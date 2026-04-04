from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from src.db.session import get_session
from src.auth.scheema import (
    LoginRequest,
    RefreshRequest,
    SignupRequest,
    UserResponse
)
from src.auth.service import login_user, refresh_user_tokens, register_user, revoke_refresh_token
from src.auth.dependencies import get_current_active_user
from src.core.api_response import ApiResponse, ApiResponseBuilder

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, session: Session = Depends(get_session)) -> ApiResponse:
    user = register_user(session, payload)
    return ApiResponseBuilder.success(
        message="Signup successful.",
        data=UserResponse.model_validate(user).model_dump(),
    )

@router.post("/login", response_model=ApiResponse)
def login(payload: LoginRequest, session: Session = Depends(get_session)) -> ApiResponse:
    tokens = login_user(session, payload)
    return ApiResponseBuilder.success(
        message="Login successful.",
        data=tokens.model_dump(),
    )

@router.post("/refresh", response_model=ApiResponse)
def refresh_tokens(payload: RefreshRequest, session: Session = Depends(get_session)) -> ApiResponse:
    tokens = refresh_user_tokens(session, payload)
    return ApiResponseBuilder.success(
        message="Token refresh successful.",
        data=tokens.model_dump(),
    )

@router.post("/logout", response_model=ApiResponse)
def logout(payload: RefreshRequest, current_user = Depends(get_current_active_user), session: Session = Depends(get_session)) -> ApiResponse:
    revoke_refresh_token(session, current_user, payload)
    return ApiResponseBuilder.success(message="Logout successful.")

