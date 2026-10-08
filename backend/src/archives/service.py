"""Reading a zip someone uploaded, without trusting any of it.

This is the trust boundary for import: every name, size and flag in a zip is
attacker-controlled, including the sizes in the central directory. Nothing here
touches the database -- the caller gets a list of safe relative paths and their
bytes, or an `ArchiveError` explaining the refusal.

The compile worker validates names *again* when it materialises a project to
disk. That is not redundant: this guards zip -> database, and that one guards
database -> filesystem. Either can be reached without the other.
"""
from __future__ import annotations

import re
import stat
import zipfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import PurePosixPath

from sqlmodel import Session

from src.auth.models import User
from src.core.config import Settings
from src.file_entries.models import FileEntry
from src.file_snapshots.service import create_file_snapshot
from src.projects.models import Project
from src.shared.project_access import clean_name
from src.shared.project_files import entry_bytes, project_source_paths
from src.uploads.service import ALLOWED_EXTENSIONS, object_url

# Finder adds these to every zip made from the context menu, and no user means
# to import them.
_JUNK_PREFIXES = ("__MACOSX/",)
_JUNK_NAMES = (".DS_Store", "Thumbs.db", "desktop.ini")

# A name that cannot become a `file_entries.name`. Mirrors the materialiser's
# rule, and adds the Windows-reserved characters a zip from Explorer can carry.
_UNSAFE_COMPONENT = re.compile(r'(^$|^\.{1,2}$|[/\\\x00:*?"<>|])')

_WINDOWS_DRIVE = re.compile(r"^[A-Za-z]:")

# The materialiser caps nesting at 64. Refusing earlier gives a message that
# names the archive rather than failing later during a compile.
MAX_DEPTH = 32


class ArchiveError(Exception):
    """The archive cannot be read safely. The message is shown to the user."""


@dataclass(frozen=True)
class ArchiveEntry:
    path: PurePosixPath
    data: bytes

    @property
    def name(self) -> str:
        return self.path.name


def _is_junk(name: str) -> bool:
    if name.startswith(_JUNK_PREFIXES):
        return True
    tail = name.rsplit("/", 1)[-1]
    # AppleDouble sidecars: "._main.tex" next to "main.tex".
    return tail in _JUNK_NAMES or tail.startswith("._")


def _safe_path(raw_name: str) -> PurePosixPath:
    """Turn a zip entry name into a relative path, or refuse it.

    Refuses rather than sanitises. A silently renamed file breaks \\input in a
    way the user cannot see from the editor.
    """
    # Some Windows tools write backslashes despite the spec saying forward
    # slashes. Treating them as separators is what makes "..\\..\\x" traversal
    # rather than a legal single filename.
    name = raw_name.replace("\\", "/")

    if name.startswith("/") or _WINDOWS_DRIVE.match(name):
        raise ArchiveError(f"Archive contains an absolute path: {raw_name!r}")

    components = [part for part in name.split("/") if part != ""]
    if not components:
        raise ArchiveError("Archive contains an entry with no name.")

    for component in components:
        if _UNSAFE_COMPONENT.search(component):
            raise ArchiveError(f"Archive contains an unusable name: {raw_name!r}")

    if len(components) > MAX_DEPTH:
        raise ArchiveError(f"Archive nests deeper than {MAX_DEPTH} folders: {raw_name!r}")

    return PurePosixPath(*components)


def _reject_unreadable(info: zipfile.ZipInfo) -> None:
    # Bit 0 of the general purpose flag means the entry is encrypted; reading it
    # would raise a bare RuntimeError from zipfile.
    if info.flag_bits & 0x1:
        raise ArchiveError(
            f"Archive is password-protected: {info.filename!r}. Export it without encryption."
        )

    # Zips carry unix mode bits in the top 16 of external_attr. A symlink's
    # "content" is its target path, so importing one would file a pointer to a
    # host file as if it were the user's document.
    mode = info.external_attr >> 16
    if mode and stat.S_ISLNK(mode):
        raise ArchiveError(f"Archive contains a symbolic link: {info.filename!r}")


def _strip_common_root(entries: list[ArchiveEntry]) -> list[ArchiveEntry]:
    """Drop the wrapping folder that "compress this folder" produces.

    Only when every entry is inside the same one: a zip holding a single
    top-level `main.tex` must keep it.
    """
    if len(entries) < 1:
        return entries
    roots = {entry.path.parts[0] for entry in entries}
    if len(roots) != 1 or any(len(entry.path.parts) < 2 for entry in entries):
        return entries
    return [
        ArchiveEntry(path=PurePosixPath(*entry.path.parts[1:]), data=entry.data)
        for entry in entries
    ]


