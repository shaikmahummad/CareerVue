"""fix roadmap_courses: drop unique course constraint, no status changes needed

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-02

"""
from alembic import op

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the unique constraint that prevents multiple items in a roadmap
    # from referencing the same course when roadmap topics overlap
    op.drop_constraint('roadmap_courses_roadmap_id_course_id_key', 'roadmap_courses', type_='unique')


def downgrade() -> None:
    op.create_unique_constraint(
        'roadmap_courses_roadmap_id_course_id_key',
        'roadmap_courses',
        ['roadmap_id', 'course_id'],
    )
