import zipfile
from io import BytesIO

import pytest
from sqlmodel import Session

from src.archives.service import archive_file_name, build_project_archive
from src.core.config import Settings
from src.file_entries.models import FileEntry
from src.file_snapshots.service import create_file_snapshot
from src.projects.models import Project


@pytest.fixture()
def project(session: Session) -> Project:
    from src.auth.models import User

    user = User(name="Owner", email="owner@example.com", password_hash="x")
    session.add(user)
    session.flush()
    project = Project(name="Thesis", user_id=user.id)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def add_text_file(session: Session, project: Project, name: str, content: str, parent_id=None):
    entry = FileEntry(project_id=project.id, parent_id=parent_id, name=name, type="file")
    session.add(entry)
    session.flush()
    create_file_snapshot(session, entry.id, content)
    session.commit()
    return entry


def add_folder(session: Session, project: Project, name: str, parent_id=None):
    entry = FileEntry(project_id=project.id, parent_id=parent_id, name=name, type="folder")
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def read(payload: bytes) -> dict[str, bytes]:
    with zipfile.ZipFile(BytesIO(payload)) as archive:
        return {name: archive.read(name) for name in archive.namelist()}


class TestBuildProjectArchive:
    def test_writes_each_file_at_its_path_in_the_tree(
        self, session: Session, project: Project, settings: Settings
    ) -> None:
        add_text_file(session, project, "main.tex", "\\documentclass{article}")
        chapters = add_folder(session, project, "chapters")
        add_text_file(session, project, "intro.tex", "Chapter one", parent_id=chapters.id)

        contents = read(build_project_archive(session, project, settings))

        assert contents == {
            "main.tex": b"\\documentclass{article}",
            "chapters/intro.tex": b"Chapter one",
        }

    def test_exports_the_latest_snapshot_not_the_first(
        self, session: Session, project: Project, settings: Settings
    ) -> None:
        entry = add_text_file(session, project, "main.tex", "first draft")
        create_file_snapshot(session, entry.id, "second draft")
        session.commit()

        contents = read(build_project_archive(session, project, settings))

        assert contents["main.tex"] == b"second draft"

    def test_a_file_with_no_snapshot_exports_empty(
        self, session: Session, project: Project, settings: Settings
    ) -> None:
        entry = FileEntry(project_id=project.id, name="empty.tex", type="file")
        session.add(entry)
        session.commit()

        contents = read(build_project_archive(session, project, settings))

        assert contents == {"empty.tex": b""}

    def test_an_empty_project_produces_a_readable_empty_zip(
        self, session: Session, project: Project, settings: Settings
    ) -> None:
        # Not an error: a project with no files is a legal, if pointless, thing
        # to export, and a corrupt zip would be worse than an empty one.
        contents = read(build_project_archive(session, project, settings))

        assert contents == {}

    def test_preserves_utf8_content(
        self, session: Session, project: Project, settings: Settings
    ) -> None:
        add_text_file(session, project, "main.tex", "Grüße — ünïcode ✓")

        contents = read(build_project_archive(session, project, settings))

        assert contents["main.tex"].decode("utf-8") == "Grüße — ünïcode ✓"

    def test_an_empty_folder_contributes_nothing(
        self, session: Session, project: Project, settings: Settings
    ) -> None:
        add_text_file(session, project, "main.tex", "x")
        add_folder(session, project, "figures")

        contents = read(build_project_archive(session, project, settings))

        assert list(contents) == ["main.tex"]


class TestArchiveFileName:
    @pytest.mark.parametrize(
        ("project_name", "expected"),
        [
            ("Thesis", "Thesis.zip"),
            ("My Paper 2026", "My Paper 2026.zip"),
            ("chapters/intro", "chapters-intro.zip"),
            ("a:b*c?d", "a-b-c-d.zip"),
            ("   ", "project.zip"),
            ("", "project.zip"),
            # A leading dot would hide the download on unix.
            ("...", "project.zip"),
        ],
    )
    def test_produces_a_saveable_name(self, project_name: str, expected: str) -> None:
        assert archive_file_name(project_name) == expected
