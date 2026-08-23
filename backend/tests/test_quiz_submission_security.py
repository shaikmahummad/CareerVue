import asyncio
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from pydantic import ValidationError

from app.models.quiz import QuizAttempt, QuizTemplate
from app.models.user import SkillProfile, Student
from app.schemas.quiz import QuizAttemptCreate
from app.routers.quiz import start_quiz_attempt
from app.services.quiz_service import (
    QuizSubmissionError,
    QuizRateLimitError,
    _question_set_hash,
    _template_is_active_v2,
    issue_quiz_attempt,
    submit_quiz_attempt,
    validate_and_order_answers,
    validate_completion_time,
)


QUESTIONS = [
    {
        "id": f"q{index}",
        "topic": "Security",
        "question": f"Question {index}?",
        "options": {"A": "A", "B": "B", "C": "C", "D": "D"},
        "correct": option,
        "difficulty": "beginner",
        "explanation": "Server-side explanation.",
    }
    for index, option in enumerate(("A", "B", "C", "D"), start=1)
]
EXPECTED_IDS = [question["id"] for question in QUESTIONS]
VALID_ANSWERS = [
    {"question_id": question["id"], "selected_option": question["correct"]}
    for question in QUESTIONS
]


def template(**overrides) -> QuizTemplate:
    values = {
        "id": uuid.uuid4(),
        "goal": "Frontend Developer",
        "topic_areas": ["Security"],
        "questions": QUESTIONS,
        "generation_key": "question-bank:frontend-developer:beginner:v2",
        "version": 2,
        "is_active": True,
        "archived_at": None,
    }
    values.update(overrides)
    return QuizTemplate(**values)


def attempt(student_id: uuid.UUID, quiz: QuizTemplate, **overrides) -> QuizAttempt:
    now = datetime.now(timezone.utc)
    values = {
        "id": uuid.uuid4(),
        "student_id": student_id,
        "quiz_id": quiz.id,
        "template_version": 2,
        "question_ids": list(EXPECTED_IDS),
        "question_set_hash": _question_set_hash(QUESTIONS),
        "status": "in_progress",
        "answers": [],
        "score": None,
        "total_questions": len(EXPECTED_IDS),
        "time_taken_secs": None,
        "started_at": now - timedelta(seconds=5),
        "expires_at": now + timedelta(minutes=5),
        "completed_at": None,
    }
    values.update(overrides)
    return QuizAttempt(**values)


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value

    def scalar_one(self):
        return self.value


class SharedSubmissionState:
    def __init__(self, student, attempt_row, template_row):
        self.student = student
        self.attempt = attempt_row
        self.template = template_row
        self.skill = SkillProfile(
            id=uuid.uuid4(),
            student_id=student.id,
            topic="Security",
            level="weak",
            score_percent=0,
        )
        self.lock = asyncio.Lock()
        self.recent_start_count = 0


class LockedFakeSession:
    """Models a transaction-held PostgreSQL row lock for concurrency tests."""

    def __init__(self, state: SharedSubmissionState, *, missing_attempt=False):
        self.state = state
        self.missing_attempt = missing_attempt
        self.holds_lock = False
        self.locking_statements = []
        self.added = []
        self.commits = 0
        self.rollbacks = 0

    async def execute(self, statement):
        entity = statement.column_descriptions[0].get("entity")
        if getattr(statement, "_for_update_arg", None) is not None:
            self.locking_statements.append(entity)
            if not self.holds_lock:
                await self.state.lock.acquire()
                self.holds_lock = True
        if entity is Student:
            return ScalarResult(self.state.student)
        if entity is QuizAttempt:
            if statement.column_descriptions[0].get("name") == "count":
                return ScalarResult(self.state.recent_start_count)
            return ScalarResult(None if self.missing_attempt else self.state.attempt)
        if entity is QuizTemplate:
            return ScalarResult(self.state.template)
        if entity is SkillProfile:
            return ScalarResult(self.state.skill)
        raise AssertionError(f"Unexpected query entity: {entity}")

    def add(self, value):
        self.added.append(value)

    async def commit(self):
        self.commits += 1
        self._release()

    async def rollback(self):
        self.rollbacks += 1
        self._release()

    async def refresh(self, _value):
        return None

    def _release(self):
        if self.holds_lock:
            self.holds_lock = False
            self.state.lock.release()


