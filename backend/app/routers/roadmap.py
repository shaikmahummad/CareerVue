import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import StudentUser
from app.models.roadmap import Roadmap, RoadmapCourse
from app.models.user import Student
from app.services.quiz_service import get_student_pk
from app.services.roadmap_service import generate_student_roadmap

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


class StatusUpdate(BaseModel):
    status: str  # "pending" | "enrolled" | "completed"


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


def _serialize_roadmap(roadmap: Roadmap, items: list[RoadmapCourse]) -> dict:
    return {
        "id": str(roadmap.id),
        "student_id": str(roadmap.student_id),
        "goal": roadmap.goal,
        "is_active": roadmap.is_active,
        "completion_pct": roadmap.completion_pct or 0,
        "generated_at": roadmap.generated_at.isoformat() if roadmap.generated_at else None,
        "updated_at": roadmap.updated_at.isoformat() if roadmap.updated_at else None,
        "items": [_serialize_item(i) for i in items],
    }


@router.post("/generate")
async def generate_roadmap_endpoint(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    student_pk = await get_student_pk(db, current_user.id)
    student = await db.get(Student, student_pk)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    if not student.current_goal:
        raise HTTPException(status_code=400, detail="Set a career goal before generating a roadmap")

    roadmap = await generate_student_roadmap(db, student_pk, student.current_goal)

    items = (await db.execute(
        select(RoadmapCourse).where(RoadmapCourse.roadmap_id == roadmap.id).order_by(RoadmapCourse.order_index)
    )).scalars().all()

    return {"success": True, "message": "Roadmap generated successfully", "data": _serialize_roadmap(roadmap, items)}


@router.get("/mine")
async def get_my_roadmap(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    student_pk = await get_student_pk(db, current_user.id)
    roadmap = (await db.execute(
        select(Roadmap).where(Roadmap.student_id == student_pk, Roadmap.is_active == True)
    )).scalar_one_or_none()

    if not roadmap:
        raise HTTPException(status_code=404, detail="No active roadmap found. Generate one first.")

    items = (await db.execute(
        select(RoadmapCourse).where(RoadmapCourse.roadmap_id == roadmap.id).order_by(RoadmapCourse.order_index)
    )).scalars().all()

    return {"success": True, "message": "Roadmap fetched", "data": _serialize_roadmap(roadmap, items)}


@router.get("/history")
async def get_roadmap_history(
    current_user: StudentUser,
    db: AsyncSession = Depends(get_db),
):
    student_pk = await get_student_pk(db, current_user.id)
    roadmaps = (await db.execute(
        select(Roadmap).where(Roadmap.student_id == student_pk).order_by(Roadmap.generated_at.desc())
    )).scalars().all()

    data = []
    for roadmap in roadmaps:
        items = (await db.execute(
            select(RoadmapCourse).where(RoadmapCourse.roadmap_id == roadmap.id).order_by(RoadmapCourse.order_index)
        )).scalars().all()
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
    valid_statuses = {"pending", "enrolled", "completed"}
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status '{body.status}'. Must be one of: {sorted(valid_statuses)}")

    try:
        rid, iid = uuid.UUID(roadmap_id), uuid.UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid roadmap_id or item_id")

    student_pk = await get_student_pk(db, current_user.id)
    roadmap = await db.get(Roadmap, rid)
    if not roadmap or roadmap.student_id != student_pk:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    item = await db.get(RoadmapCourse, iid)
    if not item or item.roadmap_id != rid:
        raise HTTPException(status_code=404, detail="Roadmap item not found")

    item.status = body.status
    await db.commit()

    return {"success": True, "message": f"Status updated to '{body.status}'", "data": _serialize_item(item)}
