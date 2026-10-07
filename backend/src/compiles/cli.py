"""Submit a compile for a project and run it inline.

    python -m src.compiles.cli <project_id> [--engine pdflatex] [--root main.tex]

M2's acceptance check: this returns a PDF for a real project, with no HTTP and no
worker process. The queue is exercised -- the job is created, claimed and finished
through the same code path the worker uses.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlmodel import Session, select

from src.compiles.models import ENGINES, STATUS_SUCCESS
from src.compiles.service import claim_next_job, create_job
from src.compiles.worker import run_job
from src.core.config import get_settings
from src.db.session import get_engine
from src.file_entries.models import FileEntry
from src.projects.models import Project


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m src.compiles.cli")
    parser.add_argument("project_id", type=int)
    parser.add_argument("--engine", choices=ENGINES, default=None)
    parser.add_argument("--root", default=None, help="root file name, e.g. main.tex")
    args = parser.parse_args(argv)

    settings = get_settings()
    with Session(get_engine(settings)) as session:
        project = session.get(Project, args.project_id)
        if project is None:
            print(f"project {args.project_id} not found", file=sys.stderr)
            return 1
        if args.engine:
            project.engine = args.engine
            session.add(project)
            session.commit()

        root_file_id = None
        if args.root:
            root_file_id = session.exec(
                select(FileEntry.id).where(
                    FileEntry.project_id == project.id,
                    FileEntry.name == args.root,
                    FileEntry.type == "file",
                )
            ).first()
            if root_file_id is None:
                print(f"no file named {args.root!r} in project", file=sys.stderr)
                return 1

        job = create_job(session, project, root_file_id=root_file_id)
        print(f"queued job {job.id} (engine={job.engine})")

        claimed = claim_next_job(session)
        if claimed is None or claimed.id != job.id:
            print("another worker claimed it first; run the worker to see the result")
            return 0

        job = run_job(session, claimed, settings)

    out = Path(settings.compile_output_dir)
    print(f"status      {job.status}")
    print(f"exit code   {job.exit_code}")
    print(f"duration    {job.duration_ms} ms")
    print(f"errors      {job.error_count}")
    for label, rel in (("pdf", job.pdf_path), ("log", job.log_path), ("synctex", job.synctex_path)):
        print(f"{label:11} {out / rel if rel else '-'}")
    return 0 if job.status == STATUS_SUCCESS else 1


if __name__ == "__main__":
    raise SystemExit(main())
