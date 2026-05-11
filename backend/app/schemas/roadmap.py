import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ── RoadmapCourse ─────────────────────────────────────────────────────────────

class RoadmapCourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    roadmap_id: uuid.UUID
    course_id: Optional[uuid.UUID] = None
    topic: str
    reason: Optional[str] = None
    priority: Optional[int] = None
    recommended_course_type: Optional[str] = None
    search_keywords: Optional[list[str]] = None
    status: Optional[str] = None
    order_index: int
    created_at: Optional[datetime] = None


class RoadmapCourseStatusUpdate(BaseModel):
    status: str


# ── Roadmap ───────────────────────────────────────────────────────────────────

class RoadmapOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    goal: str
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    items: list[RoadmapCourseOut] = []


# ── Generation request ────────────────────────────────────────────────────────

class GenerateRoadmapRequest(BaseModel):
    """
    No fields required — the server derives goal and skill profile
    from the authenticated student's existing records.
    """
    pass
