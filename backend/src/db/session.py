from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from src.core.config import Settings, get_settings

_engines: dict[str, object] = {}

def get_engine(settings: Settings | None = None):
    settings = settings or get_settings()
    
    database_url = settings.database_url
    
    if database_url not in _engines:
        connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
        _engines[database_url] = create_engine(
            database_url,
            echo=False,
            connect_args=connect_args,
        )

    return _engines[database_url]


def get_session() -> Generator[Session, None, None]:
    with Session(get_engine()) as session:
        yield session
        

def init_db(settings: Settings | None = None) -> None:
    from src.auth import models  

    SQLModel.metadata.create_all(get_engine(settings))