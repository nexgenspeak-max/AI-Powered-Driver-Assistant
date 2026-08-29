"""When the bot promises an action, confirm utterances must execute it — not ack."""
from __future__ import annotations

import logging
import re
import unicodedata
from typing import Any

from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.pending_action")

_CHECK_BOT_VN = (
    "em kiểm tra",
    "kiểm tra lịch",
    "kiểm tra ngay",
    "kiểm tra chuyến",
    "check the schedule",
    "let me check",
    "i'll check",
)
_CALL_BOT_VN = (
    "em nhắn khách",
    "nhắn khách",
    "em gọi",
    "gọi khách",
    "gọi ngay",
    "gọi hộ",
    "i'll call",
    "i'll message",
    "call the customer",
)
_CONFIRM_VN = ("ok", "okay", "vâng", "dạ", "đúng rồi", "đúng", "ừ", "uh", "được", "yes", "yeah")
_EXECUTE_NUDGE_VN = (
    "gọi đi",
    "làm đi",
    "thì gọi",
    "gọi ngay",
    "làm ngay",
    "sao không làm",
    "sao không gọi",
    "hiểu rồi sao không",
    "kiểm tra đi",
    "kiểm tra ngay",
    "thì làm",
)
_DRIVER_CALL_VN = ("báo khách", "bảo khách", "nhắn khách", "gọi hộ", "ai gọi hộ")


def _norm(text: str) -> str:
    folded = unicodedata.normalize("NFC", text).lower().strip()
    folded = folded.replace("'", "").replace("'", "")
    folded = re.sub(r"[.!?…,;:“”]+", " ", folded)
    return re.sub(r"\s+", " ", folded).strip()


def _extract_call_message(text: str) -> str:
    raw = (text or "").strip()
    lowered = raw.lower()
    for sep in (
        "nhắn khách là",
        "báo khách là",
        "bảo khách là",
        "nhắn khách rằng",
        "báo khách rằng",
        "nhắn khách",
        "báo khách",
        "bảo khách",
        "gọi khách",
    ):
        idx = lowered.find(sep)
        if idx < 0:
            continue
        msg = raw[idx + len(sep):].strip()
        if msg.lower().startswith("là "):
            msg = msg[3:].strip()
        if msg.lower().startswith("rằng "):
            msg = msg[5:].strip()
        if msg:
            return msg
    m = re.search(r"(sau\s+\d+\s+phút[^.!?]*)", lowered)
    if m:
        return m.group(1).strip().capitalize()
    return ""


def _check_upcoming_args(userdata: dict) -> dict:
    last = context_store.get_last_driver_utterance(userdata)
    if last:
        context_store.match_callable_trip_by_text(userdata, last)
    idx = context_store.get_target_trip_index(userdata)
    if idx is not None:
        return {"scope": "all", "trip_index": idx}
    return {"scope": "all"}


def _call_customer_args(userdata: dict, *, message: str = "", utterance: str = "") -> dict:
    from app.voicebot.processors.spoken_intent import call_tool_arguments

    base = utterance or context_store.get_last_driver_utterance(userdata) or message
    args = call_tool_arguments(base, lang="vn", userdata=userdata)
    if message and not args.get("message"):
        args["message"] = message
    if args.get("message") and args.get("mode") != "bridge":
        args["mode"] = "agent"
    if "mode" not in args:
        args["mode"] = "agent"
    return args


def infer_from_bot_line(text: str, userdata: dict, *, lang: str = "vn") -> None:
    """Remember promised tool work when the assistant speaks intent without calling."""
    t = _norm(text)
    if not t:
        return
    if any(p in t for p in _CHECK_BOT_VN):
        args = _check_upcoming_args(userdata)
        context_store.set_pending_driver_action(
            userdata, "upcoming", args, source=text[:120]
        )
        logger.info("pending_action set intent=upcoming trip_index=%s", args.get("trip_index"))
        return
    if any(p in t for p in _CALL_BOT_VN):
        message = _extract_call_message(text)
        args = _call_customer_args(userdata, message=message)
        context_store.set_pending_driver_action(
            userdata, "call_customer", args, source=text[:120]
        )
        logger.info("pending_action set intent=call_customer message=%s", bool(message))


def infer_from_driver_utterance(text: str, userdata: dict, *, lang: str = "vn") -> None:
    """Driver asked to message/call customer — execute on confirm even if LLM only promised."""
    if lang != "vn":
        return
    t = _norm(text)
    if not any(p in t for p in _DRIVER_CALL_VN):
        return
    args = _call_customer_args(userdata, utterance=text)
    context_store.set_pending_driver_action(
        userdata, "call_customer", args, source=text[:120]
    )
    logger.info("pending_action set from driver intent=call_customer")


def is_action_confirm(text: str, lang: str) -> bool:
    t = _norm(text)
    if not t:
        return False
    if lang == "vn" and any(p in t for p in _EXECUTE_NUDGE_VN):
        return True
    if "?" in text or len(t) > 28:
        return False
    if any(p in t for p in ("sao ", "tại sao", "bực", "nhỉ", "thế nhỉ")):
        return False
    if t in _CONFIRM_VN:
        return True
    return any(t == p or t.startswith(f"{p} ") for p in _CONFIRM_VN)


def should_execute(userdata: dict, text: str, lang: str) -> bool:
    pending = context_store.get_pending_driver_action(userdata)
    if not pending:
        return False
    return is_action_confirm(text, lang)


def has_pending(userdata: dict) -> bool:
    return context_store.get_pending_driver_action(userdata) is not None
