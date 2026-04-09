from pathlib import Path

import pytest
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect, text

from src.core.config import Settings
from src.db.migrations import get_alembic_config
from src.db.session import _engines, get_engine, init_db


@pytest.fixture()
def sqlite_settings(tmp_path: Path):
    db_path = tmp_path / "migration-test.db"
    database_url = f"sqlite:///{db_path.as_posix()}"
    settings = Settings(database_url=database_url)

    yield settings

    engine = _engines.pop(database_url, None)
    if engine is not None:
        engine.dispose()


def test_init_db_runs_head_migration(sqlite_settings: Settings) -> None:
    init_db(sqlite_settings)
    engine = get_engine(sqlite_settings)
    inspector = inspect(engine)

    assert {"alembic_version", "users", "refresh_tokens", "projects", "file_entries"} <= set(
        inspector.get_table_names()
    )

    with engine.connect() as connection:
        current_revision = connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()

    script = ScriptDirectory.from_config(get_alembic_config(sqlite_settings))
    assert current_revision == script.get_current_head()


def test_init_db_upgrades_legacy_auth_schema(sqlite_settings: Settings) -> None:
    legacy_engine = create_engine(sqlite_settings.database_url)

    with legacy_engine.begin() as connection:
        connection.exec_driver_sql(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                email VARCHAR(320) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(350) NOT NULL,
                is_active BOOLEAN NOT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            )
            """
        )
        connection.exec_driver_sql(
            """
            CREATE TABLE refresh_tokens (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                jti VARCHAR(64) NOT NULL UNIQUE,
                token_hash VARCHAR(64) NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                revoked_at TIMESTAMP NULL,
                created_at TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        connection.exec_driver_sql("CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens (user_id)")

    legacy_engine.dispose()

    init_db(sqlite_settings)
    engine = get_engine(sqlite_settings)
    inspector = inspect(engine)

    assert {"alembic_version", "users", "refresh_tokens", "projects", "file_entries"} <= set(
        inspector.get_table_names()
    )
