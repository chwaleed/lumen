from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlmodel import Field, SQLModel

from src.core.security import utc_now
from src.file_entries.models import FileEntry
from src.file_snapshots.models import FileSnapshot


class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: int | None = Field(default=None, sa_column=Column(Integer, primary_key=True))

    name: str = Field(sa_column=Column(String(255), nullable=False))

    # pdflatex is the default and the only engine supported in Phase 1; xelatex
    # and lualatex are wired and selectable. See docs/decisions/0008-latex-compiler-stack.md.
    engine: str = Field(
        default="pdflatex",
        sa_column=Column(String(20), nullable=False, server_default="pdflatex"),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        )
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )

    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
            onupdate=func.now(),
        ),
    )
