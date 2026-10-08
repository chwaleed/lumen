from pathlib import PurePath
from urllib.parse import quote

import boto3
from botocore.config import Config
from fastapi import status
from sqlmodel import Session, func, select

from src.auth.models import User
from src.core.config import Settings
from src.file_entries.models import FileEntry
from src.shared.project_access import clean_name, get_project_for_user, projects_exception
from src.uploads.schemas import PresignedUploadRequest, PresignedUploadResponse

# Extension-driven, not MIME-driven: browsers report "" or text/plain for .sty,
# .cls and .bst, so a content-type allowlist would reject the very files real
# projects need. See docs/plans/latex-compilation.md (M6).
#
# Deliberately excludes .tex: the editor owns .tex files through snapshots, and
# an uploaded one would be read from S3 and so be uneditable.
ALLOWED_EXTENSIONS: dict[str, str] = {
    # LaTeX assets the compiler reads but the user does not edit
    ".bib": "text/plain",
    ".cls": "text/plain",
    ".sty": "text/plain",
    ".bst": "text/plain",
    ".cfg": "text/plain",
    ".clo": "text/plain",
    ".def": "text/plain",
    ".ldf": "text/plain",
    # Figures
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".eps": "application/postscript",
}


def _safe_file_name(file_name: str) -> str:
    # PurePath(...).name strips any directory component a client tries to send,
    # so "../../etc/passwd" becomes "passwd".
    cleaned_name = clean_name(PurePath(file_name).name, field_name="File name")
    if cleaned_name in {".", ".."}:
        raise projects_exception("File name cannot be empty.", status.HTTP_400_BAD_REQUEST)
    return cleaned_name


def object_url(bucket_name: str, object_key: str) -> str:
    encoded_key = quote(object_key, safe="/")
    return f"https://{bucket_name}.s3.amazonaws.com/{encoded_key}"


def _content_type_for(file_name: str) -> str:
    """The content type the extension allows, ignoring what the client claimed."""
    suffix = PurePath(file_name).suffix.lower()
    content_type = ALLOWED_EXTENSIONS.get(suffix)
    if content_type is None:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise projects_exception(
            f"{suffix or 'Files without an extension'} cannot be uploaded. Allowed: {allowed}.",
            status.HTTP_400_BAD_REQUEST,
        )
    return content_type


def project_bytes_used(session: Session, project_id: int) -> int:
    total = session.exec(
        select(func.coalesce(func.sum(FileEntry.size_bytes), 0)).where(
            FileEntry.project_id == project_id
        )
    ).one()
    return int(total or 0)


def _check_size(
    session: Session, settings: Settings, project_id: int, size_bytes: int
) -> None:
    if size_bytes > settings.upload_max_file_bytes:
        limit_mb = settings.upload_max_file_bytes // (1024 * 1024)
        raise projects_exception(
            f"This file is larger than the {limit_mb} MB limit for a single upload.",
            status.HTTP_413_CONTENT_TOO_LARGE,
        )

    used = project_bytes_used(session, project_id)
    if used + size_bytes > settings.project_max_bytes:
        limit_mb = settings.project_max_bytes // (1024 * 1024)
        raise projects_exception(
            f"This upload would take the project past its {limit_mb} MB limit.",
            status.HTTP_413_CONTENT_TOO_LARGE,
        )


def create_presigned_upload(
    session: Session,
    current_user: User,
    settings: Settings,
    payload: PresignedUploadRequest,
) -> PresignedUploadResponse:
    project = get_project_for_user(session, current_user, payload.project_id)
    file_name = _safe_file_name(payload.file_name)
    content_type = _content_type_for(file_name)
    _check_size(session, settings, project.id, payload.size_bytes)

    object_key = f"uploads/{project.id}/{file_name}"

    s3_client = boto3.client(
        "s3",
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4"),
    )
    upload_url = s3_client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.s3_bucket_name,
            "Key": object_key,
            "ContentType": content_type,
            # Signed, so S3 refuses a body of any other length. Without this the
            # ceiling would rest on the client telling the truth.
            "ContentLength": payload.size_bytes,
        },
        ExpiresIn=settings.s3_presigned_url_expires_seconds,
    )

    return PresignedUploadResponse(
        upload_url=upload_url,
        file_url=object_url(settings.s3_bucket_name, object_key),
        object_key=object_key,
        headers={"Content-Type": content_type},
    )
