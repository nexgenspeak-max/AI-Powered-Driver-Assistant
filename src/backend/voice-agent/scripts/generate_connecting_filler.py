#!/usr/bin/env python3
"""Generate driver-app connecting filler MP3 (same Google TTS voice as voice-agent).

Usage (from voice-agent root):
  ENV=local .venv/bin/python scripts/generate_connecting_filler.py

Requires TTS_PROVIDER=google and GOOGLE_CREDENTIALS_FILE in envs/.env.{ENV}.
Regenerate after changing GOOGLE_TTS_VOICE / rate / pitch.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dotenv import load_dotenv

_env_name = os.getenv("ENV", "local")
_env_file = _ROOT / "envs" / f".env.{_env_name}"
if _env_file.exists():
    load_dotenv(_env_file)

from google.cloud import texttospeech

from app.config.settings import get_settings
from app.providers.google_cloud import resolve_credentials_file

CONNECTING_TEXT = "Đang kết nối với Czen"
OUT_PATH = (
    _ROOT.parent.parent
    / "frontend"
    / "driver-app"
    / "assets"
    / "audio"
    / "connecting-czen.mp3"
)


def main() -> None:
    settings = get_settings()
    if settings.tts_provider not in ("google", ""):
        print(
            f"WARN: TTS_PROVIDER={settings.tts_provider!r} — "
            "this script uses Google Cloud TTS (GOOGLE_TTS_*). "
            "Output may not match runtime if you use gemini/elevenlabs.",
            file=sys.stderr,
        )

    if settings.google_credentials_file:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = resolve_credentials_file(
            settings.google_credentials_file
        )

    voice_name = settings.tts_voice or settings.google_tts_voice
    client = texttospeech.TextToSpeechClient()
    audio_config_kwargs: dict = {
        "audio_encoding": texttospeech.AudioEncoding.MP3,
        "speaking_rate": settings.google_tts_speaking_rate,
    }
    # Chirp3-HD rejects pitch in the REST API (LiveKit plugin omits it too).
    if "chirp3" not in voice_name.lower():
        audio_config_kwargs["pitch"] = settings.google_tts_pitch

    response = client.synthesize_speech(
        input=texttospeech.SynthesisInput(text=CONNECTING_TEXT),
        voice=texttospeech.VoiceSelectionParams(
            language_code="vi-VN",
            name=voice_name,
        ),
        audio_config=texttospeech.AudioConfig(**audio_config_kwargs),
    )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_bytes(response.audio_content)
    print(f"OK {OUT_PATH} bytes={len(response.audio_content)} voice={voice_name}")


if __name__ == "__main__":
    main()
