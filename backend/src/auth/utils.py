import hashlib
from datetime import timedelta
from uuid import uuid4

import bcrypt
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError

from src.core.config import Settings, get_settings
from src.core.security import ACCESS_TOKEN_TYPE, REFRESH_TOKEN_TYPE, utc_now


class TokenError(Exception):
    def __init__(self, detail: str, *, expired: bool = False) -> None:
        self.detail = detail
        self.expired = expired
        super().__init__(detail)


def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _encode_token(payload: dict, settings: Settings) -> str:
    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def create_access_token(user_id: int, settings: Settings | None = None) -> tuple[str, int]:
    settings = settings or get_settings()
    expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    expires_at = utc_now() + expires_delta
    payload = {
        "sub": str(user_id),
        "type": ACCESS_TOKEN_TYPE,
        "exp": expires_at,
        "iat": utc_now(),
    }
    return _encode_token(payload, settings), int(expires_delta.total_seconds())


def create_refresh_token(
    user_id: int,
    settings: Settings | None = None,
) -> tuple[str, str, object]:
    settings = settings or get_settings()
    expires_at = utc_now() + timedelta(days=settings.refresh_token_expire_days)
    jti = uuid4().hex
    payload = {
        "sub": str(user_id),
        "type": REFRESH_TOKEN_TYPE,
        "jti": jti,
        "exp": expires_at,
        "iat": utc_now(),
    }
    token = _encode_token(payload, settings)
    return token, jti, expires_at


def decode_token(token: str, settings: Settings | None = None) -> dict:
    settings = settings or get_settings()
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except ExpiredSignatureError as exc:
        raise TokenError("Token has expired.", expired=True) from exc
    except InvalidTokenError as exc:
        raise TokenError("Token is invalid.") from exc
