"""rename and change column type

Revision ID: 0524db2320ab
Revises: 20260409_0002
Create Date: 2026-04-17 21:26:30.391746
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision = '0524db2320ab'
down_revision = '20260409_0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("file_entries") as batch_op:
        batch_op.alter_column(
            "content",
            existing_type=sa.Text(),
            new_column_name="file_url",
            type_=sa.VARCHAR(length=255),
        )


def downgrade() -> None:
    with op.batch_alter_table("file_entries") as batch_op:
        batch_op.alter_column(
            "file_url",
            existing_type=sa.VARCHAR(length=255),
            type_=sa.Text(),
            new_column_name="content",
        )
