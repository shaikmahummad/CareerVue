"""add one-time module ratings

Revision ID: fc2d3e4f5a6b
Revises: fb1c2d3e4f5a
Create Date: 2026-11-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "fc2d3e4f5a6b"
down_revision = "fb1c2d3e4f5a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("reviews", sa.Column("module_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_reviews_module_id", "reviews", "course_modules", ["module_id"], ["id"], ondelete="CASCADE"
    )
    op.create_unique_constraint("uq_reviews_student_module", "reviews", ["student_id", "module_id"])


def downgrade() -> None:
    op.drop_constraint("uq_reviews_student_module", "reviews", type_="unique")
    op.drop_constraint("fk_reviews_module_id", "reviews", type_="foreignkey")
    op.drop_column("reviews", "module_id")
