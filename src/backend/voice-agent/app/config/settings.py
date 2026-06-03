import os
from functools import lru_cache
from pydantic_settings import BaseSettings

_ENV = os.getenv("ENV", "local")
_ENV_FILE = f"envs/.env.{_ENV}"


class Settings(BaseSettings):
    # ── LiveKit ───────────────────────────────────────────────────────────────
    livekit_url: str = ""
    livekit_api_key: str = ""
    livekit_api_secret: str = ""
    agent_name: str = "driver-assistant"

    # ── Provider selection ────────────────────────────────────────────────────
    stt_provider: str = "openai"        # openai | deepgram
    stt_model: str = "whisper-1"

    llm_provider: str = "openai"        # openai | gemini
    llm_model: str = "gpt-4o-mini"

    tts_provider: str = "elevenlabs"    # elevenlabs | google
    tts_voice: str = ""

    # ── OpenAI ────────────────────────────────────────────────────────────────
    openai_api_key: str = ""
    openai_tts_model: str = "gpt-4o-mini-tts"
    openai_tts_voice: str = "nova"

    # ── Deepgram ──────────────────────────────────────────────────────────────
    deepgram_api_key: str = ""

    # ── Google Cloud (STT + TTS) ──────────────────────────────────────────────
    google_credentials_file: str = ""
    google_credentials_json: str = ""   # full JSON string for containerised envs
    google_stt_model: str = "telephony"
    google_tts_voice: str = "vi-VN-Neural2-A"

    # ── ElevenLabs ────────────────────────────────────────────────────────────
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "pNInz6obpgDQGcFmaJgB"   # Adam multilingual
    elevenlabs_model: str = "eleven_flash_v2_5"

    # ── Downstream services ───────────────────────────────────────────────────
    call_logger_url: str = ""    # http://localhost:8001
    trip_service_url: str = ""   # http://localhost:8002

    # ── Silence tracker ───────────────────────────────────────────────────────
    silence_tracker_enabled: bool = True
    silence_threshold_seconds: float = 0.0   # 0 = use per-mode default in session.py
    silence_max_consecutive: int = 3
    # When false, silence prompts still fire but the room is not torn down (simulator dev).
    silence_end_session: bool = True

    env: str = "local"

    model_config = {"env_file": _ENV_FILE, "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
