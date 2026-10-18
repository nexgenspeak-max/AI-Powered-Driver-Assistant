"""When the bot promises an action, confirm utterances must execute it — not ack."""
from __future__ import annotations

import logging
import re
import time
import unicodedata
from typing import Any

from app.voicebot.processors import context_store

logger = logging.getLogger("llm-orchestrator.pending_action")

_CHECK_BOT_VN = (
    "em kiểm tra",
    "để em kiểm tra",
    "em kiểm tra lại",
    "kiểm tra lịch",
    "kiểm tra ngay",
    "kiểm tra chuyến",
    "kiểm tra lại",
    "check the schedule",
    "let me check",
    "i'll check",
)
# Orphaned delivery promises must not arm upcoming (legacy LLM lines).
_ORPHAN_DELIVERY_BOT = (
    "đơn hàng",
    "đơn giao",
    "delivery order",
    "delivery orders",
)
_CHECK_EARNINGS_BOT = (
    "thu nhập",
    "doanh thu",
    "earnings",
    "theo tháng",
    "theo tuần",
    "tháng vừa rồi",
    "tháng này",
    "tuần này",
    "tuần vừa rồi",
)
# A pending action answers the bot's *last* line only. Older than this, or
# once the driver has said anything that is not a yes/no, it is dropped —
# live 2026-10-18: a call armed by a menu question survived a whole traffic
# exchange and the driver's "Ok." about traffic dialled the customer.
PENDING_TTL_S = 30.0

_CALL_BOT_VN = (
    "mình gọi",
    "mình nhắn khách",
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
    "gọi hộ đi",
    "gọi hộ",
    "hộ đi",
    "bạn gọi hộ",
    "bạn gọi",
    "làm đi",
    "thì gọi",
    "gọi ngay",
    "làm ngay",
    "sao không làm",
    "sao không gọi",
    "hiểu rồi sao không",
    "kiểm tra đi",
    "kiểm tra ngay",
    "kiểm tra lại",
    "thế kiểm tra",
    "xem nào",
    "làm chưa",
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


def _call_in_progress(userdata: dict) -> bool:
    """Sub-call active — bot lines are customer-call AI, not driver-assistant promises."""
    return bool(
        userdata.get("customer_call_active")
        or userdata.get("bridge_call_active")
        or userdata.get("background_call_active")
    )


def _call_customer_args(userdata: dict, *, message: str = "", utterance: str = "") -> dict:
    from app.voicebot.processors.spoken_intent import call_tool_arguments

    base = utterance or context_store.get_last_driver_utterance(userdata) or message
    args = call_tool_arguments(base, lang="vn", userdata=userdata)
    if message and not args.get("message"):
        args["message"] = message
    if args.get("message") and args.get("mode") != "bridge":
        args["mode"] = "agent"
    return args


def infer_from_bot_line(text: str, userdata: dict, *, lang: str = "vn") -> None:
    """Remember promised tool work when the assistant speaks intent without calling."""
    if _call_in_progress(userdata):
        return
    t = _norm(text)
    if not t:
        return
    # The system's own "Đang gọi {name}, xin đợi trong giây lát." dial
    # announcement (customer_call.py / contact_call.py) is spoken right as
    # a call is starting — `_call_in_progress` can still read False at that
    # exact instant, and a generic "Khách <địa điểm>" placeholder name makes
    # this line literally contain "gọi khách", matching _CALL_BOT_VN below.
    # Live session 2026-09-06: that false match set a second stale
    # call_customer pending action, replayed by the driver's next plain
    # "Ok" and placing an unwanted second real call. This is a status
    # announcement, never a promise — never infer a pending action from it.
    if "xin đợi trong giây lát" in t or "please hold on" in t:
        return
    if any(p in t for p in _CHECK_BOT_VN):
        # Prefer specific domains over generic "upcoming" — live session
        # 7937d495: "Em kiểm tra đơn hàng…" wrongly pending upcoming trip_index=2.
        # Delivery tools are removed; do not arm any pending on orphan delivery promises.
        if any(p in t for p in _ORPHAN_DELIVERY_BOT):
            return
        if any(p in t for p in _CHECK_EARNINGS_BOT):
            from app.voicebot.processors.spoken_intent import _earnings_period_from_text

            period = _earnings_period_from_text(text, lang)
            if period == "lifetime":
                period = "month"
            context_store.set_pending_driver_action(
                userdata,
                "earnings",
                {"period": period},
                source=text[:120],
            )
            logger.info("pending_action set intent=earnings period=%s", period)
            return
        args = _check_upcoming_args(userdata)
        context_store.set_pending_driver_action(
            userdata, "upcoming", args, source=text[:120]
        )
        logger.info("pending_action set intent=upcoming trip_index=%s", args.get("trip_index"))
        return
    if any(p in t for p in _CALL_BOT_VN):
        existing = context_store.get_pending_driver_action(userdata)
        if existing and existing.get("intent") == "call_customer" and _age_s(existing) < 3.0:
            # call_intent.ask_before_calling already armed the exact call
            # this question describes (with its trip_index) — keep it.
            return
        is_question = "?" in text
        if is_question and " hay " in f" {t} ":
            # A menu ("xem chuyến hay gọi khách?") is not a promise to call.
            return
        # Never lift a "message for the customer" out of a question.
        message = "" if is_question else _extract_call_message(text)
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
    if t in ("có", "co"):
        return True
    if t in _CONFIRM_VN:
        return True
    return any(t == p or t.startswith(f"{p} ") for p in _CONFIRM_VN)


def is_action_decline(text: str, lang: str) -> bool:
    t = _norm(text)
    if not t or len(t) > 20:
        return False
    if lang == "en":
        return t in ("no", "nope", "dont", "cancel that") or t.startswith("no ")
    return t in ("không", "khong", "thôi", "đừng", "dung") or t.startswith("không ")


def _age_s(pending: dict) -> float:
    at = pending.get("at")
    if not isinstance(at, (int, float)):
        return 0.0
    return max(0.0, time.monotonic() - float(at))


def expire_stale(userdata: dict, text: str, lang: str) -> bool:
    """Drop a pending action the driver's new turn does not answer.

    Called at the START of each driver turn, before this turn may arm a new
    pending (infer_from_driver_utterance). Returns True when one was dropped.
    """
    pending = context_store.get_pending_driver_action(userdata)
    if not pending:
        return False
    too_old = _age_s(pending) > PENDING_TTL_S
    answers_it = is_action_confirm(text, lang) or is_action_decline(text, lang)
    if too_old or not answers_it:
        context_store.clear_pending_driver_action(userdata)
        logger.info(
            "pending_action expired intent=%s reason=%s",
            pending.get("intent"),
            "ttl" if too_old else "topic_changed",
        )
        return True
    return False


def should_execute(userdata: dict, text: str, lang: str) -> bool:
    pending = context_store.get_pending_driver_action(userdata)
    if not pending:
        return False
    if _age_s(pending) > PENDING_TTL_S:
        return False
    return is_action_confirm(text, lang)


def has_pending(userdata: dict) -> bool:
    return context_store.get_pending_driver_action(userdata) is not None
