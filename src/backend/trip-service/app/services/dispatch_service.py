"""
Triggers an outbound SIP call to a driver via LiveKit, then explicitly
dispatches the voice-agent worker into the same room.

Flow:
  1. Create a LiveKit room with name driver-{phone}-{ts} and trip metadata
  2. Explicitly dispatch "driver-assistant" agent into the room
  3. Create an outbound SIP participant — LiveKit dials the driver's phone
     (SIP participant joins the room where the agent is already waiting)
"""
import json
import logging
import time

from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def dispatch_call(trip: dict) -> str:
    """
    Creates a LiveKit room + dispatches the voice agent + initiates outbound
    SIP call to the driver.  Returns the room_name created.  Raises on failure.
    """
    s = get_settings()

    if not s.livekit_api_key:
        raise RuntimeError("LIVEKIT_API_KEY must be set to dispatch calls")

    from livekit import api as lkapi

    # Use the same room-name format as inbound so session.py can parse the phone
    driver_phone_clean = trip["driver_phone"].replace("+", "")
    room_name = f"driver-{driver_phone_clean}-{int(time.time())}"

    metadata = json.dumps({
        "trip_id":         trip["trip_id"],
        "driver_phone":    trip["driver_phone"],
        "customer_name":   trip["customer_name"],
        "pickup_address":  trip["pickup_address"],
        "dropoff_address": trip["dropoff_address"],
        "pickup_time":     trip.get("pickup_time", ""),
        "distance_km":     str(trip.get("distance_km", "")),
        "eta_minutes":     str(trip.get("eta_minutes", "")),
        "traffic_note":    trip.get("traffic_note", ""),
        "route_summary":   trip.get("route_summary", ""),
    })

    async with lkapi.LiveKitAPI(
        url=s.livekit_url,
        api_key=s.livekit_api_key,
        api_secret=s.livekit_api_secret,
    ) as lk:
        # 1. Create room with trip context in metadata
        await lk.room.create_room(lkapi.CreateRoomRequest(
            name=room_name,
            metadata=metadata,
        ))
        logger.info("room created: %s", room_name)

        # 2. Dispatch voice-agent worker explicitly so it is ready before SIP rings
        try:
            try:
                from livekit.api import CreateAgentDispatchRequest
            except ImportError:
                from livekit.protocol.agent_dispatch import CreateAgentDispatchRequest

            await lk.agent_dispatch.create_dispatch(
                CreateAgentDispatchRequest(
                    room=room_name,
                    agent_name=s.livekit_agent_name,
                )
            )
            logger.info("agent dispatched | room=%s", room_name)
        except Exception:
            logger.warning(
                "agent dispatch failed (non-fatal) — ensure %s worker is running",
                s.livekit_agent_name,
                exc_info=True,
            )

        # 3. Dial driver's phone — LiveKit → SIP trunk → driver's mobile
        if s.sip_trunk_id:
            await lk.sip.create_sip_participant(lkapi.CreateSIPParticipantRequest(
                sip_trunk_id=s.sip_trunk_id,
                sip_call_to=trip["driver_phone"],
                room_name=room_name,
                participant_name="driver",
                play_ringtone=True,
            ))
            logger.info("outbound SIP call initiated → %s", trip["driver_phone"])
        else:
            logger.warning("SIP_TRUNK_ID not set — skipping SIP dial, agent-only room created")

    return room_name
