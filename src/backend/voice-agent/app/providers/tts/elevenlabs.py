from livekit.plugins import elevenlabs as elevenlabs_plugin
from app.providers.tts.base import BaseTTS
from app.config.settings import Settings


class ElevenLabsTTS(BaseTTS):
    """ElevenLabs — expressive, natural-sounding voice; good Vietnamese quality."""

    @classmethod
    def create(cls, settings: Settings):
        return elevenlabs_plugin.TTS(
            api_key=settings.elevenlabs_api_key,
            model=settings.elevenlabs_model,
            voice_id=settings.tts_voice or settings.elevenlabs_voice_id,
            # Pinned so every turn renders with the same timbre — leaving this
            # unset falls back to the voice's stored ElevenLabs dashboard
            # settings, which can drift (sound like a different voice) across
            # turns on expressive models like eleven_flash_v2_5. stability
            # raised from 0.5 and speed slowed from the 1.0 default — dense,
            # number-heavy turns (trip lists, phone number confirmations)
            # were reading too fast and drifting in tone/pace mid-sentence.
            voice_settings=elevenlabs_plugin.VoiceSettings(
                stability=0.7,
                similarity_boost=0.75,
                speed=0.9,
            ),
        )
