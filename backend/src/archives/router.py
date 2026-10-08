from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlmodel import Session

from src.archives.service import archive_file_name, build_project_archive
from src.auth.dependencies import get_current_active_user
from src.auth.models import User
from src.core.config import Settings, get_settings
from src.db.session import get_session
from src.shared.project_access import get_project_for_user

router = APIRouter(prefix="/projects", tags=["archives"])

CurrentUser = Annotated[User, Depends(get_current_active_user)]
DbSession = Annotated[Session, Depends(get_session)]
AppSettings = Annotated[Settings, Depends(get_settings)]


# Like the compiled PDF, this returns bytes rather than the
# {success, message, data} envelope: base64 in JSON would cost a third more
# payload for a file the browser is only going to save.
@router.get("/{project_id}/export")
def get_project_export(
    project_id: int,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> Response:
    project = get_project_for_user(session, current_user, project_id)
    payload = build_project_archive(session, project, settings)
    file_name = archive_file_name(project.name)

    # attachment, unlike the PDF: there is nothing to preview, and without it a
    # browser would render the bytes as text.
    return Response(
        content=payload,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )
