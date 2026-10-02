"""Track pending registration delivery state.

Revision ID: f8b9c0d1e2f3
Revises: f7a8b9c0d1e2
"""

from alembic import op
import sqlalchemy as sa


revision = "f8b9c0d1e2f3"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "pending_registrations",
        sa.Column(
            "status",
            sa.Text(),
            server_default=sa.text("'PENDING'"),
            nullable=False,
        ),
    )
    op.add_column(
        "pending_registrations",
        sa.Column("last_error", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("pending_registrations", "last_error")
    op.drop_column("pending_registrations", "status")
