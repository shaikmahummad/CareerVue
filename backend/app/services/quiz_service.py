from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime
from app.models.quiz import Quiz, QuizQuestion, QuizResult
from app.services.ai_service import generate_quiz
from app.schemas.quiz import QuizSubmission


async def create_quiz_for_student(db: AsyncSession, student_id: UUID, career_goal: str) -> Quiz:
    questions_data = generate_quiz(career_goal)

    quiz = Quiz(student_id=student_id, career_goal=career_goal, status="in_progress")
    db.add(quiz)
    await db.flush()

    for idx, q in enumerate(questions_data):
        question = QuizQuestion(
            quiz_id=quiz.id,
            topic=q["topic"],
            question_text=q["question_text"],
            options=q["options"],
            correct_option=q["correct_option"],
            order_index=idx + 1,
        )
        db.add(question)

    await db.commit()
    await db.refresh(quiz)
    return quiz


async def submit_quiz(db: AsyncSession, quiz_id: UUID, submission: QuizSubmission) -> list[QuizResult]:
    result = await db.execute(select(QuizQuestion).where(QuizQuestion.quiz_id == quiz_id))
    questions = result.scalars().all()

    question_map = {q.id: q for q in questions}
    topic_scores: dict[str, dict] = {}

    for answer in submission.answers:
        q = question_map.get(answer.question_id)
        if not q:
            continue
        if q.topic not in topic_scores:
            topic_scores[q.topic] = {"correct": 0, "total": 0}
        topic_scores[q.topic]["total"] += 1
        if answer.selected_option == q.correct_option:
            topic_scores[q.topic]["correct"] += 1

    quiz_results = []
    for topic, scores in topic_scores.items():
        pct = int((scores["correct"] / scores["total"]) * 100) if scores["total"] > 0 else 0
        skill_level = "strong" if pct >= 75 else "intermediate" if pct >= 40 else "weak"

        qr = QuizResult(quiz_id=quiz_id, topic=topic, score_pct=pct, skill_level=skill_level)
        db.add(qr)
        quiz_results.append(qr)

    quiz_obj = await db.get(Quiz, quiz_id)
    if quiz_obj:
        quiz_obj.status = "completed"
        quiz_obj.completed_at = datetime.utcnow()

    await db.commit()
    return quiz_results
