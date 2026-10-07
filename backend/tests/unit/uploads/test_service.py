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


def request_for(
    project: Project,
    file_name: str = "figure.png",
    content_type: str | None = "image/png",
    size_bytes: int = 1024,
):
    return PresignedUploadRequest(
        project_id=project.id,
        file_name=file_name,
        content_type=content_type,
        size_bytes=size_bytes,
    )


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
        # Extensions are allowed ones, so this tests the stripping rather than
        # the allowlist; a traversal attempt with no extension is rejected
        # outright by test_rejects_extensions_outside_the_allowlist.
        "../../../etc/passwd.png",
        "/etc/passwd.bib",
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
@pytest.mark.parametrize("file_name", ["figure.png", "refs.bib", "thesis.cls", "custom.sty", "plain.bst", "plot.pdf", "diagram.eps"])
def test_allows_the_assets_real_projects_need(
    session: Session,
    settings: Settings,
    owner: User,
    project: Project,
    aws_credentials: None,
    file_name: str,
) -> None:
    # Before M6 only images could be uploaded, so no real project could build.
    response = create_presigned_upload(session, owner, settings, request_for(project, file_name))

    assert response.object_key == f"uploads/{project.id}/{file_name}"


@mock_aws
@pytest.mark.parametrize("file_name", ["payload.exe", "archive.zip", "run.sh", "noextension"])
def test_rejects_extensions_outside_the_allowlist(
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
def test_rejects_an_uploaded_tex_file(
    session: Session, settings: Settings, owner: User, project: Project, aws_credentials: None
) -> None:
    # The editor owns .tex through snapshots; one read from S3 would be uneditable.
    with pytest.raises(HTTPException) as error:
        create_presigned_upload(session, owner, settings, request_for(project, "chapter.tex"))

    assert error.value.status_code == status.HTTP_400_BAD_REQUEST


@mock_aws
@pytest.mark.parametrize(
    ("file_name", "expected"),
    [("refs.bib", "text/plain"), ("thesis.cls", "text/plain"), ("figure.png", "image/png")],
)
def test_content_type_comes_from_the_extension_not_the_client(
    session: Session,
    settings: Settings,
    owner: User,
    project: Project,
    aws_credentials: None,
    file_name: str,
    expected: str,
) -> None:
    # Browsers report "" or text/plain for .sty and .cls, so the client's claim
    # cannot be trusted either to allow or to label.
    response = create_presigned_upload(
        session, owner, settings, request_for(project, file_name, "application/x-lies")
    )

    assert response.headers == {"Content-Type": expected}


@mock_aws
def test_signs_the_content_length_so_s3_enforces_the_size(
    session: Session, settings: Settings, owner: User, project: Project, aws_credentials: None
) -> None:
    # Without the length in the signature the ceiling would rest on the client
    # telling the truth about how big the file is.
    response = create_presigned_upload(session, owner, settings, request_for(project, size_bytes=4096))

    signed = urlparse(response.upload_url).query.lower()
    assert "content-length" in signed


@mock_aws
def test_rejects_a_file_over_the_single_upload_limit(
    session: Session, settings: Settings, owner: User, project: Project, aws_credentials: None
) -> None:
    oversized = settings.upload_max_file_bytes + 1

    with pytest.raises(HTTPException) as error:
        create_presigned_upload(session, owner, settings, request_for(project, size_bytes=oversized))

    assert error.value.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE


@mock_aws
def test_rejects_an_upload_that_would_pass_the_project_ceiling(
    session: Session, settings: Settings, owner: User, project: Project, aws_credentials: None
) -> None:
    from src.file_entries.models import FileEntry

    session.add(
        FileEntry(
            project_id=project.id,
            parent_id=None,
            name="already-there.pdf",
            type="file",
            size_bytes=settings.project_max_bytes,
        )
    )
    session.commit()

    with pytest.raises(HTTPException) as error:
        create_presigned_upload(session, owner, settings, request_for(project, size_bytes=1))

    assert error.value.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE


@mock_aws
def test_counts_only_the_projects_own_files(
    session: Session, settings: Settings, owner: User, project: Project, aws_credentials: None
) -> None:
    from src.file_entries.models import FileEntry
    from src.uploads.service import project_bytes_used

    other = Project(name="Other", user_id=owner.id)
    session.add(other)
    session.commit()
    session.refresh(other)
    session.add(FileEntry(project_id=other.id, parent_id=None, name="big.pdf", type="file", size_bytes=999))
    session.add(FileEntry(project_id=project.id, parent_id=None, name="small.pdf", type="file", size_bytes=10))
    session.commit()

    assert project_bytes_used(session, project.id) == 10


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
