from sqlalchemy import Text, Boolean, Integer, Numeric, DateTime, ForeignKey, Computed
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy import text
from datetime import datetime
import uuid
from app.database import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tutor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    price: Mapped[float | None] = mapped_column(
        Numeric, nullable=True, server_default=text("0.00")
    )
    is_free: Mapped[bool | None] = mapped_column(Boolean, Computed("price = 0", persisted=True), nullable=True)
    level: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_hours: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    language: Mapped[str | None] = mapped_column(
        Text, nullable=True, server_default=text("'English'")
    )
    status: Mapped[str | None] = mapped_column(
        Text, nullable=True, server_default=text("'draft'")
    )
    rejection_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    enrolled_count: Mapped[int | None] = mapped_column(
        Integer, nullable=True, server_default=text("0")
    )
    avg_rating: Mapped[float | None] = mapped_column(
        Numeric, nullable=True, server_default=text("0.00")
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=text("now()")
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=text("now()")
    )

    # Relationships
    modules: Mapped[list["CourseModule"]] = relationship(
        back_populates="course", cascade="all, delete-orphan", order_by="CourseModule.order_index"
    )
    approvals: Mapped[list["CourseApproval"]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
    )


class CourseModule(Base):
    __tablename__ = "course_modules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_mins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_preview: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True, server_default=text("false")
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=text("now()")
    )

    # Relationships
    course: Mapped["Course"] = relationship(back_populates="modules")


class CourseApproval(Base):
    __tablename__ = "course_approvals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(Text, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=text("now()")
    )

    # Relationships
    course: Mapped["Course"] = relationship(back_populates="approvals")
