from __future__ import annotations

from pathlib import Path

from sqlmodel import Session, func, select

from src.compiles.models import (
    DEFAULT_ENGINE,
    ENGINES,
    STATUS_QUEUED,
    STATUS_RUNNING,
    TERMINAL_STATUSES,
    CompileJob,
)
from src.core.config import Settings, get_settings
from src.core.security import utc_now
from src.file_entries.models import FileEntry
from src.file_snapshots.models import FileSnapshot
from src.file_snapshots.service import get_latest_file_snapshot
from src.projects.models import Project
from src.shared.project_files import (
    ProjectFilesError,
    fetch_uploaded_bytes,
    project_source_paths,
)

MANIFEST_NAME = ".lumen-manifest"
# How many queued jobs to consider before giving up on finding one whose owner is
# under their concurrency limit.
_CLAIM_CANDIDATES = 50
TEX_SUFFIXES = (".tex", ".ltx")

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
            data = fetch_uploaded_bytes(entry.file_url, settings)
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
        raise ProjectFilesError("Project contains no .tex file to compile.")
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


def running_jobs_per_user(session: Session) -> dict[int, int]:
    """How many compiles each user currently has in flight."""
    rows = session.exec(
        select(Project.user_id, func.count(CompileJob.id))
        .join(CompileJob, CompileJob.project_id == Project.id)
        .where(CompileJob.status == STATUS_RUNNING)
        .group_by(Project.user_id)
    ).all()
    return {user_id: int(count) for user_id, count in rows}


def claim_next_job(session: Session, settings: Settings | None = None) -> CompileJob | None:
    """Take the oldest queued job its owner is allowed to run, or None.

    Postgres is the queue. `FOR UPDATE SKIP LOCKED` lets several workers pull from
    one table without coordinating, which is why this needs no Redis: the job row
    is already the source of truth the API polls, and a second store could only
    disagree with it.

    The per-user limit is applied in two steps rather than one join. Postgres
    refuses `FOR UPDATE` against the nullable side of an outer join, and that
    path could not be covered by a suite that runs on SQLite -- so candidates are
    read first, filtered in Python, and only the chosen row is locked.
    """
    limit = (settings or get_settings()).compile_max_concurrent_per_user

    candidates = session.exec(
        select(CompileJob.id, Project.user_id)
        .join(Project, Project.id == CompileJob.project_id)
        .where(CompileJob.status == STATUS_QUEUED)
        .order_by(CompileJob.created_at, CompileJob.id)
        .limit(_CLAIM_CANDIDATES)
    ).all()
    if not candidates:
        return None

    in_flight = running_jobs_per_user(session)
    chosen_id: int | None = None
    for job_id, user_id in candidates:
        if in_flight.get(user_id, 0) < limit:
            chosen_id = job_id
            break

    # Every queued job belongs to a user already at their limit: leave them all
    # queued rather than starving the fleet, and try again on the next tick.
    if chosen_id is None:
        return None

    statement = select(CompileJob).where(
        CompileJob.id == chosen_id, CompileJob.status == STATUS_QUEUED
    )
    if session.bind is not None and session.bind.dialect.name == "postgresql":
        statement = statement.with_for_update(skip_locked=True)

    job = session.exec(statement).first()
    # Another worker claimed it between the read and the lock.
    if job is None:
        return None

    job.status = STATUS_RUNNING
    job.started_at = utc_now()
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def project_size_bytes(session: Session, project_id: int) -> int:
    """Total bytes a compile would materialise: uploaded assets plus live text.

    Only the newest snapshot of each file counts -- the history is append-only
    and is not written to disk.
    """
    uploaded = session.exec(
        select(func.coalesce(func.sum(FileEntry.size_bytes), 0)).where(
            FileEntry.project_id == project_id
        )
    ).one()

    newest = (
        select(FileSnapshot.file_id, func.max(FileSnapshot.version).label("version"))
        .join(FileEntry, FileEntry.id == FileSnapshot.file_id)
        .where(FileEntry.project_id == project_id)
        .group_by(FileSnapshot.file_id)
        .subquery()
    )
    text = session.exec(
        select(func.coalesce(func.sum(func.length(FileSnapshot.content)), 0)).join(
            newest,
            (FileSnapshot.file_id == newest.c.file_id)
            & (FileSnapshot.version == newest.c.version),
        )
    ).one()

    return int(uploaded or 0) + int(text or 0)


