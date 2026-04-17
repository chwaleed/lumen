from fastapi import status
from sqlmodel import Session, select

from src.auth.models import User
from src.file_entries.models import FileEntry
from src.file_entries.service import create_default_project_files, create_project_reference_file, list_project_files
from src.projects.models import Project
from src.projects.schemas import ProjectCreateRequest, ProjectUpdateRequest
from src.shared.project_access import clean_name, get_project_for_user, touch_project

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
def _get_template_content(template_id: str | None) -> str:
    if template_id is None:
        return DEFAULT_PROJECT_TEMPLATES[DEFAULT_TEMPLATE_ID]
    return DEFAULT_PROJECT_TEMPLATES.get(template_id, DEFAULT_PROJECT_TEMPLATES[DEFAULT_TEMPLATE_ID])


def list_projects(session: Session, current_user: User) -> list[Project]:
    statement = (
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(Project.updated_at.desc(), Project.id.desc())
    )
    return list(session.exec(statement).all())


def create_project(session: Session, current_user: User, payload: ProjectCreateRequest) -> Project:
    project = Project(
        name=clean_name(payload.name, field_name="Project name"),
        user_id=current_user.id,
    )
    session.add(project)
    session.commit()
    session.refresh(project)

    create_default_project_files(session, project, _get_template_content(payload.template_id))
    if payload.template_id == "academic":
        create_project_reference_file(
            session,
            project,
            """@article{lumen2026,
  title={Lumen Reference},
  author={Doe, Jane},
  journal={Journal of LaTeX},
  year={2026}
}""",
        )
    touch_project(session, project)
    session.commit()
    session.refresh(project)
    return project


def update_project(session: Session, current_user: User, project_id: int, payload: ProjectUpdateRequest) -> Project:
    project = get_project_for_user(session, current_user, project_id)
    project.name = clean_name(payload.name, field_name="Project name")
    touch_project(session, project)
    session.commit()
    session.refresh(project)
    return project


def get_project_detail(session: Session, current_user: User, project_id: int) -> tuple[Project, list[FileEntry]]:
    project = get_project_for_user(session, current_user, project_id)
    return project, list_project_files(session, project)
