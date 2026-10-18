"""Best-effort live refresh of the driver context before a trip answer.

The session snapshot is taken at connect. A session opened by a new-trip
offer starts before the driver accepts, so its optimized route and trip
status are stale by the time the driver asks "còn bao xa tới điểm đón?".
"""

from __future__ import annotations

import asyncio
import logging

from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import driver_leg_to_trip

logger = logging.getLogger("llm-orchestrator.voicebot.live_context")

REFRESH_TIMEOUT_S = 2.5


async def refresh_driver_context(userdata: dict, timeout: float = REFRESH_TIMEOUT_S) -> bool:
    phone = userdata.get("driver_phone", "") if isinstance(userdata, dict) else ""
    if not phone:
        return False
    try:
        fresh = await asyncio.wait_for(backend_api.get_driver_context(phone), timeout)
    except Exception:
        logger.info("live context refresh skipped — using session snapshot", exc_info=True)
        return False
    context_store.load_driver_context(userdata, fresh)
    return True


def driver_leg(userdata: dict, trip: dict | None) -> dict | None:
    if not trip:
        return None
    return driver_leg_to_trip(context_store.get_optimized_route(userdata), trip)
