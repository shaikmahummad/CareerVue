from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.quiz import QuizAttempt


def is_abandonment_eligible(
    attempt: QuizAttempt,
    *,
    cutoff: datetime,
) -> bool:
    """Return whether an untouched attempt is safely eligible for abandonment."""
    return bool(
        attempt.status == "in_progress"
        and attempt.expires_at is not None
        and attempt.expires_at <= cutoff
    )


async def mark_abandoned_attempts(
    db: AsyncSession,
    *,
    now: datetime | None = None,
    grace_secs: int | None = None,
    batch_size: int | None = None,
) -> int:
    """Idempotently mark old, expired in-progress attempts as abandoned."""
    current_time = now or datetime.now(timezone.utc)
    grace = (
        settings.quiz_abandoned_grace_secs
        if grace_secs is None
        else max(0, grace_secs)
    )
    limit = batch_size or settings.quiz_cleanup_batch_size
    cutoff = current_time - timedelta(seconds=grace)

    attempts = (
        await db.execute(
            select(QuizAttempt)
            .where(
                QuizAttempt.status == "in_progress",
                QuizAttempt.expires_at <= cutoff,
            )
            .order_by(QuizAttempt.expires_at)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
    ).scalars().all()

    changed = 0
    for attempt in attempts:
        # Keep this defensive predicate even though the database query filters;
        # it protects callers using test doubles and future query changes.
        if is_abandonment_eligible(attempt, cutoff=cutoff):
            attempt.status = "abandoned"
            changed += 1

    await db.commit()
    return changed