class RequestSchemaSecurityTests(unittest.TestCase):
    def payload(self, **overrides):
        payload = {
            "attempt_id": uuid.uuid4(),
            "answers": [{"question_id": "q1", "selected_option": "A"}],
            "time_taken_secs": 30,
        }
        payload.update(overrides)
        return payload

    def test_accepts_each_supported_answer(self):
        for option in "ABCD":
            parsed = QuizAttemptCreate.model_validate(self.payload(answers=[{
                "question_id": "q1", "selected_option": option
            }]))
            self.assertEqual(parsed.answers[0].selected_option, option)

    def test_rejects_invalid_answer_shapes_and_values(self):
        invalid = [None, "", "E", "F", "a", "correct", "1", 1, True, {}, []]
        for value in invalid:
            with self.subTest(value=value), self.assertRaises(ValidationError):
                QuizAttemptCreate.model_validate(self.payload(answers=[{
                    "question_id": "q1", "selected_option": value
                }]))

    def test_rejects_missing_answer_and_empty_answer_list(self):
        with self.assertRaises(ValidationError):
            QuizAttemptCreate.model_validate(self.payload(answers=[{"question_id": "q1"}]))
        with self.assertRaises(ValidationError):
            QuizAttemptCreate.model_validate(self.payload(answers=[]))

    def test_rejects_empty_or_non_string_question_id(self):
        for question_id in ("", None, 1, True, [], {}):
            with self.subTest(question_id=question_id), self.assertRaises(ValidationError):
                QuizAttemptCreate.model_validate(self.payload(answers=[{
                    "question_id": question_id, "selected_option": "A"
                }]))

    def test_rejects_client_scoring_template_and_question_metadata(self):
        for field, value in (
            ("score", 100),
            ("percentage", 100),
            ("quiz_id", str(uuid.uuid4())),
            ("template_id", str(uuid.uuid4())),
            ("template_version", 2),
        ):
            with self.subTest(field=field), self.assertRaises(ValidationError):
                QuizAttemptCreate.model_validate(self.payload(**{field: value}))
        for field, value in (
            ("is_correct", True),
            ("correct", "A"),
            ("difficulty", "beginner"),
            ("question", "replacement"),
            ("score", 100),
        ):
            answer = {"question_id": "q1", "selected_option": "A", field: value}
            with self.subTest(field=field), self.assertRaises(ValidationError):
                QuizAttemptCreate.model_validate(self.payload(answers=[answer]))

        with self.assertRaises(ValidationError):
            QuizAttemptCreate.model_validate(self.payload(answers=[{
                "question_id": "q1", "answer": "A"
            }]))

    def test_rejects_malformed_completion_times(self):
        for value in (-1, 0, "30", 1.5, True, None, float("nan"), float("inf")):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                QuizAttemptCreate.model_validate(self.payload(time_taken_secs=value))


class ExactQuestionSetTests(unittest.TestCase):
    def assert_rejected(self, answers):
        with self.assertRaises(QuizSubmissionError):
            validate_and_order_answers(EXPECTED_IDS, QUESTIONS, answers)

    def test_accepts_valid_ids_and_server_orders_them(self):
        ordered = validate_and_order_answers(
            EXPECTED_IDS, QUESTIONS, list(reversed(VALID_ANSWERS))
        )
        self.assertEqual([answer["question_id"] for answer in ordered], EXPECTED_IDS)

    def test_rejects_duplicate_ids_and_multiple_answers(self):
        self.assert_rejected([*VALID_ANSWERS, VALID_ANSWERS[0]])
        changed = [*VALID_ANSWERS[1:], {"question_id": "q2", "selected_option": "A"}]
        self.assert_rejected(changed)

    def test_rejects_missing_partial_and_empty_answers(self):
        self.assert_rejected(VALID_ANSWERS[:-1])
        self.assert_rejected([])

    def test_rejects_unknown_extra_and_completely_different_ids(self):
        self.assert_rejected([
            *VALID_ANSWERS,
            {"question_id": "unknown", "selected_option": "A"},
        ])
        self.assert_rejected([
            *VALID_ANSWERS[:-1],
            {"question_id": "other-template-q4", "selected_option": "D"},
        ])
        self.assert_rejected([
            {"question_id": f"other-{index}", "selected_option": "A"}
            for index in range(4)
        ])

    def test_rejects_empty_id_and_question_from_another_attempt(self):
        tampered = [dict(answer) for answer in VALID_ANSWERS]
        tampered[0]["question_id"] = ""
        self.assert_rejected(tampered)
        tampered[0]["question_id"] = "another-attempt-q1"
        self.assert_rejected(tampered)

    def test_rejects_template_membership_changed_after_issue(self):
        changed_questions = [dict(question) for question in QUESTIONS]
        changed_questions[0]["id"] = "new-version-q1"
        with self.assertRaisesRegex(QuizSubmissionError, "no longer matches"):
            validate_and_order_answers(EXPECTED_IDS, changed_questions, VALID_ANSWERS)


