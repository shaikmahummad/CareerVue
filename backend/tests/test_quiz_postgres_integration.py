"""Destructive integration tests for an explicitly dedicated PostgreSQL test DB.

These tests are skipped unless both variables are present:

    QUIZ_TEST_DATABASE_URL=postgresql+asyncpg://.../careervue_test
    CAREERVUE_ALLOW_TEST_DB_RESET=1

The configured database schema is dropped. The safety check requires the
database name to contain "test" and refuses the application's DATABASE_URL.
"""
import asyncio
import json
import os
from pathlib import Path
import unittest
import uuid
from datetime import datetime, timedelta, timezone

from alembic import command
from alembic.config import Config
from sqlalchemy import func, inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.database import Base
from app.models.quiz import QuizAttempt, QuizTemplate
from app.models.user import Profile, SkillProfile, Student
from app.services.quiz_service import (
    QuizSubmissionError,
    _question_set_hash,
    submit_quiz_attempt,
)


BACKEND_DIR = Path(__file__).resolve().parents[1]
HEAD_REVISION = "c9d0e1f2a3b4"
PREVIOUS_REVISION = "b8c9d0e1f2a3"
TEST_DATABASE_URL = os.getenv("QUIZ_TEST_DATABASE_URL", "")
RESET_ALLOWED = os.getenv("CAREERVUE_ALLOW_TEST_DB_RESET") == "1"

QUESTIONS = [
    {
        "id": f"pg-q{index}",
        "topic": "PostgreSQL Concurrency",
        "question": f"Integration question {index}?",
        "options": {"A": "A", "B": "B", "C": "C", "D": "D"},
        "correct": option,
        "difficulty": "advanced",
        "explanation": "Integration-test answer key.",
    }
    for index, option in enumerate(("A", "B", "C", "D"), start=1)
]
ANSWERS = [
    {"question_id": question["id"], "selected_option": question["correct"]}
    for question in QUESTIONS
]


def _safe_test_database_url() -> str | None:
    if not TEST_DATABASE_URL or not RESET_ALLOWED:
        return None
    parsed = make_url(TEST_DATABASE_URL)
    database_name = (parsed.database or "").lower()
    if "test" not in database_name or "prod" in database_name:
        raise RuntimeError(
            "QUIZ_TEST_DATABASE_URL must identify a dedicated database whose name "
            "contains 'test' and does not contain 'prod'."
        )
    configured_app_url = os.getenv("DATABASE_URL")
    if configured_app_url and make_url(configured_app_url) == parsed:
        raise RuntimeError("Refusing to reset the application's DATABASE_URL.")
    return TEST_DATABASE_URL


SAFE_TEST_URL = _safe_test_database_url()


def _alembic_config(database_url: str) -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def _run_alembic(database_url: str, operation: str, revision: str) -> None:
    previous = os.environ.get("ALEMBIC_DATABASE_URL")
    os.environ["ALEMBIC_DATABASE_URL"] = database_url
    try:
        getattr(command, operation)(_alembic_config(database_url), revision)
    finally:
        if previous is None:
            os.environ.pop("ALEMBIC_DATABASE_URL", None)
        else:
            os.environ["ALEMBIC_DATABASE_URL"] = previous


