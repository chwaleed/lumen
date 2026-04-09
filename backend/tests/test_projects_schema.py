from pathlib import Path

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from src.auth.models import User
from src.core.config import Settings
from src.db.session import _engines, get_engine, init_db
from src.projects.models import FileEntry, Project


@pytest.fixture()
def schema_engine(tmp_path: Path):
    db_path = tmp_path / "projects-schema.db"
    database_url = f"sqlite:///{db_path.as_posix()}"
    settings = Settings(database_url=database_url)

    _engines.pop(database_url, None)
    init_db(settings)
    engine = get_engine(settings)

    try:
        yield engine
    finally:
        engine.dispose()
        _engines.pop(database_url, None)


def test_projects_user_fk_and_file_entry_constraints(schema_engine) -> None:
    inspector = inspect(schema_engine)

    assert "projects" in inspector.get_table_names()
    assert "file_entries" in inspector.get_table_names()
    assert {
        index["name"] for index in inspector.get_indexes("file_entries")
    } >= {"idx_file_entries_project_id", "idx_file_entries_parent_id"}

    with Session(schema_engine) as session:
        user = User(
            email="schema-test@example.com",
            password_hash="hash",
            name="Schema Test",
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        project = Project(name="Demo", user_id=user.id)
        session.add(project)
        session.commit()
        session.refresh(project)

        folder = FileEntry(project_id=project.id, parent_id=None, name="src", type="folder")
        session.add(folder)
        session.commit()
        session.refresh(folder)

        file_entry = FileEntry(
            project_id=project.id,
            parent_id=folder.id,
            name="main.tex",
            type="file",
            mime_type="text/plain",
            content="\\documentclass{article}",
        )
        session.add(file_entry)
        session.commit()

        invalid_project = Project(name="Orphan Project", user_id=999999)
        session.add(invalid_project)
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()

        invalid_file_entry = FileEntry(
            project_id=project.id,
            parent_id=None,
            name="oops",
            type="document",
        )
        session.add(invalid_file_entry)
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()

        session.delete(user)
        session.commit()

        assert session.exec(select(Project)).all() == []
        assert session.exec(select(FileEntry)).all() == []
