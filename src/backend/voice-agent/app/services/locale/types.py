"""Locale contracts — routing vs spoken codes and session bundle."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

VoiceRoutingLang = Literal["vn", "en"]
SpokenLang = Literal["vi", "en"]


@dataclass(frozen=True, slots=True)
class SessionLocale:
    """Resolved locale for one voice session — load strings via `routing`."""

    routing: VoiceRoutingLang
    spoken: SpokenLang
    stt: str
    tts_voice: str
    turn_detection: str
