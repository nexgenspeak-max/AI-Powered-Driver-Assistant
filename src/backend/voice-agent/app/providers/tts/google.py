from app.config.settings import Settings
from app.providers.google_cloud import apply_google_credentials
from app.providers.tts.base import BaseTTS


class GoogleTTS(BaseTTS):
    """Google Cloud TTS — excellent Vietnamese Neural2 voices, low cost."""

    @classmethod
    def create(cls, settings: Settings):
        # Lazy import: google plugin pulls heavy transitive deps at import time
        from livekit.plugins import google as google_plugin

        kwargs: dict = {
            "language": "vi-VN",
            "voice_name": settings.tts_voice or settings.google_tts_voice,
            "speaking_rate": settings.google_tts_speaking_rate,
            "pitch": settings.google_tts_pitch,
        }
        apply_google_credentials(kwargs, settings)
        return google_plugin.TTS(**kwargs)
