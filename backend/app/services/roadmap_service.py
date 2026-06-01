import asyncio

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.models.roadmap import Roadmap, RoadmapCourse
from app.models.user import SkillProfile
from app.models.course import Course
from app.services.ai_service import generate_roadmap


async def generate_student_roadmap(
    db: AsyncSession,
    student_id: UUID,
    goal: str,
) -> Roadmap:
    """
    Generate an AI-powered learning roadmap for a student.

    Steps:
      1. Load the student's current SkillProfile rows.
      2. Call Claude to produce ordered roadmap items.
      3. Archive any existing active roadmap.
      4. Persist the new Roadmap + RoadmapCourse rows, attempting to match
         each item to an approved Course in the catalogue.

    Returns:
        The newly created Roadmap ORM object (items lazy-loaded via relationship).
    """
    # 1. Fetch student's skill profile
    result = await db.execute(
        select(SkillProfile).where(SkillProfile.student_id == student_id)
    )
    skills = result.scalars().all()

    skill_profile = [
        {"topic": s.topic, "level": s.level, "score_pct": s.score_percent}
        for s in skills
    ]

    # 2. Generate roadmap items via AI (run sync HTTP call off the event loop)
    try:
        loop = asyncio.get_running_loop()
        roadmap_items = await loop.run_in_executor(None, generate_roadmap, goal, skill_profile)
    except Exception as exc:
        raise ValueError(f"AI roadmap generation failed: {exc}") from exc

    if not isinstance(roadmap_items, list) or not roadmap_items:
        raise ValueError("AI returned an empty or invalid roadmap — try again")

    # 3. Archive existing active roadmap (if any)
    existing_result = await db.execute(
        select(Roadmap).where(Roadmap.student_id == student_id, Roadmap.is_active == True)
    )
    old_roadmap = existing_result.scalar_one_or_none()
    if old_roadmap:
        old_roadmap.is_active = False
        await db.flush()

    # 4. Create new roadmap
    roadmap = Roadmap(student_id=student_id, goal=goal, is_active=True)
    db.add(roadmap)
    await db.flush()  # populate roadmap.id

    # 5. Create RoadmapCourse items, matching to real courses where possible
    for item in roadmap_items:
        matched_course_id = await _find_matching_course(db, item)

        rc = RoadmapCourse(
            roadmap_id=roadmap.id,
            course_id=matched_course_id,
            topic=item["topic"],
            reason=item.get("reason", ""),
            priority=item.get("priority", 1),
            recommended_course_type=item.get("recommended_course_type", ""),
            search_keywords=item.get("search_keywords", []),
            status="pending",
            order_index=item.get("order_index", 1),
        )
        db.add(rc)

    await db.commit()
    await db.refresh(roadmap)
    return roadmap


async def _find_matching_course(db: AsyncSession, roadmap_item: dict) -> UUID | None:
    """
    Try to find an approved course that best matches the roadmap item.

    Matching strategy (in order):
      1. Topic substring match in title, filtered by level if available.
      2. Topic substring match in title without level filter.
      3. Return None if no match.
    """
    topic = roadmap_item.get("topic", "").strip()
    level = roadmap_item.get("recommended_course_type", "").strip()

    if not topic:
        return None

    # Attempt 1: match title + level
    if level:
        query = (
            select(Course)
            .where(
                Course.status == "approved",
                Course.title.ilike(f"%{topic}%"),
                Course.level == level,
            )
            .limit(1)
        )
        result = await db.execute(query)
        course = result.scalar_one_or_none()
        if course:
            return course.id

    # Attempt 2: match title only
    query = (
        select(Course)
        .where(
            Course.status == "approved",
            Course.title.ilike(f"%{topic}%"),
        )
        .limit(1)
    )
    result = await db.execute(query)
    course = result.scalar_one_or_none()
    return course.id if course else None
