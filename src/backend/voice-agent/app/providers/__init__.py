"""
Provider factory — swap STT / LLM / TTS by changing env vars only:

  STT_PROVIDER = openai | deepgram
  LLM_PROVIDER = openai | gemini
  TTS_PROVIDER = openai | elevenlabs | google

All provider modules are imported at the top level so that LiveKit plugins
(which call Plugin.register_plugin() on import) are registered on the main
thread — not inside entrypoint() which runs on a worker thread.
"""
from app.config.settings import get_settings

from app.providers.stt.openai import OpenAISTT
from app.providers.stt.deepgram import DeepgramSTT
from app.providers.llm.openai import OpenAILLM
from app.providers.llm.gemini import GeminiLLM
from app.providers.tts.openai import OpenAITTS
from app.providers.tts.elevenlabs import ElevenLabsTTS
from app.providers.tts.google import GoogleTTS


def get_stt():
    s = get_settings()
    _map = {
        "openai":   OpenAISTT,
        "deepgram": DeepgramSTT,
    }
    cls = _map.get(s.stt_provider)
    if cls is None:
        raise ValueError(
            f"Unknown STT_PROVIDER={s.stt_provider!r}. Available: {list(_map)}"
        )
    return cls.create(s)


def get_llm():
    s = get_settings()
    _map = {
        "openai":  OpenAILLM,
        "gemini":  GeminiLLM,
        "google":  GeminiLLM,
    }
    cls = _map.get(s.llm_provider)
    if cls is None:
        raise ValueError(
            f"Unknown LLM_PROVIDER={s.llm_provider!r}. Available: {list(_map)}"
        )
    return cls.create(s)


def get_tts():
    s = get_settings()
    _map = {
        "openai":     OpenAITTS,
        "elevenlabs": ElevenLabsTTS,
        "google":     GoogleTTS,
    }
    cls = _map.get(s.tts_provider)
    if cls is None:
        raise ValueError(
            f"Unknown TTS_PROVIDER={s.tts_provider!r}. Available: {list(_map)}"
        )
    return cls.create(s)
