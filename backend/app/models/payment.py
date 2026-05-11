from sqlalchemy import Text, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import text
from datetime import datetime
import uuid
from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric, nullable=False)
    currency: Mapped[str | None] = mapped_column(
        Text, nullable=True, server_default=text("'INR'")
    )
    status: Mapped[str | None] = mapped_column(
        Text, nullable=True, server_default=text("'pending'")
    )
    payment_gateway: Mapped[str | None] = mapped_column(Text, nullable=True)
    gateway_payment_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    gateway_order_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=text("now()")
    )
