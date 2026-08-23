"""Run one idempotent abandoned-quiz cleanup batch.

Suitable for a platform cron job:
    python cleanup_abandoned_quiz_attempts.py
"""
import asyncio

from app.database import AsyncSessionLocal
from app.services.quiz_maintenance_service import mark_abandoned_attempts


async def main() -> None:
    async with AsyncSessionLocal() as session:
        changed = await mark_abandoned_attempts(session)
    print(f"Marked {changed} abandoned quiz attempt(s).")


if __name__ == "__main__":
    asyncio.run(main())
