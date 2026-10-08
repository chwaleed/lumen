"""add compile job failure reason

Revision ID: 20261009_0001
Revises: 20261008_0002
Create Date: 2026-10-09
"""
import sqlalchemy as sa
from alembic import op

revision = "20261009_0001"
down_revision = "20261008_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "compile_jobs",
        sa.Column("failure_reason", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("compile_jobs", "failure_reason")
