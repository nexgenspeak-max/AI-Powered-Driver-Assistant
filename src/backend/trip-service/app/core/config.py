import os
from functools import lru_cache
from pydantic_settings import BaseSettings

_ENV = os.getenv("ENV", "local")
_ENV_FILE = f"envs/.env.{_ENV}"


class Settings(BaseSettings):
    env: str = "local"
    dynamodb_table: str = "local-driver-assistant-trips"

    # LiveKit — for creating rooms + outbound SIP calls
    livekit_url: str = ""
    livekit_api_key: str = ""
    livekit_api_secret: str = ""
    livekit_agent_name: str = "driver-assistant"
    sip_trunk_id: str = ""          # existing Twilio SIP trunk ST_xxxxx

    # Google Maps
    google_maps_api_key: str = ""

    # Outbound calls (driver → customer via call-center / Twilio)
    call_center_url: str = "http://localhost:8000"
    twilio_verified_to: str = "+84867347452"   # Twilio trial: only verified numbers
    call_force_verified_to: bool = True        # local: dial verified # instead of trip phone

    model_config = {"env_file": _ENV_FILE, "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
