"""add file entry size bytes

Revision ID: 20261008_0001
Revises: 20261007_0001
Create Date: 2026-10-08
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20261008_0001"
down_revision = "20261007_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "size_bytes" not in {c["name"] for c in inspector.get_columns("file_entries")}:
        op.add_column("file_entries", sa.Column("size_bytes", sa.Integer(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "size_bytes" in {c["name"] for c in inspector.get_columns("file_entries")}:
        op.drop_column("file_entries", "size_bytes")
