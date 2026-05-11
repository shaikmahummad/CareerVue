from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime, timezone

from app.models.quiz import QuizTemplate, QuizAttempt
from app.models.user import SkillProfile
from app.services.ai_service import generate_quiz, assess_skills


async def get_or_create_quiz_template(db: AsyncSession, goal: str) -> QuizTemplate:
    """
    Return an existing QuizTemplate for the given goal, or generate a new one via Claude
    and persist it.
    """
    result = await db.execute(
        select(QuizTemplate).where(QuizTemplate.goal == goal)
    )
    template = result.scalar_one_or_none()

    if template:
        return template

    # Generate via AI — this is a synchronous Claude API call
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
    student_id: UUID,
    quiz_id: UUID,
    answers: list[dict],
    time_taken_secs: int,
) -> tuple[QuizAttempt, list[dict]]:
    """
    Process a quiz submission:
      1. Assess skills per topic.
      2. Persist a QuizAttempt row.
      3. Upsert SkillProfile rows for the student.

    Args:
        db:               Async DB session.
        student_id:       UUID of the student.
        quiz_id:          UUID of the QuizTemplate.
        answers:          List of {"question_id": str, "selected_option": str}.
        time_taken_secs:  Total seconds spent on the quiz.

    Returns:
        (QuizAttempt, skill_results)
        skill_results is a list of {"topic", "level", "score_pct", "correct_count", "total_count"}.
    """
    # Fetch the template (raises ValueError if missing)
    template = await db.get(QuizTemplate, quiz_id)
    if not template:
        raise ValueError(f"Quiz template {quiz_id} not found")

    questions: list[dict] = template.questions  # type: ignore[assignment]

    # Compute per-topic skill breakdown
    skill_results = assess_skills(template.goal, questions, answers)

    # Compute aggregate score
    total_correct = sum(r["correct_count"] for r in skill_results)
    total_questions = len(questions)
    score_pct = int((total_correct / total_questions) * 100) if total_questions > 0 else 0

    # Persist attempt
    attempt = QuizAttempt(
        student_id=student_id,
        quiz_id=quiz_id,
        answers=answers,
        score=score_pct,
        total_questions=total_questions,
        time_taken_secs=time_taken_secs,
    )
    db.add(attempt)
    await db.flush()  # get attempt.id before upsert

    # Upsert skill_profiles
    now = datetime.now(timezone.utc)
    for result in skill_results:
        existing = await db.execute(
            select(SkillProfile).where(
                SkillProfile.student_id == student_id,
                SkillProfile.topic == result["topic"],
            )
        )
        skill = existing.scalar_one_or_none()

        if skill:
            skill.level = result["level"]
            skill.score_pct = result["score_pct"]
            skill.updated_at = now
        else:
            skill = SkillProfile(
                student_id=student_id,
                topic=result["topic"],
                level=result["level"],
                score_pct=result["score_pct"],
            )
            db.add(skill)

    await db.commit()
    await db.refresh(attempt)
    return attempt, skill_results
