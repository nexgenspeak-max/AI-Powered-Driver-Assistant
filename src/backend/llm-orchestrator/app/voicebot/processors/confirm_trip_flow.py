"""Apply confirm_trip: PATCH trip-service and speak in parallel.

LLM TTFT already used most of the 2s budget. Waiting for HTTP then TTS
stacked ~0.4s on top (live ~2.2s wall). Starting both together makes
first audio ≈ LLM + max(HTTP, TTS TTFB).

``session.say`` is synchronous and returns a ``SpeechHandle`` (awaitable).
Wrapping that handle in ``asyncio.create_task`` TypeError'd live and the
LLM retried as if confirm failed.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, NoReturn

from livekit.agents import StopResponse

from app.agent.turn_metrics import mark_user_stopped
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("llm-orchestrator.confirm_trip_flow")


def _start_say(session: Any, message: str, *, status: str) -> Any:
    mark_user_stopped(session)
    started = session.say(message, allow_interruptions=False)
    if asyncio.iscoroutine(started):
        return asyncio.create_task(started, name=f"{status}_trip_say")
    return started


async def apply_and_speak(
    session: Any,
    userdata: dict,
    trip_id: str,
    message: str,
    *,
    error_reply: str,
    status: str = "confirmed",
) -> NoReturn:
    """PATCH trip status + speak in parallel.

    Success always StopResponse so the LLM cannot rewrite TTS.
    HTTP failure interrupts the confirmation TTS and speaks error_reply.
    """
    patch_task = asyncio.create_task(
        backend_api.update_trip_status(trip_id, status),
        name=f"{status}_trip_patch",
    )
    say_wait = _start_say(session, message, status=status)

    try:
        updated = await patch_task
    except Exception:
        logger.error("%s trip failed", status, exc_info=True)
        await _cancel_say(session, say_wait)
        await context_store.speak_and_stop(session, error_reply)

    if not isinstance(updated, dict):
        updated = {}
    fields = {k: v for k, v in updated.items() if k != "trip_id"}
    fields.setdefault("status", status)
    context_store.patch_trip_by_id(userdata, trip_id, **fields)
    logger.info("%s trip ok trip_id=%s status=%s", status, trip_id, fields.get("status"))

    try:
        await say_wait
    except Exception:
        logger.warning("confirm_trip say failed", exc_info=True)
    raise StopResponse()


async def _cancel_say(session: Any, say_wait: Any) -> None:
    interrupt = getattr(say_wait, "interrupt", None) or getattr(session, "interrupt", None)
    if callable(interrupt):
        try:
            result = interrupt()
            if asyncio.iscoroutine(result):
                await result
        except Exception:
            logger.debug("confirm_trip interrupt after patch fail", exc_info=True)
    if isinstance(say_wait, asyncio.Task):
        say_wait.cancel()
    try:
        await say_wait
    except (asyncio.CancelledError, Exception):
        pass
