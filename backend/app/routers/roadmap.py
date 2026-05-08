from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
from uuid import UUID
from app.database import get_db
from app.middleware.auth import require_student
from app.models.roadmap import Roadmap, RoadmapItem
from app.schemas.roadmap import RoadmapOut, RoadmapItemUpdate
from app.services.roadmap_service import generate_student_roadmap

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


@router.post("/generate", response_model=RoadmapOut)
async def generate_roadmap(
    quiz_id: UUID,
    user: Annotated[dict, Depends(require_student)],
    db: AsyncSession = Depends(get_db),
):
    student_id = UUID(user["sub"])
    career_goal = user.get("user_metadata", {}).get("career_goal")
    if not career_goal:
        raise HTTPException(status_code=400, detail="Career goal not set")
    roadmap = await generate_student_roadmap(db, student_id, quiz_id, career_goal)
    return roadmap


@router.get("/me", response_model=RoadmapOut)
async def get_my_roadmap(
    user: Annotated[dict, Depends(require_student)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Roadmap).where(Roadmap.student_id == UUID(user["sub"])))
    roadmap = result.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return roadmap


@router.patch("/items/{item_id}", response_model=RoadmapOut)
async def update_roadmap_item(
    item_id: UUID,
    body: RoadmapItemUpdate,
    user: Annotated[dict, Depends(require_student)],
    db: AsyncSession = Depends(get_db),
):
    item = await db.get(RoadmapItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Roadmap item not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    await db.commit()
    result = await db.execute(select(Roadmap).where(Roadmap.id == item.roadmap_id))
    return result.scalar_one()
