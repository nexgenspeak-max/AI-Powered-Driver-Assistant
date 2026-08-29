import logging

from app.config.settings import Settings
from app.providers.google_cloud import (
    GOOGLE_STT_VI_VN_SUPPORT,
    apply_google_credentials,
    default_stt_location,
    parse_stt_languages,
    resolve_google_stt_location,
    resolve_google_stt_model,
    validate_google_stt_config,
)
from app.providers.stt.base import BaseSTT

logger = logging.getLogger("voice-agent.providers.google")

# Phrase hints so Chirp prefers "nhận chuyến" over near-homophones.
# Do not set speech_end_timeout: LiveKit treats Google's VAD cancel as
# STT 499 and drops the transcript (live 2026-08-29). chirp_3 SUPERSHORT
# endpointing is the supported way to close utterances faster.
_VI_KEYWORDS: tuple[tuple[str, float], ...] = (
    ("xác nhận nhận chuyến", 10.0),
    ("xác nhận chuyến", 8.0),
    ("nhận chuyến", 6.0),
)


def stt_plugin_kwargs(settings: Settings) -> dict:
    model = resolve_google_stt_model(settings)
    languages = parse_stt_languages(settings.stt_language)
    location = resolve_google_stt_location(model, settings.google_stt_location)
    # chirp_3+vi-VN is 403 on asia-southeast1. A leftover env location must
    # not keep us on the slow chirp_2 region (or fail the stream).
    if "vi-VN" in languages or "vi" in languages:
        allowed = GOOGLE_STT_VI_VN_SUPPORT.get(model)
        if allowed and location not in allowed:
            location = default_stt_location(model)
    validate_google_stt_config(model, languages, location)
    kwargs: dict = {
        "languages": languages,
        "model": model,
        "location": location,
        # Skip punctuation wait — finals return sooner; we don't speak punctuation.
        "punctuate": False,
        "keywords": list(_VI_KEYWORDS),
    }
    if model == "chirp_3":
        kwargs["endpointing_sensitivity"] = "ENDPOINTING_SENSITIVITY_SUPERSHORT"
    apply_google_credentials(kwargs, settings)
    return kwargs


class GoogleSTT(BaseSTT):
    """Google Cloud STT — model, language, and location driven by env vars."""

    @classmethod
    def create(cls, settings: Settings):
        # Lazy import: google plugin pulls heavy transitive deps at import time
        from livekit.plugins import google as google_plugin

        kwargs = stt_plugin_kwargs(settings)
        logger.info(
            "Google STT | model=%s languages=%s location=%s punctuate=%s endpointing=%s",
            kwargs.get("model"),
            kwargs.get("languages"),
            kwargs.get("location"),
            kwargs.get("punctuate"),
            kwargs.get("endpointing_sensitivity") or "default",
        )
        return google_plugin.STT(**kwargs)
