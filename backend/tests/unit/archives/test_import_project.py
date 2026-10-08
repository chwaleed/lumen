import zipfile
from io import BytesIO

import boto3
import pytest
from moto import mock_aws
from sqlmodel import Session, select

from src.archives.service import ArchiveError, import_project
from src.auth.models import User
from src.core.config import Settings
from src.file_entries.models import FileEntry
from src.file_snapshots.service import get_latest_file_snapshot


@pytest.fixture()
def user(session: Session) -> User:
    user = User(name="Importer", email="importer@example.com", password_hash="x")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def make_zip(files: dict[str, bytes | str]) -> bytes:
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    return buffer.getvalue()


def tree(session: Session, project_id: int) -> dict[str, str]:
    """Every entry as path -> type, so assertions read like a directory listing."""
    entries = list(
        session.exec(select(FileEntry).where(FileEntry.project_id == project_id)).all()
    )
    by_id = {entry.id: entry for entry in entries}

    def path_of(entry: FileEntry) -> str:
        parts = [entry.name]
        parent_id = entry.parent_id
        while parent_id is not None:
            parent = by_id[parent_id]
            parts.append(parent.name)
            parent_id = parent.parent_id
        return "/".join(reversed(parts))

    return {path_of(entry): entry.type for entry in entries}


class TestImportsText:
    def test_creates_a_project_named_after_the_archive(
        self, session: Session, user: User, settings: Settings
    ) -> None:
        result = import_project(
            session, user, "My Thesis", make_zip({"main.tex": "x"}), settings
        )

        assert result.project.name == "My Thesis"
        assert result.project.user_id == user.id

    def test_files_become_editable_snapshots(
        self, session: Session, user: User, settings: Settings
    ) -> None:
        result = import_project(
            session, user, "T", make_zip({"main.tex": "\\documentclass{book}"}), settings
        )

        entry = session.exec(
            select(FileEntry).where(FileEntry.project_id == result.project.id)
        ).one()
        snapshot = get_latest_file_snapshot(session, entry.id)
        assert snapshot is not None
        assert snapshot.content == "\\documentclass{book}"
        # No file_url: the editor loads it from the snapshot, not from S3.
        assert entry.file_url is None

    def test_rebuilds_the_folder_tree(
        self, session: Session, user: User, settings: Settings
    ) -> None:
        data = make_zip(
            {
                "main.tex": "root",
                "chapters/one.tex": "one",
                "chapters/deep/two.tex": "two",
            }
        )

        result = import_project(session, user, "T", data, settings)

        assert tree(session, result.project.id) == {
            "main.tex": "file",
            "chapters": "folder",
            "chapters/one.tex": "file",
            "chapters/deep": "folder",
            "chapters/deep/two.tex": "file",
        }

    def test_creates_each_folder_once(
        self, session: Session, user: User, settings: Settings
    ) -> None:
        # main.tex at the root keeps "chapters" from being stripped as the
        # single wrapping folder.
        data = make_zip({"main.tex": "x", **{f"chapters/f{i}.tex": "x" for i in range(5)}})

        result = import_project(session, user, "T", data, settings)

        folders = [
            entry
            for entry in session.exec(
                select(FileEntry).where(FileEntry.project_id == result.project.id)
            ).all()
            if entry.type == "folder"
        ]
        assert len(folders) == 1

    def test_a_bibliography_stays_editable(
        self, session: Session, user: User, settings: Settings
    ) -> None:
        # .bib is an *upload* extension, but every template stores
        # references.bib as a snapshot. Import has to agree with the templates.
        result = import_project(
            session, user, "T", make_zip({"refs.bib": "@book{a}"}), settings
        )

        entry = session.exec(
            select(FileEntry).where(FileEntry.project_id == result.project.id)
        ).one()
        assert entry.file_url is None
        assert get_latest_file_snapshot(session, entry.id).content == "@book{a}"

    def test_falls_back_to_latin1_for_older_files(
        self, session: Session, user: User, settings: Settings
    ) -> None:
        # A cp1252 thesis must import rather than 500. latin-1 maps every byte,
        # so nothing is lost even when the glyphs are wrong.
        result = import_project(
            session, user, "T", make_zip({"main.tex": b"caf\xe9"}), settings
        )

        entry = session.exec(
            select(FileEntry).where(FileEntry.project_id == result.project.id)
        ).one()
        assert get_latest_file_snapshot(session, entry.id).content == "café"

    def test_reports_what_it_skipped(
        self, session: Session, user: User, settings: Settings
    ) -> None:
        data = make_zip(
            {"main.tex": "x", "Makefile": "all:", "main.synctex.gz": b"\x1f\x8b"}
        )

        result = import_project(session, user, "T", data, settings)

        assert result.imported == ["main.tex"]
        assert sorted(result.skipped) == ["Makefile", "main.synctex.gz"]

    def test_refuses_an_archive_with_nothing_importable(
        self, session: Session, user: User, settings: Settings
    ) -> None:
        with pytest.raises(ArchiveError, match="Nothing in that archive"):
            import_project(session, user, "T", make_zip({"Makefile": "all:"}), settings)


