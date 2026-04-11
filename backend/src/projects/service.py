from fastapi import HTTPException, status
from sqlmodel import Session, select

from src.auth.models import User
from src.core.security import utc_now
from src.projects.models import FileEntry, Project
from src.projects.schemas import FileEntryCreateRequest, ProjectCreateRequest

DEFAULT_TEMPLATE_ID = "blank"

DEFAULT_PROJECT_TEMPLATES: dict[str, str] = {
    "blank": """\\documentclass{article}
\\usepackage[utf8]{inputenc}

\\title{New Lumen Project}
\\author{Lumen}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
Start writing here.

\\end{document}
""",
    "academic": """\\documentclass[conference]{IEEEtran}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath,amssymb}

\\title{Academic Paper Draft}
\\author{Your Name}

\\begin{document}

\\maketitle

\\begin{abstract}
Write your abstract here.
\\end{abstract}

\\section{Introduction}
Start your paper here.

\\end{document}
""",
    "math": """\\documentclass{article}
\\usepackage{amsmath, amssymb}

\\begin{document}

\\section*{Math Assignment}
Solve the following:

\\begin{equation}
  \\int_0^1 x^2 \\, dx
\\end{equation}

\\end{document}
""",
    "presentation": """\\documentclass{beamer}
\\usetheme{Madrid}

\\title{Presentation}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\frame{\\titlepage}

\\begin{frame}{Agenda}
  \\tableofcontents
\\end{frame}

\\section{Introduction}

\\begin{frame}{Introduction}
  Add your presentation content here.
\\end{frame}

\\end{document}
""",
    "resume": """\\documentclass{article}
\\usepackage[margin=1in]{geometry}

\\begin{document}

\\begin{center}
  {\\LARGE Your Name} \\\\
  your.email@example.com
\\end{center}

\\section*{Experience}
Add your experience here.

\\section*{Education}
Add your education here.

\\end{document}
""",
    "letter": """\\documentclass{letter}

\\signature{Your Name}
\\address{Your Address}

\\begin{document}

\\begin{letter}{Recipient Name \\\\ Recipient Address}
\\opening{Dear Recipient,}

Write your letter here.

\\closing{Sincerely,}

\\end{letter}

\\end{document}
""",
}


def _projects_exception(detail: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> HTTPException:
    return HTTPException(status_code=status_code, detail=detail)


def _clean_name(name: str, *, field_name: str) -> str:
    clean_name = name.strip()
    if not clean_name:
        raise _projects_exception(f"{field_name} cannot be empty.")
    return clean_name


def _get_project_for_user(session: Session, current_user: User, project_id: int) -> Project:
    statement = select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    project = session.exec(statement).first()
    if project is None:
        raise _projects_exception("Project not found.", status.HTTP_404_NOT_FOUND)
    return project


def _get_template_content(template_id: str | None) -> str:
    if template_id is None:
        return DEFAULT_PROJECT_TEMPLATES[DEFAULT_TEMPLATE_ID]
    return DEFAULT_PROJECT_TEMPLATES.get(template_id, DEFAULT_PROJECT_TEMPLATES[DEFAULT_TEMPLATE_ID])


def _touch_project(session: Session, project: Project) -> None:
    project.updated_at = utc_now()
    session.add(project)


def _create_default_project_files(session: Session, project: Project, template_id: str | None) -> None:
    main_file = FileEntry(
        project_id=project.id,
        name="main.tex",
        type="file",
        mime_type="text/x-tex",
        content=_get_template_content(template_id),
    )
    session.add(main_file)

    if template_id == "academic":
        session.add(
            FileEntry(
                project_id=project.id,
                name="references.bib",
                type="file",
                mime_type="text/plain",
                content="""@article{lumen2026,
  title={Lumen Reference},
  author={Doe, Jane},
  journal={Journal of LaTeX},
  year={2026}
}""",
            )
        )


def list_projects(session: Session, current_user: User) -> list[Project]:
    statement = (
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(Project.updated_at.desc(), Project.id.desc())
    )
    return list(session.exec(statement).all())


def create_project(session: Session, current_user: User, payload: ProjectCreateRequest) -> Project:
    project = Project(
        name=_clean_name(payload.name, field_name="Project name"),
        user_id=current_user.id,
    )
    session.add(project)
    session.commit()
    session.refresh(project)

    _create_default_project_files(session, project, payload.template_id)
    _touch_project(session, project)
    session.commit()
    session.refresh(project)
    return project


def list_project_files(session: Session, project: Project) -> list[FileEntry]:
    statement = (
        select(FileEntry)
        .where(FileEntry.project_id == project.id)
        .order_by(FileEntry.parent_id.asc(), FileEntry.type.asc(), FileEntry.name.asc(), FileEntry.id.asc())
    )
    return list(session.exec(statement).all())


def get_project_detail(session: Session, current_user: User, project_id: int) -> tuple[Project, list[FileEntry]]:
    project = _get_project_for_user(session, current_user, project_id)
    return project, list_project_files(session, project)


def create_file_entry(
    session: Session,
    current_user: User,
    project_id: int,
    payload: FileEntryCreateRequest,
) -> FileEntry:
    project = _get_project_for_user(session, current_user, project_id)
    clean_name = _clean_name(payload.name, field_name="File name")

    parent_id = payload.parent_id
    if parent_id is not None:
        parent_entry = session.get(FileEntry, parent_id)
        if parent_entry is None or parent_entry.project_id != project.id:
            raise _projects_exception("Parent folder not found.", status.HTTP_404_NOT_FOUND)
        if parent_entry.type != "folder":
            raise _projects_exception("Files can only be created inside folders.", status.HTTP_400_BAD_REQUEST)

    file_entry = FileEntry(
        project_id=project.id,
        parent_id=parent_id,
        name=clean_name,
        type=payload.type,
        mime_type=payload.mime_type if payload.type == "file" else None,
        content=payload.content if payload.type == "file" else None,
    )
    session.add(file_entry)
    _touch_project(session, project)
    session.commit()
    session.refresh(file_entry)
    return file_entry
