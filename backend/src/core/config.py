from functools import lru_cache

from pathlib import Path

from pydantic import  Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR / ".env", REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )
    database_url: str = Field(
        default="sqlite:///./lumen.db",
        alias="POSTGRES_CONNECTION_STRING",
    )
    jwt_secret_key: str = Field(
        default="change-me-please-use-a-32-char-secret",
        alias="JWT_SECRET_KEY",
    )
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=15,
        alias="ACCESS_TOKEN_EXPIRE_MINUTES",
    )
    refresh_token_expire_days: int = Field(
        default=7,
        alias="REFRESH_TOKEN_EXPIRE_DAYS",
    )
    sentry_dsn: str | None = Field(default=None, alias="SENTRY_DSN")
    sentry_environment: str = Field(default="development", alias="SENTRY_ENVIRONMENT")
    sentry_traces_sample_rate: float = Field(
        default=1.0,
        alias="SENTRY_TRACES_SAMPLE_RATE",
    )
    sentry_send_default_pii: bool = Field(
        default=True,
        alias="SENTRY_SEND_DEFAULT_PII",
    )
    s3_bucket_name: str = Field(default="texai-bucket", alias="S3_BUCKET_NAME")
    s3_presigned_url_expires_seconds: int = Field(
        default=900,
        alias="S3_PRESIGNED_URL_EXPIRES_SECONDS",
    )
    
@lru_cache
def get_settings() -> Settings:
    return Settings()
