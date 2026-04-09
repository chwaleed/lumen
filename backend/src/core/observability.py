from __future__ import annotations

import logging
from importlib import import_module
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request, Response

from src.core.config import Settings

HTTP_LOGGER_NAME = "src.http"
APP_LOGGER_NAME = "src.app"

http_logger = logging.getLogger(HTTP_LOGGER_NAME)
app_logger = logging.getLogger(APP_LOGGER_NAME)


def configure_logging() -> None:
    root_logger = logging.getLogger()
    if root_logger.handlers:
        return

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )


def _load_sentry_sdk():
    try:
        return import_module("sentry_sdk")
    except ImportError:
        return None


def _load_sentry_logging_integration():
    try:
        module = import_module("sentry_sdk.integrations.logging")
    except ImportError:
        return None

    return getattr(module, "LoggingIntegration", None)


def initialize_sentry(settings: Settings) -> bool:
    if not settings.sentry_dsn:
        return False

    sentry_sdk = _load_sentry_sdk()
    if sentry_sdk is None:
        app_logger.warning(
            "Sentry DSN is configured but sentry-sdk is not installed. Skipping Sentry initialization."
        )
        return False

    init_kwargs = {
        "dsn": settings.sentry_dsn,
        "environment": settings.sentry_environment,
        "send_default_pii": settings.sentry_send_default_pii,
        "traces_sample_rate": settings.sentry_traces_sample_rate,
    }

    logging_integration = _load_sentry_logging_integration()
    if logging_integration is not None:
        init_kwargs["integrations"] = [
            logging_integration(level=logging.INFO, event_level=logging.ERROR),
        ]

    try:
        sentry_sdk.init(**init_kwargs)
    except Exception:
        app_logger.exception("Sentry initialization failed. Continuing without Sentry.")
        return False

    app_logger.info(
        "Sentry initialized for environment=%s with traces_sample_rate=%s",
        settings.sentry_environment,
        settings.sentry_traces_sample_rate,
    )
    return True


def register_observability(app: FastAPI, settings: Settings) -> None:
    configure_logging()
    initialize_sentry(settings)

    @app.middleware("http")
    async def request_logging_middleware(request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid4()))
        request.state.request_id = request_id
        started_at = perf_counter()
        client_host = request.client.host if request.client else "unknown"

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((perf_counter() - started_at) * 1000, 2)
            http_logger.exception(
                "HTTP request failed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "client_ip": client_host,
                    "duration_ms": duration_ms,
                },
            )
            raise

        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        http_logger.info(
            "HTTP request completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "client_ip": client_host,
                "duration_ms": duration_ms,
            },
        )
        return response
