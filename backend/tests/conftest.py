"""Shared fixtures.

Every test gets its own throwaway SQLite database under tmp_path, so tests never
share state and can run in any order.
"""

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from src.core.config import Settings, get_settings
from src.db.session import _engines, get_engine, init_db
from src.main import create_app


TEST_S3_BUCKET = "test-bucket"
TEST_S3_REGION = "us-east-1"


@pytest.fixture(autouse=True)
def _neutralise_object_storage(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep the developer's own .env out of what the suite asserts.

    Settings reads the repository .env, so once that pointed at the local
    s3proxy every assertion about an AWS URL started failing on a working tree
    and passing in CI. Autouse rather than part of the `settings` fixture
    because tests also construct Settings directly, and an explicit environment
    variable outranks the .env file. Init keyword arguments still outrank this,
    so a test can opt back in to a custom endpoint by passing one.
    """
    monkeypatch.setenv("S3_ENDPOINT_URL", "")
    monkeypatch.setenv("S3_PUBLIC_ENDPOINT_URL", "")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")


@pytest.fixture()
def database_url(tmp_path: Path) -> Iterator[str]:
    """An isolated SQLite URL, with its engine disposed afterwards."""
    url = f"sqlite:///{(tmp_path / 'test.db').as_posix()}"

    yield url

    engine = _engines.pop(url, None)
    if engine is not None:
        engine.dispose()


@pytest.fixture()
def settings(database_url: str, monkeypatch: pytest.MonkeyPatch) -> Iterator[Settings]:
    """Settings pointed at the throwaway database, with Sentry and S3 neutralised."""
    monkeypatch.setenv("POSTGRES_CONNECTION_STRING", database_url)
    monkeypatch.setenv("SENTRY_DSN", "")
    monkeypatch.setenv("S3_BUCKET_NAME", TEST_S3_BUCKET)
    monkeypatch.setenv("S3_REGION", TEST_S3_REGION)
    get_settings.cache_clear()

    yield get_settings()

    get_settings.cache_clear()


@pytest.fixture()
def migrated_settings(settings: Settings) -> Settings:
    """Settings whose database has the full migration history applied."""
    init_db(settings)
    return settings


@pytest.fixture()
def session(migrated_settings: Settings) -> Iterator[Session]:
    """A session against a migrated database, for testing services directly."""
    with Session(get_engine(migrated_settings)) as open_session:
        yield open_session


@pytest.fixture()
def client(settings: Settings) -> Iterator[TestClient]:
    """An API client; app startup runs the migrations."""
    with TestClient(create_app(init_db_on_startup=True)) as test_client:
        yield test_client


def register(client: TestClient, email: str = "user@example.com", password: str = "password123") -> dict[str, str]:
    """Signs a user up and returns Authorization headers for them."""
    client.post("/auth/signup", json={"name": "Test User", "email": email, "password": password})
    response = client.post("/auth/login", json={"email": email, "password": password})
    access_token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture()
def auth_headers(client: TestClient) -> dict[str, str]:
    return register(client)
