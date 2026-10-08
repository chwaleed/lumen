"""Serving a file's bytes through the API rather than the object store."""
from pathlib import Path

import boto3
import pytest
from fastapi.testclient import TestClient
from moto import mock_aws

from src.core.config import get_settings
from src.db.session import _engines
from src.main import create_app

BUCKET = "test-bucket"
REGION = "us-east-1"


@pytest.fixture()
def api(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    database_url = f"sqlite:///{(tmp_path / 'raw-api.db').as_posix()}"
    monkeypatch.setenv("POSTGRES_CONNECTION_STRING", database_url)
    monkeypatch.setenv("SENTRY_DSN", "")
    monkeypatch.setenv("S3_BUCKET_NAME", BUCKET)
    monkeypatch.setenv("S3_REGION", REGION)
    get_settings.cache_clear()

    app = create_app(init_db_on_startup=True)
    with TestClient(app) as client:
        yield client

    engine = _engines.pop(database_url, None)
    if engine is not None:
        engine.dispose()
    get_settings.cache_clear()


def _auth(client: TestClient, email: str) -> dict[str, str]:
    client.post("/auth/signup", json={"name": "U", "email": email, "password": "password123"})
    response = client.post("/auth/login", json={"email": email, "password": "password123"})
    return {"Authorization": f"Bearer {response.json()['data']['access_token']}"}


def _new_project(client: TestClient, headers: dict[str, str]) -> int:
    response = client.post(
        "/projects", json={"name": "P", "template_id": "blank"}, headers=headers
    )
    return response.json()["data"]["id"]


class TestRawFile:
    def test_serves_an_editable_file_as_its_text(self, api: TestClient) -> None:
        h = _auth(api, "raw-text@example.com")
        project_id = _new_project(api, h)
        file_id = api.get(f"/projects/{project_id}", headers=h).json()["data"]["files"][0]["id"]

        response = api.get(f"/projects/{project_id}/files/{file_id}/raw", headers=h)

        assert response.status_code == 200, response.text
        assert b"documentclass" in response.content

    @mock_aws
    def test_streams_an_uploaded_asset_from_storage(self, api: TestClient) -> None:
        boto3.client("s3", region_name=REGION).create_bucket(Bucket=BUCKET)
        png = b"\x89PNG\r\n\x1a\n" + b"pretend pixels"
        h = _auth(api, "raw-asset@example.com")
        project_id = _new_project(api, h)

        boto3.client("s3", region_name=REGION).put_object(
            Bucket=BUCKET, Key=f"uploads/{project_id}/fig.png", Body=png
        )
        created = api.post(
            f"/projects/{project_id}/files",
            json={
                "name": "fig.png",
                "type": "file",
                "mime_type": "image/png",
                "file_url": f"https://{BUCKET}.s3.amazonaws.com/uploads/{project_id}/fig.png",
            },
            headers=h,
        ).json()["data"]

        response = api.get(f"/projects/{project_id}/files/{created['id']}/raw", headers=h)

        assert response.status_code == 200, response.text
        assert response.content == png
        assert response.headers["content-type"].startswith("image/png")
        # inline: this feeds an <img>, it is not a download.
        assert response.headers["content-disposition"].startswith("inline")

    @mock_aws
    def test_a_missing_object_is_502_naming_the_file(self, api: TestClient) -> None:
        # The bucket exists but the object does not -- an upload that never
        # finished. The viewer has to be able to say which file failed, and a
        # 500 would read as a bug in us rather than a gap in storage.
        boto3.client("s3", region_name=REGION).create_bucket(Bucket=BUCKET)
        h = _auth(api, "raw-missing@example.com")
        project_id = _new_project(api, h)
        created = api.post(
            f"/projects/{project_id}/files",
            json={
                "name": "ghost.png",
                "type": "file",
                "mime_type": "image/png",
                "file_url": f"https://{BUCKET}.s3.amazonaws.com/uploads/{project_id}/ghost.png",
            },
            headers=h,
        ).json()["data"]

        response = api.get(f"/projects/{project_id}/files/{created['id']}/raw", headers=h)

        assert response.status_code == 502, response.text
        assert "ghost.png" in response.json()["message"]

    def test_requires_authentication(self, api: TestClient) -> None:
        h = _auth(api, "raw-owner@example.com")
        project_id = _new_project(api, h)
        file_id = api.get(f"/projects/{project_id}", headers=h).json()["data"]["files"][0]["id"]

        assert api.get(f"/projects/{project_id}/files/{file_id}/raw").status_code == 401

    def test_another_users_file_is_404(self, api: TestClient) -> None:
        owner = _auth(api, "raw-mine@example.com")
        project_id = _new_project(api, owner)
        file_id = api.get(f"/projects/{project_id}", headers=owner).json()["data"]["files"][0]["id"]
        stranger = _auth(api, "raw-stranger@example.com")

        response = api.get(f"/projects/{project_id}/files/{file_id}/raw", headers=stranger)

        assert response.status_code == 404, response.text

    def test_a_file_from_another_project_is_404(self, api: TestClient) -> None:
        h = _auth(api, "raw-cross@example.com")
        first = _new_project(api, h)
        second = _new_project(api, h)
        file_id = api.get(f"/projects/{first}", headers=h).json()["data"]["files"][0]["id"]

        response = api.get(f"/projects/{second}/files/{file_id}/raw", headers=h)

        assert response.status_code == 404, response.text
