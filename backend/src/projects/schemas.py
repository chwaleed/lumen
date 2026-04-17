from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from src.file_entries.schemas import FileEntryResponse


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    template_id: str | None = Field(default=None, max_length=50)


class ProjectUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class ProjectSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime
    updated_at: datetime


class ProjectDetailResponse(ProjectSummaryResponse):
    files: list[FileEntryResponse]
