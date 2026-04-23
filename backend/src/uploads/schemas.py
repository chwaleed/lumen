from pydantic import BaseModel, Field


class PresignedUploadRequest(BaseModel):
    project_id: int
    file_name: str = Field(min_length=1, max_length=255)
    content_type: str = Field(min_length=1, max_length=255)


class PresignedUploadResponse(BaseModel):
    upload_url: str
    file_url: str
    object_key: str
    headers: dict[str, str]
