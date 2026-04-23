from pathlib import PurePath
from urllib.parse import quote

import boto3
from botocore.config import Config
from fastapi import status
from sqlmodel import Session

from src.auth.models import User
from src.core.config import Settings
from src.shared.project_access import clean_name, get_project_for_user, projects_exception
from src.uploads.schemas import PresignedUploadRequest, PresignedUploadResponse


ALLOWED_IMAGE_CONTENT_TYPE_PREFIX = "image/"


def _safe_file_name(file_name: str) -> str:
    cleaned_name = clean_name(PurePath(file_name).name, field_name="File name")
    if cleaned_name in {".", ".."}:
        raise projects_exception("File name cannot be empty.", status.HTTP_400_BAD_REQUEST)
    return cleaned_name


def _object_url(bucket_name: str, object_key: str) -> str:
    encoded_key = quote(object_key, safe="/")
    return f"https://{bucket_name}.s3.amazonaws.com/{encoded_key}"


def _clean_image_content_type(content_type: str) -> str:
    clean_content_type = content_type.strip().lower()
    if not clean_content_type.startswith(ALLOWED_IMAGE_CONTENT_TYPE_PREFIX):
        raise projects_exception("Only image uploads are allowed.", status.HTTP_400_BAD_REQUEST)
    return clean_content_type


def create_presigned_upload(
    session: Session,
    current_user: User,
    settings: Settings,
    payload: PresignedUploadRequest,
) -> PresignedUploadResponse:
    project = get_project_for_user(session, current_user, payload.project_id)
    file_name = _safe_file_name(payload.file_name)
    content_type = _clean_image_content_type(payload.content_type)
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
        },
        ExpiresIn=settings.s3_presigned_url_expires_seconds,
    )

    return PresignedUploadResponse(
        upload_url=upload_url,
        file_url=_object_url(settings.s3_bucket_name, object_key),
        object_key=object_key,
        headers={"Content-Type": content_type},
    )
