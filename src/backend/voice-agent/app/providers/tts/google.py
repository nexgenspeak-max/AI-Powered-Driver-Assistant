from app.config.settings import Settings
from app.providers.google_cloud import apply_google_credentials
from app.providers.tts.base import BaseTTS

import logging

logger = logging.getLogger("voice-agent.providers.google_tts")


def _use_streaming(voice_name: str) -> bool:
    """Neural2/Wavenet batch-only on LiveKit Google plugin; Chirp3-HD supports streaming."""
    lower = voice_name.lower()
    return "chirp3" in lower or "chirp_3" in lower


class GoogleTTS(BaseTTS):
    """Google Cloud TTS — vi-VN Chirp3-HD (streaming) or Neural2 (batch)."""

    @classmethod
    def create(cls, settings: Settings):
        # Lazy import: google plugin pulls heavy transitive deps at import time
        from livekit.plugins import google as google_plugin

        voice = settings.tts_voice or settings.google_tts_voice
        use_streaming = _use_streaming(voice)
        kwargs: dict = {
            "language": "vi-VN",
            "voice_name": voice,
            "speaking_rate": settings.google_tts_speaking_rate,
            "pitch": settings.google_tts_pitch,
            "use_streaming": use_streaming,
        }
        apply_google_credentials(kwargs, settings)
        logger.info(
            "Google TTS | voice=%s streaming=%s rate=%s pitch=%s",
            voice,
            use_streaming,
            settings.google_tts_speaking_rate,
            settings.google_tts_pitch,
        )
        return google_plugin.TTS(**kwargs)
