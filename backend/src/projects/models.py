from datetime import datetime

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlmodel import Field, SQLModel

from src.core.security import utc_now


class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: int | None = Field(default=None, sa_column=Column(Integer, primary_key=True))

    name: str = Field(sa_column=Column(String(255), nullable=False))

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


class FileEntry(SQLModel, table=True):
    __tablename__ = "file_entries"
    __table_args__ = (
        CheckConstraint(
            "type IN ('file', 'folder')",
            name="ck_file_entries_type",
        ),
        Index("idx_file_entries_project_id", "project_id"),
        Index("idx_file_entries_parent_id", "parent_id"),
    )
    __mapper_args__ = {"confirm_deleted_rows": False}

    id: int | None = Field(default=None, sa_column=Column(Integer, primary_key=True))

    project_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        )
    )

    parent_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("file_entries.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )

    name: str = Field(sa_column=Column(String(255), nullable=False))

    type: str = Field(sa_column=Column(String(20), nullable=False))

    mime_type: str | None = Field(default=None, sa_column=Column(String(255), nullable=True))

    content: str | None = Field(default=None, sa_column=Column(Text, nullable=True))

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
