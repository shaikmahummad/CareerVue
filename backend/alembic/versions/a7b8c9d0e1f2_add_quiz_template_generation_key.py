"""add quiz template generation key

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
"""
from alembic import op
import sqlalchemy as sa


revision = "a7b8c9d0e1f2"
down_revision = "f6a7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("quiz_templates", sa.Column("generation_key", sa.Text(), nullable=True))
    op.create_unique_constraint(
        "uq_quiz_templates_generation_key", "quiz_templates", ["generation_key"]
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_quiz_templates_generation_key", "quiz_templates", type_="unique"
    )
    op.drop_column("quiz_templates", "generation_key")
