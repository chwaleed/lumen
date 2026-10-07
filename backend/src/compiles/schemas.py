from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CompileJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    root_file_id: int | None
    engine: str
    status: str
    exit_code: int | None
    duration_ms: int | None
    error_count: int | None
    has_pdf: bool
    has_log: bool
    has_synctex: bool
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None


class CompileLogResponse(BaseModel):
    job_id: int
    status: str
    error_count: int | None
    # Raw engine output. The parsed (file, line, severity, message) list is M5;
    # until then the client shows the log verbatim rather than a wrong guess.
    log: str
