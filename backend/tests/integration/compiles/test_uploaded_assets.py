"""Does an uploaded asset actually reach the compiler?

Needs Docker and the lumen-tex image, so it is marked `texlive` and deselected
by default. Run with: pytest -m texlive
"""

import shutil
import uuid
from pathlib import Path

import boto3
import pytest
from moto import mock_aws
from sqlmodel import Session

from src.auth.models import User
from src.auth.utils import hash_password
from src.compiles.service import create_job
from src.compiles.worker import run_job
from src.core.config import Settings
from src.db.session import _engines, get_engine
from src.file_entries.models import FileEntry
from src.file_snapshots.models import FileSnapshot
from src.projects.models import Project

pytestmark = pytest.mark.texlive

CUSTOM_STY = r"""
\ProvidesPackage{lumenstyle}
\newcommand{\lumenhello}{Materialised from object storage.}
"""

MAIN_TEX = r"""
\documentclass{article}
\usepackage{lumenstyle}
\begin{document}
\lumenhello
\end{document}
"""


@pytest.fixture()
def docker_visible_dir() -> Path:
    """A working directory Docker can actually bind-mount.

    pytest's tmp_path lives under /tmp, and Snap-installed Docker mounts /tmp
    binds EMPTY -- the container would see no files and the compile would fail
    for a reason that has nothing to do with the test. Staying under the backend
    directory (inside $HOME) works on every host. `.compile/` is gitignored.
    """
    root = Path(__file__).resolve().parents[3] / ".compile" / f"it-{uuid.uuid4().hex[:8]}"
    root.mkdir(parents=True, exist_ok=True)
    try:
        yield root
    finally:
        shutil.rmtree(root, ignore_errors=True)


@pytest.fixture()
def aws_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_SECURITY_TOKEN", "testing")
    monkeypatch.setenv("AWS_SESSION_TOKEN", "testing")


@mock_aws
def test_an_uploaded_sty_is_materialised_and_used(
    docker_visible_dir: Path, aws_credentials: None
) -> None:
    tmp_path = docker_visible_dir
    database_url = f"sqlite:///{(tmp_path / 'assets.db').as_posix()}"
    settings = Settings(
        database_url=database_url,
        s3_bucket_name="lumen-test",
        s3_region="us-east-1",
        compile_work_dir=str(tmp_path / "work"),
        compile_output_dir=str(tmp_path / "out"),
        compile_cache_dir=str(tmp_path / "texcache"),
        compile_security_opt="",
    )
    _engines.pop(database_url, None)
    from sqlmodel import SQLModel

    engine = get_engine(settings)
    SQLModel.metadata.create_all(engine)

    boto3.client("s3", region_name="us-east-1").create_bucket(Bucket="lumen-test")
    boto3.client("s3", region_name="us-east-1").put_object(
        Bucket="lumen-test", Key="uploads/1/lumenstyle.sty", Body=CUSTOM_STY.encode()
    )

    with Session(engine) as session:
        user = User(name="U", email="assets@example.com", password_hash=hash_password("password123"))
        session.add(user)
        session.commit()
        session.refresh(user)
        project = Project(name="Assets", user_id=user.id, engine="pdflatex")
        session.add(project)
        session.commit()
        session.refresh(project)

        main = FileEntry(project_id=project.id, parent_id=None, name="main.tex", type="file")
        session.add(main)
        session.commit()
        session.refresh(main)
        session.add(FileSnapshot(file_id=main.id, content=MAIN_TEX, version=1))

        # The upload path: content lives in S3, the row only points at it.
        session.add(
            FileEntry(
                project_id=project.id,
                parent_id=None,
                name="lumenstyle.sty",
                type="file",
                mime_type="text/plain",
                file_url=f"https://lumen-test.s3.amazonaws.com/uploads/{project.id}/lumenstyle.sty",
                size_bytes=len(CUSTOM_STY),
            )
        )
        session.commit()

        project_id = project.id
        job = run_job(session, create_job(session, project), settings)

    # If the .sty had not been fetched out of S3 and written to disk, pdfLaTeX
    # would have failed with "File `lumenstyle.sty' not found".
    assert job.status == "success", f"compile failed: exit={job.exit_code}"
    assert job.pdf_path is not None
    assert (Path(settings.compile_work_dir) / str(project_id) / "lumenstyle.sty").exists()

    _engines.pop(database_url, None)
