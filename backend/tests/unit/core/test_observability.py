from fastapi.testclient import TestClient
from pydantic import BaseModel

from src.core.config import Settings
from src.main import create_app


def test_request_logging_middleware_adds_request_id_and_logs(monkeypatch) -> None:
    logged_records: list[dict] = []

    def fake_http_info(message: str, *, extra: dict) -> None:
        logged_records.append({"message": message, "extra": extra})

    monkeypatch.setattr("src.core.observability.http_logger.info", fake_http_info)
    app = create_app(settings=Settings(sentry_dsn=""), init_db_on_startup=False)

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["X-Request-ID"]
    assert logged_records
    assert logged_records[0]["message"] == "HTTP request completed"
    assert logged_records[0]["extra"]["method"] == "GET"
    assert logged_records[0]["extra"]["path"] == "/health"
    assert logged_records[0]["extra"]["status_code"] == 200
    assert logged_records[0]["extra"]["request_id"] == response.headers["X-Request-ID"]


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

        logger = object()

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
    assert init_calls[0]["enable_logs"] is True
    assert len(init_calls[0]["integrations"]) == 1


def test_create_app_survives_sentry_init_failure(monkeypatch) -> None:
    logged_errors: list[str] = []

    def fake_app_exception(message: str) -> None:
        logged_errors.append(message)

    monkeypatch.setattr("src.core.observability.app_logger.exception", fake_app_exception)

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
    assert logged_errors == ["Sentry initialization failed. Continuing without Sentry."]


def test_request_logging_middleware_emits_request_and_response_payloads_to_sentry(monkeypatch) -> None:
    sentry_logs: list[tuple[str, str, dict]] = []

    class EchoPayload(BaseModel):
        email: str
        password: str

    class FakeStructuredLogger:
        @staticmethod
        def info(message: str, attributes: dict) -> None:
            sentry_logs.append(("info", message, attributes))

    class FakeSentrySdk:
        logger = FakeStructuredLogger()

        @staticmethod
        def init(**_kwargs) -> None:
            return None

    monkeypatch.setattr(
        "src.core.observability._load_sentry_sdk",
        lambda: FakeSentrySdk(),
    )
    monkeypatch.setattr(
        "src.core.observability._load_sentry_logging_integration",
        lambda: None,
    )

    app = create_app(
        settings=Settings(sentry_dsn="https://examplePublicKey@o0.ingest.sentry.io/0"),
        init_db_on_startup=False,
    )

    @app.post("/echo")
    async def echo(payload: EchoPayload):
        return {"received": payload.model_dump(), "ok": True}

    with TestClient(app) as client:
        response = client.post(
            "/echo?source=test",
            json={"email": "waleed@example.com", "password": "supersecret"},
        )

    assert response.status_code == 200
    assert sentry_logs
    assert sentry_logs[0][0] == "info"
    assert sentry_logs[0][1] == "HTTP request completed"
    assert sentry_logs[0][2]["http_path"] == "/echo"
    assert sentry_logs[0][2]["query_params"] == {"source": "test"}
    assert sentry_logs[0][2]["request_payload"] == {
        "email": "waleed@example.com",
        "password": "supersecret",
    }
    assert sentry_logs[0][2]["response_payload"] == {
        "received": {
            "email": "waleed@example.com",
            "password": "supersecret",
        },
        "ok": True,
    }


def test_request_logging_middleware_emits_structured_sentry_logs(monkeypatch) -> None:
    sentry_logs: list[tuple[str, str, dict]] = []

    class FakeStructuredLogger:
        @staticmethod
        def info(message: str, attributes: dict) -> None:
            sentry_logs.append(("info", message, attributes))

    class FakeSentrySdk:
        logger = FakeStructuredLogger()

        @staticmethod
        def init(**_kwargs) -> None:
            return None

    monkeypatch.setattr(
        "src.core.observability._load_sentry_sdk",
        lambda: FakeSentrySdk(),
    )
    monkeypatch.setattr(
        "src.core.observability._load_sentry_logging_integration",
        lambda: None,
    )

    app = create_app(
        settings=Settings(sentry_dsn="https://examplePublicKey@o0.ingest.sentry.io/0"),
        init_db_on_startup=False,
    )

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert sentry_logs
    assert sentry_logs[0][0] == "info"
    assert sentry_logs[0][1] == "HTTP request completed"
    assert sentry_logs[0][2]["http_path"] == "/health"
    assert sentry_logs[0][2]["http_status_code"] == 200
