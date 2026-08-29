"""Shared helpers for Google Cloud STT/TTS providers."""

from __future__ import annotations

import json
import logging
import tempfile
from pathlib import Path

from app.config.settings import Settings

logger = logging.getLogger("voice-agent.providers.google")

_ENVS_DIR = Path(__file__).resolve().parents[2] / "envs"
_VOICE_AGENT_ROOT = _ENVS_DIR.parent

# Speech-to-Text v2 models require a regional location (not "global").
STT_V2_MODELS = frozenset({"telephony", "chirp_2", "chirp_3"})

GOOGLE_STT_MODELS = STT_V2_MODELS | frozenset({
    "long",
    "short",
    "chirp",
    "latest_long",
    "latest_short",
    "medical_dictation",
    "medical_conversation",
})

# Models known to work with vi-VN (model -> allowed locations).
# chirp_3+vi-VN is GA only in us/eu — asia-southeast1 returns 403
# ("no longer generally available").
GOOGLE_STT_VI_VN_SUPPORT: dict[str, frozenset[str]] = {
    "chirp_3": frozenset({"us", "eu"}),
    "chirp_2": frozenset({"asia-southeast1", "us"}),
    "latest_long": frozenset({"global"}),
    "latest_short": frozenset({"global"}),
    # telephony (v2) does not support vi-VN in any tested region.
}


def parse_stt_languages(language: str) -> list[str]:
    """Parse STT_LANGUAGE — single code or comma-separated list for Google."""
    langs = [part.strip() for part in language.split(",") if part.strip()]
    return langs or ["vi-VN"]


def normalize_stt_language(language: str) -> str:
    """Convert BCP-47 tag to ISO 639-1 for OpenAI Whisper / Deepgram."""
    return language.split("-")[0].split(",")[0].strip().lower() or "vi"


def resolve_google_stt_model(settings: Settings) -> str:
    """Prefer GOOGLE_STT_MODEL; fall back to STT_MODEL when it is a Google model name."""
    if settings.google_stt_model:
        return settings.google_stt_model
    if settings.stt_model in GOOGLE_STT_MODELS:
        return settings.stt_model
    return "chirp_3"


def default_stt_location(model: str) -> str:
    if model == "chirp_3":
        return "us"
    if model in STT_V2_MODELS:
        return "asia-southeast1"
    return "global"


def resolve_google_stt_location(model: str, location: str) -> str:
    if location:
        return location
    return default_stt_location(model)


def validate_google_stt_config(model: str, languages: list[str], location: str) -> None:
    """Log warnings when env model/language/location combo is known to fail."""
    if "vi-VN" not in languages and "vi" not in languages:
        return

    supported_locations = GOOGLE_STT_VI_VN_SUPPORT.get(model)
    if supported_locations is None:
        if model == "telephony":
            logger.warning(
                "Google STT | model=%s does not support vi-VN — "
                "use chirp_2 + asia-southeast1, chirp_3 + us, or latest_long + global",
                model,
            )
        return

    if location not in supported_locations:
        logger.warning(
            "Google STT | model=%s languages=%s location=%s may fail — "
            "supported locations for vi-VN: %s",
            model,
            languages,
            location,
            ", ".join(sorted(supported_locations)),
        )


def resolve_credentials_file(path: str) -> str:
    """Resolve a credentials path relative to cwd, project root, or envs/."""
    candidate = Path(path)
    if candidate.is_absolute() and candidate.exists():
        return str(candidate)

    for base in (Path.cwd(), _VOICE_AGENT_ROOT, _ENVS_DIR):
        resolved = (base / candidate).resolve()
        if resolved.exists():
            return str(resolved)

    return path


def apply_google_credentials(kwargs: dict, settings: Settings) -> None:
    if settings.google_credentials_file:
        kwargs["credentials_file"] = resolve_credentials_file(
            settings.google_credentials_file
        )
    elif settings.google_credentials_json:
        try:
            kwargs["credentials_info"] = json.loads(settings.google_credentials_json)
        except json.JSONDecodeError:
            tmp = tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False
            )
            tmp.write(settings.google_credentials_json)
            tmp.flush()
            kwargs["credentials_file"] = tmp.name
