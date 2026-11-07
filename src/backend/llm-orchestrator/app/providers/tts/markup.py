"""Expressive speech markup: ElevenLabs audio tags and pauses.

The agent may write a few non-verbal cues into its spoken text, e.g.
"[chuckles] Dạ, cái này dễ mà." Only ElevenLabs' v3/v4 models (synthesized
through the text-to-dialogue API) perform these tags; every other TTS would
read "[chuckles]" out loud. So:

* ``render_markup`` (agent ``tts_node``) keeps only whitelisted tags, and
  only when the agent allows them; ``<break time="…"/>`` always becomes "..."
  (measured: eleven_flash_v2_5 over the websocket garbles text around a
  break tag, eleven_v4_turbo ignores it; "..." gives a pause on every TTS).
* ``guard_tts`` (provider factory) makes any TTS that cannot perform tags
  strip them itself, so a FallbackAdapter switching mid-turn to Google never
  speaks a tag.
* ``strip_markup`` (agent ``transcription_node``) keeps tags out of the
  transcript shown in the app and saved in chat history / call records.
"""
from __future__ import annotations

import re
from typing import Any, AsyncIterable, AsyncIterator, Callable

# Tags tested on eleven_v4_turbo with Vietnamese text: performed as sound,
# never read as words, and the Vietnamese words around them stay intact.
# "[cheerfully]" was dropped: it changed the spoken words in testing.
AUDIO_TAGS: frozenset[str] = frozenset(
    {"chuckles", "laughs", "sighs", "warmly", "short pause"}
)

# ElevenLabs models that go through text-to-dialogue and perform audio tags.
_TAG_MODEL_PREFIXES = ("eleven_v3", "eleven_v4")

# Any short square-bracket cue the LLM might invent ("[laughs softly]").
# Kept short and single-line so ordinary brackets in data are not a match.
_TAG_RE = re.compile(r"\[\s*([A-Za-z][A-Za-z ]{0,30}?)\s*\]")
_BREAK_RE = re.compile(r"<\s*break\b[^>]*?/?\s*>", re.IGNORECASE)
_SPACE_BEFORE_PUNCT_RE = re.compile(r"\s+([,.!?…])")
_MULTI_SPACE_RE = re.compile(r"[ \t]{2,}")

PAUSE_TEXT = "..."
# Longest markup we hold back while waiting for its closing bracket.
_MAX_PENDING = 64


def model_supports_audio_tags(provider: str, model: str) -> bool:
    """True for ElevenLabs v3/v4 models (text-to-dialogue)."""
    return "eleven" in (provider or "").lower() and (model or "").startswith(_TAG_MODEL_PREFIXES)


def tts_supports_audio_tags(tts: Any) -> bool:
    provider = str(getattr(tts, "provider", "") or "")
    model = str(getattr(tts, "model", "") or "")
    return model_supports_audio_tags(provider, model)


def _tidy(text: str) -> str:
    text = _MULTI_SPACE_RE.sub(" ", text)
    return _SPACE_BEFORE_PUNCT_RE.sub(r"\1", text)


def _render(text: str, allow_tags: bool) -> str:
    def tag(match: re.Match[str]) -> str:
        name = " ".join(match.group(1).lower().split())
        return f"[{name}]" if allow_tags and name in AUDIO_TAGS else ""

    text = _BREAK_RE.sub(PAUSE_TEXT, text)
    return _tidy(_TAG_RE.sub(tag, text))


def render_markup(text: str, *, allow_tags: bool) -> str:
    """Text for the TTS: breaks become "...", unknown tags are dropped, known
    tags are kept (lower-cased) only when ``allow_tags``.

    Whole-text variant: a tag removed at either end leaves no stray space.
    """
    out = _render(text, allow_tags)
    if text[:1] and not text[:1].isspace():
        out = out.lstrip()
    if text[-1:] and not text[-1:].isspace():
        out = out.rstrip()
    return out


def strip_markup(text: str) -> str:
    """Text without any tag or break, for transcripts and non-tag TTS."""
    return render_markup(text, allow_tags=False)


def _pending_start(text: str) -> int:
    """Index of a trailing "[" or "<" that is not closed yet, else -1."""
    for opener, closer in (("[", "]"), ("<", ">")):
        i = text.rfind(opener)
        if i != -1 and closer not in text[i:] and len(text) - i <= _MAX_PENDING:
            return i
    return -1


class MarkupStreamFilter:
    """Incremental ``render_markup`` for LLM token streams.

    Holds back an unclosed "[…" / "<…" until it closes (or grows past
    ``_MAX_PENDING`` chars, then it is plain text), and drops the space left
    behind by a removed tag so "Dạ, [chuckles] cái" does not become
    "Dạ,  cái".
    """

    def __init__(self, *, allow_tags: bool) -> None:
        self._allow_tags = allow_tags
        self._pending = ""
        self._last = ""

    def _emit(self, text: str) -> str:
        if not text:
            return ""
        out = _render(text, self._allow_tags)
        # A tag removed at a chunk edge (or at the very start) leaves a
        # leading space that would double up with the one already sent.
        if self._last == "" or self._last.isspace():
            out = out.lstrip(" \t")
        if out:
            self._last = out[-1]
        return out

    def feed(self, chunk: str) -> str:
        self._pending += chunk
        cut = _pending_start(self._pending)
        if cut == -1:
            ready, self._pending = self._pending, ""
        else:
            ready, self._pending = self._pending[:cut], self._pending[cut:]
        return self._emit(ready)

    def flush(self) -> str:
        ready, self._pending = self._pending, ""
        return self._emit(ready)


async def render_markup_stream(
    text: AsyncIterable[str], *, allow_tags: bool
) -> AsyncIterator[str]:
    stream_filter = MarkupStreamFilter(allow_tags=allow_tags)
    async for chunk in text:
        out = stream_filter.feed(chunk)
        if out:
            yield out
    rest = stream_filter.flush()
    if rest:
        yield rest


def _wrap_stream(stream: Any) -> Any:
    """Strip markup from text pushed into a LiveKit SynthesizeStream."""
    stream_filter = MarkupStreamFilter(allow_tags=False)
    push_text: Callable[[str], None] = stream.push_text
    flush: Callable[[], None] = stream.flush

    def guarded_push_text(token: str) -> None:
        out = stream_filter.feed(token)
        if out:
            push_text(out)

    def guarded_flush() -> None:
        rest = stream_filter.flush()
        if rest:
            push_text(rest)
        flush()

    stream.push_text = guarded_push_text
    stream.flush = guarded_flush
    return stream


def guard_tts(tts: Any) -> Any:
    """Make a TTS that cannot perform audio tags strip them instead.

    Patches the instance's ``synthesize``/``stream`` in place and returns it.
    Tag-capable TTS instances are returned untouched.
    """
    if tts_supports_audio_tags(tts) or getattr(tts, "_markup_guarded", False):
        return tts
    synthesize = tts.synthesize
    stream = tts.stream

    def guarded_synthesize(text: str, *args: Any, **kwargs: Any) -> Any:
        return synthesize(strip_markup(text), *args, **kwargs)

    def guarded_stream(*args: Any, **kwargs: Any) -> Any:
        return _wrap_stream(stream(*args, **kwargs))

    tts.synthesize = guarded_synthesize
    tts.stream = guarded_stream
    tts._markup_guarded = True
    return tts
