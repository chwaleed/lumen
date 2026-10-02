from pathlib import Path

import pytest
from sqlmodel import Session, SQLModel

from src.auth.models import User
from src.core.config import Settings
from src.db.session import _engines, get_engine
from src.file_entries import models as _file_entry_models  # noqa: F401
from src.file_snapshots import models as _file_snapshot_models  # noqa: F401
from src.file_snapshots.schemas import MonacoContentChange
from src.file_snapshots.service import create_file_snapshot, create_file_snapshot_from_monaco_changes
from src.projects.models import Project


@pytest.fixture()
def snapshot_engine(tmp_path: Path):
    db_path = tmp_path / "file-snapshots.db"
    database_url = f"sqlite:///{db_path.as_posix()}"
    settings = Settings(database_url=database_url)

    _engines.pop(database_url, None)
    engine = get_engine(settings)
    SQLModel.metadata.create_all(engine)

    try:
        yield engine
    finally:
        engine.dispose()
        _engines.pop(database_url, None)


def test_create_file_snapshot_from_monaco_changes_uses_latest_snapshot_content(snapshot_engine) -> None:
    from src.file_entries.models import FileEntry

    with Session(snapshot_engine) as session:
        user = User(
            email="snapshots@example.com",
            password_hash="hash",
            name="Snapshot User",
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        project = Project(name="Snapshot Project", user_id=user.id)
        session.add(project)
        session.commit()
        session.refresh(project)

        file_entry = FileEntry(
            project_id=project.id,
            parent_id=None,
            name="main.tex",
            type="file",
            mime_type="text/x-tex",
            file_url=None,
        )
        session.add(file_entry)
        session.commit()
        session.refresh(file_entry)

        initial_snapshot = create_file_snapshot(session, file_entry.id, "Hello world")
        session.commit()
        session.refresh(initial_snapshot)

        updated_snapshot = create_file_snapshot_from_monaco_changes(
            session,
            file_entry.id,
            [
                MonacoContentChange(range_offset=6, range_length=5, text="Lumen"),
                MonacoContentChange(range_offset=11, range_length=0, text="!"),
            ],
            base_version=initial_snapshot.version,
        )
        session.commit()
        session.refresh(updated_snapshot)

        assert updated_snapshot.version == initial_snapshot.version + 1
        assert updated_snapshot.content == "Hello Lumen!"
