"""LiveKit in-room customer calls — agent mode, bridge mode, shared dial."""
from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING

from livekit.agents import Agent, RunContext

from app.services import backend_api
from app.voicebot.bridge_call_agent import BridgeCallAgent
from app.voicebot.customer_call_agent import CustomerCallAgent
from app.voicebot.processors import context_store
from app.voicebot.processors.custom_call import normalize_vn_phone
from app.voicebot.processors.pre_dial import announce_pre_dial
from app.voicebot.processors.sip_call_watch import schedule_no_answer_watch
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


def _self_call_blocked(name: str, lang: str) -> str:
    return (
        f"Số của {name} trên chuyến trùng số tài xế — không gọi được. Kiểm tra lại số khách trên ứng dụng."
        if lang == "vn"
        else f"{name}'s trip phone matches the driver's number — cannot place the call. Check the customer phone in the app."
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
    """Speak before SIP dial. Uses foreground() when available (real RunContext)."""
    await announce_pre_dial(context, _pre_dial_announcement(name, lang, mode=mode))


def _save_call_context(
    context: RunContext,
    current: dict,
    result: dict,
    *,
    mode: str,
) -> None:
    call_id = str(result.get("call_id") or result.get("call_sid") or "")
    room_name = context.userdata.get("room_name", "")
    conv_service = context.userdata.get("_conv_service")
    # Fresh dial — clear sticky pickup from a prior leg in this session.
    context.userdata["_sip_leg_answered"] = False
    context.userdata["customer_call"] = {
        "call_id": call_id,
        "trip_id": current.get("trip_id", ""),
        "customer_phone": current.get("customer_phone", ""),
        "customer_name": current.get("customer_name", ""),
        "sip_identity": result.get("sip_identity", ""),
        "room_name": room_name,
        "mode": mode,
        # Checkpoint into conv_service.turns — agent/bridge mode dials the
        # SIP leg straight into the driver's own room, so without this
        # marker there'd be no way to tell which turns belong to THIS
        # sub-call when it ends (see ConversationService.save_subcall).
        # Not used for background mode (that gets its own isolated room and
        # persists independently), but harmless to set either way.
        "turns_from": len(conv_service.turns) if conv_service else 0,
    }
    if mode == "agent":
        # Reset — _customer_spoke is session-wide (session.py's
        # conversation_item_added/user_input_transcribed handlers), so
        # without this it could already be True just from the DRIVER talking
        # earlier in the session, making it useless for "has the CUSTOMER
        # said anything yet THIS call". Safe to clear here: RoomIO gets
        # retargeted to the customer's SIP identity a few lines below, so
        # every transcript event from this point until handback genuinely is
        # the customer, not the driver.
        context.userdata["_customer_spoke"] = False
        # Same reset, for the ring-time gate (session.py's agent_state_changed
        # handler / end_customer_call's silence backstop) — without this, a
        # SECOND agent-mode call later in the same session would inherit
        # _agent_call_answered=True from the first one and start counting
        # "quiet time" during the new call's ringing too.
        context.userdata["_agent_call_answered"] = False
        context.userdata["_agent_call_quiet_since"] = None
        # Agent mode: the AI is meant to actually converse WITH the customer,
        # but RoomIO links its STT input to exactly one participant, resolved
        # once at session start — the driver, since they joined the room
        # first. Dialing the customer's SIP leg into the same room does NOT
        # make RoomIO switch to listening to them (see
        # RoomIO._on_participant_connected: it no-ops once already linked),
        # so without this the AI's STT stays locked on the driver's mic for
        # the whole customer call and never hears a word the customer says.
        # Explicitly retarget it here, and restore it back to the driver on
        # handback (see handback.py::restore_room_participant) — bridge mode
        # deliberately does NOT do this, since there the AI should keep
        # listening to the DRIVER for a wake phrase while driver and customer
        # talk to each other directly over room audio.
        room_io = context.session.room_io
        linked = room_io.linked_participant
        if linked:
            context.userdata["customer_call"]["_driver_room_identity"] = linked.identity
        sip_identity = result.get("sip_identity", "")
        if sip_identity:
            room_io.set_participant(sip_identity)

        from app.voicebot.processors.agent_call_silence import schedule_agent_call_silence_watch

        schedule_agent_call_silence_watch(context.session, context.userdata)

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

    context.userdata["_dial_started_at"] = time.time()
    schedule_no_answer_watch(context.session, context.userdata)


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

    # Live 2026-09-05: NexGen Speak trip had customer_phone == driver_phone
    # (0888887798). Dialing that number loops the driver into their own SIP
    # leg, AI "talks to customer", then hangup reports confusing summaries.
    driver_norm = normalize_vn_phone(driver_phone)
    customer_norm = normalize_vn_phone(phone)
    if driver_norm and customer_norm and driver_norm == customer_norm:
        logger.warning(
            "refusing self-call | driver=%s customer=%s trip=%s",
            driver_norm,
            customer_norm,
            current.get("trip_id", ""),
        )
        return _self_call_blocked(name, lang)

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
    custom_message: str = "",
) -> tuple[Agent, str] | str:
    """Dial customer via SIP and hand off to CustomerCallAgent.

    `custom_message` — when set, CustomerCallAgent delivers this EXACT line
    to the customer before anything else (see its own `_custom_message`
    branch) instead of its generic trip-aware greeting. Used for calls that
    have a specific reason the customer must hear first — e.g. the driver
    agreeing to a proximity nudge ("mời khách ra điểm đón") — so the AI
    states the purpose of the call before letting the conversation continue.
    """
    result = await _dial_customer_in_room(context, current, lang=lang, mode="agent")
    if isinstance(result, str):
        return result

    name = current.get("customer_name", "khách" if lang == "vn" else "the customer")

    profile = context_store.get(context.userdata, "profile") or {}
    agent = CustomerCallAgent(
        lang=lang,
        trip=current,
        customer_name=name,
        driver_name=profile.get("name", ""),
        custom_message=custom_message,
    )

    # No extra ad-libbed line here (unlike the old `msg`, which handed the LLM
    # free text like "you can listen live" to paraphrase on its own — not
    # actual scripted content). _announce_pre_dial already spoke the one
    # scripted line ("Đang gọi X, xin đợi trong giây lát") before the dial
    # above; same principle as bridge mode (see _pre_dial_announcement's
    # docstring): nothing left for the AI to improvise once the call connects.
    return agent, ""


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
            "Khi khách nghe máy, bạn nói trực tiếp với khách."
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
        "Bạn có thể hỏi việc khác. "
        "Khi cần biết kết quả, nói 'tóm tắt cuộc gọi' hoặc 'gọi xong chưa'."
    )
