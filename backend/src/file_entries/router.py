from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from src.auth.dependencies import get_current_active_user
from src.auth.models import User
from src.core.api_response import ApiResponse, ApiResponseBuilder
from src.db.session import get_session
from src.file_entries.schemas import FileEntryCreateRequest, FileEntryResponse, FileEntryUpdateRequest
from src.file_entries.service import create_file_entry, delete_file_entry, update_file_entry

router = APIRouter(prefix="/projects", tags=["projects"])

CurrentUser = Annotated[User, Depends(get_current_active_user)]
DbSession = Annotated[Session, Depends(get_session)]


@router.post("/{project_id}/files", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def post_project_file(
    project_id: int,
    payload: FileEntryCreateRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> ApiResponse:
    file_entry = create_file_entry(session, current_user, project_id, payload)
    return ApiResponseBuilder.success(
        data=FileEntryResponse.model_validate(file_entry).model_dump(),
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
    return ApiResponseBuilder.success(
        data=FileEntryResponse.model_validate(file_entry).model_dump(),
        message="Folder renamed successfully." if file_entry.type == "folder" else "File renamed successfully.",
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
