"""Safety timeout for bridge calls when the customer never hangs up."""
from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING

from livekit.agents import AgentSession

from app.config.settings import get_settings
from app.voicebot.processors.handback import cancel_bridge_timeout, handback_to_driver

if TYPE_CHECKING:
    from app.services.silence_tracker import SilenceTracker

logger = logging.getLogger("llm-orchestrator.processors.bridge_timeout")


def _timeout_summary(lang: str, seconds: int) -> str:
    minutes = max(1, seconds // 60)
    if lang == "en":
        return f"Bridge call auto-ended after {minutes} minutes (safety limit)."
    return f"Cuộc gọi trực tiếp tự kết thúc sau {minutes} phút (giới hạn an toàn)."


async def _bridge_timeout_worker(
    session: AgentSession,
    userdata: dict,
    seconds: int,
) -> None:
    try:
        await asyncio.sleep(seconds)
    except asyncio.CancelledError:
        return

    if not userdata.get("bridge_call_active"):
        return

    lang = userdata.get("lang", "vn")
    summary = _timeout_summary(lang, seconds)
    logger.info("bridge call timeout | seconds=%s", seconds)

    silence_tracker: SilenceTracker | None = userdata.get("_silence_tracker")
    await handback_to_driver(
        session,
        userdata,
        summary,
        mode="bridge",
        silence_tracker=silence_tracker,
    )


def schedule_bridge_timeout(session: AgentSession, userdata: dict) -> None:
    """Start (or replace) the bridge safety timer."""
    cancel_bridge_timeout(userdata)

    seconds = get_settings().bridge_call_max_seconds
    if seconds <= 0:
        return

    task = asyncio.create_task(
        _bridge_timeout_worker(session, userdata, seconds),
        name="bridge_call_timeout",
    )
    userdata["_bridge_timeout_task"] = task
    logger.info("bridge timeout scheduled | seconds=%s", seconds)
