from pydantic import BaseModel, Field


class PresignedUploadRequest(BaseModel):
    project_id: int
    file_name: str = Field(min_length=1, max_length=255)
    # Advisory only: the allowlist is driven by the extension, because browsers
    # report no usable type for .sty, .cls or .bst.
    content_type: str | None = Field(default=None, max_length=255)
    # Signed into the URL, so S3 rejects an upload whose real length differs.
    # That is what makes the ceiling enforced rather than merely declared.
    size_bytes: int = Field(ge=0)


class PresignedUploadResponse(BaseModel):
    upload_url: str
    file_url: str
    object_key: str
    headers: dict[str, str]
