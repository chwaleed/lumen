from sqlmodel import Session, select

from src.file_snapshots.models import FileSnapshot


def create_file_snapshot(session: Session, file_id: int, content: str) -> FileSnapshot:
    latest_snapshot = session.exec(
        select(FileSnapshot)
        .where(FileSnapshot.file_id == file_id)
        .order_by(FileSnapshot.version.desc(), FileSnapshot.id.desc())
    ).first()

    next_version = 1 if latest_snapshot is None else latest_snapshot.version + 1

    snapshot = FileSnapshot(
        file_id=file_id,
        content=content,
        version=next_version,
    )
    session.add(snapshot)
    return snapshot


def list_file_snapshots(session: Session, file_id: int) -> list[FileSnapshot]:
    statement = (
        select(FileSnapshot)
        .where(FileSnapshot.file_id == file_id)
        .order_by(FileSnapshot.version.desc(), FileSnapshot.id.desc())
    )
    return list(session.exec(statement).all())
