import pytest
from fastapi import status
from fastapi.testclient import TestClient
from moto import mock_aws

from tests.conftest import register


@pytest.fixture()
def aws_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_SECURITY_TOKEN", "testing")
    monkeypatch.setenv("AWS_SESSION_TOKEN", "testing")


@pytest.fixture()
def project_id(client: TestClient, auth_headers: dict[str, str]) -> int:
    response = client.post(
        "/projects", json={"name": "Thesis", "template_id": "academic"}, headers=auth_headers
    )
    return response.json()["data"]["id"]


def request_url(client: TestClient, headers: dict[str, str], payload: dict):
    return client.post("/uploads/presigned-url", json=payload, headers=headers)


@mock_aws
def test_returns_a_presigned_url(
    client: TestClient, auth_headers: dict[str, str], project_id: int, aws_credentials: None
) -> None:
    response = request_url(
        client,
        auth_headers,
        {"project_id": project_id, "file_name": "figure.png", "content_type": "image/png"},
    )

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["success"] is True
    assert body["data"]["object_key"] == f"uploads/{project_id}/figure.png"
    assert "X-Amz-Signature" in body["data"]["upload_url"]


@mock_aws
def test_rejects_a_non_image_upload(
    client: TestClient, auth_headers: dict[str, str], project_id: int, aws_credentials: None
) -> None:
    response = request_url(
        client,
        auth_headers,
        {"project_id": project_id, "file_name": "paper.pdf", "content_type": "application/pdf"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["success"] is False


@mock_aws
def test_requires_authentication(client: TestClient, project_id: int, aws_credentials: None) -> None:
    response = client.post(
        "/uploads/presigned-url",
        json={"project_id": project_id, "file_name": "figure.png", "content_type": "image/png"},
    )

    assert response.status_code in {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN}


@mock_aws
def test_hides_another_user_s_project(
    client: TestClient, auth_headers: dict[str, str], project_id: int, aws_credentials: None
) -> None:
    intruder = register(client, email="intruder@example.com")

    response = request_url(
        client,
        intruder,
        {"project_id": project_id, "file_name": "figure.png", "content_type": "image/png"},
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


@mock_aws
def test_rejects_a_missing_file_name(
    client: TestClient, auth_headers: dict[str, str], project_id: int, aws_credentials: None
) -> None:
    response = request_url(
        client, auth_headers, {"project_id": project_id, "content_type": "image/png"}
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
