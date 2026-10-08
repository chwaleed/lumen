import zipfile
from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.core.config import get_settings
from src.db.session import _engines
from src.main import create_app


@pytest.fixture()
def api(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    database_url = f"sqlite:///{(tmp_path / 'archives-api.db').as_posix()}"
    monkeypatch.setenv("POSTGRES_CONNECTION_STRING", database_url)
    monkeypatch.setenv("SENTRY_DSN", "")
    monkeypatch.setenv("S3_BUCKET_NAME", "test-bucket")
    monkeypatch.setenv("S3_REGION", "us-east-1")
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
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['data']['access_token']}"}


def _new_project(client: TestClient, headers: dict[str, str], name: str = "P") -> int:
    response = client.post(
        "/projects", json={"name": name, "template_id": "blank"}, headers=headers
    )
    assert response.status_code in (200, 201), response.text
    return response.json()["data"]["id"]


def _names(payload: bytes) -> list[str]:
    with zipfile.ZipFile(BytesIO(payload)) as archive:
        return sorted(archive.namelist())


class TestExportProject:
    def test_returns_a_zip_of_the_project(self, api: TestClient) -> None:
        h = _auth(api, "export@example.com")
        project_id = _new_project(api, h, name="Thesis")

        response = api.get(f"/projects/{project_id}/export", headers=h)

        assert response.status_code == 200, response.text
        assert response.headers["content-type"] == "application/zip"
        assert _names(response.content) == ["main.tex"]

    def test_names_the_download_after_the_project(self, api: TestClient) -> None:
        h = _auth(api, "name@example.com")
        project_id = _new_project(api, h, name="My Thesis")

        response = api.get(f"/projects/{project_id}/export", headers=h)

        disposition = response.headers["content-disposition"]
        assert disposition == 'attachment; filename="My Thesis.zip"'

    def test_the_zip_holds_the_file_contents(self, api: TestClient) -> None:
        h = _auth(api, "content@example.com")
        project_id = _new_project(api, h)

        response = api.get(f"/projects/{project_id}/export", headers=h)

        with zipfile.ZipFile(BytesIO(response.content)) as archive:
            assert b"\\documentclass" in archive.read("main.tex")

    def test_includes_files_added_after_creation(self, api: TestClient) -> None:
        h = _auth(api, "added@example.com")
        project_id = _new_project(api, h)

        folder = api.post(
            f"/projects/{project_id}/files",
            json={"name": "chapters", "type": "folder"},
            headers=h,
        ).json()["data"]
        created = api.post(
            f"/projects/{project_id}/files",
            json={"name": "intro.tex", "type": "file", "parent_id": folder["id"]},
            headers=h,
        ).json()["data"]
        api.post(
            f"/projects/{project_id}/files/{created['id']}/snapshots",
            json={"base_version": None, "changes": [
                {"range_offset": 0, "range_length": 0, "text": "Chapter one"}
            ]},
            headers=h,
        )

        response = api.get(f"/projects/{project_id}/export", headers=h)

        assert _names(response.content) == ["chapters/intro.tex", "main.tex"]
        with zipfile.ZipFile(BytesIO(response.content)) as archive:
            assert archive.read("chapters/intro.tex") == b"Chapter one"

    def test_requires_authentication(self, api: TestClient) -> None:
        h = _auth(api, "owner@example.com")
        project_id = _new_project(api, h)

        response = api.get(f"/projects/{project_id}/export")

        assert response.status_code == 401, response.text

    def test_another_users_project_is_404(self, api: TestClient) -> None:
        owner = _auth(api, "mine@example.com")
        project_id = _new_project(api, owner)
        stranger = _auth(api, "stranger@example.com")

        response = api.get(f"/projects/{project_id}/export", headers=stranger)

        # 404 rather than 403: see docs/decisions/0003.
        assert response.status_code == 404, response.text

    def test_a_missing_project_is_404(self, api: TestClient) -> None:
        h = _auth(api, "missing@example.com")

        response = api.get("/projects/999999/export", headers=h)

        assert response.status_code == 404, response.text
