import asyncio

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from uuid import UUID
from datetime import datetime, timezone

from app.models.quiz import QuizTemplate, QuizAttempt
from app.models.user import SkillProfile, Student
from app.services.ai_service import generate_quiz, assess_skills
from app.rag.course_retriever import retrieve_courses
from app.services.question_bank_service import build_verified_quiz, generation_key


def _generate_quiz_with_context(
    goal: str, skill_level: str, context: list[dict]
) -> dict:
    return generate_quiz(goal, 20, skill_level, context)


async def get_student_pk(db: AsyncSession, profile_id: UUID) -> UUID:
    """Resolve profiles.id → students.id, creating the student row if it doesn't exist."""
    row = (await db.execute(select(Student).where(Student.profile_id == profile_id))).scalar_one_or_none()
    if not row:
        row = Student(profile_id=profile_id)
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row.id


def _compute_skill_level(avg_score: float) -> str:
    if avg_score >= 75:
        return "advanced"
    if avg_score >= 45:
        return "intermediate"
    return "beginner"


async def get_or_create_quiz_template(
    db: AsyncSession,
    goal: str,
    student_id: UUID | None = None,
) -> QuizTemplate:
    # Determine the appropriate difficulty for this student
    skill_level = "beginner"
    if student_id:
        skills = (await db.execute(
            select(SkillProfile).where(SkillProfile.student_id == student_id)
        )).scalars().all()
        if skills:
            avg = sum(s.score_percent for s in skills) / len(skills)
            skill_level = _compute_skill_level(avg)

    # CareerVue's verified bank is the primary engine for supported careers.
    # A stable generation key lets all students at the same level reuse the
    # same immutable template without confusing it with legacy Groq templates.
    bank_result = await build_verified_quiz(db, goal, skill_level)
    if bank_result:
        career_slug, career_title, quiz_data = bank_result
        bank_key = generation_key(career_slug, skill_level)
        existing = (
            await db.execute(
                select(QuizTemplate).where(QuizTemplate.generation_key == bank_key)
            )
        ).scalar_one_or_none()
        if existing:
            return existing

        template = QuizTemplate(
            goal=career_title,
            topic_areas=quiz_data["topic_areas"],
            questions=quiz_data["questions"],
            generation_key=bank_key,
        )
        db.add(template)
        try:
            await db.commit()
        except IntegrityError:
            # Another request may have created the same deterministic template.
            await db.rollback()
            concurrent = (
                await db.execute(
                    select(QuizTemplate).where(
                        QuizTemplate.generation_key == bank_key
                    )
                )
            ).scalar_one()
            return concurrent
        await db.refresh(template)
        return template

    # Unsupported careers (or incomplete banks) retain the existing Groq path.
    # For non-beginner students, always generate a fresh quiz so difficulty improves.
    if skill_level != "beginner":
        context = [
            item.as_prompt_context()
            for item in await retrieve_courses(db, goal)
        ]
        loop = asyncio.get_running_loop()
        quiz_data = await loop.run_in_executor(
            None, _generate_quiz_with_context, goal, skill_level, context
        )
        template = QuizTemplate(
            goal=goal,
            topic_areas=quiz_data["topic_areas"],
            questions=quiz_data["questions"],
        )
        db.add(template)
        await db.commit()
        await db.refresh(template)
        return template

    # Beginners reuse the first template created for this goal. Adaptive users
    # can create additional templates for the same goal, so this query must not
    # assume that the goal is unique.
    result = await db.execute(
        select(QuizTemplate)
        .where(QuizTemplate.goal == goal)
        .order_by(QuizTemplate.created_at.asc(), QuizTemplate.id.asc())
        .limit(1)
    )
    template = result.scalars().first()
    if template:
        return template

    loop = asyncio.get_running_loop()
    context = [
        item.as_prompt_context()
        for item in await retrieve_courses(db, goal)
    ]
    quiz_data = await loop.run_in_executor(
        None, _generate_quiz_with_context, goal, "beginner", context
    )
    template = QuizTemplate(
        goal=goal,
        topic_areas=quiz_data["topic_areas"],
        questions=quiz_data["questions"],
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


async def submit_quiz_attempt(
    db: AsyncSession,
    profile_id: UUID,
    quiz_id: UUID,
    answers: list[dict],
    time_taken_secs: int,
) -> tuple[QuizAttempt, list[dict]]:
    # Resolve profile UUID → students.id (the actual FK used by quiz_attempts)
    student_pk = await get_student_pk(db, profile_id)

    template = await db.get(QuizTemplate, quiz_id)
    if not template:
        raise ValueError(f"Quiz template {quiz_id} not found")

    questions: list[dict] = template.questions  # type: ignore[assignment]

    skill_results = assess_skills(template.goal, questions, answers)

    total_correct = sum(r["correct_count"] for r in skill_results)
    total_questions = len(questions)
    score_pct = int((total_correct / total_questions) * 100) if total_questions > 0 else 0

    attempt = QuizAttempt(
        student_id=student_pk,
        quiz_id=quiz_id,
        answers=answers,
        score=score_pct,
        total_questions=total_questions,
        time_taken_secs=time_taken_secs,
    )
    db.add(attempt)
    await db.flush()

    now = datetime.now(timezone.utc)
    for result in skill_results:
        existing = (await db.execute(
            select(SkillProfile).where(
                SkillProfile.student_id == student_pk,
                SkillProfile.topic == result["topic"],
            )
        )).scalar_one_or_none()

        if existing:
            existing.level = result["level"]
            existing.score_percent = result["score_pct"]
            existing.assessed_at = now
        else:
            db.add(SkillProfile(
                student_id=student_pk,
                topic=result["topic"],
                level=result["level"],
                score_percent=result["score_pct"],
            ))

    await db.commit()
    await db.refresh(attempt)
    return attempt, skill_results
