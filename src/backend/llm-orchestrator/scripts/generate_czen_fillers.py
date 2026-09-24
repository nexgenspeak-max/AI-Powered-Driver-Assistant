#!/usr/bin/env python3
"""Generate driver-app Czen connect/disconnect filler MP3s (Google TTS = voice-agent).

Usage (from voice-agent root):
  ENV=local .venv/bin/python scripts/generate_czen_fillers.py

Regenerate after changing GOOGLE_TTS_VOICE / speaking_rate.
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

FILLERS: tuple[tuple[str, str], ...] = (
    ("Đang kết nối với trợ lý Czen", "connecting-czen.mp3"),
    ("Đang ngắt kết nối với trợ lý Czen", "disconnecting-czen.mp3"),
)
OUT_DIR = _ROOT.parent.parent / "frontend" / "driver-app" / "assets" / "audio"


def synthesize(client: texttospeech.TextToSpeechClient, text: str, voice_name: str, settings) -> bytes:
    audio_config_kwargs: dict = {
        "audio_encoding": texttospeech.AudioEncoding.MP3,
        "speaking_rate": settings.google_tts_speaking_rate,
    }
    if "chirp3" not in voice_name.lower():
        audio_config_kwargs["pitch"] = settings.google_tts_pitch

    response = client.synthesize_speech(
        input=texttospeech.SynthesisInput(text=text),
        voice=texttospeech.VoiceSelectionParams(language_code="vi-VN", name=voice_name),
        audio_config=texttospeech.AudioConfig(**audio_config_kwargs),
    )
    return response.audio_content


def main() -> None:
    settings = get_settings()
    if settings.tts_provider not in ("google", ""):
        print(
            f"WARN: TTS_PROVIDER={settings.tts_provider!r} — script uses Google Cloud TTS.",
            file=sys.stderr,
        )

    if settings.google_credentials_file:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = resolve_credentials_file(
            settings.google_credentials_file
        )

    voice_name = settings.tts_voice or settings.google_tts_voice
    client = texttospeech.TextToSpeechClient()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for text, filename in FILLERS:
        out_path = OUT_DIR / filename
        content = synthesize(client, text, voice_name, settings)
        out_path.write_bytes(content)
        print(f"OK {out_path} bytes={len(content)} voice={voice_name} text={text!r}")


if __name__ == "__main__":
    main()
