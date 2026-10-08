"""Walking a project's file tree and resolving each file to bytes.

Shared because two features need the same walk and would otherwise drift: the
compile worker materialises a project onto disk, and export writes the same
files into a zip. Neither owns the tree, so neither hosts the walk.
"""
from __future__ import annotations

import re
from pathlib import PurePosixPath
from urllib.parse import unquote, urlparse

from sqlmodel import Session, select

from src.core.config import Settings
from src.file_entries.models import FileEntry
from src.file_snapshots.service import get_latest_file_snapshot
from src.projects.models import Project

# File names come from users and end up as path components on the compile
# worker's disk, so this is a trust boundary. Anything that could escape the
# work directory is rejected rather than sanitised, because a silently renamed
# file breaks \input in a way the user cannot see.
_UNSAFE_NAME = re.compile(r"(^$|^\.{1,2}$|[/\\\x00])")

# A corrupt parent_id cannot be allowed to hang the walk.
MAX_DEPTH = 64


class ProjectFilesError(RuntimeError):
    """A project's files could not be resolved safely."""


def safe_component(name: str) -> str:
    if _UNSAFE_NAME.search(name):
        raise ProjectFilesError(f"Unsafe file or folder name: {name!r}")
    return name


def project_source_paths(session: Session, project: Project) -> list[tuple[FileEntry, str]]:
    """Every file in the project with its path relative to the project root."""
    entries = list(
        session.exec(select(FileEntry).where(FileEntry.project_id == project.id)).all()
    )
    by_parent: dict[int | None, list[FileEntry]] = {}
    for entry in entries:
        by_parent.setdefault(entry.parent_id, []).append(entry)

    out: list[tuple[FileEntry, str]] = []

    def walk(parent_id: int | None, prefix: PurePosixPath, depth: int) -> None:
        if depth > MAX_DEPTH:
            raise ProjectFilesError("Project tree is nested too deeply.")
        for entry in sorted(by_parent.get(parent_id, []), key=lambda e: (e.name or "")):
            path = prefix / safe_component(entry.name)
            if entry.type == "folder":
                walk(entry.id, path, depth + 1)
            else:
                out.append((entry, str(path)))

    walk(None, PurePosixPath(), 0)
    return out


def fetch_uploaded_bytes(file_url: str, settings: Settings) -> bytes:
    """Read an uploaded asset back out of S3 by the URL stored on the entry."""
    import boto3  # imported lazily: text-only projects need no AWS

    key = unquote(urlparse(file_url).path).lstrip("/")
    if not key:
        raise ProjectFilesError(f"Cannot derive an object key from {file_url!r}")
    body = boto3.client("s3", region_name=settings.s3_region).get_object(
        Bucket=settings.s3_bucket_name, Key=key
    )["Body"]
    return body.read()


def entry_bytes(session: Session, entry: FileEntry, settings: Settings) -> bytes:
    """The current contents of one file, wherever it is stored."""
    if entry.file_url:
        return fetch_uploaded_bytes(entry.file_url, settings)
    snapshot = get_latest_file_snapshot(session, entry.id)
    return b"" if snapshot is None else snapshot.content.encode("utf-8")
