from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.core.config import get_settings
from src.db.session import _engines
from src.main import create_app


@pytest.fixture()
def project_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    db_path = tmp_path / "projects-api.db"
    database_url = f"sqlite:///{db_path.as_posix()}"

    monkeypatch.setenv("POSTGRES_CONNECTION_STRING", database_url)
    monkeypatch.setenv("SENTRY_DSN", "")
    monkeypatch.setenv("S3_BUCKET_NAME", "texai-bucket")
    monkeypatch.setenv("S3_REGION", "us-east-1")
    get_settings.cache_clear()

    app = create_app(init_db_on_startup=True)

    with TestClient(app) as client:
        yield client

    engine = _engines.pop(database_url, None)
    if engine is not None:
        engine.dispose()
    get_settings.cache_clear()


def _auth_headers(client: TestClient) -> dict[str, str]:
    client.post(
        "/auth/signup",
        json={
            "name": "Projects User",
            "email": "projects@example.com",
            "password": "password123",
        },
    )
    login_response = client.post(
        "/auth/login",
        json={
            "email": "projects@example.com",
            "password": "password123",
        },
    )
    access_token = login_response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


def test_project_creation_listing_and_file_creation_flow(project_client: TestClient) -> None:
    headers = _auth_headers(project_client)

    create_project_response = project_client.post(
        "/projects",
        json={"name": "Research Notes", "template_id": "academic"},
        headers=headers,
    )

    assert create_project_response.status_code == 201
    create_project_payload = create_project_response.json()
    assert create_project_payload["success"] is True
    project_id = create_project_payload["data"]["id"]

    list_projects_response = project_client.get("/projects", headers=headers)
    assert list_projects_response.status_code == 200
    assert list_projects_response.json()["data"][0]["name"] == "Research Notes"

    get_project_response = project_client.get(f"/projects/{project_id}", headers=headers)
    assert get_project_response.status_code == 200
    get_project_payload = get_project_response.json()
    assert get_project_payload["data"]["name"] == "Research Notes"
    assert {file_entry["name"] for file_entry in get_project_payload["data"]["files"]} >= {
        "main.tex",
        "references.bib",
    }

    create_folder_response = project_client.post(
        f"/projects/{project_id}/files",
        json={"name": "images", "type": "folder"},
        headers=headers,
    )
    assert create_folder_response.status_code == 201
    folder_id = create_folder_response.json()["data"]["id"]

    create_file_response = project_client.post(
        f"/projects/{project_id}/files",
        json={
            "name": "diagram.png",
            "type": "file",
            "parent_id": folder_id,
            "mime_type": "image/png",
            "content": "",
        },
        headers=headers,
    )
    assert create_file_response.status_code == 201
    assert create_file_response.json()["data"]["parent_id"] == folder_id
    assert create_file_response.json()["data"]["name"] == "diagram.png"

    rename_project_response = project_client.patch(
        f"/projects/{project_id}",
        json={"name": "Research Notes Final"},
        headers=headers,
    )
    assert rename_project_response.status_code == 200
    assert rename_project_response.json()["data"]["name"] == "Research Notes Final"

    rename_file_response = project_client.patch(
        f"/projects/{project_id}/files/{create_file_response.json()['data']['id']}",
        json={"name": "chart.png"},
        headers=headers,
    )
    assert rename_file_response.status_code == 200
    assert rename_file_response.json()["data"]["name"] == "chart.png"

    create_nested_folder_response = project_client.post(
        f"/projects/{project_id}/files",
        json={"name": "figures", "type": "folder", "parent_id": folder_id},
        headers=headers,
    )
    assert create_nested_folder_response.status_code == 201
    nested_folder_id = create_nested_folder_response.json()["data"]["id"]

    move_file_response = project_client.patch(
        f"/projects/{project_id}/files/{create_file_response.json()['data']['id']}",
        json={"parent_id": nested_folder_id},
        headers=headers,
    )
    assert move_file_response.status_code == 200
    assert move_file_response.json()["data"]["parent_id"] == nested_folder_id

    invalid_folder_move_response = project_client.patch(
        f"/projects/{project_id}/files/{nested_folder_id}",
        json={"parent_id": nested_folder_id},
        headers=headers,
    )
    assert invalid_folder_move_response.status_code == 400

    delete_entry_response = project_client.delete(
        f"/projects/{project_id}/files/{folder_id}",
        headers=headers,
    )
    assert delete_entry_response.status_code == 200

    refreshed_project_response = project_client.get(f"/projects/{project_id}", headers=headers)
    refreshed_names = {file_entry["name"] for file_entry in refreshed_project_response.json()["data"]["files"]}
    assert "images" not in refreshed_names
    assert "chart.png" not in refreshed_names


