from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.core.config import get_settings
from src.db.session import _engines
from src.main import create_app


@pytest.fixture()
def auth_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    db_path = tmp_path / "auth-api.db"
    database_url = f"sqlite:///{db_path.as_posix()}"

    monkeypatch.setenv("POSTGRES_CONNECTION_STRING", database_url)
    monkeypatch.setenv("SENTRY_DSN", "")
    get_settings.cache_clear()

    app = create_app(init_db_on_startup=True)

    with TestClient(app) as client:
        yield client

    engine = _engines.pop(database_url, None)
    if engine is not None:
        engine.dispose()
    get_settings.cache_clear()


def test_auth_endpoints_support_frontend_session_flow(auth_client: TestClient) -> None:
    signup_response = auth_client.post(
        "/auth/signup",
        json={
            "name": "Auth Flow User",
            "email": "auth-flow@example.com",
            "password": "password123",
        },
    )

    assert signup_response.status_code == 201
    assert signup_response.json()["success"] is True
    assert signup_response.json()["data"]["email"] == "auth-flow@example.com"

    login_response = auth_client.post(
        "/auth/login",
        json={
            "email": "auth-flow@example.com",
            "password": "password123",
        },
    )

    assert login_response.status_code == 200
    login_payload = login_response.json()
    assert login_payload["success"] is True
    assert login_payload["data"]["access_token"]
    assert login_payload["data"]["refresh_token"]
    assert login_payload["data"]["token_type"] == "bearer"
    assert login_payload["data"]["expires_in"] > 0

    refresh_response = auth_client.post(
        "/auth/refresh",
        json={"refresh_token": login_payload["data"]["refresh_token"]},
    )

    assert refresh_response.status_code == 200
    refresh_payload = refresh_response.json()
    assert refresh_payload["success"] is True
    assert refresh_payload["data"]["access_token"]
    assert refresh_payload["data"]["refresh_token"]
    assert refresh_payload["data"]["refresh_token"] != login_payload["data"]["refresh_token"]

    replay_refresh_response = auth_client.post(
        "/auth/refresh",
        json={"refresh_token": login_payload["data"]["refresh_token"]},
    )

    assert replay_refresh_response.status_code == 401
    assert replay_refresh_response.json()["message"] == "Refresh token is revoked or no longer valid."

    logout_response = auth_client.post(
        "/auth/logout",
        json={"refresh_token": refresh_payload["data"]["refresh_token"]},
        headers={"Authorization": f"Bearer {refresh_payload['data']['access_token']}"},
    )

    assert logout_response.status_code == 200
    assert logout_response.json()["success"] is True

    post_logout_refresh_response = auth_client.post(
        "/auth/refresh",
        json={"refresh_token": refresh_payload["data"]["refresh_token"]},
    )

    assert post_logout_refresh_response.status_code == 401
    assert post_logout_refresh_response.json()["message"] == "Refresh token is revoked or no longer valid."


def test_login_rejects_invalid_credentials(auth_client: TestClient) -> None:
    auth_client.post(
        "/auth/signup",
        json={
            "name": "Invalid Login User",
            "email": "invalid-login@example.com",
            "password": "password123",
        },
    )

    response = auth_client.post(
        "/auth/login",
        json={
            "email": "invalid-login@example.com",
            "password": "wrong-password",
        },
    )

    assert response.status_code == 401
    assert response.json()["message"] == "Invalid email or password."
