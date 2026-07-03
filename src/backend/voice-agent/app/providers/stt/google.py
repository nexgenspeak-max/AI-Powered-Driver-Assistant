import logging

from app.config.settings import Settings
from app.providers.google_cloud import (
    apply_google_credentials,
    parse_stt_languages,
    resolve_google_stt_location,
    resolve_google_stt_model,
    validate_google_stt_config,
)
from app.providers.stt.base import BaseSTT

logger = logging.getLogger("voice-agent.providers.google")


class GoogleSTT(BaseSTT):
    """Google Cloud STT — model, language, and location driven by env vars."""

    @classmethod
    def create(cls, settings: Settings):
        # Lazy import: google plugin pulls heavy transitive deps at import time
        from livekit.plugins import google as google_plugin

        model = resolve_google_stt_model(settings)
        languages = parse_stt_languages(settings.stt_language)
        location = resolve_google_stt_location(model, settings.google_stt_location)
        validate_google_stt_config(model, languages, location)

        logger.info(
            "Google STT | model=%s languages=%s location=%s",
            model,
            languages,
            location,
        )

        kwargs: dict = {
            "languages": languages,
            "model": model,
            "location": location,
        }
        apply_google_credentials(kwargs, settings)
        return google_plugin.STT(**kwargs)
