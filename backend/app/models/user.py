from sqlalchemy import Text, Boolean, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy import text
from datetime import datetime
import uuid
from app.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=text("now()")
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=text("now()")
    )

    # Relationships
    student: Mapped["Student | None"] = relationship(back_populates="profile", uselist=False)
    tutor: Mapped["Tutor | None"] = relationship(back_populates="profile", uselist=False)


class Student(Base):
    __tablename__ = "students"

    # Shared PK with profiles — also a FK
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True
    )
    college: Mapped[str | None] = mapped_column(Text, nullable=True)
    branch: Mapped[str | None] = mapped_column(Text, nullable=True)
    year_of_study: Mapped[int | None] = mapped_column(Integer, nullable=True)
    graduation_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    city: Mapped[str | None] = mapped_column(Text, nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    github_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    career_goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    xp_points: Mapped[int | None] = mapped_column(Integer, nullable=True, server_default=text("0"))
    streak_days: Mapped[int | None] = mapped_column(Integer, nullable=True, server_default=text("0"))
    last_active: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    placement_ready: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True, server_default=text("false")
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=text("now()")
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=text("now()")
    )

    # Relationships
    profile: Mapped["Profile"] = relationship(back_populates="student")


class Tutor(Base):
    __tablename__ = "tutors"

    # Shared PK with profiles — also a FK
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True
    )
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    expertise_tags: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    qualification: Mapped[str | None] = mapped_column(Text, nullable=True)
    years_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    website_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_verified: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True, server_default=text("false")
    )
    total_earnings: Mapped[float | None] = mapped_column(
        Numeric, nullable=True, server_default=text("0")
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=text("now()")
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=text("now()")
    )

    # Relationships
    profile: Mapped["Profile"] = relationship(back_populates="tutor")


class SkillProfile(Base):
    __tablename__ = "skill_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    topic: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[str] = mapped_column(Text, nullable=False)  # 'strong' | 'intermediate' | 'weak'
    score_pct: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=text("now()")
    )
