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
    stt_provider: str = "openai"        # openai | deepgram | google | inference
    stt_model: str = "whisper-1"
    stt_language: str = "vi-VN"         # BCP-47, e.g. vi-VN | en-US (comma-separated for Google)

    llm_provider: str = "openai"        # openai | gemini | kimi
    llm_model: str = "gpt-4o-mini"

    tts_provider: str = "elevenlabs"    # elevenlabs | google
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
    google_stt_model: str = "telephony"
    google_stt_location: str = ""     # auto: asia-southeast1 for chirp_3, global for latest_long
    google_tts_voice: str = "vi-VN-Neural2-A"
    # Northern-Vietnamese-standard delivery: slightly slower for clear
    # enunciation ("rõ chữ") and a touch lower-pitched for the gentle
    # downward inflection ("hơi xuống") typical of Northern Vietnamese
    # speech — Google's pitch range is roughly -20..+20 semitones, so -2 is
    # a subtle shift, not a different-sounding voice.
    google_tts_speaking_rate: float = 0.95
    google_tts_pitch: float = -2.0

    # ── ElevenLabs ────────────────────────────────────────────────────────────
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "pNInz6obpgDQGcFmaJgB"   # Adam multilingual
    elevenlabs_model: str = "eleven_flash_v2_5"

    # ── Downstream services ───────────────────────────────────────────────────
    call_logger_url: str = ""    # http://localhost:8001
    trip_service_url: str = ""   # http://localhost:8002
    jwt_secret: str = ""         # must match auth-service/trip-service JWT_SECRET

    # Call-record retention — call-logger's DynamoDB table has TTL enabled on
    # its `ttl` attribute (see infra/call-logger/sam.yaml), but nothing ever
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

    env: str = "local"

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE if os.path.exists(_ENV_FILE) else None,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
