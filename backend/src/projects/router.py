from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from src.auth.dependencies import get_current_active_user
from src.auth.models import User
from src.core.api_response import ApiResponse, ApiResponseBuilder
from src.db.session import get_session
from src.file_entries.service import serialize_file_entry
from src.projects.schemas import ProjectCreateRequest, ProjectDetailResponse, ProjectSummaryResponse, ProjectUpdateRequest
from src.projects.service import create_project, get_project_detail, list_projects, update_project

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
            files=[serialize_file_entry(session, file_entry) for file_entry in files],
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
