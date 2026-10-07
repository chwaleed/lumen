from pathlib import Path

import pytest
from sqlmodel import Session, SQLModel

from src.auth.models import User
from src.compiles import models as _compile_models  # noqa: F401
from src.compiles.worker import _count_errors, _finish
from src.core.config import Settings
from src.db.session import _engines, get_engine
from src.file_entries import models as _file_entry_models  # noqa: F401
from src.file_snapshots import models as _file_snapshot_models  # noqa: F401
from src.projects.models import Project


@pytest.fixture()
def compile_session(tmp_path: Path):
    database_url = f"sqlite:///{(tmp_path / 'worker.db').as_posix()}"
    _engines.pop(database_url, None)
    engine = get_engine(Settings(database_url=database_url))
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    _engines.pop(database_url, None)


def _make_project(session: Session) -> Project:
    user = User(email="worker@example.com", password_hash="x", name="U")
    session.add(user)
    session.commit()
    session.refresh(user)
    project = Project(name="P", user_id=user.id, engine="pdflatex")
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


class TestCountErrors:
    def test_counts_file_line_errors(self) -> None:
        log = "./main.tex:4: Missing $ inserted.\n./sections/bad.tex:1: Undefined control sequence.\n"
        assert _count_errors(log) == 2

    def test_counts_errors_with_no_location(self) -> None:
        assert _count_errors("! File ended while scanning use of \\textbf .\n") == 1

    def test_ignores_ordinary_log_noise(self) -> None:
        log = (
            "This is pdfTeX, Version 3.141592653\n"
            "(/usr/local/texlive/2026/texmf-dist/tex/latex/base/article.cls)\n"
            "Output written on main.pdf (2 pages, 125743 bytes).\n"
        )
        assert _count_errors(log) == 0

    def test_a_clean_log_counts_zero(self) -> None:
        assert _count_errors("") == 0


class TestFinishDoesNotClobberACancellation:
    def test_a_cancelled_job_keeps_its_status(self, compile_session) -> None:
        # The API kills the container, which makes the compile fail. Writing that
        # failure over the cancellation would report something untrue.
        from src.compiles.models import STATUS_CANCELLED, STATUS_FAILURE
        from src.compiles.service import create_job

        project = _make_project(compile_session)
        job = create_job(compile_session, project)
        job.status = STATUS_CANCELLED
        compile_session.add(job)
        compile_session.commit()

        _finish(compile_session, job, STATUS_FAILURE, exit_code=137, duration_ms=800)

        compile_session.refresh(job)
        assert job.status == STATUS_CANCELLED
        # The measurements are still recorded.
        assert job.exit_code == 137
        assert job.duration_ms == 800

    def test_a_running_job_takes_the_new_status(self, compile_session) -> None:
        from src.compiles.models import STATUS_SUCCESS
        from src.compiles.service import create_job

        project = _make_project(compile_session)
        job = create_job(compile_session, project)
        job.status = "running"
        compile_session.add(job)
        compile_session.commit()

        _finish(compile_session, job, STATUS_SUCCESS, exit_code=0, duration_ms=1400)

        compile_session.refresh(job)
        assert job.status == STATUS_SUCCESS
