import pytest
from fastapi import HTTPException, status
from sqlmodel import Session

from src.auth.models import User
from src.auth.utils import hash_password
from src.projects.models import Project
from src.shared.project_access import (
    clean_name,
    get_project_for_user,
    projects_exception,
    touch_project,
)


def make_user(session: Session, email: str) -> User:
    user = User(name="Owner", email=email, password_hash=hash_password("password123"))
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def make_project(session: Session, user: User, name: str = "Thesis") -> Project:
    project = Project(name=name, user_id=user.id)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


class TestCleanName:
    def test_strips_surrounding_whitespace(self) -> None:
        assert clean_name("  Thesis  ", field_name="Project name") == "Thesis"

    @pytest.mark.parametrize("value", ["", "   ", "\t\n"])
    def test_rejects_blank_names_with_the_field_in_the_message(self, value: str) -> None:
        with pytest.raises(HTTPException) as error:
            clean_name(value, field_name="Project name")

        assert error.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Project name" in error.value.detail

    def test_keeps_inner_whitespace(self) -> None:
        assert clean_name("  My Great Paper ", field_name="Project name") == "My Great Paper"


class TestProjectsException:
    def test_defaults_to_bad_request(self) -> None:
        assert projects_exception("nope").status_code == status.HTTP_400_BAD_REQUEST

    def test_honours_an_explicit_status(self) -> None:
        error = projects_exception("missing", status.HTTP_404_NOT_FOUND)

        assert error.status_code == status.HTTP_404_NOT_FOUND
        assert error.detail == "missing"


class TestGetProjectForUser:
    def test_returns_the_owner_s_project(self, session: Session) -> None:
        user = make_user(session, "owner@example.com")
        project = make_project(session, user)

        assert get_project_for_user(session, user, project.id).id == project.id

    # The ownership filter is the whole authorisation boundary for projects.
    def test_hides_another_user_s_project_as_a_404(self, session: Session) -> None:
        owner = make_user(session, "owner@example.com")
        intruder = make_user(session, "intruder@example.com")
        project = make_project(session, owner)

        with pytest.raises(HTTPException) as error:
            get_project_for_user(session, intruder, project.id)

        # 404 rather than 403, so project ids cannot be probed for existence.
        assert error.value.status_code == status.HTTP_404_NOT_FOUND

    def test_raises_404_for_an_unknown_project(self, session: Session) -> None:
        user = make_user(session, "owner@example.com")

        with pytest.raises(HTTPException) as error:
            get_project_for_user(session, user, 999_999)

        assert error.value.status_code == status.HTTP_404_NOT_FOUND


class TestTouchProject:
    def test_advances_updated_at(self, session: Session) -> None:
        user = make_user(session, "owner@example.com")
        project = make_project(session, user)
        before = project.updated_at

        touch_project(session, project)
        session.commit()
        session.refresh(project)

        assert project.updated_at >= before
