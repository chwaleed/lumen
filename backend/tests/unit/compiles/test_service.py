from pathlib import Path

import pytest
from sqlmodel import Session, SQLModel

from src.auth.models import User
from src.compiles import models as _compile_models  # noqa: F401
from src.compiles.models import STATUS_QUEUED, STATUS_RUNNING, CompileJob
from src.compiles.service import (
    MaterialiseError,
    claim_next_job,
    create_job,
    materialise_project,
    project_source_paths,
    reap_stale_jobs,
    resolve_root_tex,
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
        with pytest.raises(MaterialiseError):
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
        with pytest.raises(MaterialiseError):
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

        assert reap_stale_jobs(compile_session, timeout_seconds=60) == 1
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

        assert reap_stale_jobs(compile_session, timeout_seconds=300) == 0
        compile_session.refresh(job)
        assert job.status == STATUS_RUNNING
