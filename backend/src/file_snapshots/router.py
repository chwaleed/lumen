from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from src.auth.dependencies import get_current_active_user
from src.auth.models import User
from src.core.api_response import ApiResponse, ApiResponseBuilder
from src.db.session import get_session
from src.file_entries.models import FileEntry
from src.file_snapshots.schemas import FileSnapshotCreateRequest, FileSnapshotResponse
from src.file_snapshots.service import create_file_snapshot_from_monaco_changes
from src.shared.project_access import get_project_for_user, projects_exception, touch_project

router = APIRouter(prefix="/projects", tags=["projects"])

CurrentUser = Annotated[User, Depends(get_current_active_user)]
DbSession = Annotated[Session, Depends(get_session)]


@router.post("/{project_id}/files/{file_entry_id}/snapshots", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def post_file_snapshot(
    project_id: int,
    file_entry_id: int,
    payload: FileSnapshotCreateRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> ApiResponse:
    project = get_project_for_user(session, current_user, project_id)
    file_entry = session.get(FileEntry, file_entry_id)

    if file_entry is None or file_entry.project_id != project.id:
        raise projects_exception("File entry not found.", status.HTTP_404_NOT_FOUND)
    if file_entry.type != "file":
        raise projects_exception("Snapshots can only be created for files.", status.HTTP_400_BAD_REQUEST)

    snapshot = create_file_snapshot_from_monaco_changes(
        session,
        file_entry_id,
        payload.changes,
        base_version=payload.base_version,
    )
    touch_project(session, project)
    session.commit()
    session.refresh(snapshot)

    return ApiResponseBuilder.success(
        data=FileSnapshotResponse.model_validate(snapshot).model_dump(),
        message="Snapshot created successfully.",
    )
