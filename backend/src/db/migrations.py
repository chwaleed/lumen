from pathlib import Path

from alembic import command
from alembic.config import Config

from src.core.config import Settings, get_settings

BACKEND_DIR = Path(__file__).resolve().parents[2]
ALEMBIC_INI_PATH = BACKEND_DIR / "alembic.ini"
ALEMBIC_SCRIPT_PATH = BACKEND_DIR / "alembic"


def get_alembic_config(settings: Settings | None = None) -> Config:
    app_settings = settings or get_settings()

    config = Config(str(ALEMBIC_INI_PATH))
    config.set_main_option("script_location", str(ALEMBIC_SCRIPT_PATH))
    config.set_main_option("sqlalchemy.url", app_settings.database_url)
    config.attributes["settings"] = app_settings
    return config


def run_migrations(settings: Settings | None = None, revision: str = "head") -> None:
    command.upgrade(get_alembic_config(settings), revision)
