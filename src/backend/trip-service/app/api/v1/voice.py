import logging
import time
from datetime import timedelta

from fastapi import APIRouter, HTTPException
from livekit.api import AccessToken, VideoGrants
from app.core.config import get_settings

router = APIRouter(prefix="/voice", tags=["voice"])
logger = logging.getLogger("trip-service.voice")


async def _dispatch_agent(room_name: str, s, agent_name: str = "driver-assistant") -> None:
    """
    Ask the voice-agent worker to join the room.
    Failure is non-fatal — the token is still returned so the client can connect.
    """
    try:
        from livekit.api import LiveKitAPI

        try:
            from livekit.api import CreateAgentDispatchRequest
        except ImportError:
            from livekit.protocol.agent_dispatch import CreateAgentDispatchRequest

        async with LiveKitAPI(
            url=s.livekit_url,
            api_key=s.livekit_api_key,
            api_secret=s.livekit_api_secret,
        ) as lk:
            await lk.agent_dispatch.create_dispatch(
                CreateAgentDispatchRequest(
                    room=room_name,
                    agent_name=agent_name,
                )
            )
        logger.info("agent '%s' dispatched | room=%s", agent_name, room_name)

    except Exception:
        logger.warning(
            "agent dispatch failed (non-fatal) — ensure voice-agent worker is running "
            "and registered as '%s'",
            agent_name,
            exc_info=True,
        )


def _make_token(s, identity: str, name: str, room_name: str) -> str:
    return (
        AccessToken(s.livekit_api_key, s.livekit_api_secret)
        .with_identity(identity)
        .with_name(name)
        .with_ttl(timedelta(hours=1))
        .with_grants(VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
        ))
        .to_jwt()
    )


# ── Driver token ──────────────────────────────────────────────────────────────

@router.post("/token")
async def create_token(driver_phone: str):
    """
    Generate a LiveKit access token for the driver, then dispatch the AI voice
    agent into the same room so it is ready when the driver connects.
    Room name: driver-{phone_without_plus}-{unix_timestamp}
    """
    s = get_settings()
    if not s.livekit_api_key or not s.livekit_api_secret:
        raise HTTPException(status_code=503, detail="LiveKit not configured")

    room_name = f"driver-{driver_phone.replace('+', '')}-{int(time.time())}"
    token     = _make_token(s, f"driver-{driver_phone}", driver_phone, room_name)

    await _dispatch_agent(room_name, s, agent_name=s.livekit_agent_name)

    return {
        "token":       token,
        "room_name":   room_name,
        "livekit_url": s.livekit_url,
    }


# ── Customer support token ─────────────────────────────────────────────────────

@router.post("/customer-token")
async def create_customer_token(customer_phone: str):
    """
    Generate a LiveKit access token for a customer contacting support.
    The same driver-assistant worker handles the session; session.py routes
    customer- rooms to CustomerAgent automatically.
    Room name: customer-{phone_without_plus}-{unix_timestamp}
    """
    s = get_settings()
    if not s.livekit_api_key or not s.livekit_api_secret:
        raise HTTPException(status_code=503, detail="LiveKit not configured")

    room_name = f"customer-{customer_phone.replace('+', '')}-{int(time.time())}"
    token     = _make_token(s, f"customer-{customer_phone}", customer_phone, room_name)

    await _dispatch_agent(room_name, s, agent_name=s.livekit_agent_name)

    return {
        "token":       token,
        "room_name":   room_name,
        "livekit_url": s.livekit_url,
    }
