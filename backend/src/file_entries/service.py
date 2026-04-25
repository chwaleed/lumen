from fastapi import status
from sqlmodel import Session, select

from src.auth.models import User
from src.file_entries.models import FileEntry
from src.file_entries.schemas import FileEntryCreateRequest, FileEntryResponse, FileEntryUpdateRequest
from src.file_snapshots.service import create_file_snapshot, get_latest_file_snapshot
from src.projects.models import Project
from src.shared.project_access import clean_name, get_project_for_user, projects_exception, touch_project


def _delete_file_entry_tree(session: Session, file_entry: FileEntry) -> None:
    child_entries = list(session.exec(select(FileEntry).where(FileEntry.parent_id == file_entry.id)).all())

    for child_entry in child_entries:
        _delete_file_entry_tree(session, child_entry)

    session.delete(file_entry)


def _is_descendant_entry(session: Session, ancestor_id: int, candidate_id: int) -> bool:
    child_entries = list(session.exec(select(FileEntry).where(FileEntry.parent_id == ancestor_id)).all())

    for child_entry in child_entries:
        if child_entry.id == candidate_id:
            return True
        if child_entry.id is not None and _is_descendant_entry(session, child_entry.id, candidate_id):
            return True

    return False


def create_default_project_files(session: Session, project: Project, template_content: str) -> None:
    main_file = FileEntry(
        project_id=project.id,
        name="main.tex",
        type="file",
        mime_type="text/x-tex",
        file_url=None,
    )
    session.add(main_file)
    session.flush()
    create_file_snapshot(session, main_file.id, template_content)


def create_project_reference_file(session: Session, project: Project, content: str) -> None:
    reference_file = FileEntry(
        project_id=project.id,
        name="references.bib",
        type="file",
        mime_type="text/plain",
        file_url=None,
    )
    session.add(reference_file)
    session.flush()
    create_file_snapshot(session, reference_file.id, content)


def list_project_files(session: Session, project: Project) -> list[FileEntry]:
    statement = (
        select(FileEntry)
        .where(FileEntry.project_id == project.id)
        .order_by(FileEntry.parent_id.asc(), FileEntry.type.asc(), FileEntry.name.asc(), FileEntry.id.asc())
    )
    return list(session.exec(statement).all())


def serialize_file_entry(session: Session, file_entry: FileEntry) -> FileEntryResponse:
    latest_snapshot = get_latest_file_snapshot(session, file_entry.id)
    return FileEntryResponse(
        id=file_entry.id,
        project_id=file_entry.project_id,
        parent_id=file_entry.parent_id,
        name=file_entry.name,
        type=file_entry.type,
        mime_type=file_entry.mime_type,
        file_url=file_entry.file_url,
        content=None if latest_snapshot is None else latest_snapshot.content,
        snapshot_version=None if latest_snapshot is None else latest_snapshot.version,
        created_at=file_entry.created_at,
        updated_at=file_entry.updated_at,
    )


def create_file_entry(
    session: Session,
    current_user: User,
    project_id: int,
    payload: FileEntryCreateRequest,
) -> FileEntry:
    project = get_project_for_user(session, current_user, project_id)
    clean_file_name = clean_name(payload.name, field_name="File name")

    parent_id = payload.parent_id
    if parent_id is not None:
        parent_entry = session.get(FileEntry, parent_id)
        if parent_entry is None or parent_entry.project_id != project.id:
            raise projects_exception("Parent folder not found.", status.HTTP_404_NOT_FOUND)
        if parent_entry.type != "folder":
            raise projects_exception("Files can only be created inside folders.", status.HTTP_400_BAD_REQUEST)

    file_entry = FileEntry(
        project_id=project.id,
        parent_id=parent_id,
        name=clean_file_name,
        type=payload.type,
        mime_type=payload.mime_type if payload.type == "file" else None,
        file_url=payload.file_url if payload.type == "file" else None,
    )
    session.add(file_entry)
    session.flush()

    touch_project(session, project)
    session.commit()
    session.refresh(file_entry)
    return file_entry


def update_file_entry(
    session: Session,
    current_user: User,
    project_id: int,
    file_entry_id: int,
    payload: FileEntryUpdateRequest,
) -> FileEntry:
    project = get_project_for_user(session, current_user, project_id)
    file_entry = session.get(FileEntry, file_entry_id)

    if file_entry is None or file_entry.project_id != project.id:
        raise projects_exception("File entry not found.", status.HTTP_404_NOT_FOUND)

    if payload.name is not None:
        file_entry.name = clean_name(
            payload.name,
            field_name="Folder name" if file_entry.type == "folder" else "File name",
        )

    if "parent_id" in payload.model_fields_set:
        parent_id = payload.parent_id

        if parent_id is not None:
            parent_entry = session.get(FileEntry, parent_id)
            if parent_entry is None or parent_entry.project_id != project.id:
                raise projects_exception("Parent folder not found.", status.HTTP_404_NOT_FOUND)
            if parent_entry.type != "folder":
                raise projects_exception("Entries can only be moved inside folders.", status.HTTP_400_BAD_REQUEST)
            if parent_entry.id == file_entry.id:
                raise projects_exception("A folder cannot be moved inside itself.", status.HTTP_400_BAD_REQUEST)
            if (
                file_entry.type == "folder"
                and file_entry.id is not None
                and parent_entry.id is not None
                and _is_descendant_entry(session, file_entry.id, parent_entry.id)
            ):
                raise projects_exception("A folder cannot be moved inside one of its children.", status.HTTP_400_BAD_REQUEST)

        file_entry.parent_id = parent_id

    session.add(file_entry)
    touch_project(session, project)
    session.commit()
    session.refresh(file_entry)
    return file_entry


def delete_file_entry(session: Session, current_user: User, project_id: int, file_entry_id: int) -> None:
    project = get_project_for_user(session, current_user, project_id)
    file_entry = session.get(FileEntry, file_entry_id)

    if file_entry is None or file_entry.project_id != project.id:
        raise projects_exception("File entry not found.", status.HTTP_404_NOT_FOUND)

    _delete_file_entry_tree(session, file_entry)
    touch_project(session, project)
    session.commit()
