from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import FileResponse
from sqlmodel import Session

from src.auth.dependencies import get_current_active_user
from src.auth.models import User
from src.compiles.models import CompileJob
from src.compiles.log_parser import SEVERITY_ERROR, parse_log
from src.compiles.schemas import (
    CompileDiagnostic,
    CompileJobResponse,
    CompileLogResponse,
)
from src.compiles.service import (
    cancel_job,
    create_job,
    ensure_project_fits,
    get_job_for_project,
    output_path,
    queue_stats,
    snapshot_storage_stats,
)
from src.core.api_response import ApiResponse, ApiResponseBuilder
from src.core.config import Settings, get_settings
from src.db.session import get_session
from src.file_entries.models import FileEntry
from src.shared.project_access import get_project_for_user, projects_exception

router = APIRouter(prefix="/projects", tags=["compiles"])

CurrentUser = Annotated[User, Depends(get_current_active_user)]
DbSession = Annotated[Session, Depends(get_session)]
AppSettings = Annotated[Settings, Depends(get_settings)]


def _serialize(job: CompileJob) -> dict:
    return CompileJobResponse(
        id=job.id,
        project_id=job.project_id,
        root_file_id=job.root_file_id,
        engine=job.engine,
        status=job.status,
        exit_code=job.exit_code,
        duration_ms=job.duration_ms,
        error_count=job.error_count,
        has_pdf=job.pdf_path is not None,
        has_log=job.log_path is not None,
        has_synctex=job.synctex_path is not None,
        created_at=job.created_at,
        started_at=job.started_at,
        finished_at=job.finished_at,
    ).model_dump()


@router.post(
    "/{project_id}/compile",
    response_model=ApiResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def post_compile(
    project_id: int,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
    root_file_id: int | None = None,
) -> ApiResponse:
    """Queue a compile. 202, never a result: a build holds a core for seconds."""
    project = get_project_for_user(session, current_user, project_id)

    if root_file_id is not None:
        root = session.get(FileEntry, root_file_id)
        if root is None or root.project_id != project.id:
            raise projects_exception("File entry not found.", status.HTTP_404_NOT_FOUND)
        if root.type != "file":
            raise projects_exception(
                "The compile root must be a file.", status.HTTP_400_BAD_REQUEST
            )

    # Rejected here rather than after a worker has already fetched the project
    # and filled a disk with it.
    ensure_project_fits(session, project.id, settings)

    job = create_job(session, project, root_file_id=root_file_id)
    return ApiResponseBuilder.success(data=_serialize(job), message="Compile queued.")


@router.get("/{project_id}/compile/{job_id}", response_model=ApiResponse)
def get_compile(
    project_id: int,
    job_id: int,
    current_user: CurrentUser,
    session: DbSession,
) -> ApiResponse:
    project = get_project_for_user(session, current_user, project_id)
    job = get_job_for_project(session, project, job_id)
    return ApiResponseBuilder.success(data=_serialize(job), message="Compile status.")


@router.get("/{project_id}/compile/{job_id}/log", response_model=ApiResponse)
def get_compile_log(
    project_id: int,
    job_id: int,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> ApiResponse:
    project = get_project_for_user(session, current_user, project_id)
    job = get_job_for_project(session, project, job_id)

    log_text = ""
    if job.log_path:
        path = output_path(settings, job.log_path)
        if path.exists():
            log_text = path.read_text(encoding="utf-8", errors="replace")

    # Parsed on read rather than stored: the log is the source of truth, and
    # improving the parser should improve old jobs too, without a migration.
    source_dir = Path(settings.compile_work_dir) / str(job.project_id)
    diagnostics = parse_log(log_text, source_dir if source_dir.exists() else None)

    return ApiResponseBuilder.success(
        data=CompileLogResponse(
            job_id=job.id,
            status=job.status,
            error_count=job.error_count,
            errors=[
                CompileDiagnostic(**d.as_dict())
                for d in diagnostics
                if d.severity == SEVERITY_ERROR
            ],
            warnings=[
                CompileDiagnostic(**d.as_dict())
                for d in diagnostics
                if d.severity != SEVERITY_ERROR
            ],
            log=log_text,
        ).model_dump(),
        message="Compile log.",
    )


# The only endpoint that does NOT return the {success, message, data} envelope.
# A PDF is bytes: wrapping it in JSON would mean base64, a third more payload,
# and a decode step before pdf.js can open it.
@router.get("/{project_id}/compile/{job_id}/pdf", response_class=FileResponse)
def get_compile_pdf(
    project_id: int,
    job_id: int,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> FileResponse:
    project = get_project_for_user(session, current_user, project_id)
    job = get_job_for_project(session, project, job_id)

    if not job.pdf_path:
        raise projects_exception(
            "This compile produced no PDF.", status.HTTP_404_NOT_FOUND
        )
    path: Path = output_path(settings, job.pdf_path)
    if not path.exists():
        raise projects_exception("Compile output is no longer available.", status.HTTP_404_NOT_FOUND)

    return FileResponse(path, media_type="application/pdf", filename=path.name)


@router.delete("/{project_id}/compile/{job_id}", response_model=ApiResponse)
def delete_compile(
    project_id: int,
    job_id: int,
    current_user: CurrentUser,
    session: DbSession,
) -> ApiResponse:
    project = get_project_for_user(session, current_user, project_id)
    job = get_job_for_project(session, project, job_id)
    job = cancel_job(session, job)
    return ApiResponseBuilder.success(data=_serialize(job), message="Compile cancelled.")


# Operational metrics. Not project-scoped, so a separate router.
#
# Behind authentication because nothing scrapes it yet. A real metrics collector
# wants an unauthenticated or token-authenticated endpoint; that is a deployment
# decision rather than something to guess at now.
ops_router = APIRouter(prefix="/ops", tags=["ops"])


@ops_router.get("/compile-queue", response_model=ApiResponse)
def get_compile_queue(current_user: CurrentUser, session: DbSession) -> ApiResponse:
    """Queue depth, oldest wait, recent throughput, and snapshot volume.

    Queue depth backing up is the signal to add compile workers. Snapshot volume
    is the number ADR 0007 defers acting on until it matters.
    """
    return ApiResponseBuilder.success(
        data={**queue_stats(session), **snapshot_storage_stats(session)},
        message="Compile queue status.",
    )
