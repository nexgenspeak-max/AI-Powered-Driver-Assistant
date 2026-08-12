"""Shared helper to gracefully tear down a driver/customer voice-agent room."""
import asyncio
import logging

from livekit.agents import JobContext

from app.services import backend_api

logger = logging.getLogger("voice-agent.session_control")


async def end_room_session(ctx: JobContext, reason: str) -> None:
    """Remove remote participants (if any) then shut the agent job down.

    Callers (end_conversation.py, end_call.py, silence_tracker.py)
    all `await session.say(...)` a final goodbye/summary line
    right before this — `session.say()`'s await only resolves once the agent
    has finished GENERATING/publishing that speech, not once the caller's
    device has actually finished rendering the last of it through their
    speaker (real network jitter/decode buffering on the client always trails
    a bit behind). Removing the participant right after that await could kick
    them off the room mid-word, clipping the tail of the sentence — heard as
    the goodbye line sounding rushed/garbled ("nói không chuẩn được, quá
    nhanh") rather than a real TTS speed problem.
    """
    remote_participants = list(ctx.room.remote_participants.values())
    if remote_participants:
        # Grace period BEFORE kicking anyone — not after (that's what this
        # used to be, which did nothing for the reason above: by the time you
        # remove the participant, it's already too late for anything they
        # were still hearing). Comfortably longer than typical jitter-buffer
        # lag so the last words of the goodbye line actually finish playing.
        await asyncio.sleep(0.8)

        # Routed through trip-service (which already owns a RoomServiceClient
        # for token issuance) rather than voice-agent holding its own
        # separate LiveKit admin client just for this one teardown step —
        # see backend_api.end_voice_session. Non-fatal: a failure here just
        # means the participant(s) stay connected to an agent that's shutting
        # down anyway (ctx.shutdown() below always runs regardless).
        try:
            await backend_api.end_voice_session(
                ctx.room.name, [p.identity for p in remote_participants]
            )
            logger.info(
                "end_room_session | removed participants via trip-service | %s",
                [p.identity for p in remote_participants],
            )
        except Exception as exc:
            logger.warning("end_room_session | trip-service removal failed: %s", exc)

    ctx.shutdown(reason=reason)
