from urllib.parse import urlparse

import pytest
from fastapi import HTTPException, status
from moto import mock_aws
from sqlmodel import Session

from src.auth.models import User
from src.auth.utils import hash_password
from src.core.config import Settings
from src.projects.models import Project
from src.uploads.schemas import PresignedUploadRequest
from src.uploads.service import create_presigned_upload


@pytest.fixture()
def aws_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    """moto refuses to run against real credentials, so pin fake ones."""
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_SECURITY_TOKEN", "testing")
    monkeypatch.setenv("AWS_SESSION_TOKEN", "testing")


@pytest.fixture()
def owner(session: Session) -> User:
    user = User(name="Owner", email="owner@example.com", password_hash=hash_password("password123"))
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture()
def project(session: Session, owner: User) -> Project:
    project = Project(name="Thesis", user_id=owner.id)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def request_for(project: Project, file_name: str = "figure.png", content_type: str = "image/png"):
    return PresignedUploadRequest(project_id=project.id, file_name=file_name, content_type=content_type)


@mock_aws
def test_returns_a_signed_url_scoped_to_the_project(
    session: Session, settings: Settings, owner: User, project: Project, aws_credentials: None
) -> None:
    response = create_presigned_upload(session, owner, settings, request_for(project))

    assert response.object_key == f"uploads/{project.id}/figure.png"
    assert response.headers == {"Content-Type": "image/png"}

    signed = urlparse(response.upload_url)
    assert signed.scheme == "https"
    # A presigned PUT is only usable with its signature parameters attached.
    assert "X-Amz-Signature" in signed.query
    assert "X-Amz-Expires" in signed.query


@mock_aws
def test_file_url_points_at_the_configured_bucket(
    session: Session, settings: Settings, owner: User, project: Project, aws_credentials: None
) -> None:
    response = create_presigned_upload(session, owner, settings, request_for(project))

    assert response.file_url == (
        f"https://{settings.s3_bucket_name}.s3.amazonaws.com/uploads/{project.id}/figure.png"
    )


@mock_aws
def test_percent_encodes_spaces_in_the_file_url(
    session: Session, settings: Settings, owner: User, project: Project, aws_credentials: None
) -> None:
    response = create_presigned_upload(session, owner, settings, request_for(project, "my figure.png"))

    assert response.object_key == f"uploads/{project.id}/my figure.png"
    assert "my%20figure.png" in response.file_url


@mock_aws
@pytest.mark.parametrize(
    "file_name",
    [
        "../../../etc/passwd",
        "/etc/passwd",
        "subdir/nested.png",
    ],
)
def test_strips_directory_components_from_the_file_name(
    session: Session,
    settings: Settings,
    owner: User,
    project: Project,
    aws_credentials: None,
    file_name: str,
) -> None:
    # Without this the key could be steered outside the project's own prefix.
    response = create_presigned_upload(session, owner, settings, request_for(project, file_name))

    assert response.object_key.startswith(f"uploads/{project.id}/")
    assert ".." not in response.object_key
    assert response.object_key.count("/") == 2


@mock_aws
@pytest.mark.parametrize("file_name", ["..", ".", "   "])
def test_rejects_file_names_that_reduce_to_nothing(
    session: Session,
    settings: Settings,
    owner: User,
    project: Project,
    aws_credentials: None,
    file_name: str,
) -> None:
    with pytest.raises(HTTPException) as error:
        create_presigned_upload(session, owner, settings, request_for(project, file_name))

    assert error.value.status_code == status.HTTP_400_BAD_REQUEST


@mock_aws
@pytest.mark.parametrize("content_type", ["application/pdf", "text/html", "application/octet-stream"])
def test_rejects_non_image_content_types(
    session: Session,
    settings: Settings,
    owner: User,
    project: Project,
    aws_credentials: None,
    content_type: str,
) -> None:
    with pytest.raises(HTTPException) as error:
        create_presigned_upload(session, owner, settings, request_for(project, "x.png", content_type))

    assert error.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "image" in error.value.detail.lower()


@mock_aws
def test_normalises_content_type_casing_and_padding(
    session: Session, settings: Settings, owner: User, project: Project, aws_credentials: None
) -> None:
    response = create_presigned_upload(session, owner, settings, request_for(project, "x.png", "  IMAGE/PNG  "))

    assert response.headers == {"Content-Type": "image/png"}


@mock_aws
def test_refuses_to_sign_an_upload_for_another_user_s_project(
    session: Session, settings: Settings, project: Project, aws_credentials: None
) -> None:
    intruder = User(name="Intruder", email="intruder@example.com", password_hash=hash_password("password123"))
    session.add(intruder)
    session.commit()
    session.refresh(intruder)

    with pytest.raises(HTTPException) as error:
        create_presigned_upload(session, intruder, settings, request_for(project))

    assert error.value.status_code == status.HTTP_404_NOT_FOUND
