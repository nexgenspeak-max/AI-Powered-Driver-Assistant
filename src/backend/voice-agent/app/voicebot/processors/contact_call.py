"""LiveKit in-room agent call to a personal contact (resolved via the driver's
phone contacts, not a trip customer) — AI speaks on the driver's behalf and
optionally relays a message the driver dictated first.

Bridge mode for contacts needs no new function — custom_call.py's
start_bridge_call_to_number already dials an arbitrary number and hands off to
BridgeCallAgent; this module only adds the "agent" mode, which
custom_call.py has no equivalent of.
"""
from __future__ import annotations

import logging

from livekit.agents import Agent, RunContext

from app.services import backend_api
from app.voicebot.customer_call_agent import CustomerCallAgent

logger = logging.getLogger("voice-agent.processors.contact_call")


def _room_missing(lang: str) -> str:
    return "Không tìm thấy phòng LiveKit." if lang == "vn" else "LiveKit room not found."


def _dial_failed(name: str, lang: str) -> str:
    return (
        f"Không thể gọi {name} lúc này. Kiểm tra trip-service (:8002) và SIP_TRUNK_ID."
        if lang == "vn"
        else f"Unable to call {name}. Check trip-service (:8002) and SIP_TRUNK_ID."
    )


async def start_agent_call_to_contact(
    context: RunContext,
    phone_number: str,
    *,
    contact_name: str,
    custom_message: str = "",
    lang: str = "vn",
) -> tuple[Agent, str] | str:
    """Dial a personal contact via SIP and hand off to CustomerCallAgent, which
    optionally opens with `custom_message` instead of its generic greeting."""
    driver_phone = context.userdata.get("driver_phone", "")
    room_name = context.userdata.get("room_name", "")
    if not room_name:
        return _room_missing(lang)

    try:
        result = await backend_api.start_call(
            driver_id=driver_phone,
            customer_id="",
            trip_id="",
            phone_number=phone_number,
            mode="agent",
            room_name=room_name,
            lang=lang,
            customer_name=contact_name,
        )
    except Exception:
        logger.error("contact agent call — start_call failed", exc_info=True)
        return _dial_failed(contact_name, lang)

    call_id = str(result.get("call_id") or "")
    context.userdata["customer_call"] = {
        "call_id": call_id,
        "trip_id": "",
        "sip_identity": result.get("sip_identity", ""),
        "room_name": room_name,
        "mode": "agent",
    }
    context.userdata["customer_call_active"] = True
    context.userdata["bridge_call_active"] = False
    context.userdata["background_call_active"] = False

    tracker = context.userdata.get("_silence_tracker")
    if tracker:
        tracker.pause()

    dialed = result.get("dialed_number", phone_number)
    note = result.get("override_note") or ""
    suffix = f" {note}" if note else ""

    agent = CustomerCallAgent(
        lang=lang,
        trip={},
        customer_name=contact_name,
        custom_message=custom_message,
    )

    if lang == "en":
        msg = (
            f"Dialing {contact_name} at {dialed} into this call.{suffix} "
            "You can listen live while I speak with them."
        )
    else:
        msg = (
            f"Đang gọi {contact_name} tại {dialed} vào cuộc gọi này.{suffix} "
            "Anh/chị có thể nghe trực tiếp trong khi tôi nói chuyện."
        )
    return agent, msg
