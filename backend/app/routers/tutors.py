from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
from uuid import UUID
from app.database import get_db
from app.middleware.auth import require_tutor
from app.models.user import TutorProfile
from app.schemas.user import TutorProfileOut

router = APIRouter(prefix="/tutors", tags=["tutors"])


@router.get("/me", response_model=TutorProfileOut)
async def get_my_profile(
    user: Annotated[dict, Depends(require_tutor)],
    db: AsyncSession = Depends(get_db),
):
    tutor_id = user["sub"]
    result = await db.execute(select(TutorProfile).where(TutorProfile.user_id == UUID(tutor_id)))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    return profile
