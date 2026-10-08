from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.core.config import get_settings
from src.db.session import _engines
from src.main import create_app


@pytest.fixture()
def api(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    database_url = f"sqlite:///{(tmp_path / 'compiles-api.db').as_posix()}"
    monkeypatch.setenv("POSTGRES_CONNECTION_STRING", database_url)
    monkeypatch.setenv("SENTRY_DSN", "")
    monkeypatch.setenv("S3_BUCKET_NAME", "test-bucket")
    monkeypatch.setenv("S3_REGION", "us-east-1")
    monkeypatch.setenv("COMPILE_OUTPUT_DIR", str(tmp_path / "out"))
    get_settings.cache_clear()

    app = create_app(init_db_on_startup=True)
    with TestClient(app) as client:
        yield client

    engine = _engines.pop(database_url, None)
    if engine is not None:
        engine.dispose()
    get_settings.cache_clear()


def _auth(client: TestClient, email: str) -> dict[str, str]:
    """Sign a user up and return their Authorization headers."""
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


def _queue(client: TestClient, headers: dict[str, str], project_id: int) -> int:
    response = client.post(f"/projects/{project_id}/compile", headers=headers)
    assert response.status_code == 202, response.text
    return response.json()["data"]["id"]


class TestQueueCompile:
    def test_queues_a_job_and_returns_202(self, api: TestClient) -> None:
        h = _auth(api, "q1@example.com")
        project_id = _new_project(api, h)

        response = api.post(f"/projects/{project_id}/compile", headers=h)

        assert response.status_code == 202, response.text
        body = response.json()
        assert body["success"] is True
        data = body["data"]
        assert data["status"] == "queued"
        assert data["engine"] == "pdflatex"
        assert data["project_id"] == project_id
        assert data["has_pdf"] is False

    def test_another_users_project_is_404(self, api: TestClient) -> None:
        owner = _auth(api, "owner@example.com")
        project_id = _new_project(api, owner, "owned")
        stranger = _auth(api, "stranger@example.com")

        response = api.post(f"/projects/{project_id}/compile", headers=stranger)
        assert response.status_code == 404, response.text

    def test_a_root_file_from_another_project_is_404(self, api: TestClient) -> None:
        h = _auth(api, "roots@example.com")
        first = _new_project(api, h, "first")
        second = _new_project(api, h, "second")
        created = api.post(
            f"/projects/{second}/files",
            json={"name": "other.tex", "type": "file", "parent_id": None},
            headers=h,
        )
        assert created.status_code == 201, created.text
        other_file_id = created.json()["data"]["id"]

        response = api.post(
            f"/projects/{first}/compile", params={"root_file_id": other_file_id}, headers=h
        )
        assert response.status_code == 404, response.text

    def test_a_folder_cannot_be_the_compile_root(self, api: TestClient) -> None:
        h = _auth(api, "folder@example.com")
        project_id = _new_project(api, h)
        created = api.post(
            f"/projects/{project_id}/files",
            json={"name": "chapters", "type": "folder", "parent_id": None},
            headers=h,
        )
        folder_id = created.json()["data"]["id"]

        response = api.post(
            f"/projects/{project_id}/compile", params={"root_file_id": folder_id}, headers=h
        )
        assert response.status_code == 400, response.text


class TestReadCompile:
    def test_status_is_readable(self, api: TestClient) -> None:
        h = _auth(api, "status@example.com")
        project_id = _new_project(api, h)
        job_id = _queue(api, h, project_id)

        response = api.get(f"/projects/{project_id}/compile/{job_id}", headers=h)

        assert response.status_code == 200, response.text
        assert response.json()["data"]["id"] == job_id

    def test_an_unknown_job_is_404(self, api: TestClient) -> None:
        h = _auth(api, "unknown@example.com")
        project_id = _new_project(api, h)

        assert api.get(f"/projects/{project_id}/compile/99999", headers=h).status_code == 404

    def test_a_job_from_another_project_is_404(self, api: TestClient) -> None:
        h = _auth(api, "cross@example.com")
        first = _new_project(api, h, "first")
        second = _new_project(api, h, "second")
        job_id = _queue(api, h, second)

        assert api.get(f"/projects/{first}/compile/{job_id}", headers=h).status_code == 404

    def test_log_is_empty_before_the_worker_runs(self, api: TestClient) -> None:
        h = _auth(api, "log@example.com")
        project_id = _new_project(api, h)
        job_id = _queue(api, h, project_id)

        response = api.get(f"/projects/{project_id}/compile/{job_id}/log", headers=h)

        assert response.status_code == 200, response.text
        data = response.json()["data"]
        assert data["job_id"] == job_id
        assert data["log"] == ""

    def test_pdf_is_404_when_the_compile_produced_none(self, api: TestClient) -> None:
        h = _auth(api, "nopdf@example.com")
        project_id = _new_project(api, h)
        job_id = _queue(api, h, project_id)

        response = api.get(f"/projects/{project_id}/compile/{job_id}/pdf", headers=h)
        assert response.status_code == 404, response.text

    def test_pdf_is_served_as_bytes_when_it_exists(self, api: TestClient) -> None:
        # The one endpoint that does not use the {success, message, data} envelope.
        h = _auth(api, "pdf@example.com")
        project_id = _new_project(api, h)
        job_id = _queue(api, h, project_id)

        from sqlmodel import Session

        from src.compiles.models import CompileJob
        from src.db.session import get_engine

        settings = get_settings()
        out = Path(settings.compile_output_dir) / str(job_id)
        out.mkdir(parents=True, exist_ok=True)
        (out / "main.pdf").write_bytes(b"%PDF-1.7\n%fake\n")
        with Session(get_engine(settings)) as session:
            job = session.get(CompileJob, job_id)
            job.pdf_path = f"{job_id}/main.pdf"
            job.status = "success"
            session.add(job)
            session.commit()

        response = api.get(f"/projects/{project_id}/compile/{job_id}/pdf", headers=h)

        assert response.status_code == 200, response.text
        assert response.headers["content-type"] == "application/pdf"
        assert response.content.startswith(b"%PDF")

    def test_pdf_is_served_inline_so_the_preview_can_render_it(
        self, api: TestClient
    ) -> None:
        # Regression: FileResponse defaults to `attachment` whenever a filename
        # is passed, which makes the browser download the PDF instead of showing
        # it in the preview iframe.
        h = _auth(api, "inline@example.com")
        project_id = _new_project(api, h)
        job_id = _queue(api, h, project_id)

        from sqlmodel import Session

        from src.compiles.models import CompileJob
        from src.db.session import get_engine

        settings = get_settings()
        out = Path(settings.compile_output_dir) / str(job_id)
        out.mkdir(parents=True, exist_ok=True)
        (out / "main.pdf").write_bytes(b"%PDF-1.7\n%fake\n")
        with Session(get_engine(settings)) as session:
            job = session.get(CompileJob, job_id)
            job.pdf_path = f"{job_id}/main.pdf"
            job.status = "success"
            session.add(job)
            session.commit()

        response = api.get(f"/projects/{project_id}/compile/{job_id}/pdf", headers=h)

        disposition = response.headers["content-disposition"]
        assert disposition.startswith("inline"), disposition
        assert "attachment" not in disposition
        # The name still travels, for anyone who does choose to save it.
        assert 'filename="main.pdf"' in disposition


    def test_log_returns_ranked_diagnostics(self, api: TestClient) -> None:
        h = _auth(api, "diag@example.com")
        project_id = _new_project(api, h)
        job_id = _queue(api, h, project_id)

        from sqlmodel import Session

        from src.compiles.models import CompileJob
        from src.db.session import get_engine

        settings = get_settings()
        out = Path(settings.compile_output_dir) / str(job_id)
        out.mkdir(parents=True, exist_ok=True)
        (out / "main.log").write_text(
            "./main.tex:4: Missing $ inserted.\n"
            "./main.tex:4: Emergency stop.\n"
            "LaTeX Warning: Reference `nope' on page 1 undefined on input line 9.\n"
        )
        with Session(get_engine(settings)) as session:
            job = session.get(CompileJob, job_id)
            job.log_path = f"{job_id}/main.log"
            job.status = "failure"
            session.add(job)
            session.commit()

        data = api.get(f"/projects/{project_id}/compile/{job_id}/log", headers=h).json()["data"]

        assert len(data["errors"]) == 1
        assert data["errors"][0]["file"] == "main.tex"
        assert data["errors"][0]["line"] == 4
        # The Emergency stop is suppressed, not ranked.
        assert all("Emergency stop" not in e["message"] for e in data["errors"])
        assert len(data["warnings"]) == 1
        assert data["warnings"][0]["line"] == 9
        assert data["log"].startswith("./main.tex:4:")


class TestLatestCompile:
    """A reload has to be able to find the build that already happened."""

    def test_is_null_before_the_first_compile(self, api: TestClient) -> None:
        h = _auth(api, "latest-none@example.com")
        project_id = _new_project(api, h)

        response = api.get(f"/projects/{project_id}/compile/latest", headers=h)

        assert response.status_code == 200, response.text
        assert response.json()["data"] is None

    def test_returns_the_newest_job(self, api: TestClient) -> None:
        h = _auth(api, "latest-newest@example.com")
        project_id = _new_project(api, h)
        _queue(api, h, project_id)
        second = _queue(api, h, project_id)

        response = api.get(f"/projects/{project_id}/compile/latest", headers=h)

        assert response.json()["data"]["id"] == second

    def test_latest_is_not_mistaken_for_a_job_id(self, api: TestClient) -> None:
        # The {job_id} route parses its segment as an int, so declaration
        # order is what keeps "latest" from 422-ing.
        h = _auth(api, "latest-route@example.com")
        project_id = _new_project(api, h)

        assert api.get(f"/projects/{project_id}/compile/latest", headers=h).status_code == 200

    def test_another_users_project_is_404(self, api: TestClient) -> None:
        owner = _auth(api, "latest-mine@example.com")
        project_id = _new_project(api, owner)
        stranger = _auth(api, "latest-stranger@example.com")

        response = api.get(f"/projects/{project_id}/compile/latest", headers=stranger)

        assert response.status_code == 404, response.text


class TestCancelCompile:
    def test_a_queued_job_can_be_cancelled(self, api: TestClient) -> None:
        h = _auth(api, "cancel@example.com")
        project_id = _new_project(api, h)
        job_id = _queue(api, h, project_id)

        response = api.delete(f"/projects/{project_id}/compile/{job_id}", headers=h)

        assert response.status_code == 200, response.text
        assert response.json()["data"]["status"] == "cancelled"

    def test_a_running_job_can_now_be_cancelled(self, api: TestClient) -> None:
        # M3 returned 409 here because only the worker knew the container name.
        # M7 records it on the row, so the API can kill the container.
        h = _auth(api, "running@example.com")
        project_id = _new_project(api, h)
        job_id = _queue(api, h, project_id)

        from sqlmodel import Session

        from src.compiles.models import CompileJob
        from src.db.session import get_engine

        with Session(get_engine(get_settings())) as session:
            job = session.get(CompileJob, job_id)
            job.status = "running"
            # No container name: the kill is skipped, the row still cancels.
            session.add(job)
            session.commit()

        response = api.delete(f"/projects/{project_id}/compile/{job_id}", headers=h)

        assert response.status_code == 200, response.text
        assert response.json()["data"]["status"] == "cancelled"

    def test_an_already_finished_job_is_409(self, api: TestClient) -> None:
        h = _auth(api, "finished@example.com")
        project_id = _new_project(api, h)
        job_id = _queue(api, h, project_id)

        from sqlmodel import Session

        from src.compiles.models import CompileJob
        from src.db.session import get_engine

        with Session(get_engine(get_settings())) as session:
            job = session.get(CompileJob, job_id)
            job.status = "success"
            session.add(job)
            session.commit()

        response = api.delete(f"/projects/{project_id}/compile/{job_id}", headers=h)
        assert response.status_code == 409, response.text

    def test_cancelling_twice_is_409(self, api: TestClient) -> None:
        h = _auth(api, "twice@example.com")
        project_id = _new_project(api, h)
        job_id = _queue(api, h, project_id)

        assert api.delete(f"/projects/{project_id}/compile/{job_id}", headers=h).status_code == 200
        assert api.delete(f"/projects/{project_id}/compile/{job_id}", headers=h).status_code == 409


class TestQueueMetrics:
    def test_reports_depth_and_snapshot_volume(self, api: TestClient) -> None:
        h = _auth(api, "ops@example.com")
        project_id = _new_project(api, h)
        _queue(api, h, project_id)
        _queue(api, h, project_id)

        response = api.get("/ops/compile-queue", headers=h)

        assert response.status_code == 200, response.text
        data = response.json()["data"]
        assert data["queued"] == 2
        assert data["running"] == 0
        # Queue depth backing up is the signal to add workers.
        assert data["oldest_wait_seconds"] is not None
        # ADR 0007 defers compressing snapshots; this is the number to watch.
        assert data["snapshot_count"] >= 1
        assert data["snapshot_content_bytes"] > 0

    def test_requires_authentication(self, api: TestClient) -> None:
        assert api.get("/ops/compile-queue").status_code == 401
