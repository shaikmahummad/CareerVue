"""Retain pending registrations until explicit account deletion.

Revision ID: fa0b1c2d3e4f
Revises: f9c0d1e2f3a4
"""

from alembic import op
import sqlalchemy as sa


revision = "fa0b1c2d3e4f"
down_revision = "f9c0d1e2f3a4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "pending_registrations",
        "expires_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "pending_registrations",
        "expires_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
    )
