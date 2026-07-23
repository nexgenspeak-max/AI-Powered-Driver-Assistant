"""Shared helper to gracefully tear down a driver/customer voice-agent room."""
import asyncio
import logging
import os

from livekit import api
from livekit.agents import JobContext
from livekit.protocol.room import RoomParticipantIdentity

logger = logging.getLogger("voice-agent.session_control")


async def end_room_session(ctx: JobContext, reason: str) -> None:
    """Remove remote participants (if any) then shut the agent job down."""
    remote_participants = list(ctx.room.remote_participants.values())
    if remote_participants:
        lk = api.LiveKitAPI(
            url=os.getenv("LIVEKIT_URL", ""),
            api_key=os.getenv("LIVEKIT_API_KEY", ""),
            api_secret=os.getenv("LIVEKIT_API_SECRET", ""),
        )
        try:
            for p in remote_participants:
                try:
                    await lk.room.remove_participant(
                        RoomParticipantIdentity(room=ctx.room.name, identity=p.identity)
                    )
                    logger.info("end_room_session | removed participant %s", p.identity)
                except Exception as exc:
                    logger.warning(
                        "end_room_session | could not remove %s: %s", p.identity, exc
                    )
            await asyncio.sleep(0.5)
        finally:
            await lk.aclose()

    ctx.shutdown(reason=reason)
