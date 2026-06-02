"""add quiz_attempt_id to roadmaps

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-06-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'a1b2c3d4e5f6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'roadmaps',
        sa.Column(
            'quiz_attempt_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('quiz_attempts.id', ondelete='SET NULL'),
            nullable=True,
        )
    )


def downgrade() -> None:
    op.drop_column('roadmaps', 'quiz_attempt_id')
