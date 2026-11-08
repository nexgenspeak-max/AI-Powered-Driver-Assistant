#!/usr/bin/env python3
"""Generate driver-app Czen connect/disconnect filler MP3s in the agent's own voice.

Uses ElevenLabs when TTS_PROVIDER=elevenlabs (same voice and model as the agent),
otherwise Google Cloud TTS.

Usage (from llm-orchestrator root):
  ENV=local .venv/bin/python scripts/generate_czen_fillers.py

Regenerate after changing the TTS voice, model or speaking rate.
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

import httpx

from app.config.settings import DEFAULT_ELEVENLABS_VOICE_ID, get_settings

FILLERS: tuple[tuple[str, str], ...] = (
    ("Đang kết nối với trợ lý Czen", "connecting-czen.mp3"),
    ("Đang ngắt kết nối với trợ lý Czen", "disconnecting-czen.mp3"),
)
OUT_DIR = _ROOT.parent.parent / "frontend" / "driver-app" / "assets" / "audio"


def synthesize_elevenlabs(text: str, settings) -> tuple[bytes, str]:
    voice_id = settings.tts_voice or settings.elevenlabs_voice_id or DEFAULT_ELEVENLABS_VOICE_ID
    body: dict = {
        "text": text,
        "model_id": settings.elevenlabs_model,
        "voice_settings": {"stability": settings.elevenlabs_stability},
    }
    if settings.elevenlabs_language:
        body["language_code"] = settings.elevenlabs_language
    response = httpx.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        params={"output_format": "mp3_44100_128"},
        headers={"xi-api-key": settings.elevenlabs_api_key},
        json=body,
        timeout=60,
    )
    response.raise_for_status()
    return response.content, f"elevenlabs:{voice_id}:{settings.elevenlabs_model}"


def synthesize(client, text: str, voice_name: str, settings) -> bytes:
    from google.cloud import texttospeech

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
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if settings.tts_provider == "elevenlabs":
        if not settings.elevenlabs_api_key:
            sys.exit("ELEVENLABS_API_KEY is not set")
        for text, filename in FILLERS:
            content, voice = synthesize_elevenlabs(text, settings)
            (OUT_DIR / filename).write_bytes(content)
            print(f"OK {OUT_DIR / filename} bytes={len(content)} voice={voice} text={text!r}")
        return

    if settings.tts_provider not in ("google", ""):
        print(
            f"WARN: TTS_PROVIDER={settings.tts_provider!r} — script uses Google Cloud TTS.",
            file=sys.stderr,
        )

    from google.cloud import texttospeech

    from app.providers.google_cloud import resolve_credentials_file

    if settings.google_credentials_file:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = resolve_credentials_file(
            settings.google_credentials_file
        )

    voice_name = settings.tts_voice or settings.google_tts_voice
    client = texttospeech.TextToSpeechClient()

    for text, filename in FILLERS:
        out_path = OUT_DIR / filename
        content = synthesize(client, text, voice_name, settings)
        out_path.write_bytes(content)
        print(f"OK {out_path} bytes={len(content)} voice={voice_name} text={text!r}")


if __name__ == "__main__":
    main()
