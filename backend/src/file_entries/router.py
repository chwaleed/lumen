from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlmodel import Session

from src.auth.dependencies import get_current_active_user
from src.auth.models import User
from src.core.api_response import ApiResponse, ApiResponseBuilder
from src.core.config import Settings, get_settings
from src.db.session import get_session
from src.file_entries.models import FileEntry
from src.shared.project_access import get_project_for_user, projects_exception
from src.shared.project_files import ProjectFilesError, entry_bytes
from src.file_entries.schemas import FileEntryCreateRequest, FileEntryResponse, FileEntryUpdateRequest
from src.file_entries.service import create_file_entry, delete_file_entry, serialize_file_entry, update_file_entry

router = APIRouter(prefix="/projects", tags=["projects"])

CurrentUser = Annotated[User, Depends(get_current_active_user)]
DbSession = Annotated[Session, Depends(get_session)]
AppSettings = Annotated[Settings, Depends(get_settings)]


# Raw bytes, so the browser never needs the object store's URL.
#
# Entries used to carry an unsigned S3 URL that the <img> tag loaded directly.
# That only renders at all if the bucket is world-readable -- which hands every
# project's figures to anyone who learns the key -- and shows a broken image if
# it is not. Reading through here keeps the bucket private and the check on us.
@router.get("/{project_id}/files/{file_entry_id}/raw")
def get_project_file_raw(
    project_id: int,
    file_entry_id: int,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> Response:
    project = get_project_for_user(session, current_user, project_id)
    entry = session.get(FileEntry, file_entry_id)
    if entry is None or entry.project_id != project.id or entry.type != "file":
        raise projects_exception("File not found.", status.HTTP_404_NOT_FOUND)

    try:
        payload = entry_bytes(session, entry, settings)
    except ProjectFilesError as error:
        raise projects_exception(str(error), status.HTTP_502_BAD_GATEWAY) from error
    except Exception as error:  # noqa: BLE001 - the store is a remote system
        # A missing object or an unreachable bucket is not a 500 on our side,
        # and the viewer needs to be able to say which file failed.
        raise projects_exception(
            f"{entry.name} could not be read from storage.",
            status.HTTP_502_BAD_GATEWAY,
        ) from error

    return Response(
        content=payload,
        media_type=entry.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'inline; filename="{entry.name}"',
            # Private and short: an uploaded asset can be replaced under the
            # same id, and a stale figure is worse than a second request.
            "Cache-Control": "private, max-age=60",
        },
    )


@router.post("/{project_id}/files", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def post_project_file(
    project_id: int,
    payload: FileEntryCreateRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> ApiResponse:
    file_entry = create_file_entry(session, current_user, project_id, payload)
    return ApiResponseBuilder.success(
        data=serialize_file_entry(session, file_entry).model_dump(),
        message="File created successfully." if payload.type == "file" else "Folder created successfully.",
    )


@router.patch("/{project_id}/files/{file_entry_id}", response_model=ApiResponse)
def patch_project_file(
    project_id: int,
    file_entry_id: int,
    payload: FileEntryUpdateRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> ApiResponse:
    file_entry = update_file_entry(session, current_user, project_id, file_entry_id, payload)
    message = (
        "Folder renamed successfully."
        if payload.name is not None and file_entry.type == "folder"
        else "File renamed successfully."
        if payload.name is not None
        else "Entry moved successfully."
    )
    return ApiResponseBuilder.success(
        data=serialize_file_entry(session, file_entry).model_dump(),
        message=message,
    )


@router.delete("/{project_id}/files/{file_entry_id}", response_model=ApiResponse)
def remove_project_file(
    project_id: int,
    file_entry_id: int,
    current_user: CurrentUser,
    session: DbSession,
) -> ApiResponse:
    delete_file_entry(session, current_user, project_id, file_entry_id)
    return ApiResponseBuilder.success(message="Entry deleted successfully.")
