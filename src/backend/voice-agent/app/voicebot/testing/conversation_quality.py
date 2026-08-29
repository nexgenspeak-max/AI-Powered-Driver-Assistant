"""Shared gates for spoken Vietnamese — natural, TTS-safe, concise."""
from __future__ import annotations

import re

# Patterns that sound robotic or break TTS.
_FORBIDDEN_VN = (
    re.compile(r"anh/chị", re.I),
    re.compile(r"Anh/Chị"),
    re.compile(r"—"),
    re.compile(r"\*\*"),
    re.compile(r"```"),
    re.compile(r"tôi giúp gì thêm", re.I),
    re.compile(r"hỗ trợ gì tiếp", re.I),
    re.compile(r"cần hỗ trợ gì", re.I),
    re.compile(r"quý khách", re.I),
)

# Stiff honorific particles — prefer plain spoken Vietnamese.
_STIFF_PARTICLES = re.compile(r"\b(ạ|dạ vâng ạ|vâng ạ)\b", re.I)


def count_sentences(text: str) -> int:
    parts = re.split(r"[.!?…]+", text.strip())
    return len([p for p in parts if p.strip()])


def assert_no_raw_template(text: str) -> None:
    """Raise when spoken/chat text would leak internal tool XML to the driver."""
    assert text and text.strip(), "empty spoken text"
    assert "<ResponseTemplate>" not in text, f"raw template leaked: {text[:120]!r}..."
    assert "<ResponseRule>" not in text, f"raw template rule leaked: {text[:120]!r}..."
    assert "<ActionKnowledge>" not in text, f"raw action block leaked: {text[:120]!r}..."


def assert_natural_vn(
    text: str,
    *,
    max_chars: int = 120,
    max_sentences: int = 2,
    allow_long: bool = False,
) -> None:
    """Raise AssertionError when text fails the natural-voice bar."""
    assert text and text.strip(), "empty spoken text"
    for pattern in _FORBIDDEN_VN:
        assert not pattern.search(text), f"forbidden pattern {pattern.pattern!r} in {text!r}"
    if not allow_long:
        assert len(text) <= max_chars, f"too long ({len(text)}>{max_chars}): {text!r}"
        assert count_sentences(text) <= max_sentences, (
            f"too many sentences ({count_sentences(text)}>{max_sentences}): {text!r}"
        )


def assert_tts_safe_vn(text: str) -> None:
    from app.voicebot.speech_text_fix import fix_speech_text

    fixed = fix_speech_text(text, [], lang="vn")
    assert "/" not in fixed or "http" in fixed.lower(), f"TTS may read slash in {fixed!r}"
    assert "—" not in fixed, f"em-dash left in {fixed!r}"
    assert not re.search(r"anh/chị", fixed, re.I), f"honorific slash in {fixed!r}"
