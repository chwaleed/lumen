from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FileSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_id: int
    content: str
    version: int
    created_at: datetime
    updated_at: datetime
