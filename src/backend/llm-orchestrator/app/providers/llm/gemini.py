from app.providers.llm.base import BaseLLM
from app.config.settings import Settings


class GeminiLLM(BaseLLM):
    """Google Gemini — alternative to GPT, good multilingual reasoning."""

    @classmethod
    def create(cls, settings: Settings):
        # Lazy import: google plugin pulls heavy transitive deps at import time
        from livekit.plugins import google as google_plugin
        return google_plugin.LLM(model=settings.llm_model or "gemini-2.0-flash")
