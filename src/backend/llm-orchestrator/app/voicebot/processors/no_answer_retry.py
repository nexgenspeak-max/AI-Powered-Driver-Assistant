"""No-answer redial policy for background customer calls (AVDA-120).

When the AI calls a customer on the driver's behalf (background mode) and
nobody picks up, the call is redialled up to MAX_REDIALS times, at least
REDIAL_DELAY_SECONDS apart. Each redial is a fresh `calls/start` (new room,
new SIP leg), so a customer who answers a redial gets the normal call flow.
The driver hears a short notice for every redial and a clear failure message
once the redials are used up. Bridge/agent modes are not redialled: the
driver is on the line and is told immediately.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Awaitable, Callable

from app.services import backend_api

logger = logging.getLogger("llm-orchestrator.no_answer_retry")

MAX_REDIALS = 2
REDIAL_DELAY_SECONDS = 60.0
# A redial is pointless once the trip is over or the customer is on board.
# Live 2026-10-18: a trip cancelled during the 60 s wait was still redialled.
NO_REDIAL_STATUSES = frozenset({
    "cancelled", "cancelled_by_driver", "completed", "no_show", "rejected", "picked_up",
})


def next_attempt(current: int) -> int | None:
    """Redial number to place next, or None when redials are exhausted."""
    return current + 1 if current < MAX_REDIALS else None


def redial_notice(lang: str, name: str, attempt: int) -> str:
    secs = int(REDIAL_DELAY_SECONDS)
    if lang == "en":
        return f"{name} did not answer. I will call again in {secs} seconds (retry {attempt} of {MAX_REDIALS})."
    return f"{name} chưa nghe máy. Tôi sẽ gọi lại sau {secs} giây (lần gọi lại {attempt}/{MAX_REDIALS})."


def final_notice(lang: str, name: str) -> str:
    total = MAX_REDIALS + 1
    if lang == "en":
        return f"I called {name} {total} times but nobody answered. You may want to send a message or try later."
    return f"Tôi đã gọi {name} {total} lần nhưng khách không nghe máy. Bạn có thể nhắn tin hoặc gọi lại sau."


def redial_skipped_notice(lang: str, name: str) -> str:
    if lang == "en":
        return f"{name} did not answer. The trip changed meanwhile, so I did not call again."
    return f"{name} chưa nghe máy. Chuyến đã thay đổi nên mình không gọi lại."


def redial_failed_notice(lang: str, name: str) -> str:
    if lang == "en":
        return f"{name} did not answer and I could not place another call right now."
    return f"{name} không nghe máy và hiện chưa thể gọi lại cho khách."


async def redial_after_delay(
    call_meta: dict,
    attempt: int,
    *,
    sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    start_call: Callable[..., Awaitable[dict]] | None = None,
    get_trip: Callable[[str], Awaitable[dict]] | None = None,
) -> bool | None:
    """Wait REDIAL_DELAY_SECONDS, then place redial `attempt`.

    True if dialled, False if dialling failed, None if skipped because the
    trip no longer needs the customer called."""
    start = start_call or backend_api.start_call
    await sleep(REDIAL_DELAY_SECONDS)
    trip_id = call_meta.get("trip_id", "")
    if trip_id:
        try:
            status = str((await (get_trip or backend_api.get_trip)(trip_id)).get("status") or "")
        except Exception:
            status = ""  # can't tell: keep the redial (the safer side for a waiting driver)
        if status in NO_REDIAL_STATUSES:
            logger.info("no-answer redial %d skipped | trip=%s status=%s", attempt, trip_id[:8], status)
            return None
    try:
        await start(
            driver_id=call_meta.get("driver_phone", ""),
            customer_id=call_meta.get("customer_phone", ""),
            trip_id=call_meta.get("trip_id", ""),
            phone_number=call_meta.get("customer_phone", ""),
            mode="background",
            room_name=call_meta.get("driver_room_name", ""),
            lang=call_meta.get("lang", "vn"),
            customer_name=call_meta.get("customer_name", ""),
            pickup_address=call_meta.get("pickup_address", ""),
            custom_message=call_meta.get("custom_message", ""),
            retry_attempt=attempt,
        )
        return True
    except Exception:
        logger.error("no-answer redial %d failed", attempt, exc_info=True)
        return False
