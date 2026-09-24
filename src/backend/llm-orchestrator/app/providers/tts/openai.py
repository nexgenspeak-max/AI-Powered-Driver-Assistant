from livekit.plugins import openai as openai_plugin
from app.providers.tts.base import BaseTTS
from app.config.settings import Settings


class OpenAITTS(BaseTTS):
    """OpenAI TTS — works with the same API key as STT/LLM."""

    @classmethod
    def create(cls, settings: Settings):
        return openai_plugin.TTS(
            api_key=settings.openai_api_key,
            model=settings.openai_tts_model,
            voice=settings.tts_voice or settings.openai_tts_voice,
        )
