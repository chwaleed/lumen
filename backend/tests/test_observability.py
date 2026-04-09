import logging

from fastapi.testclient import TestClient

from src.core.config import Settings
from src.main import create_app


def test_request_logging_middleware_adds_request_id_and_logs(caplog) -> None:
    caplog.set_level(logging.INFO, logger="src.http")
    app = create_app(settings=Settings(), init_db_on_startup=False)

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["X-Request-ID"]

    request_log = next(
        record
        for record in caplog.records
        if record.name == "src.http" and record.msg == "HTTP request completed"
    )

    assert request_log.method == "GET"
    assert request_log.path == "/health"
    assert request_log.status_code == 200
    assert request_log.request_id == response.headers["X-Request-ID"]


def test_create_app_initializes_sentry_when_dsn_is_configured(monkeypatch) -> None:
    init_calls: list[dict] = []

    class FakeLoggingIntegration:
        def __init__(self, *, level, event_level):
            self.level = level
            self.event_level = event_level

    class FakeSentrySdk:
        @staticmethod
        def init(**kwargs) -> None:
            init_calls.append(kwargs)

    monkeypatch.setattr(
        "src.core.observability._load_sentry_sdk",
        lambda: FakeSentrySdk(),
    )
    monkeypatch.setattr(
        "src.core.observability._load_sentry_logging_integration",
        lambda: FakeLoggingIntegration,
    )

    settings = Settings(
        sentry_dsn="https://examplePublicKey@o0.ingest.sentry.io/0",
        sentry_environment="production",
        sentry_traces_sample_rate=0.25,
        sentry_send_default_pii=True,
    )

    create_app(settings=settings, init_db_on_startup=False)

    assert len(init_calls) == 1
    assert init_calls[0]["dsn"] == settings.sentry_dsn
    assert init_calls[0]["environment"] == "production"
    assert init_calls[0]["traces_sample_rate"] == 0.25
    assert init_calls[0]["send_default_pii"] is True
    assert len(init_calls[0]["integrations"]) == 1


def test_create_app_survives_sentry_init_failure(monkeypatch, caplog) -> None:
    class FakeSentrySdk:
        @staticmethod
        def init(**_kwargs) -> None:
            raise ImportError("jinja2 must be installed to use Jinja2Templates")

    monkeypatch.setattr(
        "src.core.observability._load_sentry_sdk",
        lambda: FakeSentrySdk(),
    )
    monkeypatch.setattr(
        "src.core.observability._load_sentry_logging_integration",
        lambda: None,
    )

    settings = Settings(
        sentry_dsn="https://examplePublicKey@o0.ingest.sentry.io/0",
    )

    app = create_app(settings=settings, init_db_on_startup=False)

    assert app is not None
    assert "Sentry initialization failed" in caplog.text
