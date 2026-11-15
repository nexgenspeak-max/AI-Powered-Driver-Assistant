"""Spoken filler when first reply audio would miss the 2s speech-to-first-audio bar.

One filler per turn. Skip/cancel if the real reply (or any agent speech) starts first.
Phrases are generic holds only — never trip facts.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from livekit.agents import FlushSentinel

from app.devlog import event

logger = logging.getLogger("llm-orchestrator.turn_filler")

# Fire shortly before the 2s speech-to-first-audio bar (NFR-02 / AC-15), measured
# from when the driver stopped speaking — not from when this task was scheduled.
# 1.8s + pre-synthesized audio keeps the first sound under 2s; firing at 2.0s and
# synthesizing on demand always landed after the bar (measured 2026-11-15:
# filler audio arrived 0.27s P50 / 0.67s P90 after the trigger).
FILLER_DELAY_S = 1.8
_AUDIO_KEY = "_turn_filler_audio"
# The SDK plays one speech at a time: a filler sent with ``say()`` queues behind
# the reply that is still waiting for the LLM, so it is dropped when the reply
# starts (25 of 33 fillers on 2026-11-15). The inline filler below is therefore
# the main path: it is yielded as the first text of the reply itself when the LLM
# has produced nothing by this many seconds after the driver stopped speaking.
# The filler is flushed to TTS at once, so 1.6s leaves the TTS time-to-first-audio
# (about 0.2s) plus a margin before the 2s bar.
INLINE_FILLER_DELAY_S = 1.6
_STATE_KEY = "_turn_filler"
_WALL_STATE_KEY = "_turn_wall_state"
# Ignore a user-stopped stamp older than this; it belongs to a prior turn.
_STALE_USER_STOP_S = 30.0

FILLER_VN = "Đợi mình một chút…"
FILLER_EN = "One moment…"


def filler_phrase(lang: str) -> str:
    return FILLER_EN if lang == "en" else FILLER_VN


def filler_wait_s(
    *,
    delay_s: float,
    user_stopped_at: float | None,
    now: float,
) -> float:
    """Seconds to sleep so filler lands on ``delay_s`` after the driver stopped.

    ``user_stopped_at`` is ``time.perf_counter()`` when speech ended. Missing
    or stale stamps fall back to a full ``delay_s`` wait.
    """
    if user_stopped_at is None:
        return delay_s
    elapsed = now - float(user_stopped_at)
    if elapsed < 0 or elapsed > _STALE_USER_STOP_S:
        return delay_s
    return max(0.0, delay_s - elapsed)


def _prewarm_filler_audio(session: Any, userdata: dict, lang: str) -> None:
    """Synthesize the filler once per session and language so it can play at once.

    Best effort: with no TTS, or if synthesis fails, the filler falls back to
    on-demand ``say(text)``.
    """
    cache = userdata.setdefault(_AUDIO_KEY, {})
    if lang in cache:
        return
    tts = getattr(session, "tts", None)
    synthesize = getattr(tts, "synthesize", None)
    if not callable(synthesize):
        return
    cache[lang] = None  # in flight; None means "not ready, use text"

    async def _run() -> None:
        try:
            frames = [ev.frame async for ev in synthesize(filler_phrase(lang))]
        except Exception:
            logger.warning("turn_filler prewarm failed", exc_info=True)
            cache.pop(lang, None)
            return
        if frames:
            cache[lang] = frames
        else:
            cache.pop(lang, None)

    try:
        asyncio.get_running_loop().create_task(_run())
    except RuntimeError:
        cache.pop(lang, None)


async def _replay(frames: list) -> Any:
    for frame in frames:
        yield frame


def _user_stopped_at(userdata: dict) -> float | None:
    state = userdata.get(_WALL_STATE_KEY)
    if not isinstance(state, dict):
        return None
    raw = state.get("user_stopped_at")
    if raw is None:
        return None
    return float(raw)


def should_speak_turn_filler(
    *,
    elapsed_s: float,
    reply_started: bool,
    already_spoken: bool,
    delay_s: float = FILLER_DELAY_S,
) -> bool:
    """Pure timing gate — unit-tested without a live session."""
    if already_spoken or reply_started:
        return False
    return elapsed_s >= delay_s


def mark_reply_started(session: Any) -> None:
    """Cancel pending filler when agent TTS (real reply or other speech) begins."""
    userdata = getattr(session, "userdata", None)
    if not isinstance(userdata, dict):
        return
    state = userdata.get(_STATE_KEY)
    if not isinstance(state, dict):
        return
    state["reply_started"] = True
    _drop_queued_filler(session, state)


def _drop_queued_filler(session: Any, state: dict) -> None:
    """say() queues behind an already-scheduled reply; drop the filler if the reply plays first."""
    handle = state.get("handle")
    if handle is None or getattr(session, "current_speech", None) is handle:
        return
    try:
        if handle.done():
            return
        handle.interrupt()
    except Exception:
        logger.warning("turn_filler drop failed", exc_info=True)
        return
    state["handle"] = None
    started_at = float(state.get("started_at") or time.perf_counter())
    event(
        "turn_filler_skip",
        ok=True,
        reason="reply_first",
        duration_ms=(time.perf_counter() - started_at) * 1000,
    )


def schedule_turn_filler(session: Any, *, lang: str, delay_s: float = FILLER_DELAY_S) -> None:
    """Once per turn: speak filler if no agent audio by ``delay_s`` after user turn end."""
    userdata = getattr(session, "userdata", None)
    if not isinstance(userdata, dict):
        return
    generation = int(userdata.get("_turn_filler_gen", 0)) + 1
    userdata["_turn_filler_gen"] = generation
    started_at = time.perf_counter()
    state: dict[str, Any] = {
        "generation": generation,
        "spoken": False,
        "reply_started": False,
        "started_at": started_at,
    }
    userdata[_STATE_KEY] = state
    _prewarm_filler_audio(session, userdata, lang)
    wait_s = filler_wait_s(
        delay_s=delay_s,
        user_stopped_at=_user_stopped_at(userdata),
        now=started_at,
    )

    async def _run() -> None:
        try:
            await asyncio.sleep(wait_s)
        except asyncio.CancelledError:
            return
        cur = userdata.get(_STATE_KEY)
        if not isinstance(cur, dict) or cur.get("generation") != generation:
            return
        duration_ms = (time.perf_counter() - float(cur.get("started_at") or started_at)) * 1000
        if bool(cur.get("spoken")):
            event(
                "turn_filler_skip",
                ok=True,
                reason="already_spoken",
                lang=lang,
                duration_ms=duration_ms,
            )
            return
        if bool(cur.get("reply_started")):
            event(
                "turn_filler_skip",
                ok=True,
                reason="reply_started",
                lang=lang,
                duration_ms=duration_ms,
            )
            return
        agent_state = getattr(session, "agent_state", None)
        if agent_state == "speaking":
            cur["reply_started"] = True
            event(
                "turn_filler_skip",
                ok=True,
                reason="agent_speaking",
                lang=lang,
                duration_ms=duration_ms,
            )
            return
        if not should_speak_turn_filler(
            elapsed_s=delay_s,
            reply_started=False,
            already_spoken=False,
            delay_s=delay_s,
        ):
            event(
                "turn_filler_skip",
                ok=True,
                reason="before_delay",
                lang=lang,
                duration_ms=duration_ms,
            )
            return
        cur["spoken"] = True
        phrase = filler_phrase(lang)
        event(
            "turn_filler",
            ok=True,
            lang=lang,
            delay_s=delay_s,
            duration_ms=duration_ms,
        )
        logger.info("turn_filler lang=%s delay_s=%.2f duration_ms=%.0f", lang, delay_s, duration_ms)
        say = getattr(session, "say", None)
        if not callable(say):
            return
        try:
            frames = (userdata.get(_AUDIO_KEY) or {}).get(lang)
            if frames:
                result = say(phrase, audio=_replay(frames), allow_interruptions=True)
            else:
                result = say(phrase, allow_interruptions=True)
            if asyncio.iscoroutine(result):
                await result
            elif result is not None:
                cur["handle"] = result
        except Exception:
            event(
                "turn_filler",
                ok=False,
                lang=lang,
                duration_ms=(time.perf_counter() - float(cur.get("started_at") or started_at)) * 1000,
                error="say_failed",
            )
            logger.warning("turn_filler say failed", exc_info=True)

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    loop.create_task(_run())


def _chunk_has_payload(chunk: Any) -> bool:
    """True once the LLM produced text or a tool call — no filler needed after that."""
    if isinstance(chunk, str):
        return bool(chunk.strip())
    delta = getattr(chunk, "delta", None)
    if delta is None:
        return False
    return bool(getattr(delta, "content", None)) or bool(getattr(delta, "tool_calls", None))


async def inline_turn_filler(
    session: Any,
    stream: Any,
    *,
    lang: str,
    delay_s: float = INLINE_FILLER_DELAY_S,
) -> Any:
    """Pass LLM chunks through; open with the filler when nothing arrived in time.

    The deadline counts from when the driver stopped speaking. After a tool call
    with no spoken text the next LLM call of the same turn is past the deadline,
    so it opens with the filler at once. No stamp (agent already spoke, or a
    typed turn that never set one) means plain pass-through.
    """
    if asyncio.iscoroutine(stream):
        stream = await stream
    userdata = getattr(session, "userdata", None)
    stamp = _user_stopped_at(userdata) if isinstance(userdata, dict) else None
    now = time.perf_counter()
    armed = stamp is not None and 0 <= now - stamp <= _STALE_USER_STOP_S
    deadline = (stamp or 0.0) + delay_s
    it = stream.__aiter__()
    pending: asyncio.Future | None = None
    try:
        while True:
            pending = asyncio.ensure_future(it.__anext__())
            if armed:
                remaining = deadline - time.perf_counter()
                if remaining > 0:
                    await asyncio.wait({pending}, timeout=remaining)
                if not pending.done():
                    armed = False
                    still_waiting = (
                        _user_stopped_at(userdata) == stamp
                        and getattr(session, "agent_state", None) != "speaking"
                    )
                    if still_waiting:
                        state = userdata.get(_STATE_KEY)
                        if isinstance(state, dict):
                            state["spoken"] = True  # the say() filler stands down
                        waited_ms = (time.perf_counter() - float(stamp)) * 1000
                        event("turn_filler", ok=True, lang=lang, delay_s=delay_s,
                              duration_ms=waited_ms, inline=True)
                        logger.info("turn_filler lang=%s delay_s=%.2f duration_ms=%.0f inline",
                                    lang, delay_s, waited_ms)
                        yield filler_phrase(lang) + " "
                        # LiveKit's own pattern (examples/voice_agents/flush_llm_node.py):
                        # flush so TTS speaks the filler now instead of waiting for
                        # the rest of the reply text.
                        yield FlushSentinel()
            try:
                chunk = await pending
            except StopAsyncIteration:
                return
            pending = None
            if armed and _chunk_has_payload(chunk):
                armed = False
            yield chunk
    finally:
        if pending is not None and not pending.done():
            pending.cancel()
        aclose = getattr(it, "aclose", None)
        if callable(aclose):
            try:
                await aclose()
            except Exception:
                pass


def strip_filler_from_history(chat_ctx: Any) -> None:
    """Drop the filler from earlier assistant turns so the LLM does not learn to say it."""
    items = getattr(chat_ctx, "items", None)
    if not items:
        return
    phrases = (FILLER_VN, FILLER_EN)
    for item in items:
        if getattr(item, "role", None) != "assistant":
            continue
        content = getattr(item, "content", None)
        if not isinstance(content, list):
            continue
        for i, part in enumerate(content):
            if not isinstance(part, str):
                continue
            for phrase in phrases:
                if part.lstrip().startswith(phrase):
                    content[i] = part.lstrip()[len(phrase):].lstrip()
                    break
