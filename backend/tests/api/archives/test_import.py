import zipfile
from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.core.config import get_settings
from src.db.session import _engines
from src.main import create_app

ZIP_HEADERS = {"Content-Type": "application/zip"}


@pytest.fixture()
def api(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    database_url = f"sqlite:///{(tmp_path / 'import-api.db').as_posix()}"
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


def make_zip(files: dict[str, bytes | str]) -> bytes:
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    return buffer.getvalue()


class TestImportProject:
    def test_creates_a_project_the_user_can_open(self, api: TestClient) -> None:
        h = _auth(api, "import@example.com")
        payload = make_zip({"main.tex": "\\documentclass{article}", "refs.bib": "@book{a}"})

        response = api.post(
            "/projects/import?file_name=Thesis.zip",
            content=payload,
            headers={**h, **ZIP_HEADERS},
        )

        assert response.status_code == 201, response.text
        data = response.json()["data"]
        assert data["project"]["name"] == "Thesis"
        assert sorted(data["imported"]) == ["main.tex", "refs.bib"]

        detail = api.get(f"/projects/{data['project']['id']}", headers=h).json()["data"]
        assert sorted(f["name"] for f in detail["files"]) == ["main.tex", "refs.bib"]

    def test_imported_files_arrive_with_their_content(self, api: TestClient) -> None:
        h = _auth(api, "content-import@example.com")

        created = api.post(
            "/projects/import?file_name=T.zip",
            content=make_zip({"main.tex": "hello world"}),
            headers={**h, **ZIP_HEADERS},
        ).json()["data"]

        detail = api.get(f"/projects/{created['project']['id']}", headers=h).json()["data"]
        assert detail["files"][0]["content"] == "hello world"

    def test_names_the_project_after_the_uploaded_file(self, api: TestClient) -> None:
        h = _auth(api, "naming@example.com")

        response = api.post(
            "/projects/import?file_name=Quantum%20Notes.zip",
            content=make_zip({"main.tex": "x"}),
            headers={**h, **ZIP_HEADERS},
        )

        assert response.json()["data"]["project"]["name"] == "Quantum Notes"

    def test_falls_back_to_a_default_name(self, api: TestClient) -> None:
        h = _auth(api, "noname@example.com")

        response = api.post(
            "/projects/import",
            content=make_zip({"main.tex": "x"}),
            headers={**h, **ZIP_HEADERS},
        )

        assert response.json()["data"]["project"]["name"] == "Imported project"

    def test_the_project_belongs_to_the_importer(self, api: TestClient) -> None:
        owner = _auth(api, "owner-import@example.com")
        created = api.post(
            "/projects/import?file_name=T.zip",
            content=make_zip({"main.tex": "x"}),
            headers={**owner, **ZIP_HEADERS},
        ).json()["data"]

        stranger = _auth(api, "stranger-import@example.com")
        response = api.get(f"/projects/{created['project']['id']}", headers=stranger)

        assert response.status_code == 404, response.text

    def test_requires_authentication(self, api: TestClient) -> None:
        response = api.post(
            "/projects/import",
            content=make_zip({"main.tex": "x"}),
            headers=ZIP_HEADERS,
        )

        assert response.status_code == 401, response.text

    def test_a_hostile_archive_is_a_400_with_a_reason(self, api: TestClient) -> None:
        h = _auth(api, "hostile@example.com")

        response = api.post(
            "/projects/import?file_name=evil.zip",
            content=make_zip({"../../etc/passwd": "root"}),
            headers={**h, **ZIP_HEADERS},
        )

        assert response.status_code == 400, response.text
        message = response.json()["message"]
        assert "absolute path" in message or "unusable" in message

    def test_a_file_that_is_not_a_zip_is_a_400(self, api: TestClient) -> None:
        h = _auth(api, "notzip@example.com")

        response = api.post(
            "/projects/import?file_name=main.tex",
            content=b"\\documentclass{article}",
            headers={**h, **ZIP_HEADERS},
        )

        assert response.status_code == 400, response.text
        assert "not a readable zip" in response.json()["message"]

    def test_an_oversized_archive_is_refused(
        self, api: TestClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        h = _auth(api, "toobig@example.com")
        settings = get_settings()
        monkeypatch.setattr(settings, "archive_max_bytes", 64)

        response = api.post(
            "/projects/import?file_name=big.zip",
            content=make_zip({"main.tex": "x" * 4096}),
            headers={**h, **ZIP_HEADERS},
        )

        assert response.status_code == 413, response.text

    def test_an_imported_project_exports_again(self, api: TestClient) -> None:
        h = _auth(api, "roundtrip@example.com")
        created = api.post(
            "/projects/import?file_name=Round.zip",
            content=make_zip({"main.tex": "body", "chapters/one.tex": "one"}),
            headers={**h, **ZIP_HEADERS},
        ).json()["data"]

        exported = api.get(f"/projects/{created['project']['id']}/export", headers=h)

        assert exported.status_code == 200, exported.text
        with zipfile.ZipFile(BytesIO(exported.content)) as archive:
            assert sorted(archive.namelist()) == ["chapters/one.tex", "main.tex"]
            assert archive.read("main.tex") == b"body"
