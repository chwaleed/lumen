from fastapi import status
from sqlmodel import Session, select

from src.file_snapshots.models import FileSnapshot
from src.file_snapshots.schemas import MonacoContentChange
from src.shared.project_access import projects_exception


def get_latest_file_snapshot(session: Session, file_id: int) -> FileSnapshot | None:
    return session.exec(
        select(FileSnapshot)
        .where(FileSnapshot.file_id == file_id)
        .order_by(FileSnapshot.version.desc(), FileSnapshot.id.desc())
    ).first()


def create_file_snapshot(session: Session, file_id: int, content: str) -> FileSnapshot:
    latest_snapshot = get_latest_file_snapshot(session, file_id)
    next_version = 1 if latest_snapshot is None else latest_snapshot.version + 1

    snapshot = FileSnapshot(
        file_id=file_id,
        content=content,
        version=next_version,
    )
    session.add(snapshot)
    return snapshot


def apply_monaco_change(content: str, change: MonacoContentChange) -> str:
    start_index = change.range_offset
    end_index = change.range_offset + change.range_length

    if start_index < 0 or end_index < start_index or end_index > len(content):
        raise projects_exception("Invalid editor change range.", status.HTTP_400_BAD_REQUEST)

    return f"{content[:start_index]}{change.text}{content[end_index:]}"


def apply_monaco_changes(content: str, changes: list[MonacoContentChange]) -> str:
    next_content = content

    for change in changes:
        next_content = apply_monaco_change(next_content, change)

    return next_content


def create_file_snapshot_from_monaco_changes(
    session: Session,
    file_id: int,
    changes: list[MonacoContentChange],
    *,
    base_version: int | None = None,
) -> FileSnapshot:
    if not changes:
        raise projects_exception("At least one editor change is required.", status.HTTP_400_BAD_REQUEST)

    latest_snapshot = get_latest_file_snapshot(session, file_id)
    latest_content = "" if latest_snapshot is None else latest_snapshot.content
    latest_version = 0 if latest_snapshot is None else latest_snapshot.version

    if base_version is not None and base_version != latest_version:
        raise projects_exception("Snapshot version conflict. Refresh and try again.", status.HTTP_409_CONFLICT)

    updated_content = apply_monaco_changes(latest_content, changes)
    return create_file_snapshot(session, file_id, updated_content)


def list_file_snapshots(session: Session, file_id: int) -> list[FileSnapshot]:
    statement = (
        select(FileSnapshot)
        .where(FileSnapshot.file_id == file_id)
        .order_by(FileSnapshot.version.desc(), FileSnapshot.id.desc())
    )
    return list(session.exec(statement).all())
