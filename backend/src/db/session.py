from collections.abc import Generator

from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlmodel import Session, create_engine

from src.core.config import Settings, get_settings
from src.db.migrations import run_migrations

_engines: dict[str, Engine] = {}


def _create_engine(database_url: str) -> Engine:
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    engine = create_engine(
        database_url,
        echo=False,
        connect_args=connect_args,
    )

    if database_url.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


def get_engine(settings: Settings | None = None):
    settings = settings or get_settings()

    database_url = settings.database_url

    if database_url not in _engines:
        _engines[database_url] = _create_engine(database_url)

    return _engines[database_url]


def get_session() -> Generator[Session, None, None]:
    with Session(get_engine()) as session:
        yield session
        

def init_db(settings: Settings | None = None) -> None:
    run_migrations(settings)
