from livekit.plugins import openai as openai_plugin
from app.providers.llm.base import BaseLLM
from app.config.settings import Settings


class OpenAILLM(BaseLLM):
    """OpenAI GPT — default provider, fast function-calling support."""

    @classmethod
    def create(cls, settings: Settings):
        return openai_plugin.LLM(model=settings.llm_model or "gpt-4o-mini")
