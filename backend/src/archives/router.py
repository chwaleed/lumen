from pathlib import PurePath
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from sqlmodel import Session

from src.archives.schemas import ProjectImportResponse
from src.archives.service import (
    ArchiveError,
    archive_file_name,
    build_project_archive,
    import_project,
)
from src.auth.dependencies import get_current_active_user
from src.auth.models import User
from src.core.api_response import ApiResponse, ApiResponseBuilder
from src.core.config import Settings, get_settings
from src.db.session import get_session
from src.projects.schemas import ProjectSummaryResponse
from src.shared.project_access import get_project_for_user, projects_exception

router = APIRouter(prefix="/projects", tags=["archives"])

CurrentUser = Annotated[User, Depends(get_current_active_user)]
DbSession = Annotated[Session, Depends(get_session)]
AppSettings = Annotated[Settings, Depends(get_settings)]


# Like the compiled PDF, this returns bytes rather than the
# {success, message, data} envelope: base64 in JSON would cost a third more
# payload for a file the browser is only going to save.
@router.get("/{project_id}/export")
def get_project_export(
    project_id: int,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> Response:
    project = get_project_for_user(session, current_user, project_id)
    payload = build_project_archive(session, project, settings)
    file_name = archive_file_name(project.name)

    # attachment, unlike the PDF: there is nothing to preview, and without it a
    # browser would render the bytes as text.
    return Response(
        content=payload,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )


def _project_name_from(file_name: str | None) -> str:
    """The zip's own name, minus the extension, is what the user expects."""
    stem = PurePath(file_name or "").stem.strip()
    return stem or "Imported project"


# The zip arrives as the raw request body rather than as multipart form data.
# Multipart would mean adding python-multipart for a single endpoint, and a
# browser can PUT a File straight into fetch's body with no wrapper at all.
@router.post(
    "/import", response_model=ApiResponse, status_code=status.HTTP_201_CREATED
)
async def post_project_import(
    request: Request,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
    file_name: str | None = None,
) -> ApiResponse:
    """Create a project from an uploaded zip."""
    payload = await request.body()
    if len(payload) > settings.archive_max_bytes:
        raise projects_exception(
            f"The archive is larger than "
            f"{settings.archive_max_bytes // (1024 * 1024)} MB.",
            status.HTTP_413_CONTENT_TOO_LARGE,
        )

    try:
        result = import_project(
            session, current_user, _project_name_from(file_name), payload, settings
        )
    except ArchiveError as error:
        # Every refusal in the archive reader is about the user's file, so they
        # are all 400s with the reader's own message.
        raise projects_exception(str(error), status.HTTP_400_BAD_REQUEST) from error

    return ApiResponseBuilder.success(
        data=ProjectImportResponse(
            project=ProjectSummaryResponse.model_validate(result.project),
            imported=result.imported,
            skipped=result.skipped,
        ).model_dump(),
        message=f"Imported {len(result.imported)} file(s).",
    )
