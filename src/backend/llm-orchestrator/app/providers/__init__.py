"""
Provider factory — swap STT / LLM / TTS by changing env vars only:

  STT_PROVIDER = openai | deepgram | google | inference
  LLM_PROVIDER = openai | gemini | kimi
  TTS_PROVIDER = openai | elevenlabs | google | gemini

Optional backups (used only when the one in front fails):

  STT_FALLBACK = google
  LLM_FALLBACK = gemini
  TTS_FALLBACK = google

All provider modules are imported at the top level so that LiveKit plugins
(which call Plugin.register_plugin() on import) are registered on the main
thread — not inside entrypoint() which runs on a worker thread.
"""
import logging

from livekit.agents import llm as llm_mod
from livekit.agents import stt as stt_mod
from livekit.agents import tts as tts_mod

from app.config.settings import Settings, get_settings

from app.providers.fallback import (
    _LLM_ALIAS,
    log_provider_availability,
    provider_chain,
    with_fallback,
)
from app.providers.stt.openai import OpenAISTT
from app.providers.stt.deepgram import DeepgramSTT
from app.providers.stt.google import GoogleSTT
from app.providers.stt.inference import InferenceSTT
from app.providers.llm.openai import OpenAILLM
from app.providers.llm.gemini import GeminiLLM
from app.providers.llm.kimi import KimiLLM
from app.providers.tts.openai import OpenAITTS
from app.providers.tts.elevenlabs import ElevenLabsTTS
from app.providers.tts.google import GoogleTTS
from app.providers.tts.gemini import GeminiTTS

logger = logging.getLogger("llm-orchestrator.providers")

_STT = {
    "openai": OpenAISTT,
    "deepgram": DeepgramSTT,
    "google": GoogleSTT,
    "inference": InferenceSTT,
}
_LLM = {
    "openai": OpenAILLM,
    "gemini": GeminiLLM,
    "kimi": KimiLLM,
}
_TTS = {
    "openai": OpenAITTS,
    "elevenlabs": ElevenLabsTTS,
    "google": GoogleTTS,
    "gemini": GeminiTTS,
}


def _create_chain(kind: str, names: list[str], classes: dict, settings: Settings, tune: dict):
    instances = []
    for index, name in enumerate(names):
        cls = classes.get(name)
        if cls is None:
            raise ValueError(
                f"Unknown {kind} provider {name!r}. Available: {list(classes)}"
            )
        tuned = settings if index == 0 else settings.model_copy(update=tune)
        instances.append(cls.create(tuned))
    if len(names) > 1:
        logger.info("%s chain primary=%s backups=%s", kind, names[0], ",".join(names[1:]))
    return instances


def get_stt():
    s = get_settings()
    names = provider_chain(s.stt_provider, s.stt_fallback)
    instances = _create_chain("stt", names, _STT, s, {"stt_model": ""})
    wrapped = with_fallback(
        instances,
        stt_mod.FallbackAdapter,
        attempt_timeout=5.0,
        max_retry_per_stt=0,
        retry_interval=0.5,
    )
    if len(instances) > 1:
        log_provider_availability(
            wrapped, kind="stt", event_name="stt_availability_changed", attr="stt"
        )
    return wrapped


def get_llm():
    s = get_settings()
    names = provider_chain(s.llm_provider, s.llm_fallback, aliases=_LLM_ALIAS)
    instances = _create_chain("llm", names, _LLM, s, {"llm_model": ""})
    wrapped = with_fallback(
        instances,
        llm_mod.FallbackAdapter,
        attempt_timeout=5.0,
        max_retry_per_llm=0,
    )
    if len(instances) > 1:
        log_provider_availability(
            wrapped, kind="llm", event_name="llm_availability_changed", attr="llm"
        )
    return wrapped


def get_tts():
    s = get_settings()
    names = provider_chain(s.tts_provider, s.tts_fallback)
    instances = _create_chain("tts", names, _TTS, s, {"tts_voice": ""})
    wrapped = with_fallback(
        instances,
        tts_mod.FallbackAdapter,
        max_retry_per_tts=0,
    )
    if len(instances) > 1:
        log_provider_availability(
            wrapped, kind="tts", event_name="tts_availability_changed", attr="tts"
        )
    return wrapped