class TestImportsAssets:
    @mock_aws
    def test_figures_are_uploaded_and_linked(
        self, session: Session, user: User, settings: Settings
    ) -> None:
        boto3.client("s3", region_name=settings.s3_region).create_bucket(
            Bucket=settings.s3_bucket_name
        )
        png = b"\x89PNG\r\n\x1a\n" + b"0" * 32

        result = import_project(
            session, user, "T", make_zip({"main.tex": "x", "figures/plot.png": png}), settings
        )

        entry = session.exec(
            select(FileEntry).where(
                FileEntry.project_id == result.project.id, FileEntry.name == "plot.png"
            )
        ).one()
        assert entry.mime_type == "image/png"
        assert entry.size_bytes == len(png)
        assert entry.file_url is not None

        stored = boto3.client("s3", region_name=settings.s3_region).get_object(
            Bucket=settings.s3_bucket_name,
            Key=f"uploads/{result.project.id}/figures/plot.png",
        )
        assert stored["Body"].read() == png

    @mock_aws
    def test_same_named_figures_in_different_folders_both_survive(
        self, session: Session, user: User, settings: Settings
    ) -> None:
        # The uploads endpoint keys on the bare filename, which would store one
        # of these over the other. Import keys on the full path.
        boto3.client("s3", region_name=settings.s3_region).create_bucket(
            Bucket=settings.s3_bucket_name
        )
        data = make_zip(
            {
                "main.tex": "x",
                "chapters/fig.png": b"\x89PNGchapter",
                "appendix/fig.png": b"\x89PNGappendix",
            }
        )

        result = import_project(session, user, "T", data, settings)

        client = boto3.client("s3", region_name=settings.s3_region)
        base = f"uploads/{result.project.id}"
        assert client.get_object(Bucket=settings.s3_bucket_name, Key=f"{base}/chapters/fig.png")[
            "Body"
        ].read() == b"\x89PNGchapter"
        assert client.get_object(Bucket=settings.s3_bucket_name, Key=f"{base}/appendix/fig.png")[
            "Body"
        ].read() == b"\x89PNGappendix"

    @mock_aws
    def test_refuses_assets_beyond_the_project_limit(
        self, session: Session, user: User, settings: Settings, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        boto3.client("s3", region_name=settings.s3_region).create_bucket(
            Bucket=settings.s3_bucket_name
        )
        monkeypatch.setattr(settings, "project_max_bytes", 1024)

        data = make_zip({"main.tex": "x", "big.png": b"\x89PNG" + b"0" * 4096})

        with pytest.raises(ArchiveError, match="project limit"):
            import_project(session, user, "T", data, settings)


class TestRoundTrip:
    def test_an_exported_project_imports_back_identically(
        self, session: Session, user: User, settings: Settings
    ) -> None:
        from src.archives.service import build_project_archive

        original = make_zip(
            {"main.tex": "\\documentclass{article}", "chapters/one.tex": "Chapter"}
        )
        imported = import_project(session, user, "Round", original, settings)

        exported = build_project_archive(session, imported.project, settings)
        again = import_project(session, user, "Round 2", exported, settings)

        assert tree(session, again.project.id) == tree(session, imported.project.id)
        entry = session.exec(
            select(FileEntry).where(
                FileEntry.project_id == again.project.id, FileEntry.name == "main.tex"
            )
        ).one()
        assert get_latest_file_snapshot(session, entry.id).content == "\\documentclass{article}"
