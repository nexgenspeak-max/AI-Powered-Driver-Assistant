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

Money amounts and street-lot addresses needed their own fix on top of that:
Vietnamese-formatted currency uses "." as the thousands separator (e.g.
"2.373.000đ") — that never matches _PHONE_RE, and _DIGIT_RUN_RE only grabs
runs of 6+ CONTIGUOUS digits, so the dots split it into three short groups
("2", "373", "000") that neither rule touches. Left alone, the TTS reads the
dots as decimal points or sentence breaks — wrong and, per a real driver
report, noticeably rushed. _vietnamese_number_to_words below is a real
number → Vietnamese-words converter (not a static lookup — PRONUNCIATIONS
only does fixed string substitutions, it can't spell out an arbitrary
amount), reused by both _fix_currency (adds "đồng") and _fix_slash_address
(Vietnamese lot/alley numbers like "5/9/36" or "58/10", which a TTS
otherwise tends to read as a date or a fraction).

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
# Vietnamese money: 150.000đ, 150,000đ, 2đ, 150000đ, 2.373.000 VNĐ
_CURRENCY_RE = re.compile(
    r"\b\d+(?:[.,]\d{3})*(?:[.,]\d+)?\s*(?:đ|đồng|VNĐ|VND)\b|\b\d+\s*đ\b",
    re.IGNORECASE,
)
# Vietnamese lot/alley-style address numbers: 2+ digit groups joined by "/",
# e.g. "5/9/36", "58/10" — a bare TTS tends to read the "/" as a date or a
# fraction ("5 trên 9 trên 36") instead of "năm, chín, ba mươi sáu".
_SLASH_ADDRESS_RE = re.compile(r"\b\d{1,4}(?:/\d{1,4}){1,3}\b")
# Holds back a trailing run that might still be an in-progress phone number,
# money amount, or slash-address for _buffered_fix — digits plus the ".", "/",
# "+" that can appear mid-pattern. Without this, a chunk boundary landing
# inside "2.373" (before ".000đ" streams in) would let _CURRENCY_RE match
# and convert the truncated "2.373" on its own instead of the real 2,373,000.
_TRAILING_PARTIAL_RE = re.compile(r"[\d./]+$|\+$")


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


_DIGIT_WORDS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
# Index i = "nghìn"/"triệu"/"tỷ" placed after the i-th group of 3 digits
# (i=0 is the ones/hundreds group, which gets no unit word at all). Money
# amounts in this app never run past a few tỷ, so nothing beyond that is
# needed — a group past index 3 just gets no unit word instead of raising.
_GROUP_UNITS = ["", "nghìn", "triệu", "tỷ"]


def _read_three_digit_group(n: int, is_leading_group: bool) -> str:
    """Reads 0-999 the way Vietnamese actually says a 3-digit group.

    `is_leading_group`: the most-significant nonzero group in the whole
    number never needs a "không trăm"/"linh" placeholder (nothing outranks
    it), every group after it does — e.g. 202 200 is "hai trăm linh hai
    nghìn, hai trăm" (trailing group's own hundred digit is real, so no
    "linh" there), but 1 005 is "một nghìn không trăm linh năm" (middle
    hundreds digit is a real placeholder zero that has to be said or the
    number reads as ambiguous).
    """
    if n == 0:
        return ""
    hundreds, remainder = divmod(n, 100)
    tens, units = divmod(remainder, 10)
    parts: list[str] = []

    if hundreds > 0:
        parts.append(f"{_DIGIT_WORDS[hundreds]} trăm")
    elif not is_leading_group:
        parts.append("không trăm")

    if tens == 0:
        if units > 0:
            # "linh" fills the silent tens place — only said when something
            # outranks this group (a hundreds digit here, or an earlier
            # group already spoken); a bare leading "5" is just "năm", not
            # "linh năm".
            if hundreds > 0 or not is_leading_group:
                parts.append(f"linh {_DIGIT_WORDS[units]}")
            else:
                parts.append(_DIGIT_WORDS[units])
    elif tens == 1:
        parts.append("mười")
        if units == 1:
            parts.append("một")
        elif units == 5:
            parts.append("lăm")
        elif units > 0:
            parts.append(_DIGIT_WORDS[units])
    else:
        parts.append(f"{_DIGIT_WORDS[tens]} mươi")
        if units == 1:
            parts.append("mốt")
        elif units == 5:
            parts.append("lăm")
        elif units > 0:
            parts.append(_DIGIT_WORDS[units])

    return " ".join(parts)


