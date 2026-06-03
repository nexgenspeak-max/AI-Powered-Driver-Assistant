import os
from functools import lru_cache
from pydantic_settings import BaseSettings

# On Lambda, env vars come from SAM template. Locally, load from envs/.env.local
_ENV = os.getenv("ENV", "local")
_ENV_FILE = f"envs/.env.{_ENV}" if _ENV in ("local",) else None


class Settings(BaseSettings):
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    base_url: str = "http://localhost:8000"
    env: str = "local"

    model_config = {"env_file": _ENV_FILE, "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
