from contextlib import contextmanager

import pytest
from fastapi import HTTPException, status
from sqlmodel import Session

from src.auth.models import User
from src.auth.utils import hash_password
from src.file_entries.models import FileEntry
from src.file_entries.schemas import FileEntryCreateRequest, FileEntryUpdateRequest
from src.file_entries.service import (
    create_default_project_files,
    create_file_entry,
    create_project_reference_file,
    delete_file_entry,
    list_project_files,
    serialize_file_entry,
    update_file_entry,
)
from src.projects.models import Project


@pytest.fixture()
def owner(session: Session) -> User:
    user = User(name="Owner", email="owner@example.com", password_hash=hash_password("password123"))
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture()
def intruder(session: Session) -> User:
    user = User(name="Intruder", email="intruder@example.com", password_hash=hash_password("password123"))
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture()
def project(session: Session, owner: User) -> Project:
    project = Project(name="Thesis", user_id=owner.id)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def add_entry(
    session: Session,
    user: User,
    project: Project,
    name: str,
    entry_type: str = "file",
    parent_id: int | None = None,
) -> FileEntry:
    return create_file_entry(
        session,
        user,
        project.id,
        FileEntryCreateRequest(name=name, type=entry_type, parent_id=parent_id),
    )


class TestCreate:
    def test_creates_a_file_at_the_project_root(self, session: Session, owner: User, project: Project) -> None:
        entry = add_entry(session, owner, project, "chapter.tex")

        assert entry.project_id == project.id
        assert entry.parent_id is None
        assert entry.type == "file"

    def test_trims_the_name(self, session: Session, owner: User, project: Project) -> None:
        assert add_entry(session, owner, project, "  spaced.tex  ").name == "spaced.tex"

    @pytest.mark.parametrize("name", ["   ", "\t"])
    def test_rejects_a_blank_name(self, session: Session, owner: User, project: Project, name: str) -> None:
        with fail_as(status.HTTP_400_BAD_REQUEST):
            add_entry(session, owner, project, name)

    def test_creates_inside_a_folder(self, session: Session, owner: User, project: Project) -> None:
        folder = add_entry(session, owner, project, "chapters", "folder")
        child = add_entry(session, owner, project, "intro.tex", parent_id=folder.id)

        assert child.parent_id == folder.id

    def test_refuses_to_nest_inside_a_file(self, session: Session, owner: User, project: Project) -> None:
        plain_file = add_entry(session, owner, project, "main.tex")

        with fail_as(status.HTTP_400_BAD_REQUEST):
            add_entry(session, owner, project, "nested.tex", parent_id=plain_file.id)

    def test_refuses_an_unknown_parent(self, session: Session, owner: User, project: Project) -> None:
        with fail_as(status.HTTP_404_NOT_FOUND):
            add_entry(session, owner, project, "orphan.tex", parent_id=999_999)

    # Parent ids are global, so without the project check a folder from another
    # project could be used as a parent.
    def test_refuses_a_parent_from_another_project(
        self, session: Session, owner: User, project: Project
    ) -> None:
        other_project = Project(name="Other", user_id=owner.id)
        session.add(other_project)
        session.commit()
        session.refresh(other_project)
        foreign_folder = add_entry(session, owner, other_project, "foreign", "folder")

        with fail_as(status.HTTP_404_NOT_FOUND):
            add_entry(session, owner, project, "sneaky.tex", parent_id=foreign_folder.id)

    def test_refuses_a_project_owned_by_someone_else(
        self, session: Session, intruder: User, project: Project
    ) -> None:
        with fail_as(status.HTTP_404_NOT_FOUND):
            add_entry(session, intruder, project, "mine-now.tex")

    def test_drops_file_metadata_on_folders(self, session: Session, owner: User, project: Project) -> None:
        folder = create_file_entry(
            session,
            owner,
            project.id,
            FileEntryCreateRequest(
                name="assets", type="folder", mime_type="image/png", file_url="https://example.com/x.png"
            ),
        )

        assert folder.mime_type is None
        assert folder.file_url is None


