"""harden quiz submission integrity

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-08-23

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "c9d0e1f2a3b4"
down_revision = "b8c9d0e1f2a3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "quiz_templates",
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "quiz_templates",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "quiz_templates",
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("""
        UPDATE quiz_templates
        SET version = 2,
            is_active = true
        WHERE generation_key LIKE 'question-bank:%'
          AND right(generation_key, 3) = chr(58) || 'v2'
    """)
    op.alter_column("quiz_templates", "version", server_default="2")
    op.alter_column("quiz_templates", "is_active", server_default=sa.true())
    op.create_check_constraint(
        "quiz_templates_version_check", "quiz_templates", "version >= 1"
    )
    op.create_check_constraint(
        "quiz_templates_active_archive_check",
        "quiz_templates",
        "NOT (is_active AND archived_at IS NOT NULL)",
    )
    op.create_check_constraint(
        "quiz_templates_active_v2_check",
        "quiz_templates",
        "NOT is_active OR (version = 2 AND generation_key IS NOT NULL "
        "AND generation_key LIKE 'question-bank:%' "
        "AND right(generation_key, 3) = chr(58) || 'v2')",
    )

    op.add_column(
        "quiz_attempts", sa.Column("template_version", sa.Integer(), nullable=True)
    )
    op.add_column(
        "quiz_attempts",
        sa.Column("question_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "quiz_attempts", sa.Column("question_set_hash", sa.Text(), nullable=True)
    )
    op.add_column(
        "quiz_attempts",
        sa.Column(
            "status", sa.Text(), nullable=False, server_default="in_progress"
        ),
    )
    op.add_column(
        "quiz_attempts",
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "quiz_attempts",
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Preserve historical results as terminal legacy-version submissions. They
    # remain readable but can never pass the active-v2 submission gate.
    op.execute("""
        UPDATE quiz_attempts qa
        SET template_version = qt.version,
            question_ids = CASE
                WHEN jsonb_typeof(qt.questions) = 'array'
                     AND jsonb_array_length(qt.questions) > 0
                THEN COALESCE((
                    SELECT jsonb_agg(question->>'id' ORDER BY ordinal)
                    FROM jsonb_array_elements(qt.questions)
                         WITH ORDINALITY AS items(question, ordinal)
                ), jsonb_build_array('legacy-' || qa.id::text))
                ELSE jsonb_build_array('legacy-' || qa.id::text)
            END,
            question_set_hash = md5(qt.questions::text),
            status = 'submitted',
            started_at = COALESCE(qa.completed_at, now()),
            expires_at = COALESCE(qa.completed_at, now()),
            completed_at = COALESCE(qa.completed_at, now()),
            score = GREATEST(0, LEAST(COALESCE(qa.score, 0), 100)),
            total_questions = GREATEST(
                1,
                COALESCE(
                    qa.total_questions,
                    CASE WHEN jsonb_typeof(qt.questions) = 'array'
                         THEN jsonb_array_length(qt.questions)
                         ELSE 1 END,
                    1
                )
            ),
            time_taken_secs = GREATEST(1, COALESCE(qa.time_taken_secs, 1)),
            answers = CASE
                WHEN jsonb_typeof(qa.answers) = 'array' THEN qa.answers
                ELSE '[]'::jsonb
            END
        FROM quiz_templates qt
        WHERE qa.quiz_id = qt.id
    """)

    op.alter_column("quiz_attempts", "template_version", nullable=False)
    op.alter_column("quiz_attempts", "question_ids", nullable=False)
    op.alter_column("quiz_attempts", "question_set_hash", nullable=False)
    op.alter_column("quiz_attempts", "total_questions", nullable=False)
    op.alter_column("quiz_attempts", "started_at", nullable=False, server_default=sa.text("now()"))
    op.alter_column("quiz_attempts", "expires_at", nullable=False)
    op.alter_column("quiz_attempts", "completed_at", server_default=None)
    op.alter_column("quiz_attempts", "answers", server_default=sa.text("'[]'::jsonb"))

    op.create_check_constraint(
        "quiz_attempts_status_check",
        "quiz_attempts",
        "status IN ('in_progress', 'submitted', 'expired', 'abandoned')",
    )
    op.create_check_constraint(
        "quiz_attempts_score_check",
        "quiz_attempts",
        "score IS NULL OR score BETWEEN 0 AND 100",
    )
    op.create_check_constraint(
        "quiz_attempts_total_check", "quiz_attempts", "total_questions > 0"
    )
    op.create_check_constraint(
        "quiz_attempts_time_check",
        "quiz_attempts",
        "time_taken_secs IS NULL OR time_taken_secs > 0",
    )
    op.create_check_constraint(
        "quiz_attempts_template_version_check",
        "quiz_attempts",
        "template_version >= 1",
    )
    op.create_check_constraint(
        "quiz_attempts_question_ids_array_check",
        "quiz_attempts",
        "jsonb_typeof(question_ids) = 'array' AND jsonb_array_length(question_ids) > 0",
    )
    op.create_check_constraint(
        "quiz_attempts_answers_array_check",
        "quiz_attempts",
        "jsonb_typeof(answers) = 'array'",
    )
    op.create_check_constraint(
        "quiz_attempts_question_hash_check",
        "quiz_attempts",
        "length(question_set_hash) >= 32",
    )
    op.create_check_constraint(
        "quiz_attempts_expiration_check",
        "quiz_attempts",
        "expires_at >= started_at",
    )
    op.create_check_constraint(
        "quiz_attempts_lifecycle_check",
        "quiz_attempts",
        "(status = 'in_progress' AND completed_at IS NULL AND score IS NULL "
        "AND time_taken_secs IS NULL AND answers = '[]'::jsonb) OR "
        "(status = 'submitted' AND completed_at IS NOT NULL AND score IS NOT NULL "
        "AND time_taken_secs IS NOT NULL) OR "
        "(status IN ('expired', 'abandoned') AND completed_at IS NULL "
        "AND score IS NULL)",
    )
    op.create_index(
        "ix_quiz_attempts_student_status",
        "quiz_attempts",
        ["student_id", "status"],
    )
    op.create_index(
        "ix_quiz_attempts_cleanup",
        "quiz_attempts",
        ["status", "expires_at"],
    )

    op.execute("""
        DELETE FROM skill_profiles
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY student_id, topic
                    ORDER BY assessed_at DESC NULLS LAST, id DESC
                ) AS duplicate_number
                FROM skill_profiles
            ) duplicates
            WHERE duplicate_number > 1
        )
    """)
    op.create_unique_constraint(
        "uq_skill_profiles_student_topic",
        "skill_profiles",
        ["student_id", "topic"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_skill_profiles_student_topic", "skill_profiles", type_="unique"
    )
    op.drop_index("ix_quiz_attempts_student_status", table_name="quiz_attempts")
    op.drop_index("ix_quiz_attempts_cleanup", table_name="quiz_attempts")
    for constraint in (
        "quiz_attempts_lifecycle_check",
        "quiz_attempts_expiration_check",
        "quiz_attempts_question_hash_check",
        "quiz_attempts_answers_array_check",
        "quiz_attempts_question_ids_array_check",
        "quiz_attempts_template_version_check",
        "quiz_attempts_time_check",
        "quiz_attempts_total_check",
        "quiz_attempts_score_check",
        "quiz_attempts_status_check",
    ):
        op.drop_constraint(constraint, "quiz_attempts", type_="check")
    op.alter_column("quiz_attempts", "completed_at", server_default=sa.text("now()"))
    for column in (
        "expires_at",
        "started_at",
        "status",
        "question_set_hash",
        "question_ids",
        "template_version",
    ):
        op.drop_column("quiz_attempts", column)

    op.drop_constraint(
        "quiz_templates_active_v2_check", "quiz_templates", type_="check"
    )
    op.drop_constraint(
        "quiz_templates_active_archive_check", "quiz_templates", type_="check"
    )
    op.drop_constraint(
        "quiz_templates_version_check", "quiz_templates", type_="check"
    )
    for column in ("archived_at", "is_active", "version"):
        op.drop_column("quiz_templates", column)
