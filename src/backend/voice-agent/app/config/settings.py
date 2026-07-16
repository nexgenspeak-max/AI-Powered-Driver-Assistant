import os
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Anchored to this file's location (not the process's CWD) so the right .env
# still loads no matter which directory the agent (or a spawned job process)
# was launched from — a CWD-relative path here previously caused job
# processes to silently miss envs/.env.local and fall back to the hardcoded
# defaults below (e.g. a different ElevenLabs voice_id than configured).
_BASE_DIR = Path(__file__).resolve().parents[2]
_ENV = os.getenv("ENV", "local")
_ENV_FILE = _BASE_DIR / "envs" / f".env.{_ENV}"


class Settings(BaseSettings):
    # ── LiveKit ───────────────────────────────────────────────────────────────
    livekit_url: str = ""
    livekit_api_key: str = ""
    livekit_api_secret: str = ""
    agent_name: str = "driver-assistant"

    # ── Provider selection ────────────────────────────────────────────────────
    stt_provider: str = "openai"        # openai | deepgram | google
    stt_model: str = "whisper-1"
    stt_language: str = "vi-VN"         # BCP-47, e.g. vi-VN | en-US (comma-separated for Google)

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
    google_stt_location: str = ""     # auto: asia-southeast1 for chirp_3, global for latest_long
    google_tts_voice: str = "vi-VN-Neural2-A"

    # ── ElevenLabs ────────────────────────────────────────────────────────────
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "pNInz6obpgDQGcFmaJgB"   # Adam multilingual
    elevenlabs_model: str = "eleven_flash_v2_5"

    # ── Downstream services ───────────────────────────────────────────────────
    call_logger_url: str = ""    # http://localhost:8001
    trip_service_url: str = ""   # http://localhost:8002
    jwt_secret: str = ""         # must match auth-service/trip-service JWT_SECRET

    # ── FAQ RAG (LlamaIndex playbook) ─────────────────────────────────────────
    faq_rag_enabled: bool = True
    faq_knowledge_dir: str = "requirements/knowledge"
    faq_index_dir: str = "data/faq_index"
    faq_embed_model: str = "text-embedding-3-small"
    faq_top_k: int = 4

    # ── Silence tracker ───────────────────────────────────────────────────────
    silence_tracker_enabled: bool = True
    silence_threshold_seconds: float = 0.0   # 0 = use per-mode default in session.py
    silence_max_consecutive: int = 0   # 0 = use per-mode default in session.py
    # When false, silence prompts still fire but the room is not torn down (simulator dev).
    silence_end_session: bool = True

    # ── In-room bridge call ───────────────────────────────────────────────────
    # Max seconds before auto handback if customer never hangs up (0 = disabled).
    bridge_call_max_seconds: int = 600

    env: str = "local"

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE if os.path.exists(_ENV_FILE) else None,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
