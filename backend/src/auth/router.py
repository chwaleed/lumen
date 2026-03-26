from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from src.auth.dependencies import get_current_active_user
from src.auth.models import User
from src.auth.schemas import (
    LoginRequest,
    LogoutResponse,
    RefreshRequest,
    SignupRequest,
    TokenPair,
    UserResponse,
)
from src.auth.service import login_user, refresh_user_tokens, register_user, revoke_refresh_token
from src.db.session import get_session

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def signup(payload: SignupRequest, session: Session = Depends(get_session)) -> UserResponse:
    user = register_user(session, payload)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, session: Session = Depends(get_session)) -> TokenPair:
    return login_user(session, payload)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, session: Session = Depends(get_session)) -> TokenPair:
    return refresh_user_tokens(session, payload)


@router.post("/logout", response_model=LogoutResponse)
def logout(
    payload: RefreshRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> LogoutResponse:
    revoke_refresh_token(session, current_user, payload)
    return LogoutResponse(message="Logged out successfully.")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)
