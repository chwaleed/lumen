from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlmodel import Field, SQLModel

from src.core.security import utc_now


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, sa_column=Column(Integer, primary_key=True))
    email: str = Field(
        sa_column=Column(String(320), unique=True, index=True, nullable=False),
    )
    password_hash: str = Field(sa_column=Column(String(255), nullable=False))
    is_active: bool = Field(
        default=True,
        sa_column=Column(Boolean, nullable=False, default=True),
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_tokens"

    id: int | None = Field(default=None, sa_column=Column(Integer, primary_key=True))
    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    jti: str = Field(
        sa_column=Column(String(64), unique=True, index=True, nullable=False),
    )
    token_hash: str = Field(
        sa_column=Column(String(64), unique=True, nullable=False),
    )
    expires_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    revoked_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
