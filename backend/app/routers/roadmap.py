import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import StudentUser
from app.models.roadmap import Roadmap, RoadmapCourse
from app.models.user import Student
from app.services.roadmap_service import generate_student_roadmap

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


# ── Request bodies ────────────────────────────────────────────────────────────

class StatusUpdate(BaseModel):
    status: str  # "pending" | "enrolled" | "completed"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize_item(item: RoadmapCourse) -> dict:
    return {
        "id": str(item.id),
        "course_id": str(item.course_id) if item.course_id else None,
        "topic": item.topic,
        "reason": item.reason,
        "priority": item.priority,
        "recommended_course_type": item.recommended_course_type,
        "search_keywords": item.search_keywords or [],
        "status": item.status,
        "order_index": item.order_index,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def _serialize_roadmap(roadmap: Roadmap, items: list[RoadmapCourse] | None = None) -> dict:
    """
    Serialize a Roadmap ORM object.

    Pass `items` explicitly when the relationship isn't loaded in the same session
    (e.g. after a select + separate items query).  If items is None, the ORM
    relationship attribute is used directly.
    """
    road_items = items if items is not None else getattr(roadmap, "items", [])
    return {
        "id": str(roadmap.id),
        "student_id": str(roadmap.student_id),
        "goal": roadmap.goal,
        "status": roadmap.status,
        "created_at": roadmap.created_at.isoformat() if roadmap.created_at else None,
        "updated_at": roadmap.updated_at.isoformat() if roadmap.updated_at else None,
        "items": [_serialize_item(i) for i in road_items],
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/generate")
async def generate_roadmap_endpoint(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate (or regenerate) an AI-powered learning roadmap for the authenticated
    student based on their career goal and current SkillProfile.

    The previous active roadmap (if any) is archived before the new one is created.
    """
    student = await db.get(Student, current_user.id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    if not student.career_goal:
        raise HTTPException(
            status_code=400,
            detail="Set a career goal before generating a roadmap",
        )

    roadmap = await generate_student_roadmap(db, current_user.id, student.career_goal)

    # Eagerly load items for serialization
    items_result = await db.execute(
        select(RoadmapCourse)
        .where(RoadmapCourse.roadmap_id == roadmap.id)
        .order_by(RoadmapCourse.order_index)
    )
    items = items_result.scalars().all()

    return {
        "success": True,
        "message": "Roadmap generated successfully",
        "data": _serialize_roadmap(roadmap, items),
    }


@router.get("/mine")
async def get_my_roadmap(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    """Return the student's current active roadmap with all course items."""
    result = await db.execute(
        select(Roadmap).where(
            Roadmap.student_id == current_user.id,
            Roadmap.status == "active",
        )
    )
    roadmap = result.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(
            status_code=404,
            detail="No active roadmap found. Generate one first.",
        )

    items_result = await db.execute(
        select(RoadmapCourse)
        .where(RoadmapCourse.roadmap_id == roadmap.id)
        .order_by(RoadmapCourse.order_index)
    )
    items = items_result.scalars().all()

    return {
        "success": True,
        "message": "Roadmap fetched",
        "data": _serialize_roadmap(roadmap, items),
    }


@router.get("/history")
async def get_roadmap_history(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    """Return all roadmaps (active + archived) for the authenticated student."""
    result = await db.execute(
        select(Roadmap)
        .where(Roadmap.student_id == current_user.id)
        .order_by(Roadmap.created_at.desc())
    )
    roadmaps = result.scalars().all()

    data = []
    for roadmap in roadmaps:
        items_result = await db.execute(
            select(RoadmapCourse)
            .where(RoadmapCourse.roadmap_id == roadmap.id)
            .order_by(RoadmapCourse.order_index)
        )
        items = items_result.scalars().all()
        data.append(_serialize_roadmap(roadmap, items))

    return {"success": True, "message": "Roadmap history fetched", "data": data}


@router.put("/{roadmap_id}/course/{item_id}/status")
async def update_roadmap_course_status(
    roadmap_id: str,
    item_id: str,
    body: StatusUpdate,
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Update the status of a single roadmap course item.

    Allowed status values: ``pending``, ``enrolled``, ``completed``.
    """
    valid_statuses = {"pending", "enrolled", "completed"}
    if body.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{body.status}'. Must be one of: {sorted(valid_statuses)}",
        )

    try:
        rid = uuid.UUID(roadmap_id)
        iid = uuid.UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid roadmap_id or item_id")

    roadmap = await db.get(Roadmap, rid)
    if not roadmap or roadmap.student_id != current_user.id:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    item = await db.get(RoadmapCourse, iid)
    if not item or item.roadmap_id != rid:
        raise HTTPException(status_code=404, detail="Roadmap item not found")

    item.status = body.status
    await db.commit()

    return {
        "success": True,
        "message": f"Course item status updated to '{body.status}'",
        "data": _serialize_item(item),
    }
