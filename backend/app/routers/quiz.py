import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.dependencies import AnyUser, StudentUser
from app.models.quiz import QuizAttempt, QuizTemplate
from app.models.user import SkillProfile
from app.services.quiz_service import get_or_create_quiz_template, submit_quiz_attempt

router = APIRouter(prefix="/quiz", tags=["quiz"])


# ── Request / Response bodies ─────────────────────────────────────────────────

class AnswerItem(BaseModel):
    question_id: str
    selected_option: str  # "A" | "B" | "C" | "D"


class SubmitQuizRequest(BaseModel):
    quiz_id: uuid.UUID
    answers: list[AnswerItem]
    time_taken_secs: Optional[int] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/template/{goal}")
async def get_quiz_template(
    goal: str,
    current_user: AnyUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch an existing quiz template for the given career goal, or generate one
    on the fly via Claude if none exists yet.

    Correct answers are stripped from the response so clients cannot cheat.
    """
    template = await get_or_create_quiz_template(db, goal)

    # Omit correct answer + explanation from client payload
    safe_questions = [
        {
            "id": q["id"],
            "topic": q["topic"],
            "question": q["question"],
            "options": q["options"],
            "difficulty": q.get("difficulty", "intermediate"),
        }
        for q in template.questions  # type: ignore[union-attr]
    ]

    return {
        "success": True,
        "message": "Quiz template fetched",
        "data": {
            "id": str(template.id),
            "goal": template.goal,
            "topic_areas": template.topic_areas,
            "questions": safe_questions,
            "total_questions": len(safe_questions),
        },
    }


@router.post("/attempt")
async def submit_quiz(
    body: SubmitQuizRequest,
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit quiz answers for a student.

    Scores the attempt, updates the student's SkillProfile, and returns a
    per-topic breakdown of their performance.
    """
    answers = [
        {"question_id": a.question_id, "selected_option": a.selected_option}
        for a in body.answers
    ]

    try:
        attempt, skill_results = await submit_quiz_attempt(
            db=db,
            student_id=current_user.id,
            quiz_id=body.quiz_id,
            answers=answers,
            time_taken_secs=body.time_taken_secs or 0,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return {
        "success": True,
        "message": "Quiz submitted successfully",
        "data": {
            "attempt_id": str(attempt.id),
            "score": attempt.score,
            "total_questions": attempt.total_questions,
            "skill_assessments": skill_results,
        },
    }


@router.get("/attempt/{attempt_id}")
async def get_attempt(
    attempt_id: str,
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve a single past quiz attempt with the answers the student submitted.
    The template's correct answers are included here (post-quiz review).
    """
    try:
        aid = uuid.UUID(attempt_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid attempt_id")

    attempt = await db.get(QuizAttempt, aid)
    if not attempt or attempt.student_id != current_user.id:
        raise HTTPException(status_code=404, detail="Attempt not found")

    template = await db.get(QuizTemplate, attempt.quiz_id)

    return {
        "success": True,
        "message": "Attempt fetched",
        "data": {
            "id": str(attempt.id),
            "quiz_id": str(attempt.quiz_id),
            "goal": template.goal if template else None,
            "answers": attempt.answers,
            "score": attempt.score,
            "total_questions": attempt.total_questions,
            "time_taken_secs": attempt.time_taken_secs,
            "completed_at": (
                attempt.completed_at.isoformat() if attempt.completed_at else None
            ),
        },
    }


@router.get("/my-attempts")
async def get_my_attempts(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    """Return a summary list of all quiz attempts for the authenticated student."""
    result = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.student_id == current_user.id)
        .order_by(QuizAttempt.completed_at.desc())
    )
    attempts = result.scalars().all()

    return {
        "success": True,
        "message": "Attempts fetched",
        "data": [
            {
                "id": str(a.id),
                "quiz_id": str(a.quiz_id),
                "score": a.score,
                "total_questions": a.total_questions,
                "time_taken_secs": a.time_taken_secs,
                "completed_at": (
                    a.completed_at.isoformat() if a.completed_at else None
                ),
            }
            for a in attempts
        ],
    }


@router.get("/my-skills")
async def get_my_skills(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    """Return the student's current SkillProfile (all assessed topics)."""
    result = await db.execute(
        select(SkillProfile)
        .where(SkillProfile.student_id == current_user.id)
        .order_by(SkillProfile.score_pct.desc())
    )
    skills = result.scalars().all()

    return {
        "success": True,
        "message": "Skills fetched",
        "data": [
            {
                "id": str(s.id),
                "topic": s.topic,
                "level": s.level,
                "score_pct": s.score_pct,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            }
            for s in skills
        ],
    }
