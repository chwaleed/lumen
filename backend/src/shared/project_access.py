from fastapi import HTTPException, status
from sqlmodel import Session, select

from src.auth.models import User
from src.core.security import utc_now
from src.projects.models import Project


def projects_exception(detail: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> HTTPException:
    return HTTPException(status_code=status_code, detail=detail)


def clean_name(name: str, *, field_name: str) -> str:
    clean_value = name.strip()
    if not clean_value:
        raise projects_exception(f"{field_name} cannot be empty.")
    return clean_value


def get_project_for_user(session: Session, current_user: User, project_id: int) -> Project:
    statement = select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    project = session.exec(statement).first()
    if project is None:
        raise projects_exception("Project not found.", status.HTTP_404_NOT_FOUND)
    return project


def touch_project(session: Session, project: Project) -> None:
    project.updated_at = utc_now()
    session.add(project)
