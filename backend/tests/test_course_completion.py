import unittest
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException

from app.models.enrollment import Enrollment
from app.routers.enrollments import complete_course


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value

    def scalar_one(self):
        return self.value


def fake_db(*results):
    db = MagicMock()
    db.execute = AsyncMock(side_effect=[ScalarResult(value) for value in results])
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


class CourseCompletionTests(unittest.IsolatedAsyncioTestCase):
    async def test_incomplete_course_cannot_be_completed(self):
        student_id = uuid.uuid4()
        enrollment = Enrollment(
            id=uuid.uuid4(),
            student_id=student_id,
            course_id=uuid.uuid4(),
            progress_pct=40,
        )
        db = fake_db(enrollment)

        with (
            patch(
                "app.routers.enrollments._get_student",
                new=AsyncMock(return_value=SimpleNamespace(id=student_id)),
            ),
            patch(
                "app.routers.enrollments._recalculate_progress",
                new=AsyncMock(return_value=75),
            ),
        ):
            with self.assertRaises(HTTPException) as raised:
                await complete_course(
                    str(enrollment.id),
                    SimpleNamespace(id=uuid.uuid4()),
                    db,
                )

        self.assertEqual(raised.exception.status_code, 409)
        self.assertIn("Current progress: 75%", raised.exception.detail)
        self.assertIsNone(enrollment.completed_at)
        db.commit.assert_not_awaited()

    async def test_first_completion_issues_certificate_and_xp_once(self):
        student_id = uuid.uuid4()
        certificate_id = uuid.uuid4()
        enrollment = Enrollment(
            id=uuid.uuid4(),
            student_id=student_id,
            course_id=uuid.uuid4(),
            progress_pct=100,
        )
        db = fake_db(enrollment, certificate_id, None)

        with (
            patch(
                "app.routers.enrollments._get_student",
                new=AsyncMock(return_value=SimpleNamespace(id=student_id)),
            ),
            patch(
                "app.routers.enrollments._recalculate_progress",
                new=AsyncMock(return_value=100),
            ),
        ):
            response = await complete_course(
                str(enrollment.id),
                SimpleNamespace(id=uuid.uuid4()),
                db,
            )

        self.assertEqual(response["data"]["xp_awarded"], 100)
        self.assertFalse(response["data"]["already_completed"])
        self.assertEqual(response["data"]["certificate_id"], str(certificate_id))
        self.assertIsNotNone(enrollment.completed_at)
        self.assertTrue(any(
            "UPDATE students" in str(call.args[0])
            for call in db.execute.await_args_list
        ))
        db.commit.assert_awaited_once()

    async def test_repeated_completion_does_not_award_xp_again(self):
        student_id = uuid.uuid4()
        certificate_id = uuid.uuid4()
        enrollment = Enrollment(
            id=uuid.uuid4(),
            student_id=student_id,
            course_id=uuid.uuid4(),
            progress_pct=100,
            completed_at=datetime.now(timezone.utc),
        )
        db = fake_db(enrollment, None, certificate_id)

        with (
            patch(
                "app.routers.enrollments._get_student",
                new=AsyncMock(return_value=SimpleNamespace(id=student_id)),
            ),
            patch(
                "app.routers.enrollments._recalculate_progress",
                new=AsyncMock(return_value=100),
            ),
        ):
            response = await complete_course(
                str(enrollment.id),
                SimpleNamespace(id=uuid.uuid4()),
                db,
            )

        self.assertEqual(response["data"]["xp_awarded"], 0)
        self.assertTrue(response["data"]["already_completed"])
        self.assertFalse(any(
            "UPDATE students" in str(call.args[0])
            for call in db.execute.await_args_list
        ))
        db.commit.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
