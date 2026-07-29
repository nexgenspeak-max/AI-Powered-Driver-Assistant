"""Publishes the AI agent's real speaking/thinking/listening state to the
room's LiveKit data channel.

Lets the driver-app's assistant orb keep animating for the AI's whole reply
instead of reacting to raw audio level alone — audio level drops to ~0 during
a natural mid-sentence pause, which made the orb visibly stop moving before
the AI had actually finished talking.
"""
from __future__ import annotations

import asyncio
import json
import logging

from livekit.agents.job import get_job_context

logger = logging.getLogger("voice-agent.processors.agent_state")

AGENT_STATE_TOPIC = "agent_state"


async def _publish(state: str) -> None:
    try:
        job_ctx = get_job_context()
        payload = json.dumps({"type": "agent_state", "state": state})
        await job_ctx.room.local_participant.publish_data(
            payload, reliable=True, topic=AGENT_STATE_TOPIC
        )
    except Exception:
        logger.warning("failed to publish agent_state | state=%s", state, exc_info=True)


def publish_agent_state(state: str) -> None:
    """Fire-and-forget — call directly from a synchronous `session.on(...)` handler."""
    try:
        asyncio.get_running_loop().create_task(_publish(state))
    except RuntimeError:
        # No running event loop (e.g. during teardown) — nothing to publish to.
        pass
