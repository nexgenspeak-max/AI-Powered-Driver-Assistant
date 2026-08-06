from livekit.agents import inference
from app.providers.llm.base import BaseLLM
from app.config.settings import Settings


class KimiLLM(BaseLLM):
    """Kimi K2 via LiveKit Inference — routed through LIVEKIT_API_KEY/SECRET,
    no separate Moonshot API key needed. Used as a drop-in swap when OpenAI credit runs out."""

    @classmethod
    def create(cls, settings: Settings):
        return inference.LLM(
            model=settings.llm_model or "moonshotai/kimi-k2.6",
            provider=settings.kimi_provider or None,
        )
