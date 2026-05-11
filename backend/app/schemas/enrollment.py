import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ── Enrollment ────────────────────────────────────────────────────────────────

class EnrollmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    course_id: uuid.UUID
    enrolled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress_pct: Optional[int] = None


# ── ModuleProgress ────────────────────────────────────────────────────────────

class ModuleProgressCreate(BaseModel):
    enrollment_id: uuid.UUID
    module_id: uuid.UUID


# ── Certificate ───────────────────────────────────────────────────────────────

class CertificateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    course_id: uuid.UUID
    certificate_url: Optional[str] = None
    issued_at: Optional[datetime] = None
