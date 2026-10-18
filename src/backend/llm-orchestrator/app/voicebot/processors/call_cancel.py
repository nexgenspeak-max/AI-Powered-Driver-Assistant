"""Driver cancels an AI-placed customer call that is still ringing or live.

During an agent-mode call RoomIO is retargeted to the customer's SIP leg, so
neither the driver's voice nor the driver's chat reaches the agent (live
2026-10-18: a typed "Huỷ cuộc gọi" was ignored), and the app's button only
said "Không thể tắt trong lúc đang gọi". The app now sends
{"action": "cancel"} on the CALL_CONTROL_TOPIC data channel, which the agent
reads outside RoomIO. A typed cancel phrase still works in modes where chat
reaches the agent (bridge).
"""
from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger("llm-orchestrator.call_cancel")

_CANCEL_VN = re.compile(
    r"^\s*(thôi|hủy|huỷ|dừng|khỏi|cúp máy|tắt máy|ngắt máy)\b"
    r"|\b(hủy|huỷ|dừng|ngắt) cuộc gọi\b|\bkhông gọi nữa\b|\bđừng gọi\b|\bcúp máy\b",
    re.IGNORECASE,
)
_CANCEL_EN = re.compile(
    r"^\s*(stop|cancel|never mind|hang up)\b|\b(cancel|end|stop) (the )?call\b|\bhang up\b|\bdon'?t call\b",
    re.IGNORECASE,
)

CALL_CONTROL_TOPIC = "call_control"
CANCELLED_VN = "Mình đã dừng cuộc gọi theo yêu cầu của bạn."
CANCELLED_EN = "I stopped the call as you asked."


def is_cancel_request(text: str, lang: str = "vn") -> bool:
    pattern = _CANCEL_EN if lang == "en" else _CANCEL_VN
    return bool(pattern.search(text or ""))


def _call_in_progress(userdata: Any) -> bool:
    return isinstance(userdata, dict) and bool(
        userdata.get("customer_call_active") or userdata.get("bridge_call_active")
    )


async def maybe_cancel_active_call(session: Any, text: str, lang: str = "vn") -> bool:
    """True when a call was in progress and the driver's line cancelled it."""
    if not is_cancel_request(text, lang):
        return False
    return await cancel_active_call(session, lang)


async def cancel_active_call(session: Any, lang: str = "vn") -> bool:
    """Hang up the in-room customer call (ringing or live) and hand back."""
    userdata = getattr(session, "userdata", None)
    if not _call_in_progress(userdata):
        return False

    from app.voicebot.processors.agent_call_silence import cancel_agent_call_silence_watch
    from app.voicebot.processors.handback import disconnect_sip_participant, handback_to_driver
    from app.voicebot.processors.sip_call_watch import cancel_no_answer_watch

    mode = (userdata.get("customer_call") or {}).get("mode", "agent")
    if userdata.get("bridge_call_active"):
        mode = "bridge"
    summary = CANCELLED_EN if lang == "en" else CANCELLED_VN
    cancel_no_answer_watch(userdata)
    cancel_agent_call_silence_watch(userdata)
    # Hand back first: it clears the call flags, so the participant_disconnected
    # caused by the hang-up below is ignored instead of reporting "no answer".
    await handback_to_driver(
        session, userdata, summary, mode=mode, silence_tracker=userdata.get("_silence_tracker"),
    )
    try:
        await disconnect_sip_participant(userdata)
    except Exception:
        logger.warning("cancel: SIP hang-up failed", exc_info=True)
    logger.info("customer call cancelled by driver | mode=%s", mode)
    return True
