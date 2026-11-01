"""Allow multiple quiz templates for one career goal.

Revision ID: fb1c2d3e4f5a
Revises: fa0b1c2d3e4f
"""

from alembic import op


revision = "fb1c2d3e4f5a"
down_revision = "fa0b1c2d3e4f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Legacy templates were unique by goal. Versioned question-bank templates
    # are uniquely identified by generation_key, so the goal may repeat.
    op.drop_constraint(
        "quiz_templates_goal_key",
        "quiz_templates",
        type_="unique",
    )


def downgrade() -> None:
    op.create_unique_constraint(
        "quiz_templates_goal_key",
        "quiz_templates",
        ["goal"],
    )
