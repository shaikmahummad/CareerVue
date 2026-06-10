"""fix courses_status_check to include pending_approval

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-10

"""
from alembic import op

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint('courses_status_check', 'courses', type_='check')
    op.create_check_constraint(
        'courses_status_check',
        'courses',
        "status IN ('draft', 'pending_approval', 'approved', 'rejected')",
    )


def downgrade() -> None:
    op.drop_constraint('courses_status_check', 'courses', type_='check')
    op.create_check_constraint(
        'courses_status_check',
        'courses',
        "status IN ('draft', 'approved', 'rejected')",
    )
