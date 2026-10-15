"""LiveKit in-room driver calls — customer dials the driver directly (bridge mode)."""
from __future__ import annotations

import logging

from livekit.agents import Agent, RunContext

from app.services import backend_api
from app.voicebot.customer_bridge_call_agent import CustomerBridgeCallAgent

logger = logging.getLogger("llm-orchestrator.processors.driver_call")


def _room_missing(lang: str) -> str:
    return "Không tìm thấy phòng LiveKit." if lang == "vn" else "LiveKit room not found."


def _dial_failed(lang: str) -> str:
    return (
        "Không thể gọi tài xế lúc này. Bạn thử lại sau ít phút nhé."
        if lang == "vn"
        else "Unable to call the driver right now. Please try again in a moment."
    )


async def start_bridge_call_to_driver(
    context: RunContext,
    trip: dict,
    *,
    lang: str,
) -> tuple[Agent, str] | str:
    """Dial the trip's driver via SIP and hand off to CustomerBridgeCallAgent."""
    room_name = context.userdata.get("room_name", "")
    if not room_name:
        return _room_missing(lang)

    try:
        result = await backend_api.call_driver(
            customer_phone=context.userdata.get("customer_phone", ""),
            trip_id=trip.get("trip_id", ""),
            room_name=room_name,
        )
    except Exception:
        logger.error("call_driver failed", exc_info=True)
        return _dial_failed(lang)

    call_id = str(result.get("call_id") or "")
    context.userdata["customer_call"] = {
        "call_id": call_id,
        "trip_id": trip.get("trip_id", ""),
        "sip_identity": result.get("sip_identity", ""),
        "room_name": room_name,
        "mode": "bridge",
    }
    context.userdata["bridge_call_active"] = True
    context.userdata["driver_call_active"] = True

    tracker = context.userdata.get("_silence_tracker")
    if tracker:
        tracker.pause()

    dialed = result.get("dialed_number", trip.get("driver_phone", ""))
    note = result.get("override_note") or ""
    suffix = f" {note}" if note else ""

    agent = CustomerBridgeCallAgent(lang=lang)

    if lang == "en":
        msg = (
            f"Connecting the driver at {dialed} to this call.{suffix} "
            "When they answer, speak to them directly."
        )
    else:
        msg = (
            f"Đang kết nối tài xế tại {dialed} vào cuộc gọi này.{suffix} "
            "Khi tài xế nghe máy, bạn nói trực tiếp với tài xế."
        )
    return agent, msg
