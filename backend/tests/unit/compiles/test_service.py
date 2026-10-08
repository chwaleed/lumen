from datetime import datetime, timedelta
from pathlib import Path

import pytest
from sqlmodel import Session, SQLModel

from src.auth.models import User
from src.compiles import models as _compile_models  # noqa: F401
from src.compiles.models import STATUS_QUEUED, STATUS_RUNNING, CompileJob
from src.compiles.service import (
    ProjectFilesError,
    claim_next_job,
    create_job,
    ensure_project_fits,
    materialise_project,
    project_size_bytes,
    project_source_paths,
    queue_stats,
    reap_stale_jobs,
    resolve_root_tex,
    running_jobs_per_user,
)
from src.core.config import Settings
from src.core.security import utc_now
from src.db.session import _engines, get_engine
from src.file_entries.models import FileEntry
from src.file_snapshots.models import FileSnapshot
from src.projects.models import Project


@pytest.fixture()
def compile_session(tmp_path: Path):
    database_url = f"sqlite:///{(tmp_path / 'compiles.db').as_posix()}"
    _engines.pop(database_url, None)
    engine = get_engine(Settings(database_url=database_url))
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    _engines.pop(database_url, None)


@pytest.fixture()
def settings(tmp_path: Path) -> Settings:
    return Settings(
        database_url="sqlite:///:memory:",
        compile_work_dir=str(tmp_path / "work"),
        compile_output_dir=str(tmp_path / "out"),
    )


def _project(session: Session, engine: str = "pdflatex") -> Project:
    user = User(email=f"u{utc_now().timestamp()}@example.com", password_hash="x", name="U")
    session.add(user)
    session.commit()
    session.refresh(user)
    project = Project(name="P", user_id=user.id, engine=engine)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def _file(session: Session, project: Project, name: str, content: str, parent_id=None) -> FileEntry:
    entry = FileEntry(project_id=project.id, parent_id=parent_id, name=name, type="file")
    session.add(entry)
    session.commit()
    session.refresh(entry)
    session.add(FileSnapshot(file_id=entry.id, content=content, version=1))
    session.commit()
    return entry


def _folder(session: Session, project: Project, name: str, parent_id=None) -> FileEntry:
    entry = FileEntry(project_id=project.id, parent_id=parent_id, name=name, type="folder")
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


class TestProjectSourcePaths:
    def test_nested_folders_become_relative_paths(self, compile_session: Session) -> None:
        project = _project(compile_session)
        _file(compile_session, project, "main.tex", "x")
        chapters = _folder(compile_session, project, "chapters")
        one = _folder(compile_session, project, "one", chapters.id)
        _file(compile_session, project, "intro.tex", "y", one.id)

        paths = {path for _, path in project_source_paths(compile_session, project)}
        assert paths == {"main.tex", "chapters/one/intro.tex"}

    def test_folders_are_not_materialised_as_files(self, compile_session: Session) -> None:
        project = _project(compile_session)
        _folder(compile_session, project, "empty")
        assert project_source_paths(compile_session, project) == []

    @pytest.mark.parametrize("name", ["..", "../escape.tex", "a/b.tex", "", "x\\y.tex"])
    def test_names_that_could_escape_the_work_dir_are_rejected(
        self, compile_session: Session, name: str
    ) -> None:
        # Materialising writes user-supplied names to disk, so this is a trust
        # boundary: reject rather than sanitise.
        project = _project(compile_session)
        _file(compile_session, project, name, "x")
        with pytest.raises(ProjectFilesError):
            project_source_paths(compile_session, project)


class TestResolveRootTex:
    def test_prefers_main_tex(self) -> None:
        assert resolve_root_tex(["a.tex", "main.tex", "z.tex"]) == "main.tex"

    def test_prefers_shallowest_when_no_main(self) -> None:
        assert resolve_root_tex(["deep/one/a.tex", "b.tex"]) == "b.tex"

    def test_honours_an_explicit_root(self) -> None:
        assert resolve_root_tex(["main.tex", "thesis.tex"], "thesis.tex") == "thesis.tex"

    def test_ignores_an_explicit_root_that_is_not_present(self) -> None:
        assert resolve_root_tex(["main.tex"], "gone.tex") == "main.tex"

    def test_raises_without_any_tex(self) -> None:
        with pytest.raises(ProjectFilesError):
            resolve_root_tex(["refs.bib", "logo.png"])