def ensure_project_fits(session: Session, project_id: int, settings: Settings) -> None:
    """Reject an oversized project at submit, not after a worker has fetched it."""
    from fastapi import status as http_status

    from src.shared.project_access import projects_exception

    size = project_size_bytes(session, project_id)
    if size > settings.compile_max_project_bytes:
        limit_mb = settings.compile_max_project_bytes // (1024 * 1024)
        raise projects_exception(
            f"This project is {size // (1024 * 1024)} MB, past the {limit_mb} MB compile limit.",
            http_status.HTTP_413_CONTENT_TOO_LARGE,
        )


def queue_stats(session: Session) -> dict:
    """Depth, oldest wait and recent throughput.

    Queue depth backing up is the signal to add workers -- a far better one than
    a user count. See docs/product/ai-agent-vision.md.
    """
    from datetime import timedelta

    now = utc_now()
    depth = int(
        session.exec(
            select(func.count(CompileJob.id)).where(CompileJob.status == STATUS_QUEUED)
        ).one()
        or 0
    )
    running = int(
        session.exec(
            select(func.count(CompileJob.id)).where(CompileJob.status == STATUS_RUNNING)
        ).one()
        or 0
    )
    oldest_queued = session.exec(
        select(func.min(CompileJob.created_at)).where(CompileJob.status == STATUS_QUEUED)
    ).one()

    window_start = now - timedelta(minutes=1)
    finished_rows = session.exec(
        select(CompileJob.status, CompileJob.duration_ms).where(
            CompileJob.finished_at.is_not(None), CompileJob.finished_at >= window_start
        )
    ).all()
    durations = sorted(d for _, d in finished_rows if d is not None)

    def wait_seconds() -> float | None:
        if oldest_queued is None:
            return None
        oldest = oldest_queued
        if oldest.tzinfo is None:
            return max(0.0, (now.replace(tzinfo=None) - oldest).total_seconds())
        return max(0.0, (now - oldest).total_seconds())

    return {
        "queued": depth,
        "running": running,
        "oldest_wait_seconds": wait_seconds(),
        "completed_last_minute": len(finished_rows),
        "failed_last_minute": sum(1 for status, _ in finished_rows if status != "success"),
        "median_duration_ms": durations[len(durations) // 2] if durations else None,
    }


def snapshot_storage_stats(session: Session) -> dict:
    """Snapshot volume, so growth can be watched.

    ADR 0007 keeps full content per save and defers compressing it; this is the
    number that decides when that stops being the right call.
    """
    count = int(session.exec(select(func.count(FileSnapshot.id))).one() or 0)
    total = int(
        session.exec(select(func.coalesce(func.sum(func.length(FileSnapshot.content)), 0))).one()
        or 0
    )
    return {"snapshot_count": count, "snapshot_content_bytes": total}


def get_job_for_project(session: Session, project: Project, job_id: int) -> CompileJob:
    """A job, scoped to its project.

    Returns 404 for a job belonging to someone else's project, like every other
    resource here. See docs/decisions/0003-return-404-for-another-users-resource.md.
    """
    from fastapi import status as http_status

    from src.shared.project_access import projects_exception

    job = session.get(CompileJob, job_id)
    if job is None or job.project_id != project.id:
        raise projects_exception("Compile job not found.", http_status.HTTP_404_NOT_FOUND)
    return job


def cancel_job(session: Session, job: CompileJob) -> CompileJob:
    """Cancel a queued or running compile.

    A running one is stopped by killing its container by name -- which is why the
    name is recorded on the row. The kill is best effort: if this process cannot
    reach Docker (a split deployment where the API has no socket), the row still
    reads cancelled and `compile.sh`'s own deadline remains the backstop.
    """
    import subprocess

    from fastapi import status as http_status

    from src.compiles.models import STATUS_CANCELLED
    from src.shared.project_access import projects_exception

    if job.status in TERMINAL_STATUSES:
        raise projects_exception(
            f"This compile has already finished; it is {job.status}.",
            http_status.HTTP_409_CONFLICT,
        )

    if job.status == STATUS_RUNNING and job.container_name:
        try:
            subprocess.run(  # noqa: S603 - fixed argv, name is ours
                ["docker", "kill", job.container_name],
                capture_output=True,
                timeout=15,
                check=False,
            )
        except (OSError, subprocess.SubprocessError):
            # Logged by the caller's status; the deadline still applies.
            pass

    job.status = STATUS_CANCELLED
    job.finished_at = utc_now()
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def output_path(settings: Settings, relative: str) -> Path:
    """Resolve an output path, refusing anything outside the output directory."""
    root = Path(settings.compile_output_dir).resolve()
    resolved = (root / relative).resolve()
    if not resolved.is_relative_to(root):
        raise ProjectFilesError(f"Output path escapes the output directory: {relative!r}")
    return resolved


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
