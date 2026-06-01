from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime, timezone

from app.models.quiz import QuizTemplate, QuizAttempt
from app.models.user import SkillProfile, Student
from app.services.ai_service import generate_quiz, assess_skills


async def get_student_pk(db: AsyncSession, profile_id: UUID) -> UUID:
    """Resolve profiles.id → students.id, creating the student row if it doesn't exist."""
    row = (await db.execute(select(Student).where(Student.profile_id == profile_id))).scalar_one_or_none()
    if not row:
        row = Student(profile_id=profile_id)
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row.id


async def get_or_create_quiz_template(db: AsyncSession, goal: str) -> QuizTemplate:
    result = await db.execute(select(QuizTemplate).where(QuizTemplate.goal == goal))
    template = result.scalar_one_or_none()

    if template:
        return template

    quiz_data = generate_quiz(goal)

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
