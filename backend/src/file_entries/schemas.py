from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class FileEntryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: Literal["file", "folder"]
    parent_id: int | None = None
    mime_type: str | None = Field(default=None, max_length=255)
    file_url: str | None = Field(default=None, max_length=255)


class FileEntryUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class FileEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    parent_id: int | None
    name: str
    type: Literal["file", "folder"]
    mime_type: str | None
    file_url: str | None
    content: str | None = None
    snapshot_version: int | None = None
    created_at: datetime
    updated_at: datetime
