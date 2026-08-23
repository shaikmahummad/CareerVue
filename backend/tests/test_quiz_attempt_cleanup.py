import unittest
import uuid
from datetime import datetime, timedelta, timezone

from app.models.quiz import QuizAttempt
from app.services.quiz_maintenance_service import mark_abandoned_attempts


def attempt_row(
    *,
    student_id: uuid.UUID,
    status: str,
    expires_at: datetime,
) -> QuizAttempt:
    submitted = status == "submitted"
    return QuizAttempt(
        id=uuid.uuid4(),
        student_id=student_id,
        quiz_id=uuid.uuid4(),
        template_version=2,
        question_ids=["q1"],
        question_set_hash="a" * 64,
        status=status,
        answers=[{"question_id": "q1", "selected_option": "A"}] if submitted else [],
        score=100 if submitted else None,
        total_questions=1,
        time_taken_secs=10 if submitted else None,
        started_at=expires_at - timedelta(seconds=90),
        expires_at=expires_at,
        completed_at=expires_at if submitted else None,
    )


class RowsResult:
    def __init__(self, rows):
        self.rows = rows

    def scalars(self):
        return self

    def all(self):
        return self.rows


class CleanupSession:
    def __init__(self, rows):
        self.rows = rows
        self.commits = 0
        self.statements = []

    async def execute(self, statement):
        self.statements.append(statement)
        return RowsResult(self.rows)

    async def commit(self):
        self.commits += 1


class QuizAttemptCleanupTests(unittest.IsolatedAsyncioTestCase):
    async def test_cleanup_only_marks_old_abandoned_attempts_and_is_idempotent(self):
        now = datetime.now(timezone.utc)
        owner = uuid.uuid4()
        other_owner = uuid.uuid4()
        active = attempt_row(
            student_id=owner,
            status="in_progress",
            expires_at=now + timedelta(minutes=5),
        )
        recently_expired = attempt_row(
            student_id=owner,
            status="in_progress",
            expires_at=now - timedelta(seconds=30),
        )
        eligible = attempt_row(
            student_id=owner,
            status="in_progress",
            expires_at=now - timedelta(minutes=5),
        )
        submitted = attempt_row(
            student_id=owner,
            status="submitted",
            expires_at=now - timedelta(minutes=10),
        )
        already_abandoned = attempt_row(
            student_id=owner,
            status="abandoned",
            expires_at=now - timedelta(minutes=10),
        )
        other_users_active = attempt_row(
            student_id=other_owner,
            status="in_progress",
            expires_at=now + timedelta(minutes=2),
        )
        rows = [
            active,
            recently_expired,
            eligible,
            submitted,
            already_abandoned,
            other_users_active,
        ]
        session = CleanupSession(rows)

        changed = await mark_abandoned_attempts(
            session, now=now, grace_secs=60, batch_size=100
        )
        self.assertEqual(changed, 1)
        self.assertEqual(eligible.status, "abandoned")
        self.assertEqual(active.status, "in_progress")
        self.assertEqual(recently_expired.status, "in_progress")
        self.assertEqual(submitted.status, "submitted")
        self.assertEqual(already_abandoned.status, "abandoned")
        self.assertEqual(other_users_active.status, "in_progress")

        changed_again = await mark_abandoned_attempts(
            session, now=now, grace_secs=60, batch_size=100
        )
        self.assertEqual(changed_again, 0)
        self.assertEqual(session.commits, 2)
        self.assertTrue(all(
            statement._for_update_arg is not None
            and statement._for_update_arg.skip_locked
            for statement in session.statements
        ))


if __name__ == "__main__":
    unittest.main()
