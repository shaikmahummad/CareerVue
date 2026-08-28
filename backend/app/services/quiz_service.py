from collections import Counter
from datetime import datetime, timedelta, timezone
import hashlib
import json
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quiz import QuizAttempt, QuizTemplate
from app.models.user import SkillProfile, Student
from app.config import settings
from app.services.question_bank_service import (
    QUESTION_BANK_VERSION,
    build_verified_quiz,
    generation_key,
)


SECONDS_PER_QUESTION = 90
ACTIVE_TEMPLATE_VERSION = QUESTION_BANK_VERSION
VALID_OPTIONS = frozenset({"A", "B", "C", "D"})


class QuizUnavailableError(ValueError):
    """Raised when CareerVue has no complete, active question bank for a career."""


class QuizSubmissionError(ValueError):
    """A safe, client-facing rejection of an invalid quiz submission."""

    def __init__(self, message: str, *, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


class QuizRateLimitError(ValueError):
    """Raised when a student starts too many attempts in the configured window."""

    def __init__(self, retry_after_secs: int, message: str | None = None):
        super().__init__(
            message or "Too many quiz attempts started. Please try again later."
        )
        self.retry_after_secs = retry_after_secs


def _template_is_active_v2(template: QuizTemplate | None) -> bool:
    if template is None:
        return False
    return bool(
        template.version == ACTIVE_TEMPLATE_VERSION
        and template.is_active
        and template.archived_at is None
        and template.generation_key
        and template.generation_key.startswith("question-bank:")
        and template.generation_key.endswith(f":v{ACTIVE_TEMPLATE_VERSION}")
    )


def _template_questions(template: QuizTemplate) -> list[dict]:
    questions = template.questions
    if not isinstance(questions, list) or not questions:
        raise QuizUnavailableError("The active quiz template has no valid questions.")
    ids = [question.get("id") for question in questions if isinstance(question, dict)]
    if (
        len(ids) != len(questions)
        or any(
            not isinstance(question_id, str) or not question_id.strip()
            for question_id in ids
        )
        or len(ids) != len(set(ids))
    ):
        raise QuizUnavailableError("The active quiz template has an invalid question set.")
    return questions


def _question_set_hash(questions: list[dict]) -> str:
    """Fingerprint all server-side question and answer-key content."""
    canonical = json.dumps(
        questions, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def validate_and_order_answers(
    expected_question_ids: list[str],
    template_questions: list[dict],
    answers: list[dict],
) -> list[dict]:
    """Validate an exact answer set and return it in server-issued question order."""
    if not isinstance(answers, list) or not answers:
        raise QuizSubmissionError("Answers must include exactly one answer per question.")
    if not isinstance(expected_question_ids, list) or not expected_question_ids:
        raise QuizSubmissionError(
            "The issued attempt has no valid question set.", status_code=409
        )

    template_ids = [question.get("id") for question in template_questions]
    if template_ids != expected_question_ids:
        raise QuizSubmissionError(
            "The quiz question set no longer matches the issued attempt.",
            status_code=409,
        )

    submitted_ids: list[str] = []
    answer_by_id: dict[str, str] = {}
    for answer in answers:
        if not isinstance(answer, dict):
            raise QuizSubmissionError("Every answer must be an answer object.")
        question_id = answer.get("question_id")
        selected_option = answer.get("selected_option")
        if not isinstance(question_id, str) or not question_id.strip():
            raise QuizSubmissionError(
                "Every answer must contain a non-empty question_id."
            )
        if not isinstance(selected_option, str) or selected_option not in VALID_OPTIONS:
            raise QuizSubmissionError("selected_option must be exactly A, B, C, or D.")
        submitted_ids.append(question_id)
        answer_by_id[question_id] = selected_option

    duplicates = sorted(
        question_id
        for question_id, count in Counter(submitted_ids).items()
        if count > 1
    )
    if duplicates:
        raise QuizSubmissionError(
            "Duplicate answers are not allowed for question IDs: "
            + ", ".join(duplicates)
        )

    expected = set(expected_question_ids)
    submitted = set(submitted_ids)
    missing = sorted(expected - submitted)
    unknown = sorted(submitted - expected)
    if missing or unknown or len(submitted_ids) != len(expected_question_ids):
        details = []
        if missing:
            details.append("missing question IDs: " + ", ".join(missing))
        if unknown:
            details.append("unknown question IDs: " + ", ".join(unknown))
        raise QuizSubmissionError(
            "Submitted answers must exactly match the issued question set"
            + (" (" + "; ".join(details) + ")" if details else ".")
        )

    return [
        {"question_id": question_id, "selected_option": answer_by_id[question_id]}
        for question_id in expected_question_ids
    ]


def validate_completion_time(time_taken_secs: int, question_count: int) -> int:
    """Validate the reported duration against the issued quiz configuration."""
    maximum_time = question_count * SECONDS_PER_QUESTION
    if isinstance(time_taken_secs, bool) or not isinstance(time_taken_secs, int):
        raise QuizSubmissionError("time_taken_secs must be a whole number.")
    if time_taken_secs < 1 or time_taken_secs > maximum_time:
        raise QuizSubmissionError(
            f"time_taken_secs must be between 1 and {maximum_time}."
        )
    return maximum_time


def assess_skills(questions: list[dict], answers: list[dict]) -> list[dict]:
    """Score a validated answer set using only the server-side answer key."""
    question_map = {question["id"]: question for question in questions}
    topic_stats: dict[str, dict[str, int]] = {}
    for answer in answers:
        question = question_map[answer["question_id"]]
        topic = question["topic"]
        stats = topic_stats.setdefault(topic, {"correct": 0, "total": 0})
        stats["total"] += 1
        if answer["selected_option"] == question["correct"]:
            stats["correct"] += 1

    results = []
    for topic, stats in topic_stats.items():
        score_pct = int(stats["correct"] / stats["total"] * 100)
        level = (
            "strong"
            if score_pct >= 75
            else "intermediate"
            if score_pct >= 40
            else "weak"
        )
        results.append({
            "topic": topic,
            "level": level,
            "score_pct": score_pct,
            "correct_count": stats["correct"],
            "total_count": stats["total"],
        })
    return results


async def get_student_pk(db: AsyncSession, profile_id: UUID) -> UUID:
    """Resolve profiles.id to students.id, creating the student row if needed."""
    row = (
        await db.execute(select(Student).where(Student.profile_id == profile_id))
    ).scalar_one_or_none()
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
    skill_level = "beginner"
    if student_id:
        skills = (
            await db.execute(
                select(SkillProfile).where(SkillProfile.student_id == student_id)
            )
        ).scalars().all()
        if skills:
            skill_level = _compute_skill_level(
                sum(skill.score_percent for skill in skills) / len(skills)
            )

    bank_result = await build_verified_quiz(db, goal, skill_level)
    if bank_result:
        career_slug, career_title, quiz_data = bank_result
        bank_key = generation_key(career_slug, skill_level)
        existing = (
            await db.execute(
                select(QuizTemplate).where(
                    or_(
                        QuizTemplate.generation_key == bank_key,
                        QuizTemplate.goal == career_title,
                    )
                )
            )
        ).scalar_one_or_none()
        if existing:
            if not _template_is_active_v2(existing):
                raise QuizUnavailableError("The requested v2 quiz template is inactive.")
            _template_questions(existing)
            return existing

        template = QuizTemplate(
            goal=career_title,
            topic_areas=quiz_data["topic_areas"],
            questions=quiz_data["questions"],
            generation_key=bank_key,
            version=ACTIVE_TEMPLATE_VERSION,
            is_active=True,
        )
        db.add(template)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            concurrent = (
                await db.execute(
                    select(QuizTemplate).where(
                        or_(
                            QuizTemplate.generation_key == bank_key,
                            QuizTemplate.goal == career_title,
                        )
                    )
                )
            ).scalar_one_or_none()
            if concurrent is None:
                raise
            if not _template_is_active_v2(concurrent):
                raise QuizUnavailableError("The requested v2 quiz template is inactive.")
            return concurrent
        await db.refresh(template)
        return template

    raise QuizUnavailableError(
        f'A verified quiz is not available for "{goal}" yet. '
        "Choose a supported career or ask an administrator to publish at least "
        "20 reviewed questions for this career."
    )


async def issue_quiz_attempt(
    db: AsyncSession,
    *,
    profile_id: UUID,
    template: QuizTemplate,
    start_limit: int | None = None,
    window_secs: int | None = None,
    max_active_attempts: int | None = None,
) -> QuizAttempt:
    """Issue an owned, expiring attempt with an immutable question-ID snapshot."""
    if not _template_is_active_v2(template):
        raise QuizUnavailableError("Only active v2 quiz templates can be issued.")
    questions = _template_questions(template)
    student_id = await get_student_pk(db, profile_id)
    now = datetime.now(timezone.utc)
    limit = start_limit or settings.quiz_attempt_start_limit
    window = window_secs or settings.quiz_attempt_start_window_secs
    active_limit = max_active_attempts or settings.quiz_max_active_attempts

    # The student row is the shared, database-backed rate-limit mutex. This
    # makes the count-and-create operation safe across processes and hosts.
    student = (
        await db.execute(
            select(Student).where(Student.id == student_id).with_for_update()
        )
    ).scalar_one()
    recent_attempts = (
        await db.execute(
            select(func.count(QuizAttempt.id)).where(
                QuizAttempt.student_id == student.id,
                QuizAttempt.started_at >= now - timedelta(seconds=window),
            )
        )
    ).scalar_one()
    if recent_attempts >= limit:
        raise QuizRateLimitError(window)

    active_attempts = (
        await db.execute(
            select(func.count(QuizAttempt.id)).where(
                QuizAttempt.student_id == student.id,
                QuizAttempt.status == "in_progress",
                QuizAttempt.expires_at > now,
            )
        )
    ).scalar_one()
    if active_attempts >= active_limit:
        raise QuizRateLimitError(
            SECONDS_PER_QUESTION,
            "Too many active quiz attempts. Finish or wait for an attempt to expire.",
        )

    question_ids = [question["id"] for question in questions]
    attempt = QuizAttempt(
        student_id=student.id,
        quiz_id=template.id,
        template_version=template.version,
        question_ids=question_ids,
        question_set_hash=_question_set_hash(questions),
        status="in_progress",
        answers=[],
        score=None,
        total_questions=len(question_ids),
        time_taken_secs=None,
        started_at=now,
        expires_at=now + timedelta(seconds=len(question_ids) * SECONDS_PER_QUESTION),
        completed_at=None,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    return attempt


async def submit_quiz_attempt(
    db: AsyncSession,
    profile_id: UUID,
    attempt_id: UUID,
    answers: list[dict],
    time_taken_secs: int,
) -> tuple[QuizAttempt, list[dict]]:
    """Atomically validate, score, and submit one server-issued attempt."""
    student = (
        await db.execute(
            select(Student).where(Student.profile_id == profile_id).with_for_update()
        )
    ).scalar_one_or_none()
    if student is None:
        raise QuizSubmissionError("Attempt not found.", status_code=404)

    attempt = (
        await db.execute(
            select(QuizAttempt)
            .where(QuizAttempt.id == attempt_id, QuizAttempt.student_id == student.id)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if attempt is None:
        raise QuizSubmissionError("Attempt not found.", status_code=404)
    if attempt.status == "submitted":
        raise QuizSubmissionError(
            "This attempt has already been submitted.", status_code=409
        )
    if attempt.status != "in_progress":
        raise QuizSubmissionError("This attempt is no longer active.", status_code=409)

    now = datetime.now(timezone.utc)
    if now > attempt.expires_at:
        attempt.status = "expired"
        await db.commit()
        raise QuizSubmissionError("This attempt has expired.", status_code=409)

    template = (
        await db.execute(
            select(QuizTemplate)
            .where(QuizTemplate.id == attempt.quiz_id)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if (
        not _template_is_active_v2(template)
        or attempt.template_version != ACTIVE_TEMPLATE_VERSION
    ):
        raise QuizSubmissionError(
            "This attempt does not belong to an active v2 question-bank template.",
            status_code=409,
        )

    try:
        questions = _template_questions(template)
    except QuizUnavailableError as exc:
        raise QuizSubmissionError(str(exc), status_code=409) from exc
    if attempt.question_set_hash != _question_set_hash(questions):
        raise QuizSubmissionError(
            "The quiz content changed after this attempt was issued.",
            status_code=409,
        )
    ordered_answers = validate_and_order_answers(
        attempt.question_ids, questions, answers
    )
    maximum_time = validate_completion_time(
        time_taken_secs, attempt.total_questions
    )

    skill_results = assess_skills(questions, ordered_answers)
    total_correct = sum(result["correct_count"] for result in skill_results)
    score_pct = int(total_correct / attempt.total_questions * 100)
    authoritative_elapsed = max(1, int((now - attempt.started_at).total_seconds()))

    attempt.answers = ordered_answers
    attempt.score = score_pct
    attempt.time_taken_secs = min(authoritative_elapsed, maximum_time)
    attempt.status = "submitted"
    attempt.completed_at = now

    for result in skill_results:
        existing = (
            await db.execute(
                select(SkillProfile).where(
                    SkillProfile.student_id == student.id,
                    SkillProfile.topic == result["topic"],
                )
            )
        ).scalar_one_or_none()
        if existing:
            existing.level = result["level"]
            existing.score_percent = result["score_pct"]
            existing.assessed_at = now
        else:
            db.add(SkillProfile(
                student_id=student.id,
                topic=result["topic"],
                level=result["level"],
                score_percent=result["score_pct"],
                assessed_at=now,
            ))

    await db.commit()
    await db.refresh(attempt)
    return attempt, skill_results