class TestUpdate:
    def test_renames_an_entry(self, session: Session, owner: User, project: Project) -> None:
        entry = add_entry(session, owner, project, "old.tex")

        renamed = update_file_entry(
            session, owner, project.id, entry.id, FileEntryUpdateRequest(name="  new.tex  ")
        )

        assert renamed.name == "new.tex"

    def test_moves_an_entry_into_a_folder(self, session: Session, owner: User, project: Project) -> None:
        folder = add_entry(session, owner, project, "chapters", "folder")
        entry = add_entry(session, owner, project, "intro.tex")

        moved = update_file_entry(
            session, owner, project.id, entry.id, FileEntryUpdateRequest(parent_id=folder.id)
        )

        assert moved.parent_id == folder.id

    # parent_id=None is a real instruction (move to root), distinct from "unchanged",
    # which is why the service checks model_fields_set rather than the value.
    def test_moves_an_entry_back_to_the_root(self, session: Session, owner: User, project: Project) -> None:
        folder = add_entry(session, owner, project, "chapters", "folder")
        entry = add_entry(session, owner, project, "intro.tex", parent_id=folder.id)

        moved = update_file_entry(
            session, owner, project.id, entry.id, FileEntryUpdateRequest(parent_id=None)
        )

        assert moved.parent_id is None

    def test_renaming_leaves_the_parent_untouched(self, session: Session, owner: User, project: Project) -> None:
        folder = add_entry(session, owner, project, "chapters", "folder")
        entry = add_entry(session, owner, project, "intro.tex", parent_id=folder.id)

        renamed = update_file_entry(
            session, owner, project.id, entry.id, FileEntryUpdateRequest(name="start.tex")
        )

        assert renamed.parent_id == folder.id

    def test_refuses_to_move_a_folder_into_itself(self, session: Session, owner: User, project: Project) -> None:
        folder = add_entry(session, owner, project, "chapters", "folder")

        with fail_as(status.HTTP_400_BAD_REQUEST):
            update_file_entry(
                session, owner, project.id, folder.id, FileEntryUpdateRequest(parent_id=folder.id)
            )

    # Allowing this would detach the branch from the tree entirely.
    def test_refuses_to_move_a_folder_into_its_own_child(
        self, session: Session, owner: User, project: Project
    ) -> None:
        parent = add_entry(session, owner, project, "parent", "folder")
        child = add_entry(session, owner, project, "child", "folder", parent_id=parent.id)

        with fail_as(status.HTTP_400_BAD_REQUEST):
            update_file_entry(
                session, owner, project.id, parent.id, FileEntryUpdateRequest(parent_id=child.id)
            )

    def test_refuses_to_move_a_folder_into_a_deep_descendant(
        self, session: Session, owner: User, project: Project
    ) -> None:
        top = add_entry(session, owner, project, "top", "folder")
        middle = add_entry(session, owner, project, "middle", "folder", parent_id=top.id)
        bottom = add_entry(session, owner, project, "bottom", "folder", parent_id=middle.id)

        with fail_as(status.HTTP_400_BAD_REQUEST):
            update_file_entry(session, owner, project.id, top.id, FileEntryUpdateRequest(parent_id=bottom.id))

    def test_allows_moving_a_folder_into_an_unrelated_folder(
        self, session: Session, owner: User, project: Project
    ) -> None:
        source = add_entry(session, owner, project, "source", "folder")
        add_entry(session, owner, project, "leaf", "folder", parent_id=source.id)
        destination = add_entry(session, owner, project, "destination", "folder")

        moved = update_file_entry(
            session, owner, project.id, source.id, FileEntryUpdateRequest(parent_id=destination.id)
        )

        assert moved.parent_id == destination.id

    def test_refuses_to_move_an_entry_under_a_file(
        self, session: Session, owner: User, project: Project
    ) -> None:
        plain_file = add_entry(session, owner, project, "main.tex")
        entry = add_entry(session, owner, project, "other.tex")

        with fail_as(status.HTTP_400_BAD_REQUEST):
            update_file_entry(
                session, owner, project.id, entry.id, FileEntryUpdateRequest(parent_id=plain_file.id)
            )

    def test_refuses_an_unknown_entry(self, session: Session, owner: User, project: Project) -> None:
        with fail_as(status.HTTP_404_NOT_FOUND):
            update_file_entry(session, owner, project.id, 999_999, FileEntryUpdateRequest(name="x.tex"))

    def test_refuses_an_entry_owned_by_someone_else(
        self, session: Session, owner: User, intruder: User, project: Project
    ) -> None:
        entry = add_entry(session, owner, project, "private.tex")

        with fail_as(status.HTTP_404_NOT_FOUND):
            update_file_entry(session, intruder, project.id, entry.id, FileEntryUpdateRequest(name="stolen.tex"))


