"""LiveKit in-room bridge call to an arbitrary phone number the driver reads out loud.

Kept separate from customer_call.py because the target isn't tied to a trip. The
entry point (start_bridge_call_to_number) takes a bare phone_number + optional
display name, so a future "call from contacts" tool can resolve a saved contact's
name to a phone_number and hand off to the same function instead of duplicating
the dial/hand-off logic.
"""
from __future__ import annotations

import logging
import re

from livekit.agents import Agent, RunContext

from app.services import backend_api
from app.voicebot.bridge_call_agent import BridgeCallAgent
from app.voicebot.prompts.bridge_call import bridge_greeting

logger = logging.getLogger("voice-agent.processors.custom_call")

MAX_CUSTOM_CALLS_PER_SESSION = 3

_NON_DIGITS_RE = re.compile(r"\D+")
_HOTLINE_PREFIXES = ("1900", "1800")


def normalize_vn_phone(raw: str) -> str:
    """Strip formatting and fold +84/84 prefixes to the local 0-prefixed form."""
    digits = _NON_DIGITS_RE.sub("", raw or "")
    if digits.startswith("840"):
        return digits[2:]
    if digits.startswith("84"):
        return "0" + digits[2:]
    return digits


def is_valid_vn_phone(raw: str) -> bool:
    """Loose validation — just enough to catch STT garbage, not full telecom rules."""
    digits = normalize_vn_phone(raw)
    if digits.startswith(_HOTLINE_PREFIXES):
        return 7 <= len(digits) <= 11
    return digits.startswith("0") and 9 <= len(digits) <= 11


def format_for_speech(digits: str) -> str:
    """Group digits so the confirmation prompt reads naturally, e.g. '0912 345 678'."""
    if len(digits) >= 10:
        return f"{digits[:4]} {digits[4:7]} {digits[7:]}"
    return digits


def _room_missing(lang: str) -> str:
    return "Không tìm thấy phòng LiveKit." if lang == "vn" else "LiveKit room not found."


def _dial_failed(lang: str) -> str:
    return (
        "Không thể thực hiện cuộc gọi lúc này. Kiểm tra trip-service (:8002) và SIP_TRUNK_ID."
        if lang == "vn"
        else "Unable to place the call right now. Check trip-service (:8002) and SIP_TRUNK_ID."
    )


def _pre_dial_announcement(name: str, lang: str) -> str:
    # Always bridge mode here (see module docstring) — say the FULL
    # bridge_greeting (connecting + "talk directly, I'll stay silent, say the
    # wake phrase or wait for hangup when done") before dialing, not after
    # pickup, so the AI has nothing left to say once the call actually
    # connects. See BridgeCallAgent.on_enter(), which no longer speaks a
    # greeting.
    return bridge_greeting(lang, name)


async def _announce_pre_dial(context: RunContext, name: str, lang: str) -> None:
    """Speak the pre-dial announcement and wait for it to finish. `foreground()`
    is required here — a bare `session.say()` races with this same tool's own
    queued reply (the handoff message returned below) and silently fails the
    whole tool call (confirmed: no exception ever reached the try/except around
    the dial, the tool just returned near-instantly with no call placed).
    Best-effort: any failure here must never block the actual call, so it's
    swallowed and logged rather than left to propagate.
    """
    logger.info("DIAL-TRACE custom_call: entering _announce_pre_dial for %r", name)
    try:
        async with context.foreground():
            logger.info("DIAL-TRACE custom_call: inside foreground, about to say")
            await context.session.say(_pre_dial_announcement(name, lang), allow_interruptions=False)
            logger.info("DIAL-TRACE custom_call: say() returned")
    except Exception:
        logger.warning("DIAL-TRACE custom_call: pre-dial announcement failed — dialing anyway", exc_info=True)
    logger.info("DIAL-TRACE custom_call: leaving _announce_pre_dial")


async def start_bridge_call_to_number(
    context: RunContext,
    phone_number: str,
    *,
    contact_name: str = "",
    lang: str = "vn",
) -> tuple[Agent, str] | str:
    """Dial an arbitrary number via SIP and hand off to BridgeCallAgent (driver talks directly)."""
    logger.info("DIAL-TRACE custom_call: start_bridge_call_to_number entered | phone=%s contact_name=%r", phone_number, contact_name)
    driver_phone = context.userdata.get("driver_phone", "")
    room_name = context.userdata.get("room_name", "")
    if not room_name:
        logger.warning("DIAL-TRACE custom_call: room_name missing, bailing")
        return _room_missing(lang)

    display_name = contact_name or ("số bạn yêu cầu" if lang == "vn" else "the number you requested")

    # Speak — and wait for it to finish — before dialing, so the driver
    # always hears "connecting X" before the SIP INVITE (and its network/
    # telecom latency) starts, instead of the phone connecting in silence.
    await _announce_pre_dial(context, display_name, lang)

    logger.info("DIAL-TRACE custom_call: calling backend_api.start_call now")
    try:
        result = await backend_api.start_call(
            driver_id=driver_phone,
            customer_id=phone_number,
            trip_id="",
            phone_number=phone_number,
            mode="bridge",
            room_name=room_name,
            lang=lang,
        )
    except Exception:
        logger.error("DIAL-TRACE custom_call: start_call failed", exc_info=True)
        return _dial_failed(lang)
    logger.info("DIAL-TRACE custom_call: start_call returned result=%r", result)

    call_id = str(result.get("call_id") or "")
    conv_service = context.userdata.get("_conv_service")
    context.userdata["customer_call"] = {
        "call_id": call_id,
        "trip_id": "",
        "customer_phone": phone_number,
        "sip_identity": result.get("sip_identity", ""),
        "room_name": room_name,
        "mode": "bridge",
        # Checkpoint into conv_service.turns — see
        # customer_call.py::_save_call_context for why this is needed.
        "turns_from": len(conv_service.turns) if conv_service else 0,
    }
    context.userdata["bridge_call_active"] = True
    context.userdata["customer_call_active"] = False
    context.userdata["background_call_active"] = False

    tracker = context.userdata.get("_silence_tracker")
    if tracker:
        tracker.pause()

    dialed = result.get("dialed_number", phone_number)
    note = result.get("override_note") or ""
    suffix = f" {note}" if note else ""

    agent = BridgeCallAgent(lang=lang, customer_name=display_name)

    if lang == "en":
        msg = (
            f"Connecting {display_name} at {dialed} to this room.{suffix} "
            "When they answer, speak to them directly."
        )
    else:
        msg = (
            f"Đang kết nối {display_name} tại {dialed} vào phòng này.{suffix} "
            "Khi đầu dây bên kia nghe máy, anh/chị nói trực tiếp."
        )
    return agent, msg
