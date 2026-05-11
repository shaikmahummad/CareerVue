import uuid
from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict


# ── QuizTemplate ──────────────────────────────────────────────────────────────

class QuizTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    goal: str
    topic_areas: Optional[list[str]] = None
    questions: list | dict  # JSONB — list of question dicts
    created_at: Optional[datetime] = None


# ── Submission types ──────────────────────────────────────────────────────────

class AnswerSubmit(BaseModel):
    question_id: str
    selected_option: Literal["A", "B", "C", "D"]


class QuizAttemptCreate(BaseModel):
    quiz_id: uuid.UUID
    answers: list[AnswerSubmit]
    time_taken_secs: int


# ── QuizAttempt output ────────────────────────────────────────────────────────

class QuizAttemptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    quiz_id: uuid.UUID
    answers: list | dict
    score: Optional[int] = None
    total_questions: Optional[int] = None
    time_taken_secs: Optional[int] = None
    completed_at: Optional[datetime] = None


# ── Results / Skill Assessment ────────────────────────────────────────────────

class SkillAssessmentResult(BaseModel):
    topic: str
    level: str  # 'strong' | 'intermediate' | 'weak'
    score_pct: int


class QuizResultsOut(BaseModel):
    attempt_id: uuid.UUID
    skill_assessments: list[SkillAssessmentResult]
