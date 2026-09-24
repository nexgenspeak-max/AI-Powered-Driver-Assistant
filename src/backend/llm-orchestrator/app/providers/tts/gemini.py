"""Gemini TTS — controllable multilingual voices; vi-VN is GA on Vertex/Gemini API."""

from __future__ import annotations

import logging
import os

from app.config.settings import Settings
from app.providers.google_cloud import resolve_credentials_file
from app.providers.tts.base import BaseTTS

logger = logging.getLogger("llm-orchestrator.providers.gemini_tts")

# Northern-Vietnamese driver assistant: clear, warm, steady pace.
_DEFAULT_VI_INSTRUCTIONS = (
    "Speak in Vietnamese (Northern accent, vi-VN). "
    "Use a warm, professional driver-assistant tone with clear enunciation. "
    "Do not omit or add any words."
)


class GeminiTTS(BaseTTS):
    """Google Gemini TTS via LiveKit plugin (non-streaming; benchmark TTFB vs ElevenLabs)."""

    @classmethod
    def create(cls, settings: Settings):
        from livekit.plugins.google.beta import gemini_tts

        voice = settings.tts_voice or settings.gemini_tts_voice
        instructions = settings.gemini_tts_instructions or _DEFAULT_VI_INSTRUCTIONS
        kwargs: dict = {
            "model": settings.gemini_tts_model,
            "voice_name": voice,
            "instructions": instructions,
        }

        api_key = settings.google_api_key or os.environ.get("GOOGLE_API_KEY", "")
        use_vertex = settings.gemini_tts_use_vertexai

        if use_vertex and (settings.google_credentials_file or settings.google_credentials_json):
            if settings.google_credentials_file:
                cred_path = resolve_credentials_file(settings.google_credentials_file)
                os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", cred_path)
            kwargs["vertexai"] = True
            if settings.gemini_tts_location:
                kwargs["location"] = settings.gemini_tts_location
            route = f"vertexai location={settings.gemini_tts_location}"
        elif api_key:
            kwargs["api_key"] = api_key
            kwargs["vertexai"] = False
            route = "gemini_api"
        else:
            # Plugin falls back to GOOGLE_API_KEY env; Vertex if GOOGLE_GENAI_USE_VERTEXAI=1.
            route = "env_default"

        logger.info(
            "Gemini TTS | model=%s voice=%s route=%s streaming=false",
            settings.gemini_tts_model,
            voice,
            route,
        )
        return gemini_tts.TTS(**kwargs)
