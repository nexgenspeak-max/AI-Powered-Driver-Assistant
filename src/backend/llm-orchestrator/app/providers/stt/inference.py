from livekit.agents import inference
from app.providers.google_cloud import normalize_stt_language
from app.providers.stt.base import BaseSTT
from app.config.settings import Settings


class InferenceSTT(BaseSTT):
    """STT via LiveKit Inference — routed through LIVEKIT_API_KEY/SECRET,
    no separate provider API key needed. Used as a drop-in swap when OpenAI
    credit runs out (same idea as providers/llm/kimi.py)."""

    @classmethod
    def create(cls, settings: Settings):
        return inference.STT(
            model=settings.stt_model or "deepgram/nova-3",
            language=normalize_stt_language(settings.stt_language),
        )
