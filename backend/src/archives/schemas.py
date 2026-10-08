from pydantic import BaseModel

from src.projects.schemas import ProjectSummaryResponse


class ProjectImportResponse(BaseModel):
    project: ProjectSummaryResponse
    # Named rather than counted: "3 files skipped" sends the user hunting
    # through the zip, and the usual cause is one figure in a format we do not
    # take.
    imported: list[str]
    skipped: list[str]
