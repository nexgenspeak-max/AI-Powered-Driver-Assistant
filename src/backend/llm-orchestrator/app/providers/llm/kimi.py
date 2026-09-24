import logging

from livekit.agents import inference
from livekit.plugins import openai as openai_plugin
from app.providers.llm.base import BaseLLM
from app.config.settings import Settings

logger = logging.getLogger("llm-orchestrator.providers.kimi")

# k2.5/k2.6 default thinking={"type":"enabled"} (Moonshot docs). That
# reasoning pass was ~13s before the first tool call on a live "lịch hôm nay"
# turn — well over the 2s voice bar. Voice tool-calling does not need it.
_THINKING_MODELS = ("kimi-k2.5", "kimi-k2.6")


def extra_body_for_voice(model: str) -> dict | None:
    name = model.split("/", 1)[-1]
    if name.startswith(_THINKING_MODELS):
        return {"thinking": {"type": "disabled"}}
    return None


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
            extra = extra_body_for_voice(direct_model)
            kwargs: dict = {
                "model": direct_model,
                "api_key": settings.kimi_api_key,
                "base_url": settings.kimi_base_url or "https://api.moonshot.ai/v1",
            }
            if extra:
                # Do not pass temperature — k2.6 pins 0.6 in non-thinking
                # and 1.0 in thinking; any other value returns an error.
                kwargs["extra_body"] = extra
                logger.info(
                    "KimiLLM: disabling thinking for voice (model=%s extra_body=%s)",
                    direct_model,
                    extra,
                )
            return openai_plugin.LLM(**kwargs)
        logger.info(
            "KimiLLM: kimi_api_key is empty (key_len=0) — using LiveKit Inference Gateway instead (model=%s)",
            model,
        )
        return inference.LLM(
            model=model,
            provider=settings.kimi_provider or None,
        )
