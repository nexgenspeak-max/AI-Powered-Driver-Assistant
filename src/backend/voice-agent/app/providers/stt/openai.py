from livekit.plugins import openai as openai_plugin
from app.providers.stt.base import BaseSTT
from app.config.settings import Settings


class OpenAISTT(BaseSTT):
    """OpenAI Whisper — good general-purpose STT, solid Vietnamese support."""

    @classmethod
    def create(cls, settings: Settings):
        return openai_plugin.STT(
            model=settings.stt_model or "whisper-1",
            language="vi",
        )
