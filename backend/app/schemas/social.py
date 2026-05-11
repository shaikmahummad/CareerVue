import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Review ────────────────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    course_id: uuid.UUID
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    course_id: uuid.UUID
    rating: int
    comment: Optional[str] = None
    created_at: Optional[datetime] = None


# ── Discussion ────────────────────────────────────────────────────────────────

class DiscussionCreate(BaseModel):
    course_id: uuid.UUID
    module_id: Optional[uuid.UUID] = None
    content: str
    parent_id: Optional[uuid.UUID] = None


class DiscussionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    course_id: uuid.UUID
    module_id: Optional[uuid.UUID] = None
    author_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    content: str
    created_at: Optional[datetime] = None


# ── Notification ──────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    type: Optional[str] = None
    title: str
    body: Optional[str] = None
    is_read: Optional[bool] = None
    link: Optional[str] = None
    created_at: Optional[datetime] = None
