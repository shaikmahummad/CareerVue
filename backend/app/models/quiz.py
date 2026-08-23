from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy import text
from datetime import datetime
import uuid
from app.database import Base


class QuizTemplate(Base):
    __tablename__ = "quiz_templates"
    __table_args__ = (
        CheckConstraint("version >= 1", name="quiz_templates_version_check"),
        CheckConstraint(
            "NOT (is_active AND archived_at IS NOT NULL)",
            name="quiz_templates_active_archive_check",
        ),
        CheckConstraint(
            "NOT is_active OR (version = 2 AND generation_key IS NOT NULL "
            "AND generation_key LIKE 'question-bank:%' "
            "AND right(generation_key, 3) = chr(58) || 'v2')",
            name="quiz_templates_active_v2_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    goal: Mapped[str] = mapped_column(Text, nullable=False)
    topic_areas: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    questions: Mapped[dict | list] = mapped_column(JSONB, nullable=False)
    generation_key: Mapped[str | None] = mapped_column(Text, nullable=True, unique=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("2"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=text("now()")
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=text("now()")
    )


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    __table_args__ = (
        CheckConstraint(
            "status IN ('in_progress', 'submitted', 'expired')",
            name="quiz_attempts_status_check",
        ),
        CheckConstraint(
            "score IS NULL OR score BETWEEN 0 AND 100",
            name="quiz_attempts_score_check",
        ),
        CheckConstraint("total_questions > 0", name="quiz_attempts_total_check"),
        CheckConstraint(
            "time_taken_secs IS NULL OR time_taken_secs > 0",
            name="quiz_attempts_time_check",
        ),
        CheckConstraint(
            "template_version >= 1", name="quiz_attempts_template_version_check"
        ),
        CheckConstraint(
            "jsonb_typeof(question_ids) = 'array' AND jsonb_array_length(question_ids) > 0",
            name="quiz_attempts_question_ids_array_check",
        ),
        CheckConstraint(
            "jsonb_typeof(answers) = 'array'",
            name="quiz_attempts_answers_array_check",
        ),
        CheckConstraint(
            "length(question_set_hash) >= 32",
            name="quiz_attempts_question_hash_check",
        ),
        CheckConstraint(
            "expires_at >= started_at", name="quiz_attempts_expiration_check"
        ),
        CheckConstraint(
            "(status = 'in_progress' AND completed_at IS NULL AND score IS NULL "
            "AND time_taken_secs IS NULL AND answers = '[]'::jsonb) OR "
            "(status = 'submitted' AND completed_at IS NOT NULL AND score IS NOT NULL "
            "AND time_taken_secs IS NOT NULL) OR "
            "(status = 'expired' AND completed_at IS NULL AND score IS NULL)",
            name="quiz_attempts_lifecycle_check",
        ),
        Index("ix_quiz_attempts_student_status", "student_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    quiz_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("quiz_templates.id", ondelete="CASCADE"), nullable=False
    )
    template_version: Mapped[int] = mapped_column(Integer, nullable=False)
    question_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    question_set_hash: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'in_progress'"))
    answers: Mapped[dict | list] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    time_taken_secs: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
