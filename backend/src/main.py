import os

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from src.auth.router import router as auth_router
from src.core.api_response import ApiResponse, ApiResponseBuilder
from src.core.config import Settings, get_settings
from src.core.observability import register_observability
from src.db.session import init_db
from src.file_entries.router import router as file_entries_router
from src.file_snapshots.router import router as file_snapshots_router
from src.projects.router import router as projects_router
from src.compiles.router import ops_router as compile_ops_router
from src.compiles.router import router as compiles_router
from src.uploads.router import router as uploads_router


def _extract_error_message(detail: object, default: str = "Request failed.") -> str:
    if isinstance(detail, str):
        return detail
    return default


def create_app(*, settings: Settings | None = None, init_db_on_startup: bool = True) -> FastAPI:
    app_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if init_db_on_startup:
            init_db(app_settings)
        yield

    app = FastAPI(title="Lumen LaTeX Editor API", lifespan=lifespan)
    register_observability(app, app_settings)
    app.include_router(auth_router)
    app.include_router(projects_router)
    app.include_router(file_entries_router)
    app.include_router(file_snapshots_router)
    app.include_router(uploads_router)
    app.include_router(compiles_router)
    app.include_router(compile_ops_router)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=ApiResponseBuilder.error(
                message=_extract_error_message(exc.detail),
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_exception_handler(_: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content=ApiResponseBuilder.error(
                message="Validation error.",
                data=exc.errors(),
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, __: Exception):
        return JSONResponse(
            status_code=500,
            content=ApiResponseBuilder.error(message="Internal server error."),
        )
        
    @app.get("/health", response_model=ApiResponse)
    async def health_check():
        return ApiResponseBuilder.success(
            message="Health check successful.",
            data={"status": "ok"},
        )

    return app


app = create_app()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "9000")))