def _vietnamese_number_to_words(n: int) -> str:
    """Cardinal number -> spoken Vietnamese, e.g. 2373000 -> 'hai triệu ba
    trăm bảy mươi ba nghìn'. A fully-zero group in the middle (e.g. the
    "nghìn" group in 1 000 500) is skipped entirely, same as how it's
    actually said aloud — not padded with "không nghìn"."""
    if n == 0:
        return "không"
    if n < 0:
        return "âm " + _vietnamese_number_to_words(-n)

    groups: list[int] = []
    while n > 0:
        groups.append(n % 1000)
        n //= 1000

    leading_index = len(groups) - 1
    parts: list[str] = []
    for i in range(leading_index, -1, -1):
        group = groups[i]
        if group == 0:
            continue
        words = _read_three_digit_group(group, is_leading_group=(i == leading_index))
        unit = _GROUP_UNITS[i] if i < len(_GROUP_UNITS) else ""
        parts.append(f"{words} {unit}".strip())
    return " ".join(parts)


def _fix_currency(match: re.Match[str]) -> str:
    """'2.373.000đ' -> 'hai triệu ba trăm bảy mươi ba nghìn đồng'."""
    digits = re.sub(r"[^\d]", "", match.group(0))
    return f"{_vietnamese_number_to_words(int(digits))} đồng"


def _fix_slash_address(match: re.Match[str]) -> str:
    """'5/9/36' -> 'năm, chín, ba mươi sáu' — comma-joined the same way
    _spell_out_phone uses commas for phone digits, so the TTS pauses briefly
    between segments instead of running them together or reading the '/' as
    a fraction/date."""
    segments = match.group(0).split("/")
    return ", ".join(_vietnamese_number_to_words(int(s)) for s in segments)


def _strip_spoken_markup(text: str) -> str:
    """LLMs often emit markdown — TTS reads asterisks aloud."""
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    return text


_VN_MODE_TERMS = (
    (re.compile(r"\bbackground\b", re.I), "gọi nền"),
    (re.compile(r"\bbridge\b", re.I), "nói trực tiếp"),
    (re.compile(r"\bagent\b", re.I), "AI gọi hộ"),
)


def _vn_spoken_tone(text: str) -> str:
    """Honorifics and punctuation that TTS reads literally, not as speech."""
    text = re.sub(r"[Aa]nh\s*/\s*[Cc]hị", "bạn", text)
    text = re.sub(r"\banh/chị\b", "bạn", text, flags=re.IGNORECASE)
    text = re.sub(r"\banh chị\b", "bạn", text, flags=re.IGNORECASE)
    text = text.replace("—", ", ")
    text = text.replace("–", ", ")
    text = text.replace("→", ",")
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip() if text else text


def _vn_spoken_terms(text: str) -> str:
    for pattern, replacement in _VN_MODE_TERMS:
        text = pattern.sub(replacement, text)
    return text


def _vn_abbreviations(text: str) -> str:
    from app.voicebot.vn.pronunciations import ABBREVIATION_PATTERNS

    for pattern, replacement in ABBREVIATION_PATTERNS:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


def fix_speech_text(text: str, pronunciations: list[tuple[str, str]], lang: str = "vn") -> str:
    text = _strip_spoken_markup(text)
    if lang != "en":
        text = _vn_spoken_tone(text)
        text = _vn_spoken_terms(text)
        text = _vn_abbreviations(text)
    text = _PHONE_RE.sub(_spell_out_phone, text)
    # Vietnamese-words conversion only — an EN agent reading the same
    # dot-grouped VND price (e.g. quoting a fare back in English) needs
    # English number words instead, which this doesn't produce; leaving it
    # to _group_digits below at least reads the digits distinctly rather
    # than switching languages mid-reply.
    if lang != "en":
        text = _CURRENCY_RE.sub(_fix_currency, text)
        text = _SLASH_ADDRESS_RE.sub(_fix_slash_address, text)
    text = _DIGIT_RUN_RE.sub(_group_digits, text)
    for pattern, replacement in pronunciations:
        text = re.sub(rf"\b{re.escape(pattern)}\b", replacement, text)
    return text


async def _buffered_fix(
    text: AsyncIterable[str], pronunciations: list[tuple[str, str]], lang: str = "vn"
) -> AsyncIterator[str]:
    """
    Streamed variant of fix_speech_text — holds back a trailing digit/./+
    run at the end of each chunk since it may continue in the next chunk
    (LLM output streams in small token deltas, which can split a phone
    number, money amount, or slash-address mid-run).
    """
    pending = ""
    async for chunk in text:
        pending += chunk
        m = _TRAILING_PARTIAL_RE.search(pending)
        safe, held = (pending[: m.start()], pending[m.start() :]) if m else (pending, "")
        if safe:
            yield fix_speech_text(safe, pronunciations, lang)
        pending = held
    if pending:
        yield fix_speech_text(pending, pronunciations, lang)


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

    def _speech_lang(self) -> str:
        """Override to "en" for an English-speaking agent — gates the
        Vietnamese-words currency/address conversion in fix_speech_text,
        which would read a VND amount out in Vietnamese mid-English-reply
        otherwise. Defaults to "vn" since most agents in this codebase are
        Vietnamese-only and never override this."""
        return "vn"

    def tts_node(self, text, model_settings):
        from livekit.agents import Agent

        fixed = _buffered_fix(text, self._speech_pronunciations(), self._speech_lang())
        return Agent.default.tts_node(self, fixed, model_settings)
