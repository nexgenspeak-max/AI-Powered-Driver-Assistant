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


async def start_bridge_call_to_number(
    context: RunContext,
    phone_number: str,
    *,
    contact_name: str = "",
    lang: str = "vn",
) -> tuple[Agent, str] | str:
    """Dial an arbitrary number via SIP and hand off to BridgeCallAgent (driver talks directly)."""
    driver_phone = context.userdata.get("driver_phone", "")
    room_name = context.userdata.get("room_name", "")
    if not room_name:
        return _room_missing(lang)

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
        logger.error("custom number bridge call — start_call failed", exc_info=True)
        return _dial_failed(lang)

    call_id = str(result.get("call_id") or "")
    context.userdata["customer_call"] = {
        "call_id": call_id,
        "trip_id": "",
        "sip_identity": result.get("sip_identity", ""),
        "room_name": room_name,
        "mode": "bridge",
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
    display_name = contact_name or ("số bạn yêu cầu" if lang == "vn" else "the number you requested")

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
