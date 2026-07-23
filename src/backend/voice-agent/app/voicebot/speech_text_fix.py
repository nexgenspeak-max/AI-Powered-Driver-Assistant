"""Text normalization applied to agent speech immediately before TTS synthesis.

Root cause this addresses: phone numbers (and other long digit runs — prices,
trip IDs) get interpolated into spoken replies as solid digit blocks like
"0912345678". ElevenLabs (especially eleven_flash_v2_5) often reads a long
unformatted digit block as one giant cardinal number or slurs it together,
which is both unclear and can make the same voice_id sound inconsistent
turn to turn. There was already a `PRONUNCIATIONS` correction list per
language (vn/en `pronunciations.py`) clearly intended to fix exactly this
class of issue, but it was never wired into the TTS pipeline — this module
is that wiring, via `SpeechTextFixMixin.tts_node`.

Phone numbers specifically get spelled out one digit at a time (not grouped
in 3s like a generic long number) — grouping still lets the TTS read a
cluster like "912" as "nine hundred twelve" instead of "nine one two", which
is how phone numbers are actually read aloud in Vietnamese.

Hooked in at `tts_node` (not at the message-construction call sites) so it
also catches free-form LLM-generated replies that read a phone number back
from context, not just the hardcoded strings this codebase builds directly.
"""
from __future__ import annotations

import re
from typing import AsyncIterable, AsyncIterator

# VN phone numbers as they actually appear in spoken text: local 0-prefixed,
# E.164 (+84/84-prefixed, used for the dialed number in call confirmations),
# or a 1900/1800 hotline. Bounded by (?<!\d)/(?!\d) so it only matches a full
# run, not a slice of some longer, unrelated digit string.
_PHONE_RE = re.compile(r"(?<!\d)(?:\+?84\d{8,10}|0\d{8,10}|1(?:900|800)\d{4,7})(?!\d)")
_DIGIT_RUN_RE = re.compile(r"\d{6,}")
# Holds back a trailing digit run for _buffered_fix, including a leading "+"
# (e.g. "+849") — without it, a chunk boundary right after the "+" leaks a
# stray "+" into the output before the phone-number match ever sees it.
_TRAILING_DIGITS_RE = re.compile(r"\+?\d+$|\+$")


def _spell_out_phone(match: re.Match[str]) -> str:
    """'+84912345678' -> '0, 9, 1, 2, 3, 4, 5, 6, 7, 8' — one digit at a time.

    Comma-joined rather than space-joined: the TTS treats a comma as a short
    pause, which slows the cadence of just this digit run to a comfortable
    listening speed without touching the global speech-rate setting (which
    would slow down the whole reply, not just phone numbers).
    """
    digits = re.sub(r"\D", "", match.group(0))
    if digits.startswith("84") and not digits.startswith("840"):
        digits = "0" + digits[2:]
    return ", ".join(digits)


def _group_digits(match: re.Match[str]) -> str:
    """Non-phone long digit runs (prices, IDs) — '250000' -> '250 000'."""
    digits = match.group(0)
    first_len = len(digits) % 3 or 3
    groups = [digits[:first_len]] + [
        digits[i : i + 3] for i in range(first_len, len(digits), 3)
    ]
    return " ".join(groups)


def fix_speech_text(text: str, pronunciations: list[tuple[str, str]]) -> str:
    text = _PHONE_RE.sub(_spell_out_phone, text)
    text = _DIGIT_RUN_RE.sub(_group_digits, text)
    for pattern, replacement in pronunciations:
        text = re.sub(rf"\b{re.escape(pattern)}\b", replacement, text)
    return text


async def _buffered_fix(
    text: AsyncIterable[str], pronunciations: list[tuple[str, str]]
) -> AsyncIterator[str]:
    """
    Streamed variant of fix_speech_text — holds back a trailing digit run at
    the end of each chunk since it may continue in the next chunk (LLM output
    streams in small token deltas, which can split a number mid-run).
    """
    pending = ""
    async for chunk in text:
        pending += chunk
        m = _TRAILING_DIGITS_RE.search(pending)
        safe, held = (pending[: m.start()], pending[m.start() :]) if m else (pending, "")
        if safe:
            yield fix_speech_text(safe, pronunciations)
        pending = held
    if pending:
        yield fix_speech_text(pending, pronunciations)


def pronunciations_for_lang(lang: str) -> list[tuple[str, str]]:
    """Lazy import to avoid a circular import with app.voicebot.vn/en at module load time."""
    if lang == "en":
        from app.voicebot.en.pronunciations import PRONUNCIATIONS
    else:
        from app.voicebot.vn.pronunciations import PRONUNCIATIONS
    return PRONUNCIATIONS


class SpeechTextFixMixin:
    """Mix into an Agent subclass to normalize numbers/acronyms right before TTS."""

    def _speech_pronunciations(self) -> list[tuple[str, str]]:
        """Override to return the PRONUNCIATIONS list matching this agent's language."""
        return []

    def tts_node(self, text, model_settings):
        from livekit.agents import Agent

        fixed = _buffered_fix(text, self._speech_pronunciations())
        return Agent.default.tts_node(self, fixed, model_settings)
