"""add compile job container name

Revision ID: 20261008_0002
Revises: 20261008_0001
Create Date: 2026-10-08
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20261008_0002"
down_revision = "20261008_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "container_name" not in {c["name"] for c in inspector.get_columns("compile_jobs")}:
        # Recorded so the API can kill a running compile. Without it only the
        # worker process knows the name, and cancelling is impossible.
        op.add_column(
            "compile_jobs", sa.Column("container_name", sa.String(length=128), nullable=True)
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "container_name" in {c["name"] for c in inspector.get_columns("compile_jobs")}:
        op.drop_column("compile_jobs", "container_name")
