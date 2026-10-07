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
    # SQLAlchemy defaults to pool_size=5 + max_overflow=10 = 15 connections, which
    # is the real ceiling: 40 anyio threads serve sync handlers, and compile
    # workers poll the same database. 20+20 matches the threadpool.
    db_pool_size: int = Field(default=20, alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=20, alias="DB_MAX_OVERFLOW")
    db_pool_pre_ping: bool = Field(default=True, alias="DB_POOL_PRE_PING")
    s3_bucket_name: str = Field(alias="S3_BUCKET_NAME")
    s3_region: str = Field(alias="S3_REGION")
    s3_presigned_url_expires_seconds: int = Field(
        default=900,
        alias="S3_PRESIGNED_URL_EXPIRES_SECONDS",
    )

    # Compilation. The work directory is kept PER PROJECT, not per job: latexmk's
    # .aux/.fdb_latexmk surviving between compiles is what makes a rebuild ~7s
    # instead of ~36s. See docs/decisions/0010-one-compile-profile.md.
    compile_script: str = Field(
        default=str(REPO_ROOT / "compile" / "compile.sh"),
        alias="COMPILE_SCRIPT",
    )
    tex_image: str = Field(default="lumen-tex:latest", alias="TEX_IMAGE")
    compile_work_dir: str = Field(
        default=str(BACKEND_DIR / ".compile" / "work"),
        alias="COMPILE_WORK_DIR",
    )
    compile_output_dir: str = Field(
        default=str(BACKEND_DIR / ".compile" / "output"),
        alias="COMPILE_OUTPUT_DIR",
    )
    compile_cache_dir: str = Field(
        default=str(BACKEND_DIR / ".compile" / "texcache"),
        alias="COMPILE_CACHE_DIR",
    )
    compile_timeout_seconds: int = Field(default=300, alias="COMPILE_TIMEOUT_SECONDS")
    compile_cpus: str = Field(default="1", alias="COMPILE_CPUS")
    compile_memory: str = Field(default="1g", alias="COMPILE_MEMORY")
    compile_poll_seconds: float = Field(default=2.0, alias="COMPILE_POLL_SECONDS")
    # no-new-privileges is required in production but breaks exec on Snap-installed
    # Docker, which cannot run this service anyway. Set empty only for local work
    # on such a host. See docs/plans/latex-compilation.md (M0).
    compile_security_opt: str = Field(
        default="--security-opt=no-new-privileges",
        alias="COMPILE_SECURITY_OPT",
    )
    
@lru_cache
def get_settings() -> Settings:
    return Settings()
