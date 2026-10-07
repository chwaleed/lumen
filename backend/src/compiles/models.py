from datetime import datetime

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, String, func
from sqlmodel import Field, SQLModel

from src.core.security import utc_now


# A compile is a job, never inline in a request handler: it holds a CPU core for
# tens of seconds. docs/plans/latex-compilation.md measured 35.9s for a cold
# 215-page thesis.
STATUS_QUEUED = "queued"
STATUS_RUNNING = "running"
STATUS_SUCCESS = "success"
STATUS_FAILURE = "failure"
STATUS_TIMEOUT = "timeout"
STATUS_CANCELLED = "cancelled"

TERMINAL_STATUSES = frozenset({STATUS_SUCCESS, STATUS_FAILURE, STATUS_TIMEOUT, STATUS_CANCELLED})

ENGINES = ("pdflatex", "xelatex", "lualatex")
DEFAULT_ENGINE = "pdflatex"


class CompileJob(SQLModel, table=True):
    __tablename__ = "compile_jobs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('queued', 'running', 'success', 'failure', 'timeout', 'cancelled')",
            name="ck_compile_jobs_status",
        ),
        CheckConstraint(
            "engine IN ('pdflatex', 'xelatex', 'lualatex')",
            name="ck_compile_jobs_engine",
        ),
        # The only read pattern that matters: a project's jobs, newest first.
        Index("idx_compile_jobs_project_created", "project_id", "created_at"),
        # Claiming the next job scans queued rows oldest first.
        Index("idx_compile_jobs_status_created", "status", "created_at"),
    )

    id: int | None = Field(default=None, sa_column=Column(Integer, primary_key=True))

    project_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        )
    )

    # The root .tex. Nullable because the project may be empty when queued; the
    # worker resolves it and records what it used.
    root_file_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("file_entries.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # Snapshotted at submit time: the project's engine may change afterwards.
    engine: str = Field(sa_column=Column(String(20), nullable=False))

    status: str = Field(
        default=STATUS_QUEUED,
        sa_column=Column(String(20), nullable=False, server_default=STATUS_QUEUED),
    )

    exit_code: int | None = Field(default=None, sa_column=Column(Integer, nullable=True))
    duration_ms: int | None = Field(default=None, sa_column=Column(Integer, nullable=True))
    error_count: int | None = Field(default=None, sa_column=Column(Integer, nullable=True))

    # Paths relative to Settings.compile_output_dir.
    # ponytail: local filesystem, because Phase 1 targets a single machine. Moving
    # to S3 is a change at one call site in worker.py when compile workers are
    # split from the API.
    pdf_path: str | None = Field(default=None, sa_column=Column(String(512), nullable=True))
    log_path: str | None = Field(default=None, sa_column=Column(String(512), nullable=True))
    synctex_path: str | None = Field(default=None, sa_column=Column(String(512), nullable=True))

    # The container running this job, so the API can kill it. Without this only
    # the worker process knows the name and a running compile is uncancellable.
    container_name: str | None = Field(
        default=None, sa_column=Column(String(128), nullable=True)
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    started_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    finished_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )
