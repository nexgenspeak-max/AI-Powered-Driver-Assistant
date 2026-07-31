"""LiveKit in-room customer calls — agent mode, bridge mode, shared dial."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from livekit.agents import Agent, RunContext

from app.services import backend_api
from app.voicebot.bridge_call_agent import BridgeCallAgent
from app.voicebot.customer_call_agent import CustomerCallAgent
from app.voicebot.processors import context_store
from app.voicebot.prompts.bridge_call import bridge_greeting

if TYPE_CHECKING:
    from app.services.silence_tracker import SilenceTracker

logger = logging.getLogger("voice-agent.processors.customer_call")


def _room_missing(lang: str) -> str:
    return (
        "Không tìm thấy phòng LiveKit."
        if lang == "vn"
        else "LiveKit room not found."
    )


def _phone_missing(name: str, lang: str) -> str:
    return (
        f"Không tìm thấy số điện thoại của {name}."
        if lang == "vn"
        else f"No phone number found for {name}."
    )


def _dial_failed(name: str, lang: str) -> str:
    return (
        f"Không thể gọi {name} lúc này. Kiểm tra trip-service (:8002) và SIP_TRUNK_ID."
        if lang == "vn"
        else f"Unable to call {name}. Check trip-service (:8002) and SIP_TRUNK_ID."
    )


def _pre_dial_announcement(name: str, lang: str, *, mode: str) -> str:
    """`mode` picks the phrasing. Bridge mode says the FULL bridge_greeting
    (connecting + "talk directly, I'll stay silent, say the wake phrase or
    wait for hangup when done") here, before dialing — not after pickup —
    since that's everything the driver needs to know, and it means the AI
    has nothing left to say once the call actually connects: no risk of it
    barging in on a conversation that started the moment the callee picked
    up. See BridgeCallAgent.on_enter(), which no longer speaks a greeting."""
    if mode == "bridge":
        return bridge_greeting(lang, name)
    return f"Đang gọi {name}, xin đợi trong giây lát." if lang == "vn" else f"Calling {name}, please hold on."


async def _announce_pre_dial(context: RunContext, name: str, lang: str, *, mode: str) -> None:
    """Speak the pre-dial announcement and wait for it to finish. `foreground()`
    is required here — a bare `session.say()` races with this same tool's own
    queued reply (the handoff message for agent/bridge mode, or this tool's own
    return string for background mode) and silently fails the whole tool call
    (confirmed: no exception ever reached the try/except around the dial, the
    tool just returned near-instantly with no call placed). Best-effort: any
    failure here must never block the actual call, so it's swallowed and
    logged rather than left to propagate.
    """
    try:
        async with context.foreground():
            await context.session.say(_pre_dial_announcement(name, lang, mode=mode), allow_interruptions=False)
    except Exception:
        logger.warning("pre-dial announcement failed — dialing anyway", exc_info=True)


def _save_call_context(
    context: RunContext,
    current: dict,
    result: dict,
    *,
    mode: str,
) -> None:
    call_id = str(result.get("call_id") or result.get("call_sid") or "")
    room_name = context.userdata.get("room_name", "")
    context.userdata["customer_call"] = {
        "call_id": call_id,
        "trip_id": current.get("trip_id", ""),
        "customer_phone": current.get("customer_phone", ""),
        "sip_identity": result.get("sip_identity", ""),
        "room_name": room_name,
        "mode": mode,
    }
    if mode == "bridge":
        context.userdata["bridge_call_active"] = True
        context.userdata["customer_call_active"] = False
        context.userdata["background_call_active"] = False
    elif mode == "background":
        context.userdata["background_call_active"] = True
        context.userdata["customer_call_active"] = False
        context.userdata["bridge_call_active"] = False
    else:
        context.userdata["customer_call_active"] = True
        context.userdata["bridge_call_active"] = False
        context.userdata["background_call_active"] = False

    if call_id:
        context_store.set_last_call(
            context.userdata,
            call_id,
            trip_id=current.get("trip_id", ""),
            mode=mode,
            status=result.get("status", "in_progress"),
        )


def _pause_silence(context: RunContext) -> None:
    tracker: SilenceTracker | None = context.userdata.get("_silence_tracker")
    if tracker:
        tracker.pause()


async def _dial_customer_in_room(
    context: RunContext,
    current: dict,
    *,
    lang: str,
    mode: str,
) -> dict | str:
    driver_phone = context.userdata.get("driver_phone", "")
    room_name = context.userdata.get("room_name", "")
    if not room_name:
        return _room_missing(lang)

    phone = current.get("customer_phone", "")
    name = current.get("customer_name", "khách" if lang == "vn" else "the customer")
    if not phone:
        return _phone_missing(name, lang)

    # Speak — and wait for it to finish — before dialing, so the driver
    # always hears "calling/connecting X" before the SIP INVITE (and its
    # network/telecom latency) starts, instead of the phone connecting in
    # silence.
    await _announce_pre_dial(context, name, lang, mode=mode)

    try:
        result = await backend_api.start_call(
            driver_id=driver_phone,
            customer_id=phone,
            trip_id=current.get("trip_id", ""),
            phone_number=phone,
            mode=mode,
            room_name=room_name,
        )
    except Exception:
        logger.error("in-room customer call — start_call failed | mode=%s", mode, exc_info=True)
        return _dial_failed(name, lang)

    _save_call_context(context, current, result, mode=mode)
    _pause_silence(context)
    return result


async def start_in_room_agent_call(
    context: RunContext,
    current: dict,
    *,
    lang: str,
) -> tuple[Agent, str] | str:
    """Dial customer via SIP and hand off to CustomerCallAgent."""
    result = await _dial_customer_in_room(context, current, lang=lang, mode="agent")
    if isinstance(result, str):
        return result

    name = current.get("customer_name", "khách" if lang == "vn" else "the customer")
    dialed = result.get("dialed_number", current.get("customer_phone", ""))
    note = result.get("override_note") or ""
    suffix = f" {note}" if note else ""

    profile = context_store.get(context.userdata, "profile") or {}
    agent = CustomerCallAgent(
        lang=lang,
        trip=current,
        customer_name=name,
        driver_name=profile.get("name", ""),
    )

    if lang == "en":
        msg = (
            f"Dialing {name} at {dialed} into this call.{suffix} "
            "You can listen live while I speak with the customer."
        )
    else:
        msg = (
            f"Đang gọi {name} tại {dialed} vào cuộc gọi này.{suffix} "
            "Anh/chị có thể nghe trực tiếp trong khi tôi nói chuyện với khách."
        )
    return agent, msg


async def start_in_room_bridge_call(
    context: RunContext,
    current: dict,
    *,
    lang: str,
) -> tuple[Agent, str] | str:
    """Dial customer via SIP and hand off to BridgeCallAgent (driver talks directly)."""
    result = await _dial_customer_in_room(context, current, lang=lang, mode="bridge")
    if isinstance(result, str):
        return result

    name = current.get("customer_name", "khách" if lang == "vn" else "the customer")
    dialed = result.get("dialed_number", current.get("customer_phone", ""))
    note = result.get("override_note") or ""
    suffix = f" {note}" if note else ""

    agent = BridgeCallAgent(lang=lang, customer_name=name)

    if lang == "en":
        msg = (
            f"Connecting {name} at {dialed} to this room.{suffix} "
            "When they answer, speak to them directly."
        )
    else:
        msg = (
            f"Đang kết nối {name} tại {dialed} vào phòng này.{suffix} "
            "Khi khách nghe máy, anh/chị nói trực tiếp với khách."
        )
    return agent, msg


async def start_background_call(
    context: RunContext,
    current: dict,
    *,
    lang: str,
) -> str:
    """AI calls customer in a separate room — driver keeps DriverAgent (no handoff)."""
    driver_phone = context.userdata.get("driver_phone", "")
    phone = current.get("customer_phone", "")
    name = current.get("customer_name", "khách" if lang == "vn" else "the customer")
    if not phone:
        return _phone_missing(name, lang)

    # Speak — and wait for it to finish — before dialing, so the driver
    # always hears "calling X" before the SIP INVITE (and its network/
    # telecom latency) starts, instead of the phone connecting in silence.
    await _announce_pre_dial(context, name, lang, mode="background")

    try:
        result = await backend_api.start_call(
            driver_id=driver_phone,
            customer_id=phone,
            trip_id=current.get("trip_id", ""),
            phone_number=phone,
            mode="background",
            # Not "the room to dial into" here (background calls always get
            # their own separate custcall-* room) — this is the driver's OWN
            # room, threaded through so the isolated call can push a data
            # message back into it once it ends, letting the driver's own
            # DriverAgent proactively announce the summary the moment it's
            # ready instead of only on request (see session.py's
            # "background_call_summary" data handler).
            room_name=context.userdata.get("room_name", ""),
            lang=lang,
            customer_name=name,
            pickup_address=current.get("pickup_address", ""),
        )
    except Exception:
        logger.error("background customer call — start_call failed", exc_info=True)
        return _dial_failed(name, lang)

    _save_call_context(context, current, result, mode="background")

    dialed = result.get("dialed_number", phone)
    note = result.get("override_note") or ""
    suffix = f" {note}" if note else ""

    if lang == "en":
        return (
            f"Calling {name} at {dialed} in the background.{suffix} "
            "You can keep asking me other questions. "
            "Say 'summarize the call' or 'is the call done?' when you want the result."
        )
    return (
        f"Đang gọi {name} tại {dialed} ở chế độ nền.{suffix} "
        "Anh/chị có thể hỏi việc khác. "
        "Khi cần biết kết quả, nói 'tóm tắt cuộc gọi' hoặc 'gọi xong chưa'."
    )
