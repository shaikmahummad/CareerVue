"""Enforce one student row per profile.

Revision ID: f9c0d1e2f3a4
Revises: f8b9c0d1e2f3
"""

from alembic import op
import sqlalchemy as sa


revision = "f9c0d1e2f3a4"
down_revision = "f8b9c0d1e2f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    duplicate_count = op.get_bind().execute(
        sa.text(
            "SELECT count(*) FROM ("
            "SELECT profile_id FROM students "
            "GROUP BY profile_id HAVING count(*) > 1"
            ") duplicates"
        )
    ).scalar_one()
    if duplicate_count:
        raise RuntimeError(
            "Cannot enforce students.profile_id uniqueness: duplicate rows exist. "
            "Review and merge duplicate student records, then rerun this migration."
        )
    op.create_unique_constraint(
        "uq_students_profile_id", "students", ["profile_id"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_students_profile_id", "students", type_="unique")