@unittest.skipUnless(
    SAFE_TEST_URL,
    "requires dedicated QUIZ_TEST_DATABASE_URL and CAREERVUE_ALLOW_TEST_DB_RESET=1",
)
class PostgreSQLQuizIntegrationTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.database_url = SAFE_TEST_URL
        cls.engine = create_async_engine(
            cls.database_url, poolclass=NullPool, pool_pre_ping=True
        )

        async def reset_to_current_metadata():
            async with cls.engine.begin() as connection:
                await connection.execute(text("DROP SCHEMA public CASCADE"))
                await connection.execute(text("CREATE SCHEMA public"))
                await connection.run_sync(Base.metadata.create_all)

        asyncio.run(reset_to_current_metadata())
        _run_alembic(cls.database_url, "stamp", HEAD_REVISION)
        _run_alembic(cls.database_url, "downgrade", PREVIOUS_REVISION)

        cls.profile_id = uuid.uuid4()
        cls.student_id = uuid.uuid4()
        cls.legacy_template_id = uuid.uuid4()
        cls.legacy_attempt_id = uuid.uuid4()

        async def seed_legacy_data():
            async with cls.engine.begin() as connection:
                await connection.execute(text("""
                    INSERT INTO profiles (id, role, full_name, email)
                    VALUES (:profile_id, 'student', 'Migration Test', :email)
                """), {
                    "profile_id": cls.profile_id,
                    "email": f"migration-{cls.profile_id}@example.test",
                })
                await connection.execute(text("""
                    INSERT INTO students (id, profile_id)
                    VALUES (:student_id, :profile_id)
                """), {
                    "student_id": cls.student_id,
                    "profile_id": cls.profile_id,
                })
                await connection.execute(text("""
                    INSERT INTO quiz_templates
                        (id, goal, topic_areas, questions, generation_key)
                    VALUES
                        (:template_id, 'Migration Test', NULL,
                         CAST(:questions AS jsonb),
                         'question-bank:migration-test:beginner:v2')
                """), {
                    "template_id": cls.legacy_template_id,
                    "questions": json.dumps(QUESTIONS),
                })
                await connection.execute(text("""
                    INSERT INTO quiz_attempts
                        (id, student_id, quiz_id, answers, score,
                         total_questions, time_taken_secs)
                    VALUES
                        (:attempt_id, :student_id, :template_id,
                         CAST(:answers AS jsonb), 100, :total, 15)
                """), {
                    "attempt_id": cls.legacy_attempt_id,
                    "student_id": cls.student_id,
                    "template_id": cls.legacy_template_id,
                    "answers": json.dumps(ANSWERS),
                    "total": len(QUESTIONS),
                })

        asyncio.run(seed_legacy_data())
        _run_alembic(cls.database_url, "upgrade", HEAD_REVISION)
        cls.session_factory = async_sessionmaker(cls.engine, expire_on_commit=False)

    @classmethod
    def tearDownClass(cls):
        async def reset():
            async with cls.engine.begin() as connection:
                await connection.execute(text("DROP SCHEMA public CASCADE"))
                await connection.execute(text("CREATE SCHEMA public"))
            await cls.engine.dispose()

        asyncio.run(reset())

    async def test_migration_schema_and_existing_attempt_are_preserved(self):
        async with self.engine.connect() as connection:
            schema = await connection.run_sync(lambda sync_connection: {
                "attempt_columns": {
                    column["name"]
                    for column in inspect(sync_connection).get_columns("quiz_attempts")
                },
                "template_columns": {
                    column["name"]
                    for column in inspect(sync_connection).get_columns("quiz_templates")
                },
                "attempt_indexes": {
                    index["name"]
                    for index in inspect(sync_connection).get_indexes("quiz_attempts")
                },
            })

        async with self.session_factory() as session:
            row = (
                await session.execute(
                    select(QuizAttempt).where(QuizAttempt.id == self.legacy_attempt_id)
                )
            ).scalar_one()
            template = (
                await session.execute(
                    select(QuizTemplate).where(
                        QuizTemplate.id == self.legacy_template_id
                    )
                )
            ).scalar_one()

        self.assertTrue({
            "template_version", "question_ids", "question_set_hash", "status",
            "started_at", "expires_at",
        }.issubset(schema["attempt_columns"]))
        self.assertTrue({"version", "is_active", "archived_at"}.issubset(
            schema["template_columns"]
        ))
        self.assertIn("ix_quiz_attempts_cleanup", schema["attempt_indexes"])
        self.assertEqual(row.status, "submitted")
        self.assertEqual(row.answers, ANSWERS)
        self.assertEqual(row.question_ids, [question["id"] for question in QUESTIONS])
        self.assertEqual(template.version, 2)
        self.assertTrue(template.is_active)

    async def test_real_postgresql_concurrent_submission_is_deterministic(self):
        profile_id = uuid.uuid4()
        student_id = uuid.uuid4()
        template_id = uuid.uuid4()
        async with self.session_factory() as session:
            session.add(Profile(
                id=profile_id,
                role="student",
                full_name="Concurrency Test",
                email=f"concurrency-{profile_id}@example.test",
            ))
            session.add(Student(id=student_id, profile_id=profile_id))
            session.add(QuizTemplate(
                id=template_id,
                goal="Concurrency Test",
                topic_areas=["PostgreSQL Concurrency"],
                questions=QUESTIONS,
                generation_key=f"question-bank:concurrency-{template_id}:v2",
                version=2,
                is_active=True,
            ))
            await session.commit()

        for _ in range(5):
            now = datetime.now(timezone.utc)
            attempt_id = uuid.uuid4()
            async with self.session_factory() as session:
                session.add(QuizAttempt(
                    id=attempt_id,
                    student_id=student_id,
                    quiz_id=template_id,
                    template_version=2,
                    question_ids=[question["id"] for question in QUESTIONS],
                    question_set_hash=_question_set_hash(QUESTIONS),
                    status="in_progress",
                    answers=[],
                    total_questions=len(QUESTIONS),
                    started_at=now - timedelta(seconds=2),
                    expires_at=now + timedelta(minutes=5),
                ))
                await session.commit()

            async def submit_once():
                async with self.session_factory() as session:
                    try:
                        result, _ = await submit_quiz_attempt(
                            session,
                            profile_id,
                            attempt_id,
                            ANSWERS,
                            2,
                        )
                        return ("submitted", result.id)
                    except QuizSubmissionError as exc:
                        await session.rollback()
                        return (str(exc), None)

            outcomes = await asyncio.gather(submit_once(), submit_once())
            self.assertEqual(
                sum(outcome[0] == "submitted" for outcome in outcomes), 1
            )
            self.assertEqual(
                sum("already been submitted" in outcome[0] for outcome in outcomes),
                1,
            )

            async with self.session_factory() as session:
                stored = await session.get(QuizAttempt, attempt_id)
                matching_attempts = (
                    await session.execute(
                        select(func.count(QuizAttempt.id)).where(
                            QuizAttempt.id == attempt_id
                        )
                    )
                ).scalar_one()
                profiles = (
                    await session.execute(
                        select(func.count(SkillProfile.id)).where(
                            SkillProfile.student_id == student_id,
                            SkillProfile.topic == "PostgreSQL Concurrency",
                        )
                    )
                ).scalar_one()

            self.assertEqual(matching_attempts, 1)
            self.assertEqual(stored.status, "submitted")
            self.assertEqual(stored.score, 100)
            self.assertEqual(stored.answers, ANSWERS)
            self.assertEqual(profiles, 1)


if __name__ == "__main__":
    unittest.main()
