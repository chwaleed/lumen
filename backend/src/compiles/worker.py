from __future__ import annotations

import logging
import os
import shutil
import subprocess
import time
from pathlib import Path

from sqlmodel import Session

from src.compiles.log_parser import count_errors, parse_log
from src.compiles.models import (
    STATUS_FAILURE,
    STATUS_SUCCESS,
    STATUS_TIMEOUT,
    CompileJob,
)
from src.compiles.service import (
    MaterialiseError,
    claim_next_job,
    materialise_project,
    project_source_paths,
    reap_stale_jobs,
    resolve_root_tex,
)
from src.core.config import Settings, get_settings
from src.core.security import utc_now
from src.db.session import get_engine
from src.file_entries.models import FileEntry
from src.projects.models import Project

logger = logging.getLogger(__name__)

# compile.sh maps a watchdog kill to 124; see compile/compile.sh.
EXIT_TIMEOUT = 124


def _count_errors(log_text: str, source_dir: Path | None = None) -> int:
    """Count real errors, after follow-on suppression and deduplication."""
    return count_errors(parse_log(log_text, source_dir))


def _work_dir(settings: Settings, project_id: int) -> Path:
    # Per project, not per job: the surviving .aux and .fdb_latexmk are what make
    # a rebuild ~7s instead of ~36s.
    return Path(settings.compile_work_dir) / str(project_id)


def run_job(session: Session, job: CompileJob, settings: Settings | None = None) -> CompileJob:
    settings = settings or get_settings()
    project = session.get(Project, job.project_id)
    if project is None:
        return _finish(session, job, STATUS_FAILURE, exit_code=None, duration_ms=0)

    work_dir = _work_dir(settings, project.id)
    started = time.monotonic()

    try:
        paths = materialise_project(session, project, settings, work_dir)
        root_path = None
        if job.root_file_id is not None:
            chosen = session.get(FileEntry, job.root_file_id)
            if chosen is not None:
                root_path = dict(
                    (entry.id, path) for entry, path in project_source_paths(session, project)
                ).get(chosen.id)
        root_tex = resolve_root_tex(paths, root_path)
    except MaterialiseError as exc:
        logger.warning("compile job %s could not be materialised: %s", job.id, exc)
        return _finish(
            session, job, STATUS_FAILURE, exit_code=None,
            duration_ms=int((time.monotonic() - started) * 1000),
        )

    cache_dir = Path(settings.compile_cache_dir)
    result = subprocess.run(  # noqa: S603 - fixed argv, no shell
        [
            settings.compile_script,
            "--work", str(work_dir),
            "--root", root_tex,
            "--engine", job.engine,
            "--deadline", str(settings.compile_timeout_seconds),
            "--cpus", settings.compile_cpus,
            "--mem", settings.compile_memory,
            "--cache", str(cache_dir),
        ],
        capture_output=True,
        text=True,
        # The container has its own deadline; this is only a backstop for a wedged
        # docker client, so it must be longer than the container's.
        timeout=settings.compile_timeout_seconds * 3,
        # The worker's own environment is inherited so `docker` stays on PATH.
        # This does not widen what the document can read: compile.sh passes only
        # the TEXMF* variables into the container, which verify.sh checks.
        env={
            **os.environ,
            "LUMEN_TEX_IMAGE": settings.tex_image,
            "LUMEN_SECOPT": settings.compile_security_opt,
        },
    )
    duration_ms = int((time.monotonic() - started) * 1000)

    stem = Path(root_tex).with_suffix("")
    produced = _collect_outputs(settings, job, work_dir, stem)
    log_text = ""
    if produced.get("log"):
        log_text = (Path(settings.compile_output_dir) / produced["log"]).read_text(
            encoding="utf-8", errors="replace"
        )

    if result.returncode == EXIT_TIMEOUT:
        status = STATUS_TIMEOUT
    elif produced.get("pdf") and result.returncode == 0:
        status = STATUS_SUCCESS
    else:
        status = STATUS_FAILURE

    return _finish(
        session, job, status,
        exit_code=result.returncode,
        duration_ms=duration_ms,
        error_count=_count_errors(log_text, work_dir) if log_text else None,
        **produced,
    )


def _collect_outputs(
    settings: Settings, job: CompileJob, work_dir: Path, stem: Path
) -> dict[str, str]:
    out_root = Path(settings.compile_output_dir) / str(job.id)
    out_root.mkdir(parents=True, exist_ok=True)
    produced: dict[str, str] = {}
    for key, suffix in (("pdf", ".pdf"), ("log", ".log"), ("synctex", ".synctex.gz")):
        source = work_dir / f"{stem}{suffix}"
        if source.exists():
            target = out_root / source.name
            shutil.copy2(source, target)
            produced[key] = str(target.relative_to(settings.compile_output_dir))
    return produced


def _finish(
    session: Session,
    job: CompileJob,
    status: str,
    *,
    exit_code: int | None,
    duration_ms: int,
    error_count: int | None = None,
    pdf: str | None = None,
    log: str | None = None,
    synctex: str | None = None,
) -> CompileJob:
    job.status = status
    job.exit_code = exit_code
    job.duration_ms = duration_ms
    job.error_count = error_count
    job.pdf_path = pdf
    job.log_path = log
    job.synctex_path = synctex
    job.finished_at = utc_now()
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def run_once(settings: Settings | None = None) -> CompileJob | None:
    """Claim and run a single job. Returns None when the queue is empty."""
    settings = settings or get_settings()
    with Session(get_engine(settings)) as session:
        job = claim_next_job(session)
        if job is None:
            return None
        return run_job(session, job, settings)


def main() -> None:  # pragma: no cover - process entrypoint
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    settings = get_settings()
    logger.info("compile worker started, image=%s", settings.tex_image)
    while True:
        try:
            with Session(get_engine(settings)) as session:
                reaped = reap_stale_jobs(session, settings.compile_timeout_seconds)
                if reaped:
                    logger.warning("reaped %s stale job(s)", reaped)
            job = run_once(settings)
        except Exception:
            logger.exception("compile worker iteration failed")
            job = None
        if job is None:
            time.sleep(settings.compile_poll_seconds)
        else:
            logger.info(
                "job %s %s in %sms (exit=%s, errors=%s)",
                job.id, job.status, job.duration_ms, job.exit_code, job.error_count,
            )


if __name__ == "__main__":  # pragma: no cover
    main()
