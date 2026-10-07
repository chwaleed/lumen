from __future__ import annotations

import re
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlparse

from sqlmodel import Session, select

from src.compiles.models import (
    DEFAULT_ENGINE,
    ENGINES,
    STATUS_QUEUED,
    STATUS_RUNNING,
    CompileJob,
)
from src.core.config import Settings
from src.core.security import utc_now
from src.file_entries.models import FileEntry
from src.file_snapshots.service import get_latest_file_snapshot
from src.projects.models import Project

MANIFEST_NAME = ".lumen-manifest"
TEX_SUFFIXES = (".tex", ".ltx")

# File names come from users, and materialising writes them to disk, so this is a
# trust boundary. Anything that could escape the work directory is rejected rather
# than sanitised, because a silently renamed file breaks \input in a way the user
# cannot see.
_UNSAFE_NAME = re.compile(r"(^$|^\.{1,2}$|[/\\\x00])")


class MaterialiseError(RuntimeError):
    """A project could not be written to disk safely."""


def _safe_component(name: str) -> str:
    if _UNSAFE_NAME.search(name):
        raise MaterialiseError(f"Unsafe file or folder name: {name!r}")
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
        # The tree is an adjacency list guarded against cycles on write, but a
        # depth cap means a corrupt row cannot hang the worker.
        if depth > 64:
            raise MaterialiseError("Project tree is nested too deeply.")
        for entry in sorted(by_parent.get(parent_id, []), key=lambda e: (e.name or "")):
            path = prefix / _safe_component(entry.name)
            if entry.type == "folder":
                walk(entry.id, path, depth + 1)
            else:
                out.append((entry, str(path)))

    walk(None, PurePosixPath(), 0)
    return out


def _fetch_uploaded_bytes(file_url: str, settings: Settings) -> bytes:
    """Read an uploaded asset back out of S3 by the URL stored on the entry."""
    import boto3  # imported lazily: materialising text-only projects needs no AWS

    key = unquote(urlparse(file_url).path).lstrip("/")
    if not key:
        raise MaterialiseError(f"Cannot derive an object key from {file_url!r}")
    body = boto3.client("s3", region_name=settings.s3_region).get_object(
        Bucket=settings.s3_bucket_name, Key=key
    )["Body"]
    return body.read()


def materialise_project(
    session: Session,
    project: Project,
    settings: Settings,
    work_dir: Path,
) -> list[str]:
    """Write the project's current files into work_dir, and return their paths.

    work_dir is reused across compiles so latexmk's .aux and .fdb_latexmk survive;
    anything materialised by a previous run and since deleted is pruned, while
    latexmk's own artifacts are left alone.
    """
    work_dir.mkdir(parents=True, exist_ok=True)
    written: list[str] = []

    for entry, rel_path in project_source_paths(session, project):
        target = work_dir / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        if entry.file_url:
            data = _fetch_uploaded_bytes(entry.file_url, settings)
            if not target.exists() or target.read_bytes() != data:
                target.write_bytes(data)
        else:
            snapshot = get_latest_file_snapshot(session, entry.id)
            content = "" if snapshot is None else snapshot.content
            # Only rewrite changed files: an unchanged mtime keeps latexmk from
            # redoing work it has already done.
            if not target.exists() or target.read_text(encoding="utf-8", errors="replace") != content:
                target.write_text(content, encoding="utf-8")
        written.append(rel_path)

    _prune_removed(work_dir, written)
    return written


def _prune_removed(work_dir: Path, written: list[str]) -> None:
    manifest = work_dir / MANIFEST_NAME
    previous = (
        manifest.read_text(encoding="utf-8").splitlines() if manifest.exists() else []
    )
    for stale in set(previous) - set(written):
        path = work_dir / stale
        if path.is_file():
            path.unlink()
    manifest.write_text("\n".join(written), encoding="utf-8")


def resolve_root_tex(paths: list[str], root_file_path: str | None = None) -> str:
    """Pick the file to compile: the chosen one, else main.tex, else any .tex."""
    if root_file_path and root_file_path in paths:
        return root_file_path
    tex = [p for p in paths if p.lower().endswith(TEX_SUFFIXES)]
    if not tex:
        raise MaterialiseError("Project contains no .tex file to compile.")
    for candidate in tex:
        if candidate.lower() == "main.tex":
            return candidate
    # Shallowest, then alphabetical, so a root file beats a chapter.
    return sorted(tex, key=lambda p: (p.count("/"), p))[0]


def project_engine(project: Project) -> str:
    engine = getattr(project, "engine", None) or DEFAULT_ENGINE
    return engine if engine in ENGINES else DEFAULT_ENGINE


def create_job(
    session: Session,
    project: Project,
    *,
    root_file_id: int | None = None,
) -> CompileJob:
    job = CompileJob(
        project_id=project.id,
        root_file_id=root_file_id,
        engine=project_engine(project),
        status=STATUS_QUEUED,
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def claim_next_job(session: Session) -> CompileJob | None:
    """Take the oldest queued job, or None.

    Postgres is the queue. `FOR UPDATE SKIP LOCKED` lets several workers pull from
    one table without coordinating, which is why this needs no Redis: the job row
    is already the source of truth the API polls, and a second store could only
    disagree with it.
    """
    statement = (
        select(CompileJob)
        .where(CompileJob.status == STATUS_QUEUED)
        .order_by(CompileJob.created_at, CompileJob.id)
        .limit(1)
    )
    if session.bind is not None and session.bind.dialect.name == "postgresql":
        statement = statement.with_for_update(skip_locked=True)

    job = session.exec(statement).first()
    if job is None:
        return None

    job.status = STATUS_RUNNING
    job.started_at = utc_now()
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def reap_stale_jobs(session: Session, timeout_seconds: int) -> int:
    """Fail jobs whose worker died mid-compile.

    Without this a crashed worker leaves a row stuck in `running` for ever. It is
    also the wall-clock backstop: compile.sh kills its own container, but nothing
    else would notice a worker that was killed between claiming and finishing.
    """
    from datetime import timedelta

    from src.compiles.models import STATUS_FAILURE

    cutoff = utc_now() - timedelta(seconds=timeout_seconds * 2)
    stale = list(
        session.exec(
            select(CompileJob).where(
                CompileJob.status == STATUS_RUNNING,
                CompileJob.started_at < cutoff,
            )
        ).all()
    )
    for job in stale:
        job.status = STATUS_FAILURE
        job.finished_at = utc_now()
        session.add(job)
    if stale:
        session.commit()
    return len(stale)