class TestMaterialise:
    def test_writes_files_and_nested_folders(
        self, compile_session: Session, settings: Settings
    ) -> None:
        project = _project(compile_session)
        _file(compile_session, project, "main.tex", "root")
        sections = _folder(compile_session, project, "sections")
        _file(compile_session, project, "intro.tex", "intro body", sections.id)

        work = Path(settings.compile_work_dir) / "1"
        written = materialise_project(compile_session, project, settings, work)

        assert sorted(written) == ["main.tex", "sections/intro.tex"]
        assert (work / "main.tex").read_text() == "root"
        assert (work / "sections" / "intro.tex").read_text() == "intro body"

    def test_latexmk_artifacts_survive_a_second_materialise(
        self, compile_session: Session, settings: Settings
    ) -> None:
        # The ~7s warm rebuild depends on this; see ADR 0010.
        project = _project(compile_session)
        _file(compile_session, project, "main.tex", "root")
        work = Path(settings.compile_work_dir) / "1"
        materialise_project(compile_session, project, settings, work)
        (work / "main.aux").write_text("aux state")

        materialise_project(compile_session, project, settings, work)
        assert (work / "main.aux").read_text() == "aux state"

    def test_a_deleted_file_is_pruned_on_the_next_materialise(
        self, compile_session: Session, settings: Settings
    ) -> None:
        project = _project(compile_session)
        _file(compile_session, project, "main.tex", "root")
        gone = _file(compile_session, project, "old.tex", "stale")
        work = Path(settings.compile_work_dir) / "1"
        materialise_project(compile_session, project, settings, work)
        assert (work / "old.tex").exists()

        compile_session.delete(gone)
        compile_session.commit()
        materialise_project(compile_session, project, settings, work)

        assert not (work / "old.tex").exists()
        assert (work / "main.tex").exists()


class TestQueue:
    def test_claim_takes_the_oldest_queued_job_and_marks_it_running(
        self, compile_session: Session
    ) -> None:
        project = _project(compile_session)
        first = create_job(compile_session, project)
        create_job(compile_session, project)

        claimed = claim_next_job(compile_session)
        assert claimed is not None
        assert claimed.id == first.id
        assert claimed.status == STATUS_RUNNING
        assert claimed.started_at is not None

    def test_claim_returns_none_when_the_queue_is_empty(self, compile_session: Session) -> None:
        assert claim_next_job(compile_session) is None

    def test_a_claimed_job_is_not_claimed_twice(self, compile_session: Session) -> None:
        project = _project(compile_session)
        create_job(compile_session, project)
        assert claim_next_job(compile_session) is not None
        assert claim_next_job(compile_session) is None

    def test_job_snapshots_the_project_engine(self, compile_session: Session) -> None:
        project = _project(compile_session, engine="xelatex")
        job = create_job(compile_session, project)
        assert job.engine == "xelatex"
        assert job.status == STATUS_QUEUED

    def test_reap_fails_a_job_whose_worker_died(self, compile_session: Session) -> None:
        from datetime import timedelta

        project = _project(compile_session)
        job = create_job(compile_session, project)
        job.status = STATUS_RUNNING
        job.started_at = utc_now() - timedelta(seconds=1000)
        compile_session.add(job)
        compile_session.commit()

        assert reap_stale_jobs(compile_session, _settings(timeout_seconds=60)) == 1
        compile_session.refresh(job)
        assert job.status == "failure"
        assert job.finished_at is not None

    def test_reap_leaves_a_job_still_within_its_deadline(self, compile_session: Session) -> None:
        project = _project(compile_session)
        job = create_job(compile_session, project)
        job.status = STATUS_RUNNING
        job.started_at = utc_now()
        compile_session.add(job)
        compile_session.commit()

        assert reap_stale_jobs(compile_session, _settings(timeout_seconds=300)) == 0
        compile_session.refresh(job)
        assert job.status == STATUS_RUNNING


def _settings(*, timeout_seconds: int, queue_seconds: int = 10_000) -> Settings:
    """Settings for the reaper; the queue deadline defaults to never firing."""
    return Settings(
        database_url="sqlite:///:memory:",
        compile_timeout_seconds=timeout_seconds,
        compile_queue_timeout_seconds=queue_seconds,
    )