def test_project_endpoints_require_project_ownership(project_client: TestClient) -> None:
    owner_headers = _auth_headers(project_client)
    project_response = project_client.post(
        "/projects",
        json={"name": "Private Project"},
        headers=owner_headers,
    )
    project_id = project_response.json()["data"]["id"]

    project_client.post(
        "/auth/signup",
        json={
            "name": "Second User",
            "email": "second@example.com",
            "password": "password123",
        },
    )
    second_login_response = project_client.post(
        "/auth/login",
        json={
            "email": "second@example.com",
            "password": "password123",
        },
    )
    second_headers = {"Authorization": f"Bearer {second_login_response.json()['data']['access_token']}"}

    get_project_response = project_client.get(f"/projects/{project_id}", headers=second_headers)
    assert get_project_response.status_code == 404
    assert get_project_response.json()["message"] == "Project not found."


def test_presigned_upload_url_uses_project_scoped_s3_key(
    project_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    headers = _auth_headers(project_client)
    project_response = project_client.post(
        "/projects",
        json={"name": "Upload Project"},
        headers=headers,
    )
    project_id = project_response.json()["data"]["id"]
    captured_params: dict[str, object] = {}

    class FakeS3Client:
        def generate_presigned_url(self, operation_name: str, *, Params: dict[str, object], ExpiresIn: int) -> str:
            captured_params["operation_name"] = operation_name
            captured_params["params"] = Params
            captured_params["expires_in"] = ExpiresIn
            return "https://texai-bucket.s3.amazonaws.com/signed-upload"

    def fake_boto3_client(service_name: str, **kwargs: object) -> FakeS3Client:
        captured_params["service_name"] = service_name
        captured_params["client_kwargs"] = kwargs
        return FakeS3Client()

    monkeypatch.setattr("src.uploads.service.boto3.client", fake_boto3_client)

    upload_response = project_client.post(
        "/uploads/presigned-url",
        json={
            "project_id": project_id,
            "file_name": "figures/chart.png",
            "content_type": "image/png", "size_bytes": 2048,
        },
        headers=headers,
    )

    assert upload_response.status_code == 200
    payload = upload_response.json()
    assert payload["success"] is True
    assert payload["data"]["upload_url"] == "https://texai-bucket.s3.amazonaws.com/signed-upload"
    assert payload["data"]["file_url"] == f"https://texai-bucket.s3.amazonaws.com/uploads/{project_id}/chart.png"
    assert payload["data"]["object_key"] == f"uploads/{project_id}/chart.png"
    assert payload["data"]["headers"] == {"Content-Type": "image/png"}
    assert captured_params["service_name"] == "s3"
    assert captured_params["client_kwargs"]["region_name"] == "us-east-1"
    assert captured_params["client_kwargs"]["config"].signature_version == "s3v4"
    assert captured_params["operation_name"] == "put_object"
    assert captured_params["params"]["Bucket"] == "texai-bucket"
    assert captured_params["params"]["ContentType"] == "image/png"
    assert captured_params["params"]["Key"] == f"uploads/{project_id}/chart.png"


def test_presigned_upload_url_rejects_an_uploaded_tex_file(project_client: TestClient) -> None:
    headers = _auth_headers(project_client)
    project_response = project_client.post(
        "/projects",
        json={"name": "Upload Project"},
        headers=headers,
    )
    project_id = project_response.json()["data"]["id"]

    upload_response = project_client.post(
        "/uploads/presigned-url",
        json={
            "project_id": project_id,
            "file_name": "main.tex",
            "content_type": "text/x-tex", "size_bytes": 2048,
        },
        headers=headers,
    )

    assert upload_response.status_code == 400
    # The message names the rejected extension and lists the allowed ones, so a
    # user is not left guessing what they can upload.
    message = upload_response.json()["message"]
    assert ".tex cannot be uploaded" in message
    assert ".bib" in message and ".sty" in message
