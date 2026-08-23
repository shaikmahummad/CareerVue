"""harden course completion integrity

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-08-23

"""
from alembic import op


revision = "b8c9d0e1f2a3"
down_revision = "a7b8c9d0e1f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Keep the earliest record before enforcing one progress event and one
    # certificate for each logical entity.
    op.execute("""
        DELETE FROM module_progress
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY enrollment_id, module_id
                    ORDER BY completed_at ASC NULLS LAST, id
                ) AS duplicate_number
                FROM module_progress
            ) duplicates
            WHERE duplicate_number > 1
        )
    """)
    op.execute("""
        DELETE FROM certificates
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY student_id, course_id
                    ORDER BY issued_at ASC NULLS LAST, id
                ) AS duplicate_number
                FROM certificates
            ) duplicates
            WHERE duplicate_number > 1
        )
    """)
    op.execute("""
        UPDATE enrollments
        SET progress_pct = GREATEST(0, LEAST(COALESCE(progress_pct, 0), 100))
    """)

    op.create_unique_constraint(
        "uq_module_progress_enrollment_module",
        "module_progress",
        ["enrollment_id", "module_id"],
    )
    op.create_unique_constraint(
        "uq_certificates_student_course",
        "certificates",
        ["student_id", "course_id"],
    )
    op.create_check_constraint(
        "enrollments_progress_pct_check",
        "enrollments",
        "progress_pct BETWEEN 0 AND 100",
    )


def downgrade() -> None:
    op.drop_constraint(
        "enrollments_progress_pct_check", "enrollments", type_="check"
    )
    op.drop_constraint(
        "uq_certificates_student_course", "certificates", type_="unique"
    )
    op.drop_constraint(
        "uq_module_progress_enrollment_module",
        "module_progress",
        type_="unique",
    )
