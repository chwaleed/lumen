from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, Text, func
from sqlmodel import Field, SQLModel

from src.core.security import utc_now


class FileSnapshot(SQLModel, table=True):
    __tablename__ = "file_snapshots"
    __table_args__ = (Index("idx_file_snapshots_file_id", "file_id"),)

    id: int | None = Field(default=None, sa_column=Column(Integer, primary_key=True))

    file_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("file_entries.id", ondelete="CASCADE"),
            nullable=False,
        )
    )

    content: str = Field(sa_column=Column(Text, nullable=False))

    version: int = Field(sa_column=Column(Integer, nullable=False))

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
