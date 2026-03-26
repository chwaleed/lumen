from fastapi import HTTPException, status
from sqlmodel import Session, select

from src.auth.models import RefreshToken, User
from src.auth.schemas import LoginRequest, RefreshRequest, SignupRequest, TokenPair
from src.auth.utils import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from src.core.security import REFRESH_TOKEN_TYPE, ensure_utc, utc_now


def _auth_exception(
    detail: str,
    *,
    status_code: int = status.HTTP_401_UNAUTHORIZED,
) -> HTTPException:
    headers = {"WWW-Authenticate": "Bearer"} if status_code == status.HTTP_401_UNAUTHORIZED else None
    return HTTPException(status_code=status_code, detail=detail, headers=headers)


def _get_user_by_email(session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email.lower())
    return session.exec(statement).first()


def _decode_token_or_raise(token: str) -> dict:
    try:
        return decode_token(token)
    except TokenError as exc:
        raise _auth_exception(exc.detail) from exc


def _issue_token_pair(session: Session, user: User) -> TokenPair:
    access_token, expires_in = create_access_token(user.id)
    refresh_token, jti, expires_at = create_refresh_token(user.id)

    refresh_record = RefreshToken(
        user_id=user.id,
        jti=jti,
        token_hash=hash_refresh_token(refresh_token),
        expires_at=expires_at,
    )
    session.add(refresh_record)
    session.commit()

    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
    )


def register_user(session: Session, payload: SignupRequest) -> User:
    existing_user = _get_user_by_email(session, str(payload.email))
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

    user = User(
        email=str(payload.email).lower(),
        password_hash=hash_password(payload.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def login_user(session: Session, payload: LoginRequest) -> TokenPair:
    user = _get_user_by_email(session, str(payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise _auth_exception("Invalid email or password.")

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    return _issue_token_pair(session, user)


def refresh_user_tokens(session: Session, payload: RefreshRequest) -> TokenPair:
    token_payload = _decode_token_or_raise(payload.refresh_token)

    if token_payload.get("type") != REFRESH_TOKEN_TYPE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Refresh token required for this endpoint.",
        )

    user_id = token_payload.get("sub")
    jti = token_payload.get("jti")

    if not user_id or not jti:
        raise _auth_exception("Token is invalid.")

    refresh_record = session.exec(
        select(RefreshToken).where(RefreshToken.jti == jti),
    ).first()

    if refresh_record is None or refresh_record.revoked_at is not None:
        raise _auth_exception("Refresh token is revoked or no longer valid.")

    if ensure_utc(refresh_record.expires_at) <= utc_now():
        raise _auth_exception("Refresh token has expired.")

    if refresh_record.token_hash != hash_refresh_token(payload.refresh_token):
        raise _auth_exception("Refresh token is invalid.")

    user = session.get(User, int(user_id))
    if user is None:
        raise _auth_exception("User account was not found.")

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    refresh_record.revoked_at = utc_now()
    session.add(refresh_record)
    session.commit()

    return _issue_token_pair(session, user)


def revoke_refresh_token(session: Session, current_user: User, payload: RefreshRequest) -> None:
    token_payload = _decode_token_or_raise(payload.refresh_token)

    if token_payload.get("type") != REFRESH_TOKEN_TYPE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Refresh token required for this endpoint.",
        )

    token_user_id = token_payload.get("sub")
    jti = token_payload.get("jti")
    if not token_user_id or not jti:
        raise _auth_exception("Token is invalid.")

    if int(token_user_id) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot revoke another user's refresh token.",
        )

    refresh_record = session.exec(
        select(RefreshToken).where(RefreshToken.jti == jti),
    ).first()

    if refresh_record is None:
        raise _auth_exception("Refresh token was not found.")

    if refresh_record.token_hash != hash_refresh_token(payload.refresh_token):
        raise _auth_exception("Refresh token is invalid.")

    if refresh_record.revoked_at is None:
        refresh_record.revoked_at = utc_now()
        session.add(refresh_record)
        session.commit()
