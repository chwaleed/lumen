"""add file entry parent lookup index

Revision ID: 20260425_0001
Revises: c8f6d85d350f
Create Date: 2026-04-25 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260425_0001"
down_revision = "c8f6d85d350f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_indexes = {
        index["name"]
        for index in inspector.get_indexes("file_entries")
    }

    if "idx_file_entries_project_parent_id" not in existing_indexes:
        op.create_index(
            "idx_file_entries_project_parent_id",
            "file_entries",
            ["project_id", "parent_id"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_indexes = {
        index["name"]
        for index in inspector.get_indexes("file_entries")
    }

    if "idx_file_entries_project_parent_id" in existing_indexes:
        op.drop_index("idx_file_entries_project_parent_id", table_name="file_entries")
