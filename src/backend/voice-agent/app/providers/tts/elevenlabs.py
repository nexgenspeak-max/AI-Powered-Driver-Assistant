from livekit.plugins import elevenlabs as elevenlabs_plugin
from app.providers.tts.base import BaseTTS
from app.config.settings import Settings


class ElevenLabsTTS(BaseTTS):
    """ElevenLabs — expressive, natural-sounding voice; good Vietnamese quality."""

    @classmethod
    def create(cls, settings: Settings):
        return elevenlabs_plugin.TTS(
            api_key=settings.elevenlabs_api_key,
            model=settings.elevenlabs_model,
            voice_id=settings.tts_voice or settings.elevenlabs_voice_id,
        )
