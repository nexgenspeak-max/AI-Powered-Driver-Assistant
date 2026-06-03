import tempfile
from app.providers.tts.base import BaseTTS
from app.config.settings import Settings


class GoogleTTS(BaseTTS):
    """Google Cloud TTS — excellent Vietnamese Neural2 voices, low cost."""

    @classmethod
    def create(cls, settings: Settings):
        # Lazy import: google plugin pulls heavy transitive deps at import time
        from livekit.plugins import google as google_plugin
        kwargs: dict = {
            "language": "vi-VN",
            "voice_name": settings.tts_voice or settings.google_tts_voice,
        }
        cls._apply_credentials(kwargs, settings)
        return google_plugin.TTS(**kwargs)

    @staticmethod
    def _apply_credentials(kwargs: dict, settings: Settings) -> None:
        if settings.google_credentials_file:
            kwargs["credentials_file"] = settings.google_credentials_file
        elif settings.google_credentials_json:
            tmp = tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False
            )
            tmp.write(settings.google_credentials_json)
            tmp.flush()
            kwargs["credentials_file"] = tmp.name
