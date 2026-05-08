from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
from uuid import UUID
from app.database import get_db
from app.middleware.auth import require_student
from app.models.quiz import Quiz
from app.schemas.quiz import QuizOut, QuizSubmission, QuizResultSummary
from app.services.quiz_service import create_quiz_for_student, submit_quiz

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.post("/generate", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
async def generate_quiz(
    user: Annotated[dict, Depends(require_student)],
    db: AsyncSession = Depends(get_db),
):
    student_id = UUID(user["sub"])
    career_goal = user.get("user_metadata", {}).get("career_goal")
    if not career_goal:
        raise HTTPException(status_code=400, detail="Set a career goal before generating a quiz")
    quiz = await create_quiz_for_student(db, student_id, career_goal)
    return quiz


@router.get("/me", response_model=QuizOut)
async def get_my_quiz(
    user: Annotated[dict, Depends(require_student)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Quiz)
        .where(Quiz.student_id == UUID(user["sub"]))
        .order_by(Quiz.created_at.desc())
        .limit(1)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="No quiz found")
    return quiz


@router.post("/{quiz_id}/submit", response_model=QuizResultSummary)
async def submit_quiz_answers(
    quiz_id: UUID,
    body: QuizSubmission,
    user: Annotated[dict, Depends(require_student)],
    db: AsyncSession = Depends(get_db),
):
    quiz = await db.get(Quiz, quiz_id)
    if not quiz or str(quiz.student_id) != user["sub"]:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.status == "completed":
        raise HTTPException(status_code=400, detail="Quiz already submitted")
    results = await submit_quiz(db, quiz_id, body)
    return QuizResultSummary(quiz_id=quiz_id, career_goal=quiz.career_goal, results=results)
