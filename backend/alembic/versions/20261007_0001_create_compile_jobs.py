"""create compile jobs table and project engine

Revision ID: 20261007_0001
Revises: 20260425_0001
Create Date: 2026-10-07
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20261007_0001"
down_revision = "20260425_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "engine" not in {c["name"] for c in inspector.get_columns("projects")}:
        op.add_column(
            "projects",
            sa.Column(
                "engine",
                sa.String(length=20),
                nullable=False,
                server_default="pdflatex",
            ),
        )

    if "compile_jobs" not in set(inspector.get_table_names()):
        op.create_table(
            "compile_jobs",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("project_id", sa.Integer(), nullable=False),
            sa.Column("root_file_id", sa.Integer(), nullable=True),
            sa.Column("engine", sa.String(length=20), nullable=False),
            sa.Column(
                "status",
                sa.String(length=20),
                nullable=False,
                server_default="queued",
            ),
            sa.Column("exit_code", sa.Integer(), nullable=True),
            sa.Column("duration_ms", sa.Integer(), nullable=True),
            sa.Column("error_count", sa.Integer(), nullable=True),
            sa.Column("pdf_path", sa.String(length=512), nullable=True),
            sa.Column("log_path", sa.String(length=512), nullable=True),
            sa.Column("synctex_path", sa.String(length=512), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["root_file_id"], ["file_entries.id"], ondelete="SET NULL"),
            sa.CheckConstraint(
                "status IN ('queued', 'running', 'success', 'failure', 'timeout', 'cancelled')",
                name="ck_compile_jobs_status",
            ),
            sa.CheckConstraint(
                "engine IN ('pdflatex', 'xelatex', 'lualatex')",
                name="ck_compile_jobs_engine",
            ),
        )
        op.create_index(
            "idx_compile_jobs_project_created",
            "compile_jobs",
            ["project_id", "created_at"],
        )
        op.create_index(
            "idx_compile_jobs_status_created",
            "compile_jobs",
            ["status", "created_at"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "compile_jobs" in set(inspector.get_table_names()):
        op.drop_index("idx_compile_jobs_status_created", table_name="compile_jobs")
        op.drop_index("idx_compile_jobs_project_created", table_name="compile_jobs")
        op.drop_table("compile_jobs")

    if "engine" in {c["name"] for c in inspector.get_columns("projects")}:
        op.drop_column("projects", "engine")
