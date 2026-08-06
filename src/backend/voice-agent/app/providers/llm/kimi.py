import logging

from livekit.agents import inference
from livekit.plugins import openai as openai_plugin
from app.providers.llm.base import BaseLLM
from app.config.settings import Settings

logger = logging.getLogger("voice-agent.providers.kimi")


class KimiLLM(BaseLLM):
    """Kimi K2. Two routes, picked by whether KIMI_API_KEY is set:
    - Set: calls Moonshot's own OpenAI-compatible API directly (billed to that
      account) — use this once LiveKit Inference Gateway's own credit is
      exhausted (MaxGatewayCredits errors), since this bypasses that quota
      entirely.
    - Empty (default): routed through LiveKit Inference instead, using
      LIVEKIT_API_KEY/SECRET — no separate Moonshot key needed, but shares
      LiveKit's own Gateway credit pool.
    """

    @classmethod
    def create(cls, settings: Settings):
        model = settings.llm_model or "moonshotai/kimi-k2.6"
        key_len = len(settings.kimi_api_key) if settings.kimi_api_key else 0
        if settings.kimi_api_key:
            # LLM_MODEL follows LiveKit Inference's own naming convention
            # ("moonshotai/kimi-k2.6") — Moonshot's own API (platform.kimi.ai,
            # formerly platform.moonshot.ai) does NOT recognize that prefix,
            # it wants the bare name ("kimi-k2.6"), confirmed against their
            # docs' OpenAPI schema. Strip it so one LLM_MODEL value works for
            # both routes without the user needing a second env var.
            direct_model = model.split("/", 1)[-1] if "/" in model else model
            logger.info(
                "KimiLLM: using direct Moonshot API (key_len=%d, base_url=%s, model=%s)",
                key_len, settings.kimi_base_url, direct_model,
            )
            return openai_plugin.LLM(
                model=direct_model,
                api_key=settings.kimi_api_key,
                base_url=settings.kimi_base_url or "https://api.moonshot.ai/v1",
            )
        logger.info(
            "KimiLLM: kimi_api_key is empty (key_len=0) — using LiveKit Inference Gateway instead (model=%s)",
            model,
        )
        return inference.LLM(
            model=model,
            provider=settings.kimi_provider or None,
        )
