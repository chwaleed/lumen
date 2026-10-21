"""The URL <-> key round trip, for both addressing styles.

The two styles put the bucket in different places -- AWS in the hostname, a
custom endpoint in the path -- so a key parser that works against one silently
prepends the bucket name to every key under the other.
"""
from urllib.parse import urlparse

from src.core.config import Settings
from src.shared.s3 import object_key_from_url, object_url, s3_client

KEY = "uploads/12/logo.png"


def aws_settings(**overrides) -> Settings:
    return Settings(
        S3_BUCKET_NAME="texai-bucket",
        S3_REGION="us-east-1",
        **overrides,
    )


def minio_settings() -> Settings:
    return aws_settings(
        S3_ENDPOINT_URL="http://minio:9000",
        S3_PUBLIC_ENDPOINT_URL="http://localhost:9100",
    )


def test_round_trip_survives_both_addressing_styles() -> None:
    for settings in (aws_settings(), minio_settings()):
        url = object_url(settings, KEY)
        assert object_key_from_url(url, settings) == KEY, url


def test_aws_url_is_unchanged_when_no_endpoint_is_configured() -> None:
    assert object_url(aws_settings(), KEY) == (
        f"https://texai-bucket.s3.amazonaws.com/{KEY}"
    )


def test_endpoint_url_is_path_style_and_browser_facing() -> None:
    # The stored URL is handed to the browser as an image src, so it must carry
    # the published host, not the one only the compose network can resolve.
    url = object_url(minio_settings(), KEY)
    assert url == f"http://localhost:9100/texai-bucket/{KEY}"


def test_a_key_equal_to_the_bucket_name_is_not_eaten() -> None:
    # Guards the prefix strip against matching more than the bucket segment.
    settings = minio_settings()
    key = "texai-bucket-notes/figure.png"
    assert object_key_from_url(object_url(settings, key), settings) == key


def test_url_without_a_key_is_rejected() -> None:
    assert object_key_from_url("http://localhost:9100/", minio_settings()) is None


def test_signing_client_uses_the_public_endpoint() -> None:
    settings = minio_settings()
    assert urlparse(s3_client(settings).meta.endpoint_url).port == 9000
    assert urlparse(s3_client(settings, for_signing=True).meta.endpoint_url).port == 9100


def test_signing_falls_back_to_the_single_endpoint() -> None:
    settings = aws_settings(S3_ENDPOINT_URL="http://localhost:9100")
    assert s3_client(settings, for_signing=True).meta.endpoint_url == "http://localhost:9100"
