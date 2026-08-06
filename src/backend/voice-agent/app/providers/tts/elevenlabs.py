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
            # nudged up (0.5 -> 0.8) for steadier tone. speed reset to 1.0
            # (ElevenLabs' normal pace) — the earlier 0.85 (slowed for
            # clearer enunciation on dense/number-heavy turns) read as
            # noticeably too slow/unnatural overall; revisit a smaller nudge
            # down only if enunciation complaints come back.
            # Note this only tunes pacing/steadiness, not accent: "Adam" is a
            # Western multilingual voice reading Vietnamese text, not a
            # native Vietnamese voice, so it can't be made to sound
            # authentically Vietnamese (let alone Northern-accented) through
            # these settings alone — see GoogleTTS (app/providers/tts/google.py)
            # for a genuine vi-VN Neural2 voice already wired up and ready
            # once real Google Cloud credentials are available.
            voice_settings=elevenlabs_plugin.VoiceSettings(
                stability=0.8,
                similarity_boost=0.75,
                speed=1.0,
            ),
        )
