from pydantic import BaseModel, UUID4
from typing import Literal
from datetime import datetime


class QuizQuestionOut(BaseModel):
    id: UUID4
    topic: str
    question_text: str
    options: dict
    order_index: int

    model_config = {"from_attributes": True}


class QuizOut(BaseModel):
    id: UUID4
    student_id: UUID4
    career_goal: str
    status: str
    created_at: datetime
    completed_at: datetime | None
    questions: list[QuizQuestionOut] = []

    model_config = {"from_attributes": True}


class QuizAnswerSubmit(BaseModel):
    question_id: UUID4
    selected_option: Literal["A", "B", "C", "D"]


class QuizSubmission(BaseModel):
    answers: list[QuizAnswerSubmit]


class QuizResultOut(BaseModel):
    id: UUID4
    quiz_id: UUID4
    topic: str
    score_pct: int
    skill_level: Literal["strong", "intermediate", "weak"]

    model_config = {"from_attributes": True}


class QuizResultSummary(BaseModel):
    quiz_id: UUID4
    career_goal: str
    results: list[QuizResultOut]
