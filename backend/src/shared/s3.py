"""One place that builds an S3 client, and one place that names an object.

Three call sites used to construct their own `boto3.client("s3", ...)`, which
meant pointing the service at anything other than real AWS took three edits and
silently worked in two of them. Everything that talks to object storage goes
through here.
"""
from __future__ import annotations

from urllib.parse import quote, unquote, urlparse

from src.core.config import Settings


def s3_client(settings: Settings, *, for_signing: bool = False):
    """A client for server-side calls, or one whose URLs the browser can reach.

    `for_signing` matters only when a custom endpoint is configured: a presigned
    URL signs its Host header, so it has to be signed with the hostname the
    browser will use, not the one the API reaches internally.
    """
    import boto3  # imported lazily: text-only projects never touch storage
    from botocore.config import Config

    endpoint = settings.s3_endpoint_url
    if for_signing:
        endpoint = settings.s3_public_endpoint_url or endpoint

    return boto3.client(
        "s3",
        region_name=settings.s3_region,
        endpoint_url=endpoint or None,
        # None defers to boto3's own chain (instance role, ~/.aws, environment).
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
        config=Config(
            signature_version="s3v4",
            # bucket.host style needs wildcard DNS, which a local MinIO does not
            # have. Real AWS keeps its default, so nothing changes in production.
            s3={"addressing_style": "path" if endpoint else "auto"},
        ),
    )


def object_url(settings: Settings, object_key: str) -> str:
    """The URL stored on a file entry, and handed to the browser as an image src."""
    encoded_key = quote(object_key, safe="/")
    endpoint = settings.s3_public_endpoint_url or settings.s3_endpoint_url
    if endpoint:
        return f"{endpoint.rstrip('/')}/{settings.s3_bucket_name}/{encoded_key}"
    return f"https://{settings.s3_bucket_name}.s3.amazonaws.com/{encoded_key}"


def object_key_from_url(file_url: str, settings: Settings) -> str | None:
    """The key `object_url` encoded, for either addressing style.

    None when the URL carries no key at all. Path-style endpoints put the bucket
    in the path and virtual-host AWS URLs put it in the hostname, so the bucket
    prefix is stripped only when it is actually there.
    """
    key = unquote(urlparse(file_url).path).lstrip("/")
    prefix = f"{settings.s3_bucket_name}/"
    if key.startswith(prefix):
        key = key[len(prefix):]
    return key or None