class TestReadLogText:
    """A log has to be bounded before it reaches memory, then a browser."""

    def test_a_small_log_is_returned_whole(self, tmp_path: Path) -> None:
        from src.compiles.service import read_log_text

        log = tmp_path / "small.log"
        log.write_text("every line matters\n" * 10)

        assert read_log_text(log, 1_000_000) == log.read_text()

    def test_a_huge_log_keeps_both_ends(self, tmp_path: Path) -> None:
        # M0 produced a 186 MB log from a runaway document. Sending that whole
        # exhausts the API and then kills the tab it is sent to.
        from src.compiles.service import read_log_text

        log = tmp_path / "huge.log"
        log.write_text("START-MARKER\n" + ("filler\n" * 200_000) + "END-MARKER\n")

        text = read_log_text(log, 4096)

        assert len(text) < 10_000
        assert "START-MARKER" in text
        assert "END-MARKER" in text
        # And it says so, rather than silently serving a truncated log.
        assert "were dropped" in text

    def test_invalid_utf8_does_not_raise(self, tmp_path: Path) -> None:
        # Fonts and encodings put arbitrary bytes in a TeX log.
        from src.compiles.service import read_log_text

        log = tmp_path / "bytes.log"
        log.write_bytes(b"ok \xff\xfe bad bytes\n" + b"x" * 9000)

        assert "ok" in read_log_text(log, 4096)


class TestSettleJob:
    """A polled job must always reach a terminal state.

    The worker is the only thing that reaps, so with no worker running a job
    stayed `queued` for ever and the UI span a spinner indefinitely.
    """

    def test_an_unclaimed_job_is_failed_with_a_reason(self, compile_session: Session) -> None:
        from src.compiles.service import settle_job

        project = _project(compile_session)
        job = create_job(compile_session, project)
        job.created_at = utc_now() - timedelta(seconds=600)
        compile_session.add(job)
        compile_session.commit()

        settled = settle_job(
            compile_session, job, _settings(timeout_seconds=300, queue_seconds=120)
        )

        assert settled.status == "failure"
        assert "worker" in settled.failure_reason
        assert settled.finished_at is not None

    def test_a_freshly_queued_job_is_left_alone(self, compile_session: Session) -> None:
        from src.compiles.service import settle_job

        project = _project(compile_session)
        job = create_job(compile_session, project)

        settled = settle_job(
            compile_session, job, _settings(timeout_seconds=300, queue_seconds=120)
        )

        assert settled.status == STATUS_QUEUED

    def test_a_job_whose_worker_died_is_failed_not_timed_out(
        self, compile_session: Session
    ) -> None:
        # "Timed out" would send the user optimising a document that was fine.
        from src.compiles.service import settle_job

        project = _project(compile_session)
        job = create_job(compile_session, project)
        job.status = STATUS_RUNNING
        job.started_at = utc_now() - timedelta(seconds=5000)
        compile_session.add(job)
        compile_session.commit()

        settled = settle_job(compile_session, job, _settings(timeout_seconds=300))

        assert settled.status == "failure"
        assert "stopped responding" in settled.failure_reason

    def test_a_finished_job_is_never_rewritten(self, compile_session: Session) -> None:
        from src.compiles.models import STATUS_SUCCESS
        from src.compiles.service import settle_job

        project = _project(compile_session)
        job = create_job(compile_session, project)
        job.status = STATUS_SUCCESS
        job.created_at = utc_now() - timedelta(seconds=99_999)
        compile_session.add(job)
        compile_session.commit()

        settled = settle_job(compile_session, job, _settings(timeout_seconds=1))

        assert settled.status == STATUS_SUCCESS
        assert settled.failure_reason is None

    def test_naive_timestamps_do_not_crash_the_poll_path(
        self, compile_session: Session
    ) -> None:
        # SQLite hands back naive datetimes where Postgres hands back aware
        # ones. Comparing the two raises, and this runs on every status poll.
        from src.compiles.service import settle_job

        project = _project(compile_session)
        job = create_job(compile_session, project)
        job.created_at = datetime(2020, 1, 1)  # naive, as SQLite would return
        compile_session.add(job)
        compile_session.commit()

        settled = settle_job(compile_session, job, _settings(timeout_seconds=300))

        assert settled.status == "failure"


def _project_for(session: Session, user: User, name: str = "P") -> Project:
    project = Project(name=name, user_id=user.id, engine="pdflatex")
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def _user(session: Session, email: str) -> User:
    user = User(email=email, password_hash="x", name="U")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