def read_archive(data: bytes, settings: Settings) -> list[ArchiveEntry]:
    """Every usable file in the archive, with safe relative paths.

    Directories are not returned: an empty folder carries nothing, and every
    folder that holds a file is implied by that file's path.
    """
    if not data:
        raise ArchiveError("The uploaded file is empty.")

    try:
        archive = zipfile.ZipFile(BytesIO(data))
    except zipfile.BadZipFile as error:
        raise ArchiveError("That file is not a readable zip archive.") from error

    infos = [info for info in archive.infolist() if not info.is_dir()]
    infos = [info for info in infos if not _is_junk(info.filename)]

    if len(infos) > settings.archive_max_entries:
        raise ArchiveError(
            f"Archive holds more than {settings.archive_max_entries} files."
        )

    # A cheap first pass on the declared sizes. The headers can lie, so the read
    # below enforces the same ceilings again on the bytes that actually arrive.
    declared_total = sum(info.file_size for info in infos)
    if declared_total > settings.archive_max_total_bytes:
        raise ArchiveError(
            f"Archive expands to more than "
            f"{settings.archive_max_total_bytes // (1024 * 1024)} MB."
        )

    entries: list[ArchiveEntry] = []
    seen: set[str] = set()
    total = 0

    for info in infos:
        _reject_unreadable(info)
        path = _safe_path(info.filename)

        key = str(path).lower()
        if key in seen:
            raise ArchiveError(f"Archive contains {str(path)!r} more than once.")
        seen.add(key)

        try:
            with archive.open(info) as handle:
                # One byte past the limit is enough to know it is over it, and
                # keeps a lying header from allocating the whole bomb.
                payload = handle.read(settings.upload_max_file_bytes + 1)
        except (zipfile.BadZipFile, EOFError, ValueError) as error:
            # Reached when an entry's real contents disagree with its headers --
            # a truncated upload, or a tampered central directory. zipfile only
            # notices at read time, and its BadZipFile would otherwise surface
            # as a 500.
            raise ArchiveError(
                f"Archive is damaged and {str(path)!r} could not be read."
            ) from error
        if len(payload) > settings.upload_max_file_bytes:
            raise ArchiveError(
                f"{str(path)!r} is larger than "
                f"{settings.upload_max_file_bytes // (1024 * 1024)} MB."
            )

        # Belt and braces. In practice an entry whose real size exceeds its
        # declared one trips zipfile's CRC check above, so this is reached only
        # if that ever stops holding -- which is exactly when it would matter.
        total += len(payload)
        if total > settings.archive_max_total_bytes:
            raise ArchiveError(
                f"Archive expands to more than "
                f"{settings.archive_max_total_bytes // (1024 * 1024)} MB."
            )

        entries.append(ArchiveEntry(path=path, data=payload))

    if not entries:
        raise ArchiveError("The archive has no files in it.")

    return _strip_common_root(entries)


# Windows forbids these outright, and a zip named with one cannot be saved.
_UNSAFE_FILENAME = re.compile(r'[/\\\x00:*?"<>|]')


def archive_file_name(project_name: str) -> str:
    """The name the downloaded zip is saved under."""
    cleaned = _UNSAFE_FILENAME.sub("-", project_name).strip().strip(".")
    return f"{cleaned or 'project'}.zip"


# Imported as editable snapshots rather than as S3 assets.
#
# This deliberately disagrees with `uploads.ALLOWED_EXTENSIONS`, which treats
# .bib, .cls and friends as uploads. An uploaded file is read back from S3 and
# cannot be edited, which is right for a figure and wrong for a bibliography --
# and every project we create from a template already stores references.bib as
# a snapshot. Import has to agree with the templates, not with uploads.
TEXT_SUFFIXES = frozenset(
    {".tex", ".ltx", ".bib", ".cls", ".sty", ".bst", ".cfg", ".clo", ".def", ".ldf", ".txt"}
)

_SUFFIX_MIME = {".tex": "text/x-tex", ".ltx": "text/x-tex"}


@dataclass
class ImportResult:
    project: Project
    imported: list[str]
    skipped: list[str]


