"""create file snapshot table

Revision ID: c8f6d85d350f
Revises: 0524db2320ab
Create Date: 2026-04-17 21:34:40.954134
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision = 'c8f6d85d350f'
down_revision = '0524db2320ab'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "file_snapshots" not in existing_tables:
        op.create_table(
            "file_snapshots",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("file_id", sa.Integer(), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("version", sa.Integer(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.ForeignKeyConstraint(["file_id"], ["file_entries.id"], ondelete="CASCADE"),
        )
        op.create_index("idx_file_snapshots_file_id", "file_snapshots", ["file_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "file_snapshots" in existing_tables:
        op.drop_index("idx_file_snapshots_file_id", table_name="file_snapshots")
        op.drop_table("file_snapshots")
