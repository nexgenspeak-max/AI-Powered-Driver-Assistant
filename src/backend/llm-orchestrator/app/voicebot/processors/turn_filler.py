"""Spoken filler when first reply audio would miss the ~2s speech-to-first-audio bar.

One filler per turn. Skip/cancel if the real reply (or any agent speech) starts first.
Phrases are generic holds only — never trip facts.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from app.devlog import event

logger = logging.getLogger("llm-orchestrator.turn_filler")

# Fire at the ~2s speech-to-first-audio bar (NFR-P01), measured from when
# the driver stopped speaking — not from when this task was scheduled.
FILLER_DELAY_S = 2.0
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
    if isinstance(state, dict):
        state["reply_started"] = True


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
            result = say(phrase, allow_interruptions=True)
            if asyncio.iscoroutine(result):
                await result
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
