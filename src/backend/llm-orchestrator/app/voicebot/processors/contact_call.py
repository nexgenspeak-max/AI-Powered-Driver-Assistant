"""LiveKit in-room agent/background call to a personal contact (resolved via
the driver's phone contacts, not a trip customer) — AI speaks on the driver's
behalf and optionally relays a message the driver dictated first.

Bridge mode for contacts needs no new function — custom_call.py's
start_bridge_call_to_number already dials an arbitrary number and hands off to
BridgeCallAgent. This module mirrors customer_call.py's 3 call modes
(agent/bridge/background) for a contact instead of a trip customer — same
behavior, just no trip_id/pickup_address to thread through.
"""
from __future__ import annotations

import logging

from livekit.agents import Agent, RunContext

from app.services import backend_api
from app.voicebot.customer_call_agent import CustomerCallAgent
from app.voicebot.processors import context_store
from app.voicebot.processors.pre_dial import announce_pre_dial

logger = logging.getLogger("llm-orchestrator.processors.contact_call")


def _room_missing(lang: str) -> str:
    return "Không tìm thấy phòng LiveKit." if lang == "vn" else "LiveKit room not found."


def _dial_failed(name: str, lang: str) -> str:
    return (
        f"Không thể gọi {name} lúc này. Bạn thử lại sau ít phút nhé."
        if lang == "vn"
        else f"Unable to call {name}. Please try again in a moment."
    )


def _pre_dial_announcement(name: str, lang: str) -> str:
    return f"Đang gọi {name}, xin đợi trong giây lát." if lang == "vn" else f"Calling {name}, please hold on."


async def _announce_pre_dial(context: RunContext, name: str, lang: str) -> None:
    await announce_pre_dial(context, _pre_dial_announcement(name, lang))


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

    # Speak — and wait for it to finish — before dialing, so the driver
    # always hears "calling X" before the SIP INVITE (and its network/
    # telecom latency) starts, instead of the phone connecting in silence.
    await _announce_pre_dial(context, contact_name, lang)

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
    conv_service = context.userdata.get("_conv_service")
    context.userdata["customer_call"] = {
        "call_id": call_id,
        "trip_id": "",
        "customer_phone": phone_number,
        "sip_identity": result.get("sip_identity", ""),
        "room_name": room_name,
        "mode": "agent",
        # Checkpoint into conv_service.turns — see
        # customer_call.py::_save_call_context for why this is needed.
        "turns_from": len(conv_service.turns) if conv_service else 0,
    }
    context.userdata["customer_call_active"] = True
    context.userdata["bridge_call_active"] = False
    context.userdata["background_call_active"] = False

    # Agent mode: retarget STT to the contact's SIP leg, same reasoning as
    # customer_call.py::_save_call_context — the driver joined the room
    # first, so RoomIO stays locked onto their mic unless switched
    # explicitly. Restored back to the driver on handback (see
    # handback.py::restore_room_participant).
    room_io = context.session.room_io
    linked = room_io.linked_participant
    if linked:
        context.userdata["customer_call"]["_driver_room_identity"] = linked.identity
    sip_identity = result.get("sip_identity", "")
    if sip_identity:
        room_io.set_participant(sip_identity)

    from app.voicebot.processors.agent_call_silence import schedule_agent_call_silence_watch

    schedule_agent_call_silence_watch(context.session, context.userdata)

    tracker = context.userdata.get("_silence_tracker")
    if tracker:
        tracker.pause()

    agent = CustomerCallAgent(
        lang=lang,
        trip={},
        customer_name=contact_name,
        custom_message=custom_message,
    )

    # No extra ad-libbed line here — same fix as customer_call.py's
    # start_in_room_agent_call: _announce_pre_dial already spoke the one
    # scripted line ("Đang gọi X, xin đợi trong giây lát") before the dial
    # above. This used to hand the LLM free text ("you can listen live") to
    # paraphrase into its own words, which is exactly the kind of off-script
    # ad-lib line the driver should never hear.
    return agent, ""


async def start_background_call_to_contact(
    context: RunContext,
    phone_number: str,
    *,
    contact_name: str,
    lang: str = "vn",
) -> str:
    """AI calls the contact in a separate room — driver keeps DriverAgent (no
    handoff). Mirrors customer_call.py's start_background_call exactly, just
    with no trip_id/pickup_address (contacts aren't tied to a trip)."""
    driver_phone = context.userdata.get("driver_phone", "")

    # Speak — and wait for it to finish — before dialing, so the driver
    # always hears "calling X" before the SIP INVITE (and its network/
    # telecom latency) starts, instead of the phone connecting in silence.
    await _announce_pre_dial(context, contact_name, lang)

    try:
        result = await backend_api.start_call(
            driver_id=driver_phone,
            customer_id="",
            trip_id="",
            phone_number=phone_number,
            mode="background",
            # Not "the room to dial into" here (background calls always get
            # their own separate custcall-* room) — this is the driver's OWN
            # room, threaded through so the isolated call can push a data
            # message back into it once it ends, letting the driver's own
            # DriverAgent proactively announce the summary the moment it's
            # ready instead of only on request (see session.py's
            # "background_call_summary" data handler). Same reasoning as
            # customer_call.py's start_background_call.
            room_name=context.userdata.get("room_name", ""),
            lang=lang,
            customer_name=contact_name,
        )
    except Exception:
        logger.error("background contact call — start_call failed", exc_info=True)
        return _dial_failed(contact_name, lang)

    call_id = str(result.get("call_id") or "")
    context.userdata["customer_call"] = {
        "call_id": call_id,
        "trip_id": "",
        "customer_phone": phone_number,
        "sip_identity": result.get("sip_identity", ""),
        "room_name": context.userdata.get("room_name", ""),
        "mode": "background",
    }
    context.userdata["background_call_active"] = True
    context.userdata["customer_call_active"] = False
    context.userdata["bridge_call_active"] = False

    if call_id:
        context_store.set_last_call(
            context.userdata,
            call_id,
            trip_id="",
            mode="background",
            status=result.get("status", "in_progress"),
        )

    dialed = result.get("dialed_number", phone_number)
    note = result.get("override_note") or ""
    suffix = f" {note}" if note else ""

    if lang == "en":
        return (
            f"Calling {contact_name} at {dialed} in the background.{suffix} "
            "You can keep asking me other questions. "
            "Say 'summarize the call' or 'is the call done?' when you want the result."
        )
    return (
        f"Đang gọi {contact_name} tại {dialed} ở chế độ nền.{suffix} "
        "Bạn có thể hỏi việc khác. "
        "Khi cần biết kết quả, nói 'tóm tắt cuộc gọi' hoặc 'gọi xong chưa'."
    )
