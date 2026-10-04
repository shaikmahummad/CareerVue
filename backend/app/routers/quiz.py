import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import StudentUser
from app.models.quiz import QuizAttempt, QuizTemplate
from app.models.roadmap import Roadmap
from app.models.user import SkillProfile
from app.schemas.quiz import QuizAttemptCreate
from app.services.quiz_service import (
    QuizSubmissionError,
    QuizRateLimitError,
    QuizUnavailableError,
    StudentProfileError,
    get_or_create_quiz_template,
    get_student_pk,
    issue_quiz_attempt,
    submit_quiz_attempt,
)

router = APIRouter(prefix="/quiz", tags=["quiz"])
logger = logging.getLogger(__name__)


# ── Request / Response bodies ─────────────────────────────────────────────────

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/attempt/start/{goal}")
async def start_quiz_attempt(
    goal: str,
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch or assemble a quiz from CareerVue's reviewed question bank.

    Correct answers are stripped from the response so clients cannot cheat.
    """
    logger.info("quiz_attempt_start event=quiz_attempt_start user_id=%s goal=%s", current_user.id, goal)
    try:
        student_pk = await get_student_pk(db, current_user.id)
        logger.info("quiz_attempt_start event=student_lookup result=found user_id=%s student_id=%s", current_user.id, student_pk)
        template = await get_or_create_quiz_template(
            db, goal, student_id=student_pk
        )
        logger.info("quiz_attempt_start event=quiz_lookup result=found user_id=%s quiz_id=%s", current_user.id, template.id)
        logger.info("quiz_attempt_start event=attempt_creation result=started user_id=%s", current_user.id)
        attempt = await issue_quiz_attempt(
            db, profile_id=current_user.id, student_id=student_pk, template=template
        )
        logger.info("quiz_attempt_start event=attempt_creation result=success user_id=%s attempt_id=%s", current_user.id, attempt.id)
        logger.info("quiz_attempt_start event=transaction result=committed user_id=%s attempt_id=%s", current_user.id, attempt.id)
    except StudentProfileError as exc:
        logger.warning("quiz_attempt_start event=student_lookup result=failed user_id=%s error=%s", current_user.id, exc)
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except QuizUnavailableError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except QuizRateLimitError as exc:
        raise HTTPException(
            status_code=429,
            detail=str(exc),
            headers={"Retry-After": str(exc.retry_after_secs)},
        ) from exc
    except Exception:
        logger.exception("quiz_attempt_start event=failed user_id=%s goal=%s", current_user.id, goal)
        raise

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
        "message": "Quiz attempt issued",
        "data": {
            "attempt_id": str(attempt.id),
            "goal": template.goal,
            "topic_areas": template.topic_areas,
            "questions": safe_questions,
            "total_questions": len(safe_questions),
            "expires_at": attempt.expires_at.isoformat(),
        },
    }


@router.post("/attempt")
async def submit_quiz(
    body: QuizAttemptCreate,
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
            profile_id=current_user.id,
            attempt_id=body.attempt_id,
            answers=answers,
            time_taken_secs=body.time_taken_secs,
        )
    except QuizSubmissionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

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

    student_pk = await get_student_pk(db, current_user.id)
    attempt = await db.get(QuizAttempt, aid)
    if (
        not attempt
        or attempt.student_id != student_pk
        or attempt.status != "submitted"
    ):
        raise HTTPException(status_code=404, detail="Attempt not found")

    template = await db.get(QuizTemplate, attempt.quiz_id)

    # Build per-question detail with correct/wrong info
    answer_map = {a["question_id"]: a["selected_option"] for a in (attempt.answers or [])}
    questions_detail = []
    for q in (template.questions if template else []):
        your_answer = answer_map.get(q["id"])
        correct_answer = q.get("correct_answer") or q.get("correct")
        questions_detail.append({
            "id": q["id"],
            "topic": q.get("topic"),
            "question": q.get("question"),
            "options": q.get("options", {}),
            "difficulty": q.get("difficulty", "intermediate"),
            "your_answer": your_answer,
            "correct_answer": correct_answer,
            "is_correct": your_answer == correct_answer if your_answer else False,
            "explanation": q.get("explanation"),
        })

    correct_count = sum(1 for q in questions_detail if q["is_correct"])
    wrong_count = len(questions_detail) - correct_count

    # Check for linked roadmap
    roadmap_result = await db.execute(
        select(Roadmap).where(Roadmap.quiz_attempt_id == attempt.id)
    )
    roadmap = roadmap_result.scalar_one_or_none()

    return {
        "success": True,
        "message": "Attempt fetched",
        "data": {
            "id": str(attempt.id),
            "quiz_id": str(attempt.quiz_id),
            "goal": template.goal if template else None,
            "score": attempt.score,
            "total_questions": attempt.total_questions,
            "correct_count": correct_count,
            "wrong_count": wrong_count,
            "time_taken_secs": attempt.time_taken_secs,
            "completed_at": (
                attempt.completed_at.isoformat() if attempt.completed_at else None
            ),
            "questions": questions_detail,
            "roadmap_id": str(roadmap.id) if roadmap else None,
        },
    }


@router.get("/my-attempts")
async def get_my_attempts(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    """Return a summary list of all quiz attempts for the authenticated student."""
    student_pk = await get_student_pk(db, current_user.id)
    result = await db.execute(
        select(QuizAttempt)
        .where(
            QuizAttempt.student_id == student_pk,
            QuizAttempt.status == "submitted",
        )
        .order_by(QuizAttempt.completed_at.desc())
    )
    attempts = result.scalars().all()

    # Batch-load all quiz templates for these attempts
    quiz_ids = list({a.quiz_id for a in attempts})
    templates_map: dict = {}
    if quiz_ids:
        tmpl_result = await db.execute(
            select(QuizTemplate).where(QuizTemplate.id.in_(quiz_ids))
        )
        for t in tmpl_result.scalars().all():
            templates_map[t.id] = t

    # Batch-load all linked roadmaps for these attempts
    attempt_ids = [a.id for a in attempts]
    roadmaps_map: dict = {}
    if attempt_ids:
        rm_result = await db.execute(
            select(Roadmap).where(Roadmap.quiz_attempt_id.in_(attempt_ids))
        )
        for r in rm_result.scalars().all():
            roadmaps_map[r.quiz_attempt_id] = r

    data = []
    for a in attempts:
        template = templates_map.get(a.quiz_id)
        roadmap = roadmaps_map.get(a.id)
        if a.score is not None and a.total_questions:
            correct_count = round(a.score * a.total_questions / 100)
            wrong_count = a.total_questions - correct_count
        else:
            correct_count = None
            wrong_count = None
        data.append({
            "id": str(a.id),
            "quiz_id": str(a.quiz_id),
            "goal": template.goal if template else None,
            "score": a.score,
            "total_questions": a.total_questions,
            "correct_count": correct_count,
            "wrong_count": wrong_count,
            "time_taken_secs": a.time_taken_secs,
            "completed_at": (
                a.completed_at.isoformat() if a.completed_at else None
            ),
            "roadmap_id": str(roadmap.id) if roadmap else None,
        })

    return {
        "success": True,
        "message": "Attempts fetched",
        "data": data,
    }


@router.get("/my-skills")
async def get_my_skills(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    """Return the student's current SkillProfile (all assessed topics)."""
    student_pk = await get_student_pk(db, current_user.id)
    result = await db.execute(
        select(SkillProfile)
        .where(SkillProfile.student_id == student_pk)
        .order_by(SkillProfile.score_percent.desc())
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
                "score_pct": s.score_percent,
                "assessed_at": s.assessed_at.isoformat() if s.assessed_at else None,
            }
            for s in skills
        ],
    }
