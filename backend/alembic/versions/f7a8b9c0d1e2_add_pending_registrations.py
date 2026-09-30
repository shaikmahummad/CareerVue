"""Add pending registrations for OTP-gated account activation.

Revision ID: f7a8b9c0d1e2
Revises: e1f2a3b4c5d6
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "f7a8b9c0d1e2"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "email_verification_tokens_user_id_fkey",
        "email_verification_tokens",
        type_="foreignkey",
    )
    op.create_table(
        "pending_registrations",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("registration_data", postgresql.JSONB(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("user_id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(
        "ix_pending_registrations_expires_at",
        "pending_registrations",
        ["expires_at"],
    )
    op.add_column(
        "email_verification_tokens",
        sa.Column("attempt_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_pending_registrations_expires_at",
        table_name="pending_registrations",
    )
    op.drop_table("pending_registrations")
    op.drop_column("email_verification_tokens", "attempt_count")
    op.create_foreign_key(
        "email_verification_tokens_user_id_fkey",
        "email_verification_tokens",
        "profiles",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