class TestPerUserConcurrency:
    def test_a_user_at_their_limit_is_skipped_for_someone_waiting(
        self, compile_session: Session
    ) -> None:
        # Fair use, not a paywall: one account must not starve the fleet.
        settings = Settings(database_url="sqlite:///:memory:", compile_max_concurrent_per_user=1)
        greedy = _user(compile_session, "greedy@example.com")
        polite = _user(compile_session, "polite@example.com")
        greedy_project = _project_for(compile_session, greedy, "greedy")
        polite_project = _project_for(compile_session, polite, "polite")

        first = create_job(compile_session, greedy_project)
        second = create_job(compile_session, greedy_project)
        third = create_job(compile_session, polite_project)

        claimed_first = claim_next_job(compile_session, settings)
        assert claimed_first.id == first.id

        # The greedy user's second job is older than the polite user's, but they
        # are already at their limit, so the polite one runs.
        claimed_second = claim_next_job(compile_session, settings)
        assert claimed_second.id == third.id
        assert second.id not in {claimed_first.id, claimed_second.id}

    def test_nothing_is_claimed_when_every_owner_is_at_their_limit(
        self, compile_session: Session
    ) -> None:
        settings = Settings(database_url="sqlite:///:memory:", compile_max_concurrent_per_user=1)
        user = _user(compile_session, "solo@example.com")
        project = _project_for(compile_session, user)
        create_job(compile_session, project)
        create_job(compile_session, project)

        assert claim_next_job(compile_session, settings) is not None
        # Queued, not starved: the next tick will pick it up.
        assert claim_next_job(compile_session, settings) is None

    def test_running_jobs_are_counted_per_user(self, compile_session: Session) -> None:
        settings = Settings(database_url="sqlite:///:memory:", compile_max_concurrent_per_user=5)
        user = _user(compile_session, "counted@example.com")
        project = _project_for(compile_session, user)
        create_job(compile_session, project)
        create_job(compile_session, project)
        claim_next_job(compile_session, settings)
        claim_next_job(compile_session, settings)

        assert running_jobs_per_user(compile_session) == {user.id: 2}


class TestProjectSize:
    def test_counts_uploaded_bytes_and_live_text(self, compile_session: Session) -> None:
        project = _project(compile_session)
        _file(compile_session, project, "main.tex", "x" * 100)
        upload = FileEntry(
            project_id=project.id,
            parent_id=None,
            name="figure.png",
            type="file",
            file_url="https://example.com/figure.png",
            size_bytes=500,
        )
        compile_session.add(upload)
        compile_session.commit()

        assert project_size_bytes(compile_session, project.id) == 600

    def test_only_the_newest_snapshot_of_a_file_counts(self, compile_session: Session) -> None:
        # The history is append-only and never written to disk, so counting it
        # would reject projects that are not actually large.
        project = _project(compile_session)
        entry = _file(compile_session, project, "main.tex", "x" * 10)
        compile_session.add(FileSnapshot(file_id=entry.id, content="y" * 40, version=2))
        compile_session.commit()

        assert project_size_bytes(compile_session, project.id) == 40

    def test_submit_is_refused_when_the_project_is_too_large(
        self, compile_session: Session
    ) -> None:
        from fastapi import HTTPException

        project = _project(compile_session)
        _file(compile_session, project, "main.tex", "x" * 5000)
        settings = Settings(database_url="sqlite:///:memory:", compile_max_project_bytes=1000)

        with pytest.raises(HTTPException) as error:
            ensure_project_fits(compile_session, project.id, settings)

        assert error.value.status_code == 413

    def test_a_normal_project_passes(self, compile_session: Session) -> None:
        project = _project(compile_session)
        _file(compile_session, project, "main.tex", "a thesis chapter")
        ensure_project_fits(
            compile_session, project.id, Settings(database_url="sqlite:///:memory:")
        )


class TestQueueStats:
    def test_reports_depth_and_running(self, compile_session: Session) -> None:
        settings = Settings(database_url="sqlite:///:memory:")
        project = _project(compile_session)
        create_job(compile_session, project)
        create_job(compile_session, project)
        claim_next_job(compile_session, settings)

        stats = queue_stats(compile_session)

        assert stats["queued"] == 1
        assert stats["running"] == 1
        assert stats["oldest_wait_seconds"] is not None

    def test_an_empty_queue_reports_no_wait(self, compile_session: Session) -> None:
        stats = queue_stats(compile_session)

        assert stats["queued"] == 0
        assert stats["oldest_wait_seconds"] is None
        assert stats["median_duration_ms"] is None
