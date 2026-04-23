from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session

from src.auth.dependencies import get_current_active_user
from src.auth.models import User
from src.core.api_response import ApiResponse, ApiResponseBuilder
from src.core.config import Settings, get_settings
from src.db.session import get_session
from src.uploads.schemas import PresignedUploadRequest
from src.uploads.service import create_presigned_upload

router = APIRouter(prefix="/uploads", tags=["uploads"])

CurrentUser = Annotated[User, Depends(get_current_active_user)]
DbSession = Annotated[Session, Depends(get_session)]
AppSettings = Annotated[Settings, Depends(get_settings)]


@router.post("/presigned-url", response_model=ApiResponse)
def post_presigned_upload_url(
    payload: PresignedUploadRequest,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> ApiResponse:
    presigned_upload = create_presigned_upload(session, current_user, settings, payload)
    return ApiResponseBuilder.success(
        data=presigned_upload.model_dump(),
        message="Upload URL created successfully.",
    )
