from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from src.auth.dependencies import get_current_active_user
from src.auth.models import User
from src.core.api_response import ApiResponse, ApiResponseBuilder
from src.db.session import get_session
from src.projects.schemas import (
    FileEntryCreateRequest,
    FileEntryResponse,
    ProjectCreateRequest,
    ProjectDetailResponse,
    ProjectSummaryResponse,
    ProjectUpdateRequest,
    FileEntryUpdateRequest,
)
from src.projects.service import (
    create_file_entry,
    create_project,
    delete_file_entry,
    get_project_detail,
    list_projects,
    update_file_entry,
    update_project,
)

router = APIRouter(prefix="/projects", tags=["projects"])

CurrentUser = Annotated[User, Depends(get_current_active_user)]
DbSession = Annotated[Session, Depends(get_session)]


@router.get("", response_model=ApiResponse)
def get_projects(current_user: CurrentUser, session: DbSession) -> ApiResponse:
    projects = list_projects(session, current_user)
    return ApiResponseBuilder.success(
        data=[ProjectSummaryResponse.model_validate(project).model_dump() for project in projects],
        message="Projects fetched successfully.",
    )


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def post_project(payload: ProjectCreateRequest, current_user: CurrentUser, session: DbSession) -> ApiResponse:
    project = create_project(session, current_user, payload)
    return ApiResponseBuilder.success(
        data=ProjectSummaryResponse.model_validate(project).model_dump(),
        message="Project created successfully.",
    )


@router.get("/{project_id}", response_model=ApiResponse)
def get_project(project_id: int, current_user: CurrentUser, session: DbSession) -> ApiResponse:
    project, files = get_project_detail(session, current_user, project_id)
    return ApiResponseBuilder.success(
        data=ProjectDetailResponse(
            **ProjectSummaryResponse.model_validate(project).model_dump(),
            files=[FileEntryResponse.model_validate(file_entry) for file_entry in files],
        ).model_dump(),
        message="Project fetched successfully.",
    )


@router.patch("/{project_id}", response_model=ApiResponse)
def patch_project(
    project_id: int,
    payload: ProjectUpdateRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> ApiResponse:
    project = update_project(session, current_user, project_id, payload)
    return ApiResponseBuilder.success(
        data=ProjectSummaryResponse.model_validate(project).model_dump(),
        message="Project renamed successfully.",
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