def _decode(data: bytes) -> str:
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        # ponytail: latin-1 fallback, no charset detection. Plenty of older
        # theses are cp1252/latin-1, and latin-1 maps every byte to a character
        # so nothing is lost -- worst case the user sees mojibake and can fix
        # it, which beats refusing the import or silently dropping bytes.
        return data.decode("latin-1")


def _put_asset(key: str, data: bytes, content_type: str, settings: Settings) -> None:
    import boto3  # lazily, so importing a text-only project needs no AWS

    boto3.client("s3", region_name=settings.s3_region).put_object(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=data,
        ContentType=content_type,
    )


def import_project(
    session: Session,
    user: User,
    project_name: str,
    data: bytes,
    settings: Settings,
) -> ImportResult:
    """Create a new project from an uploaded zip.

    Always a new project: importing into an existing one needs merge semantics
    (replace? union? what about conflicts?) that are a separate design problem.
    """
    entries = read_archive(data, settings)

    assets_total = sum(
        len(entry.data)
        for entry in entries
        if entry.path.suffix.lower() not in TEXT_SUFFIXES
        and entry.path.suffix.lower() in ALLOWED_EXTENSIONS
    )
    if assets_total > settings.project_max_bytes:
        raise ArchiveError(
            f"The archive's assets exceed the "
            f"{settings.project_max_bytes // (1024 * 1024)} MB project limit."
        )

    project = Project(name=clean_name(project_name, field_name="Project name"), user_id=user.id)
    session.add(project)
    session.flush()

    folders: dict[PurePosixPath, int | None] = {PurePosixPath("."): None}

    def folder_id_for(path: PurePosixPath) -> int | None:
        """mkdir -p, memoised, so a deep path creates each level once."""
        if path in folders:
            return folders[path]
        parent_id = folder_id_for(path.parent) if path.parent != path else None
        entry = FileEntry(
            project_id=project.id, parent_id=parent_id, name=path.name, type="folder"
        )
        session.add(entry)
        session.flush()
        folders[path] = entry.id
        return entry.id

    imported: list[str] = []
    skipped: list[str] = []

    for archive_entry in entries:
        suffix = archive_entry.path.suffix.lower()
        rel_path = str(archive_entry.path)
        parent_id = folder_id_for(archive_entry.path.parent)

        if suffix in TEXT_SUFFIXES:
            entry = FileEntry(
                project_id=project.id,
                parent_id=parent_id,
                name=archive_entry.name,
                type="file",
                mime_type=_SUFFIX_MIME.get(suffix, "text/plain"),
            )
            session.add(entry)
            session.flush()
            create_file_snapshot(session, entry.id, _decode(archive_entry.data))
            imported.append(rel_path)
            continue

        content_type = ALLOWED_EXTENSIONS.get(suffix)
        if content_type is None:
            # Not fatal. A real project carries .gitignore, Makefile, .synctex.gz
            # and build leftovers, and refusing the whole import over them would
            # make the feature useless.
            skipped.append(rel_path)
            continue

        # Keyed by full path, unlike `uploads`, which keys on the bare filename:
        # a real project has chapters/fig.png and appendix/fig.png, and a flat
        # key would silently overwrite one with the other.
        object_key = f"uploads/{project.id}/{rel_path}"
        _put_asset(object_key, archive_entry.data, content_type, settings)
        entry = FileEntry(
            project_id=project.id,
            parent_id=parent_id,
            name=archive_entry.name,
            type="file",
            mime_type=content_type,
            file_url=object_url(settings.s3_bucket_name, object_key),
            size_bytes=len(archive_entry.data),
        )
        session.add(entry)
        session.flush()
        imported.append(rel_path)

    if not imported:
        raise ArchiveError(
            "Nothing in that archive could be imported. "
            f"Skipped: {', '.join(skipped[:10])}"
        )

    session.commit()
    session.refresh(project)
    return ImportResult(project=project, imported=imported, skipped=skipped)


def build_project_archive(session: Session, project: Project, settings: Settings) -> bytes:
    """Every source file in the project, as a zip.

    Sources only. The compiled PDF has its own download, and a zip that
    contained one would re-import as an uneditable asset shadowing the .tex
    that produced it.
    """
    buffer = BytesIO()
    # ZIP_DEFLATED, not ZIP_STORED: a LaTeX project is mostly text, and the
    # bytes here are already held in memory either way.
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for entry, rel_path in project_source_paths(session, project):
            archive.writestr(rel_path, entry_bytes(session, entry, settings))
    return buffer.getvalue()
