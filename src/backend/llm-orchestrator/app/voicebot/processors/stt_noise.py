"""STT lines that are not speech: ringback, hold music, line tones.

Live 2026-10-18 (custcall-931030fb): Google STT transcribed the ringback as
"Nhạc chuông." — the customer agent answered it ("em nghe không rõ ạ…")
and the turn also flipped `_customer_spoke`, which can suppress the opening
line entirely. These are dropped before they count as a customer turn.
Real one-word replies ("alo", "dạ", "ừ") are speech and are NOT in here.
"""
from __future__ import annotations

import re
import unicodedata

_NOISE_EXACT = frozenset({
    # vi
    "nhạc chuông", "tiếng chuông", "chuông", "chuông điện thoại", "nhạc", "âm nhạc",
    "tiếng nhạc", "nhạc nền", "tút", "tút tút", "tút tút tút", "tít", "tít tít",
    "tiếng ồn", "tạp âm", "im lặng",
    # en
    "music", "ringing", "ringtone", "ring", "beep", "beeping", "dial tone", "silence", "noise",
})


def _norm(text: str) -> str:
    t = unicodedata.normalize("NFC", text or "").lower().strip()
    t = re.sub(r"[\[\]\(\)\{\}♪♫*_.!?…,;:\"'“”-]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def is_noise_transcript(text: str) -> bool:
    raw = (text or "").strip()
    if not raw:
        return True
    # "[music]", "(nhạc)", "♪♪" — bracketed / symbol-only annotations
    if re.fullmatch(r"[\[\(♪♫*].*[\]\)♪♫*]", raw):
        return True
    t = _norm(raw)
    if not t:
        return True
    return t in _NOISE_EXACT
