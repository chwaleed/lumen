"""The zip trust boundary.

Every test here builds a real zip in memory rather than asserting on a mock:
the things that matter (flag bits, external_attr, lying headers) only exist in
the actual container format.
"""
import stat
import zipfile
from io import BytesIO
from pathlib import PurePosixPath

import pytest

from src.archives.service import ArchiveError, read_archive
from src.core.config import Settings


def make_zip(files: dict[str, bytes | str], *, directories: tuple[str, ...] = ()) -> bytes:
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name in directories:
            archive.writestr(zipfile.ZipInfo(name), b"")
        for name, content in files.items():
            archive.writestr(name, content)
    return buffer.getvalue()


def paths(entries) -> list[str]:
    return [str(entry.path) for entry in entries]


class TestReadsRealArchives:
    def test_returns_each_file_with_its_relative_path(self, settings: Settings) -> None:
        data = make_zip(
            {
                "main.tex": "\\documentclass{article}",
                "chapters/intro.tex": "Hello",
                "figures/plot.png": b"\x89PNG\r\n",
            }
        )

        entries = read_archive(data, settings)

        assert sorted(paths(entries)) == [
            "chapters/intro.tex",
            "figures/plot.png",
            "main.tex",
        ]
        body = {str(e.path): e.data for e in entries}
        assert body["main.tex"] == b"\\documentclass{article}"

    def test_keeps_a_single_top_level_file(self, settings: Settings) -> None:
        # The common-root strip must not eat the only file's name.
        entries = read_archive(make_zip({"main.tex": "x"}), settings)

        assert paths(entries) == ["main.tex"]

    def test_strips_the_folder_that_wraps_everything(self, settings: Settings) -> None:
        # What "compress this folder" produces; keeping it would add a level to
        # every imported project.
        data = make_zip({"thesis/main.tex": "x", "thesis/chapters/one.tex": "y"})

        entries = read_archive(data, settings)

        assert sorted(paths(entries)) == ["chapters/one.tex", "main.tex"]

    def test_keeps_top_level_folders_when_there_is_more_than_one(
        self, settings: Settings
    ) -> None:
        data = make_zip({"src/main.tex": "x", "figures/a.png": b"\x89PNG"})

        entries = read_archive(data, settings)

        assert sorted(paths(entries)) == ["figures/a.png", "src/main.tex"]

    def test_ignores_directory_entries(self, settings: Settings) -> None:
        data = make_zip({"a/main.tex": "x"}, directories=("a/", "a/empty/"))

        entries = read_archive(data, settings)

        assert paths(entries) == ["main.tex"]

    def test_skips_the_rubbish_finder_and_explorer_add(self, settings: Settings) -> None:
        data = make_zip(
            {
                "main.tex": "x",
                "__MACOSX/._main.tex": b"junk",
                ".DS_Store": b"junk",
                "figures/Thumbs.db": b"junk",
                "._main.tex": b"junk",
            }
        )

        entries = read_archive(data, settings)

        assert paths(entries) == ["main.tex"]

    def test_preserves_bytes_exactly(self, settings: Settings) -> None:
        blob = bytes(range(256))

        entries = read_archive(make_zip({"a/fig.png": blob}), settings)

        assert entries[0].data == blob


class TestRefusesHostileArchives:
    @pytest.mark.parametrize(
        "name",
        [
            "../escape.tex",
            "a/../../escape.tex",
            "/etc/passwd",
            "..\\..\\escape.tex",
            "C:\\Windows\\system.ini",
        ],
    )
    def test_refuses_paths_that_leave_the_project(
        self, settings: Settings, name: str
    ) -> None:
        with pytest.raises(ArchiveError):
            read_archive(make_zip({name: "x"}), settings)

    def test_refuses_a_symlink(self, settings: Settings) -> None:
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            info = zipfile.ZipInfo("link.tex")
            info.external_attr = (stat.S_IFLNK | 0o777) << 16
            archive.writestr(info, "/etc/passwd")

        with pytest.raises(ArchiveError, match="symbolic link"):
            read_archive(buffer.getvalue(), settings)

    def test_refuses_an_encrypted_entry(self, settings: Settings) -> None:
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr("secret.tex", "x")
            # writestr recomputes the flags, so the encrypted bit has to be set
            # on the record close() writes into the central directory.
            archive.filelist[-1].flag_bits |= 0x1

        with pytest.raises(ArchiveError, match="password-protected"):
            read_archive(buffer.getvalue(), settings)

    def test_refuses_something_that_is_not_a_zip(self, settings: Settings) -> None:
        with pytest.raises(ArchiveError, match="not a readable zip"):
            read_archive(b"\\documentclass{article}", settings)

    def test_refuses_an_empty_upload(self, settings: Settings) -> None:
        with pytest.raises(ArchiveError, match="empty"):
            read_archive(b"", settings)

    def test_refuses_an_archive_with_nothing_in_it(self, settings: Settings) -> None:
        with pytest.raises(ArchiveError, match="no files"):
            read_archive(make_zip({}, directories=("empty/",)), settings)

    def test_refuses_too_many_entries(
        self, settings: Settings, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(settings, "archive_max_entries", 3)

        with pytest.raises(ArchiveError, match="more than 3 files"):
            read_archive(make_zip({f"f{i}.tex": "x" for i in range(4)}), settings)

    def test_refuses_a_file_over_the_per_file_ceiling(
        self, settings: Settings, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(settings, "upload_max_file_bytes", 1024)

        with pytest.raises(ArchiveError, match="larger than"):
            read_archive(make_zip({"big.tex": "x" * 2048}), settings)

    def test_refuses_a_bomb_whose_header_tells_the_truth(
        self, settings: Settings, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(settings, "archive_max_total_bytes", 4096)

        # Highly compressible, so the zip is tiny and only the declared size
        # gives it away.
        data = make_zip({f"f{i}.tex": "a" * 2048 for i in range(4)})

        with pytest.raises(ArchiveError, match="expands to more than"):
            read_archive(data, settings)

    def test_refuses_an_archive_whose_headers_do_not_match_its_contents(
        self, settings: Settings
    ) -> None:
        # The central directory is attacker-controlled, so the declared sizes
        # cannot be trusted. Here they are rewritten to understate the payload,
        # which is how a bomb hides from a header-only check. zipfile notices at
        # read time -- the thing being asserted is that its BadZipFile comes
        # back as a refusal rather than a 500.
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("f0.tex", "a" * 2048)

        truthful = buffer.getvalue()
        lying = truthful.replace((2048).to_bytes(4, "little"), (1).to_bytes(4, "little"))

        # Confirm the lie took, so the test cannot pass for the wrong reason.
        with zipfile.ZipFile(BytesIO(lying)) as probe:
            assert sum(info.file_size for info in probe.infolist()) == 1

        with pytest.raises(ArchiveError, match="damaged"):
            read_archive(lying, settings)


    def test_refuses_an_absurdly_deep_path(self, settings: Settings) -> None:
        deep = "/".join(f"d{i}" for i in range(40)) + "/main.tex"

        with pytest.raises(ArchiveError, match="nests deeper"):
            read_archive(make_zip({deep: "x"}), settings)

    def test_refuses_the_same_path_twice(self, settings: Settings) -> None:
        # Two entries differing only in case collide on a case-insensitive
        # filesystem, which is where the compile worker writes them.
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr("main.tex", "first")
            archive.writestr("Main.tex", "second")

        with pytest.raises(ArchiveError, match="more than once"):
            read_archive(buffer.getvalue(), settings)
