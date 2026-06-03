from livekit.plugins import deepgram as deepgram_plugin
from app.providers.stt.base import BaseSTT
from app.config.settings import Settings


class DeepgramSTT(BaseSTT):
    """Deepgram Nova — lower latency, strong real-time transcription."""

    @classmethod
    def create(cls, settings: Settings):
        return deepgram_plugin.STT(
            api_key=settings.deepgram_api_key,
            language="vi",
            model=settings.stt_model or "nova-2",
        )
