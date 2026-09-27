import os
from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict, TomlConfigSettingsSource

from app.config.local_config import config_path

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
    stt_provider: str = "openai"        # openai | deepgram | google | inference
    stt_fallback: str = ""              # comma-separated backups; empty = no fallback
    stt_model: str = "whisper-1"
    stt_language: str = "vi-VN"         # BCP-47, e.g. vi-VN | en-US (comma-separated for Google)

    llm_provider: str = "openai"        # openai | gemini | kimi
    llm_fallback: str = ""              # comma-separated backups; empty = no fallback
    llm_model: str = "gpt-4o-mini"

    tts_provider: str = "elevenlabs"    # elevenlabs | google | gemini
    tts_fallback: str = ""              # comma-separated backups; empty = no fallback
    tts_voice: str = ""

    # ── OpenAI ────────────────────────────────────────────────────────────────
    openai_api_key: str = ""
    openai_tts_model: str = "gpt-4o-mini-tts"
    openai_tts_voice: str = "nova"

    # ── Kimi ──────────────────────────────────────────────────────────────────
    # If kimi_api_key is set, KimiLLM calls Moonshot's own OpenAI-compatible API
    # directly (billed to that account, bypasses LiveKit Inference Gateway
    # entirely — use this when the Gateway's own credit is exhausted). Leaves
    # kimi_provider unused in that case; empty key falls back to the original
    # LiveKit Inference route (LIVEKIT_API_KEY/SECRET, no separate key needed).
    kimi_api_key: str = ""
    kimi_base_url: str = "https://api.moonshot.ai/v1"
    kimi_provider: str = ""   # optional: force a specific inference provider (e.g. "baseten") — only used via LiveKit Inference route

    # STT_PROVIDER=inference uses the same LiveKit Inference route (no separate
    # key) — set STT_MODEL to a "provider/model" string, e.g. "deepgram/nova-3"
    # or "cartesia/ink-whisper". Drop-in swap when OPENAI_API_KEY runs out of
    # credit, same idea as Kimi above.

    # ── Deepgram ──────────────────────────────────────────────────────────────
    deepgram_api_key: str = ""

    # ── Google Cloud (STT + TTS) ──────────────────────────────────────────────
    google_credentials_file: str = ""
    google_credentials_json: str = ""   # full JSON string for containerised envs
    google_stt_model: str = "chirp_3"
    google_stt_location: str = ""     # auto: asia-southeast1 for chirp_2, us for chirp_3, global for latest_long
    google_tts_voice: str = "vi-VN-Chirp3-HD-Kore"
    # Northern-Vietnamese-standard delivery: slightly slower for clear
    # enunciation ("rõ chữ") and a touch lower-pitched for the gentle
    # downward inflection ("hơi xuống") typical of Northern Vietnamese
    # speech — Google's pitch range is roughly -20..+20 semitones, so -2 is
    # a subtle shift, not a different-sounding voice.
    google_tts_speaking_rate: float = 0.95
    google_tts_pitch: float = -2.0

    # ── Gemini TTS (LiveKit google.beta.gemini_tts — non-streaming) ───────────
    google_api_key: str = ""              # GOOGLE_API_KEY — Gemini API route
    gemini_tts_model: str = "gemini-3.1-flash-tts-preview"
    gemini_tts_voice: str = "Kore"
    gemini_tts_location: str = "us-central1"
    gemini_tts_use_vertexai: bool = True  # reuse GOOGLE_CREDENTIALS_FILE when true
    gemini_tts_instructions: str = ""     # empty = Northern vi-VN driver-assistant default

    # ── ElevenLabs ────────────────────────────────────────────────────────────
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "pNInz6obpgDQGcFmaJgB"   # Adam multilingual
    elevenlabs_model: str = "eleven_flash_v2_5"

    # ── Downstream services (dual-read: new names preferred, old aliases OK) ─
    call_logger_url: str = Field(
        default="",
        validation_alias=AliasChoices(
            "CALL_RECORDS_SERVICE_URL", "CALL_LOGGER_URL", "call_logger_url"
        ),
    )
    trip_service_url: str = Field(
        default="",
        validation_alias=AliasChoices(
            "EXTERNAL_API_SERVICE_URL", "TRIP_SERVICE_URL", "trip_service_url"
        ),
    )
    jwt_secret: str = ""  # must match identity-service / external-api-service
    env: str = "local"

    # Call-record retention — call-logger's DynamoDB table has TTL enabled on
    # its `ttl` attribute (see infra/call-records-service/sam.yaml), but nothing ever
    # populated that attribute, so records piled up forever despite the infra
    # being configured to expire them. <=0 disables TTL (keep forever) — kept
    # off by default for now per explicit product decision; set
    # CALL_RECORD_TTL_DAYS to a positive number when auto-expiry is wanted.
    call_record_ttl_days: int = 0

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

    # ── Agent locale (routing) ───────────────────────────────────────────────
    # Default voice-agent language when room.metadata.lang is absent.
    # Pair with STT_LANGUAGE + GOOGLE_TTS_VOICE (or provider voice) for the
    # same locale bundle — see envs/config.example.toml "Locale bundle".
    # dual-read: AGENT_LANG preferred; VOICE_AGENT_LANG still accepted
    agent_lang: str = Field(
        default="vn",  # vn | en
        validation_alias=AliasChoices(
            "AGENT_LANG", "VOICE_AGENT_LANG", "agent_lang", "voice_agent_lang"
        ),
    )

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE if os.path.exists(_ENV_FILE) else None,
        extra="ignore",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        # Env and .env (secrets) win. The toml file only fills what they omit.
        path = config_path()
        sources = (init_settings, env_settings, dotenv_settings)
        if path is not None:
            sources = (*sources, TomlConfigSettingsSource(settings_cls, toml_file=path))
        return (*sources, file_secret_settings)

    @model_validator(mode="after")
    def _require_jwt_secret(self) -> "Settings":
        if self.jwt_secret:
            return self
        if self.env == "local" or _ENV == "local":
            self.jwt_secret = "dev-secret-change-me"
            return self
        raise ValueError("JWT_SECRET is required when ENV is not local")



@lru_cache
def get_settings() -> Settings:
    return Settings()
