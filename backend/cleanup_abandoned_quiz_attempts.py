"""Run one idempotent abandoned-quiz cleanup batch.

Suitable for a platform cron job:
    python cleanup_abandoned_quiz_attempts.py
"""
import asyncio
import logging
import sys

from app.database import AsyncSessionLocal
from app.services.quiz_maintenance_service import mark_abandoned_attempts


async def main() -> None:
    try:
        async with AsyncSessionLocal() as session:
            result = await mark_abandoned_attempts(session)
    except Exception:
        logging.exception("quiz_cleanup_failed")
        raise
    logging.info(
        "quiz_cleanup_completed candidates=%s processed=%s "
        "marked_abandoned=%s duration_ms=%s",
        result.candidates,
        result.processed,
        result.marked_abandoned,
        result.duration_ms,
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)
    asyncio.run(main())
