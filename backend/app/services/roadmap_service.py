from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from app.models.roadmap import Roadmap, RoadmapItem
from app.models.quiz import QuizResult
from app.services.ai_service import generate_roadmap


async def generate_student_roadmap(db: AsyncSession, student_id: UUID, quiz_id: UUID, career_goal: str) -> Roadmap:
    result = await db.execute(select(QuizResult).where(QuizResult.quiz_id == quiz_id))
    quiz_results = result.scalars().all()

    results_data = [
        {"topic": r.topic, "score_pct": r.score_pct, "skill_level": r.skill_level}
        for r in quiz_results
    ]
    roadmap_data = generate_roadmap(career_goal, results_data)

    # Replace existing roadmap if present
    existing = await db.execute(select(Roadmap).where(Roadmap.student_id == student_id))
    old_roadmap = existing.scalar_one_or_none()
    if old_roadmap:
        await db.delete(old_roadmap)
        await db.flush()

    roadmap = Roadmap(student_id=student_id, career_goal=career_goal)
    db.add(roadmap)
    await db.flush()

    for item_data in roadmap_data:
        item = RoadmapItem(
            roadmap_id=roadmap.id,
            topic=item_data["topic"],
            skill_level=item_data["skill_level"],
            order_index=item_data["order_index"],
            notes=item_data.get("notes"),
        )
        db.add(item)

    await db.commit()
    await db.refresh(roadmap)
    return roadmap
