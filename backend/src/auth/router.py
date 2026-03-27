from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from src.auth.scheema import (SignupRequest, UserResponse)
from src.db.session import get_session
from src.auth.scheema import (
    LoginRequest,
    LogoutResponse,
    RefreshRequest,
    SignupRequest,
    TokenPair,
    UserResponse
)
from src.auth.service import login_user, refresh_user_tokens, register_user, revoke_refresh_token
from src.auth.dependencies import get_current_active_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, session: Session = Depends(get_session))-> UserResponse:
    user = register_user(session, payload)
    return UserResponse.model_validate(user)

@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, session: Session = Depends(get_session)) -> TokenPair:
    return login_user(session, payload)

@router.post("/refresh", response_model=TokenPair)
def refresh_tokens(payload: RefreshRequest, session: Session = Depends(get_session)) -> TokenPair:
    return refresh_user_tokens(session, payload)

@router.post("/logout", response_model=LogoutResponse)
def logout(payload: RefreshRequest, current_user = Depends(get_current_active_user), session: Session = Depends(get_session)):
    revoke_refresh_token(session, current_user, payload)
    return LogoutResponse(message="Successfully logged out.")

