from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    template_id: str | None = Field(default=None, max_length=50)


class FileEntryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: Literal["file", "folder"]
    parent_id: int | None = None
    mime_type: str | None = Field(default=None, max_length=255)
    content: str | None = None


class FileEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    parent_id: int | None
    name: str
    type: Literal["file", "folder"]
    mime_type: str | None
    content: str | None
    created_at: datetime
    updated_at: datetime


class ProjectSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime
    updated_at: datetime


class ProjectDetailResponse(ProjectSummaryResponse):
    files: list[FileEntryResponse]
