from pydantic import BaseModel, UUID4
from typing import Literal
from datetime import datetime


class RoadmapItemOut(BaseModel):
    id: UUID4
    course_id: UUID4 | None
    topic: str
    skill_level: Literal["strong", "intermediate", "weak"]
    order_index: int
    is_completed: bool
    completed_at: datetime | None
    notes: str | None

    model_config = {"from_attributes": True}


class RoadmapOut(BaseModel):
    id: UUID4
    student_id: UUID4
    career_goal: str
    generated_at: datetime
    updated_at: datetime
    items: list[RoadmapItemOut] = []

    model_config = {"from_attributes": True}


class RoadmapItemUpdate(BaseModel):
    is_completed: bool | None = None
    notes: str | None = None