class TimeAndTemplateSecurityTests(unittest.TestCase):
    def test_completion_time_uses_quiz_configuration(self):
        self.assertEqual(validate_completion_time(360, 4), 360)
        for value in (-1, 0, 361, 10_000_000, "30", True, None):
            with self.subTest(value=value), self.assertRaises(QuizSubmissionError):
                validate_completion_time(value, 4)

    def test_only_active_non_archived_v2_template_is_valid(self):
        self.assertTrue(_template_is_active_v2(template()))
        self.assertFalse(_template_is_active_v2(template(version=1)))
        self.assertFalse(_template_is_active_v2(template(is_active=False)))
        self.assertFalse(_template_is_active_v2(template(archived_at=datetime.now(timezone.utc))))
        self.assertFalse(_template_is_active_v2(template(generation_key="question-bank:x:v1")))
        self.assertFalse(_template_is_active_v2(template(generation_key="untrusted:x:v2")))
        self.assertFalse(_template_is_active_v2(None))


class RateLimitEndpointTests(unittest.IsolatedAsyncioTestCase):
    async def test_attempt_start_returns_429_and_retry_after(self):
        with (
            patch(
                "app.routers.quiz.get_student_pk",
                new=AsyncMock(return_value=uuid.uuid4()),
            ),
            patch(
                "app.routers.quiz.get_or_create_quiz_template",
                new=AsyncMock(return_value=template()),
            ),
            patch(
                "app.routers.quiz.issue_quiz_attempt",
                new=AsyncMock(side_effect=QuizRateLimitError(60)),
            ),
        ):
            with self.assertRaises(HTTPException) as raised:
                await start_quiz_attempt(
                    "Frontend Developer",
                    SimpleNamespace(id=uuid.uuid4()),
                    object(),
                )
        self.assertEqual(raised.exception.status_code, 429)
        self.assertEqual(raised.exception.headers["Retry-After"], "60")


