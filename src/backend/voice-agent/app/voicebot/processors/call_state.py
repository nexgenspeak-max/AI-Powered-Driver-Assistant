"""Publishes "a real phone call is active" to the room's LiveKit data channel.

The driver/customer app's mic button (Home screen) must NOT be able to hang
up the voice session while any of these flags is true — the user is actively
talking with the other party (bridge mode: driver<->customer direct, or
agent mode: driver listening live in the same room) and hanging up the AI
session would also cut that live conversation off. Per product requirement,
the session may only end once that underlying call itself ends, not via the
AI-chat mic toggle.

`background_call_active` (mode='background' — "AI calls the customer in a
separate room while the driver keeps using the assistant normally") is
deliberately EXCLUDED: the driver isn't a party to that call at all, so
blocking their own mic would contradict the whole point of background mode.
It's also structurally never reset back to False in the driver's own room
(the background call runs in a fully separate `custcall-*` room/session with
its own userdata, which has no path back to the driver's original session) —
treating it as blocking would permanently lock the mic button after the
driver's first background call.

`CallAwareUserData` is a drop-in dict subclass for `AgentSession.userdata` —
every existing (and future) call site that does
`context.userdata["bridge_call_active"] = True` keeps working unchanged, but
now also fires a data-channel publish automatically, so no call site has to
remember to notify the frontend itself.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from livekit.agents.job import get_job_context

logger = logging.getLogger("voice-agent.processors.call_state")

CALL_STATE_TOPIC = "call_state"
CALL_TRANSCRIPT_TOPIC = "call_transcript"

# Userdata flags that mean "the user in THIS room is actively talking with
# the other party right now" — bridge (driver<->customer direct) and
# agent-mediated (driver listening live, same room) call variants.
# driver_call_active is the customer-app-side mirror (customer bridging to
# the driver). background_call_active is intentionally NOT included — see
# module docstring.
_CALL_FLAG_KEYS = {
    "bridge_call_active",
    "customer_call_active",
    "driver_call_active",
}


def is_call_active(userdata: dict) -> bool:
    return any(bool(userdata.get(key)) for key in _CALL_FLAG_KEYS)


class CallAwareUserData(dict):
    """`AgentSession.userdata` that auto-publishes on any call-flag change.

    Note: only `obj[key] = value` assignment goes through `__setitem__` — the
    initial `CallAwareUserData({...})` construction does not (CPython's dict
    init bypasses the Python-level override), which is fine here since the
    initial values are always `False` (no call active yet, nothing to
    announce).
    """

    def __setitem__(self, key: str, value: Any) -> None:
        changed = key in _CALL_FLAG_KEYS and self.get(key) != value
        super().__setitem__(key, value)
        if changed:
            _schedule_publish(self)


def _schedule_publish(userdata: dict) -> None:
    try:
        asyncio.get_running_loop().create_task(_publish(userdata))
    except RuntimeError:
        # No running event loop (e.g. during teardown) — nothing to publish to.
        pass


def _active_call_mode(userdata: dict) -> str:
    if userdata.get("bridge_call_active"):
        return "bridge"
    if userdata.get("customer_call_active"):
        return "agent"
    return ""


async def _publish(userdata: dict) -> None:
    active = is_call_active(userdata)
    try:
        job_ctx = get_job_context()
        payload = json.dumps({
            "type": "call_state",
            "active": active,
            "mode": _active_call_mode(userdata) if active else "",
        })
        await job_ctx.room.local_participant.publish_data(
            payload, reliable=True, topic=CALL_STATE_TOPIC
        )
        logger.info(
            "call_state published | active=%s mode=%s",
            active,
            _active_call_mode(userdata) if active else "-",
        )
    except Exception:
        logger.warning("failed to publish call_state | active=%s", active, exc_info=True)
