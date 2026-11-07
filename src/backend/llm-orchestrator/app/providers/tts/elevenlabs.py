import logging

from livekit.plugins import elevenlabs as elevenlabs_plugin

from app.config.settings import DEFAULT_ELEVENLABS_VOICE_ID, Settings
from app.providers.tts.base import BaseTTS
from app.providers.tts.markup import model_supports_audio_tags

logger = logging.getLogger("llm-orchestrator.providers.elevenlabs_tts")


def voice_settings_for(settings: Settings) -> "elevenlabs_plugin.VoiceSettings":
    """Pinned voice settings so every turn keeps the same timbre.

    Leaving them unset falls back to the voice's dashboard settings, which can
    drift between turns. eleven_v3/v4 go through ElevenLabs' text-to-dialogue
    API, which only accepts ``stability`` (0 creative, 0.5 natural, 1 robust);
    sending the other fields there only logs a warning, so they are omitted.
    """
    if model_supports_audio_tags("elevenlabs", settings.elevenlabs_model):
        # similarity_boost is a required dataclass field; None is dropped by
        # the plugin before the request, like the unset optional fields.
        return elevenlabs_plugin.VoiceSettings(
            stability=settings.elevenlabs_stability,
            similarity_boost=None,  # type: ignore[arg-type]
        )
    return elevenlabs_plugin.VoiceSettings(
        stability=settings.elevenlabs_stability,
        similarity_boost=settings.elevenlabs_similarity_boost,
        style=settings.elevenlabs_style,
        speed=settings.elevenlabs_speed,
    )


class ElevenLabsTTS(BaseTTS):
    """ElevenLabs — native Vietnamese Voice Library voice on eleven_v4_turbo.

    eleven_v4_turbo was picked by measurement (warm websocket, 2026-11):
    time to first audio ~360 ms, same as eleven_flash_v2_5, but clearly
    better Vietnamese (flash dropped/misread words) and it performs audio
    tags such as [chuckles]; see app/providers/tts/markup.py.
    """

    @classmethod
    def create(cls, settings: Settings):
        voice_id = settings.tts_voice or settings.elevenlabs_voice_id or DEFAULT_ELEVENLABS_VOICE_ID
        kwargs: dict = {
            "api_key": settings.elevenlabs_api_key,
            "model": settings.elevenlabs_model,
            "voice_id": voice_id,
            "voice_settings": voice_settings_for(settings),
        }
        if settings.elevenlabs_language:
            kwargs["language"] = settings.elevenlabs_language
        logger.info(
            "ElevenLabs TTS | voice=%s model=%s stability=%s audio_tags=%s",
            voice_id,
            settings.elevenlabs_model,
            settings.elevenlabs_stability,
            model_supports_audio_tags("elevenlabs", settings.elevenlabs_model),
        )
        return elevenlabs_plugin.TTS(**kwargs)
