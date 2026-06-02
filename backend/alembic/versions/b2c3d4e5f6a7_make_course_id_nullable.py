"""make roadmap_courses.course_id nullable

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-02

"""
from alembic import op

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('roadmap_courses', 'course_id', nullable=True)


def downgrade() -> None:
    op.alter_column('roadmap_courses', 'course_id', nullable=False)
