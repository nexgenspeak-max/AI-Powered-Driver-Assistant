"""Silence-based auto end for agent-mode customer/contact calls.

Unlike isolated (background) calls — which run in their own dedicated
"custcall" room and get a SilenceTracker tuned to a tight 5s/1-strike
threshold (see session.py) — an agent-mode call is dialed straight into the
driver's own room, which shares that ROOM's single SilenceTracker instance,
tuned for "driver" mode's much longer 60s x 3 (~3 min) threshold and wired to
end the whole session, not just hand back this one sub-call. Net effect:
once the customer has said at least one thing, nothing was actually forcing
the call to end when they ran out of things to say — it was entirely up to
the LLM's own (unreliable, per this codebase's own established experience
with the exact same class of bug elsewhere) judgment to notice and call
end_customer_call. This is a small, independent watchdog scoped to just the
current agent-mode sub-call that closes that gap deterministically.
"""
from __future__ import annotations

import asyncio
import logging
import time

from livekit.agents import AgentSession

from app.voicebot.processors.handback import handback_to_driver

logger = logging.getLogger("voice-agent.processors.agent_call_silence")

# Was 8.0s — too tight, same class of bug found in session.py's custcall
# SilenceTracker: real customer responses (STT delay + normal think time
# before answering a spoken question) routinely land in the 5-16s range, per
# actual call logs. 25s gives real conversational pauses (customer thinking,
# checking something with someone else) comfortable room while still ending
# a genuinely abandoned call well short of the generic session-level
# tracker's 60s x 3 (~3 min) fallback.
_QUIET_SECONDS = 25.0
_POLL_INTERVAL_SECONDS = 1.0


def cancel_agent_call_silence_watch(userdata: dict) -> None:
    task = userdata.pop("_agent_call_silence_task", None)
    if task and not task.done():
        task.cancel()


async def _watch(session: AgentSession, userdata: dict) -> None:
    try:
        while True:
            await asyncio.sleep(_POLL_INTERVAL_SECONDS)
            if not userdata.get("customer_call_active"):
                return
            # Never auto-end before the customer has said anything at all —
            # that's end_customer_call's own _MIN_AGENT_CALL_SECONDS
            # backstop's job (still ringing/just answered), not "went quiet
            # after actually talking", which is what this watches for.
            if not userdata.get("_customer_spoke"):
                continue
            quiet_since = userdata.get("_agent_call_quiet_since")
            if not quiet_since:
                continue  # AI is currently speaking/thinking — not silence
            if time.time() - quiet_since >= _QUIET_SECONDS:
                break
    except asyncio.CancelledError:
        return

    if not userdata.get("customer_call_active"):
        return

    lang = userdata.get("lang", "vn")
    summary = (
        "The customer had no further questions and stopped responding — call ended automatically."
        if lang == "en"
        else "Khách không còn câu hỏi và không phản hồi thêm — cuộc gọi tự động kết thúc."
    )
    logger.info("agent-mode call auto-ended | reason=customer_silence")
    await handback_to_driver(
        session,
        userdata,
        summary,
        mode="agent",
        silence_tracker=userdata.get("_silence_tracker"),
    )


def schedule_agent_call_silence_watch(session: AgentSession, userdata: dict) -> None:
    """Start (or replace) the agent-mode call's silence watchdog."""
    cancel_agent_call_silence_watch(userdata)
    task = asyncio.create_task(_watch(session, userdata), name="agent_call_silence_watch")
    userdata["_agent_call_silence_task"] = task