class TestDelete:
    def test_deletes_a_single_entry(self, session: Session, owner: User, project: Project) -> None:
        entry = add_entry(session, owner, project, "scratch.tex")

        delete_file_entry(session, owner, project.id, entry.id)

        assert session.get(FileEntry, entry.id) is None

    # Orphaned rows would otherwise linger and reappear in the file tree.
    def test_deletes_a_folder_s_whole_subtree(self, session: Session, owner: User, project: Project) -> None:
        top = add_entry(session, owner, project, "top", "folder")
        middle = add_entry(session, owner, project, "middle", "folder", parent_id=top.id)
        leaf = add_entry(session, owner, project, "leaf.tex", parent_id=middle.id)

        delete_file_entry(session, owner, project.id, top.id)

        assert session.get(FileEntry, top.id) is None
        assert session.get(FileEntry, middle.id) is None
        assert session.get(FileEntry, leaf.id) is None

    def test_leaves_siblings_alone(self, session: Session, owner: User, project: Project) -> None:
        folder = add_entry(session, owner, project, "chapters", "folder")
        doomed = add_entry(session, owner, project, "doomed.tex", parent_id=folder.id)
        survivor = add_entry(session, owner, project, "survivor.tex", parent_id=folder.id)

        delete_file_entry(session, owner, project.id, doomed.id)

        assert session.get(FileEntry, survivor.id) is not None
        assert session.get(FileEntry, folder.id) is not None

    def test_refuses_an_entry_owned_by_someone_else(
        self, session: Session, owner: User, intruder: User, project: Project
    ) -> None:
        entry = add_entry(session, owner, project, "private.tex")

        with fail_as(status.HTTP_404_NOT_FOUND):
            delete_file_entry(session, intruder, project.id, entry.id)

        assert session.get(FileEntry, entry.id) is not None


class TestListingAndSerialisation:
    def test_lists_only_the_given_project_s_entries(
        self, session: Session, owner: User, project: Project
    ) -> None:
        other_project = Project(name="Other", user_id=owner.id)
        session.add(other_project)
        session.commit()
        session.refresh(other_project)

        add_entry(session, owner, project, "mine.tex")
        add_entry(session, owner, other_project, "theirs.tex")

        assert [entry.name for entry in list_project_files(session, project)] == ["mine.tex"]

    def test_default_project_files_carry_their_template_content(
        self, session: Session, project: Project
    ) -> None:
        create_default_project_files(session, project, "\\documentclass{article}")
        session.commit()

        entries = {entry.name: entry for entry in list_project_files(session, project)}
        main = serialize_file_entry(session, entries["main.tex"])

        assert main.content == "\\documentclass{article}"
        assert main.snapshot_version == 1
        assert main.mime_type == "text/x-tex"

    def test_reference_file_carries_its_content(self, session: Session, project: Project) -> None:
        create_project_reference_file(session, project, "@book{knuth}")
        session.commit()

        entries = {entry.name: entry for entry in list_project_files(session, project)}
        references = serialize_file_entry(session, entries["references.bib"])

        assert references.content == "@book{knuth}"

    def test_an_entry_without_snapshots_serialises_with_no_content(
        self, session: Session, owner: User, project: Project
    ) -> None:
        folder = add_entry(session, owner, project, "assets", "folder")

        serialised = serialize_file_entry(session, folder)

        assert serialised.content is None
        assert serialised.snapshot_version is None


@contextmanager
def fail_as(expected_status: int):
    """Asserts the wrapped call raises an HTTPException carrying this status."""
    with pytest.raises(HTTPException) as error:
        yield

    assert error.value.status_code == expected_status
