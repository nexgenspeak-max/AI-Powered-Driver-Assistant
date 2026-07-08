"""Safety timeout for customer-initiated bridge calls when the driver never hangs up."""
from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING

from livekit.agents import AgentSession

from app.config.settings import get_settings
from app.voicebot.processors.handback import build_customer_agent, restore_session_audio

if TYPE_CHECKING:
    from app.services.silence_tracker import SilenceTracker

logger = logging.getLogger("voice-agent.processors.customer_bridge_timeout")


def _timeout_summary(lang: str, seconds: int) -> str:
    minutes = max(1, seconds // 60)
    if lang == "en":
        return f"Bridge call auto-ended after {minutes} minutes (safety limit)."
    return f"Cuộc gọi trực tiếp tự kết thúc sau {minutes} phút (giới hạn an toàn)."


def cancel_customer_bridge_timeout(userdata: dict) -> None:
    task = userdata.pop("_customer_bridge_timeout_task", None)
    if task and not task.done():
        task.cancel()


async def _timeout_worker(session: AgentSession, userdata: dict, seconds: int) -> None:
    try:
        await asyncio.sleep(seconds)
    except asyncio.CancelledError:
        return

    if not userdata.get("bridge_call_active"):
        return

    lang = userdata.get("lang", "vn")
    summary = _timeout_summary(lang, seconds)
    logger.info("customer bridge call timeout | seconds=%s", seconds)

    userdata["bridge_call_active"] = False
    userdata["driver_call_active"] = False
    restore_session_audio(session)

    customer = build_customer_agent(userdata, summary=summary)
    session.update_agent(customer)

    tracker: SilenceTracker | None = userdata.get("_silence_tracker")
    if tracker:
        tracker.resume()


def schedule_customer_bridge_timeout(session: AgentSession, userdata: dict) -> None:
    """Start (or replace) the customer bridge safety timer."""
    cancel_customer_bridge_timeout(userdata)

    seconds = get_settings().bridge_call_max_seconds
    if seconds <= 0:
        return

    task = asyncio.create_task(
        _timeout_worker(session, userdata, seconds),
        name="customer_bridge_call_timeout",
    )
    userdata["_customer_bridge_timeout_task"] = task
    logger.info("customer bridge timeout scheduled | seconds=%s", seconds)
