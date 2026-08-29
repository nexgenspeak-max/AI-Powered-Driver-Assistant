import logging

from livekit.plugins import openai as openai_plugin
from app.providers.llm.base import BaseLLM
from app.config.settings import Settings

logger = logging.getLogger("voice-agent.providers.openai")


def reasoning_effort_for_voice(model: str) -> str | None:
    """Pin gpt-5.x so voice never waits on a reasoning pass.

    gpt-5.6 (luna/terra/sol) accepts none|low|medium|high|xhigh|max — not
    LiveKit's default \"minimal\". Default for 5.6 is medium (~seconds of
    thinking). Luna is the fast tier; none keeps it on the 2s bar.
    """
    if not model.startswith("gpt-5"):
        return None
    if model.startswith("gpt-5.6") or "luna" in model:
        return "none"
    if model.startswith(("gpt-5.1", "gpt-5.2", "gpt-5.4")):
        return "none"
    return "minimal"


class OpenAILLM(BaseLLM):
    """OpenAI GPT — default provider, fast function-calling support."""

    @classmethod
    def create(cls, settings: Settings):
        model = settings.llm_model or "gpt-4o-mini"
        kwargs: dict = {
            "model": model,
            "api_key": settings.openai_api_key or None,
        }
        effort = reasoning_effort_for_voice(model)
        if effort:
            kwargs["reasoning_effort"] = effort
        logger.info("OpenAILLM: model=%s reasoning_effort=%s", model, effort or "default")
        return openai_plugin.LLM(**kwargs)