class TransactionalSubmissionTests(unittest.IsolatedAsyncioTestCase):
    def state(self, **attempt_overrides):
        profile_id = uuid.uuid4()
        student = Student(id=uuid.uuid4(), profile_id=profile_id)
        quiz = template()
        attempt_row = attempt(student.id, quiz, **attempt_overrides)
        return profile_id, SharedSubmissionState(student, attempt_row, quiz)

    async def test_issuance_snapshots_owned_active_v2_question_set(self):
        profile_id, state = self.state()
        session = LockedFakeSession(state)
        issued = await issue_quiz_attempt(
            session, profile_id=profile_id, template=state.template
        )
        self.assertEqual(issued.student_id, state.student.id)
        self.assertEqual(issued.quiz_id, state.template.id)
        self.assertEqual(issued.template_version, 2)
        self.assertEqual(issued.question_ids, EXPECTED_IDS)
        self.assertEqual(issued.question_set_hash, _question_set_hash(QUESTIONS))
        self.assertEqual(issued.status, "in_progress")
        self.assertEqual(issued.answers, [])
        self.assertIsNone(issued.completed_at)
        self.assertEqual(
            int((issued.expires_at - issued.started_at).total_seconds()),
            len(QUESTIONS) * 90,
        )

    async def test_attempt_start_rate_limit_allows_normal_use_and_throttles_abuse(self):
        profile_id, state = self.state()
        state.recent_start_count = 1
        allowed = LockedFakeSession(state)
        issued = await issue_quiz_attempt(
            allowed,
            profile_id=profile_id,
            template=state.template,
            start_limit=2,
            window_secs=60,
        )
        self.assertEqual(issued.status, "in_progress")

        profile_id, state = self.state()
        state.recent_start_count = 2
        throttled = LockedFakeSession(state)
        with self.assertRaises(QuizRateLimitError) as raised:
            await issue_quiz_attempt(
                throttled,
                profile_id=profile_id,
                template=state.template,
                start_limit=2,
                window_secs=60,
            )
        self.assertEqual(raised.exception.retry_after_secs, 60)
        self.assertEqual(throttled.commits, 0)
        self.assertEqual(throttled.added, [])
        await throttled.rollback()

    async def test_valid_submission_is_atomic_and_uses_server_time_and_key(self):
        profile_id, state = self.state()
        session = LockedFakeSession(state)
        submitted, results = await submit_quiz_attempt(
            session, profile_id, state.attempt.id, VALID_ANSWERS, 300
        )
        self.assertEqual(submitted.status, "submitted")
        self.assertEqual(submitted.score, 100)
        self.assertEqual(submitted.answers, VALID_ANSWERS)
        self.assertLess(submitted.time_taken_secs, 300)
        self.assertIsNotNone(submitted.completed_at)
        self.assertEqual(results[0]["correct_count"], 4)
        self.assertEqual(session.commits, 1)
        self.assertEqual(
            session.locking_statements[:3], [Student, QuizAttempt, QuizTemplate]
        )

    async def test_second_submission_is_rejected(self):
        profile_id, state = self.state()
        first = LockedFakeSession(state)
        await submit_quiz_attempt(
            first, profile_id, state.attempt.id, VALID_ANSWERS, 10
        )
        second = LockedFakeSession(state)
        with self.assertRaisesRegex(QuizSubmissionError, "already been submitted"):
            await submit_quiz_attempt(
                second, profile_id, state.attempt.id, VALID_ANSWERS, 10
            )
        await second.rollback()

    async def test_two_concurrent_submissions_only_commit_once(self):
        profile_id, state = self.state()
        sessions = [LockedFakeSession(state), LockedFakeSession(state)]

        async def submit(session):
            try:
                await submit_quiz_attempt(
                    session, profile_id, state.attempt.id, VALID_ANSWERS, 10
                )
                return "submitted"
            except QuizSubmissionError as exc:
                await session.rollback()
                return str(exc)

        outcomes = await asyncio.gather(*(submit(session) for session in sessions))
        self.assertEqual(outcomes.count("submitted"), 1)
        self.assertEqual(sum(session.commits for session in sessions), 1)
        self.assertTrue(any("already been submitted" in outcome for outcome in outcomes))

    async def test_unknown_or_other_users_attempt_is_not_disclosed(self):
        profile_id, state = self.state()
        session = LockedFakeSession(state, missing_attempt=True)
        with self.assertRaisesRegex(QuizSubmissionError, "Attempt not found"):
            await submit_quiz_attempt(
                session, profile_id, uuid.uuid4(), VALID_ANSWERS, 10
            )
        await session.rollback()

    async def test_expired_attempt_transitions_to_terminal_state(self):
        profile_id, state = self.state(
            expires_at=datetime.now(timezone.utc) - timedelta(seconds=1)
        )
        session = LockedFakeSession(state)
        with self.assertRaisesRegex(QuizSubmissionError, "expired"):
            await submit_quiz_attempt(
                session, profile_id, state.attempt.id, VALID_ANSWERS, 10
            )
        self.assertEqual(state.attempt.status, "expired")
        self.assertEqual(session.commits, 1)

    async def test_inactive_old_archived_deleted_and_unknown_templates_are_rejected(self):
        mutations = (
            ("inactive", {"is_active": False}),
            ("v1", {"version": 1, "generation_key": "question-bank:x:v1"}),
            ("archived", {"archived_at": datetime.now(timezone.utc)}),
        )
        for label, changes in mutations:
            with self.subTest(label=label):
                profile_id, state = self.state()
                for key, value in changes.items():
                    setattr(state.template, key, value)
                session = LockedFakeSession(state)
                with self.assertRaisesRegex(QuizSubmissionError, "active v2"):
                    await submit_quiz_attempt(
                        session, profile_id, state.attempt.id, VALID_ANSWERS, 10
                    )
                await session.rollback()

        profile_id, state = self.state()
        state.template = None
        session = LockedFakeSession(state)
        with self.assertRaisesRegex(QuizSubmissionError, "active v2"):
            await submit_quiz_attempt(
                session, profile_id, state.attempt.id, VALID_ANSWERS, 10
            )
        await session.rollback()

    async def test_old_attempt_version_and_partial_submission_are_rejected(self):
        profile_id, state = self.state(template_version=1)
        session = LockedFakeSession(state)
        with self.assertRaisesRegex(QuizSubmissionError, "active v2"):
            await submit_quiz_attempt(
                session, profile_id, state.attempt.id, VALID_ANSWERS, 10
            )
        await session.rollback()

        profile_id, state = self.state(question_set_hash="stale-content")
        session = LockedFakeSession(state)
        with self.assertRaisesRegex(QuizSubmissionError, "content changed"):
            await submit_quiz_attempt(
                session, profile_id, state.attempt.id, VALID_ANSWERS, 10
            )
        await session.rollback()

        profile_id, state = self.state()
        session = LockedFakeSession(state)
        with self.assertRaises(QuizSubmissionError):
            await submit_quiz_attempt(
                session, profile_id, state.attempt.id, VALID_ANSWERS[:-1], 10
            )
        self.assertEqual(state.attempt.status, "in_progress")
        self.assertEqual(session.commits, 0)
        await session.rollback()


if __name__ == "__main__":
    unittest.main()
