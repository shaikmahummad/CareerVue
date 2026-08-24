"""normalize profile emails and enforce case-insensitive uniqueness

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-08-24

"""
from alembic import op


revision = "d0e1f2a3b4c5"
down_revision = "c9d0e1f2a3b4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE profiles SET email = lower(trim(email))")
    op.execute(
        "CREATE UNIQUE INDEX uq_profiles_email_normalized "
        "ON profiles (lower(email))"
    )


def downgrade() -> None:
    op.drop_index("uq_profiles_email_normalized", table_name="profiles")
