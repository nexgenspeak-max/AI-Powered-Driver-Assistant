import os
from functools import lru_cache
from pydantic_settings import BaseSettings

_ENV = os.getenv("ENV", "local")
_ENV_FILE = f"envs/.env.{_ENV}" if _ENV == "local" else None


class Settings(BaseSettings):
    env: str = "local"
    dynamodb_table: str = "local-driver-assistant-call-records"

    model_config = {"env_file": _ENV_FILE, "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
