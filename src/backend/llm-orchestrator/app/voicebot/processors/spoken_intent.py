"""Driver turn helpers — intent classify + pending_action safety.

Turn UX is **one path**: always LLM with context + tool schema. Spoken-intent
auto-tool execution is gated off (``SPOKEN_INTENT_AUTO_TOOL``); late audio uses
``turn_filler`` against the 2s speech-to-first-audio bar (NFR-P01).

``pending_action`` confirmations for promised destructive work stay here — that
is tool-flow safety, not a third UX path. Reject wins over confirm in classify.
"""
from __future__ import annotations

import asyncio
import logging
import re
import unicodedata
from types import SimpleNamespace
from typing import Any, Literal

from livekit.agents import Agent, NOT_GIVEN, StopResponse
from livekit.agents.utils import is_given

from app.agent.turn_metrics import mark_user_stopped
from app.devlog import event
from app.voicebot.processors import context_store
from app.voicebot.processors.chat_window import MAX_CHAT_ITEMS, cap_chat_context
from app.voicebot.processors.conversational_ack import conversational_ack_reply
from app.voicebot.processors.driving_advice import driving_advice_reply
from app.voicebot.processors import pending_action
from app.voicebot.processors.trip_format import format_primary_customer_phone
from app.voicebot.processors.turn_filler import schedule_turn_filler

# Off: one LLM+tools path. Set True only for emergency rollback to auto-tool.
SPOKEN_INTENT_AUTO_TOOL = False

logger = logging.getLogger("llm-orchestrator.spoken_intent")

Intent = Literal[
    "confirm",
    "reject",
    "call_customer",
    "upcoming",
    "current",
    "customer_phone",
    "earnings",
    "trip_history",
    "driving_advice",
    "conversational_ack",
    "end_conversation",
    "trip_lookup",
]

_CONFIRM_VN = (
    "xác nhận nhận chuyến",
    "xác nhận nhận",
    "nhận chuyến",
    "đồng ý nhận",
)
_CONFIRM_EXACT_VN = frozenset({"xác nhận", "confirm", "xác nhận đi", "xác nhận nhé", "xác nhận nha"})
# "xác nhận chuyến sắp tới" is schedule talk, not accept-offer.
_CONFIRM_NOT_VN = ("sắp tới", "đang chạy", "xem chuyến", "chuyến nào", "mấy chuyến")
_REJECT_VN = (
    "từ chối chuyến",
    "từ chối nhận",
    "không nhận chuyến",
    "không nhận",
    "không muốn nhận",
    "tôi bận",
    "từ chối",
)
_CALL_VN = (
    "gọi khách",
    "gọi cho khách",
    "gọi giúp",
    "nhấc máy gọi",
    "nói chuyện với khách",
)
_PHONE_VN = (
    "số điện thoại khách",
    "số của khách",
    "số khách",
    "đọc số khách",
    "số điện thoại",
)
_PHONE_EN = (
    "customer number",
    "customers number",
    "customer phone",
    "rider number",
    "riders number",
    "rider phone",
    "whats the number",
)
_UPCOMING_VN = (
    "chuyến sắp tới",
    "các chuyến sắp",
    "có chuyến nào",
    "danh sách chuyến",
    "lịch chuyến",
    "lịch trình",
    "lịch hôm nay",
    "kiểm tra trình",
    "kiểm tra lịch",
    "xem lịch",
    "xem trình",
    "chuyến tiếp theo",
    "mấy chuyến",
    "bao nhiêu chuyến",
    "có bao nhiêu chuyến",
)
_END_VN = (
    "tắt máy",
    "tắt trợ lý",
    "tắt đi",
    "tạm biệt",
    "kết thúc trợ lý",
    "kết thúc cuộc",
    "thôi tắt",
    "dừng lại nhé",
    "dừng lại đi",
)
_END_EN = (
    "goodbye",
    "hang up",
    "end the session",
    "end session",
    "that's all",
    "thats all",
    "turn off",
)
_TRIP_IDENTITY_VN = (
    "chuyến nào",
    "khách nào",
    "là ai",
    "là chuyến gì",
    "khách đấy",
    "khách đó",
    "họ là ai",
    "khách nào nhỉ",
)
_EARNINGS_VN = (
    "thu nhập",
    "kiếm được",
    "kiếm bao nhiêu",
    "thu nhập hôm nay",
    "doanh thu",
)
_EARNINGS_EN = ("earnings", "how much did i make", "today's earnings", "how much i made")
# Period-only follow-ups after an earnings answer ("trong tháng vừa rồi mà").
_EARNINGS_PERIOD_FOLLOWUP_VN = (
    "tháng vừa rồi",
    "tháng vừa qua",
    "tháng trước",
    "tháng rồi",
    "theo tháng",
    "trong tháng",
    "tuần vừa rồi",
    "tuần vừa qua",
    "tuần trước",
    "tuần rồi",
    "theo tuần",
    "trong tuần",
    # Unsupported periods — still classify as earnings so we speak the limit, not LLM invent.
    "toàn bộ",
    "từ trước đến giờ",
    "từ trước đến nay",
    "năm qua",
    "một năm",
    "1 năm",
    "cả năm",
)
_EARNINGS_PERIOD_FOLLOWUP_EN = (
    "last month",
    "this month",
    "past month",
    "last week",
    "this week",
    "past week",
    "all time",
    "all-time",
    "lifetime",
    "past year",
    "last year",
)
_EARNINGS_LIFETIME_VN = (
    "từ trước",
    "từ đầu",
    "tổng đời",
    "tổng doanh thu từ",
    "từ khi bắt đầu",
    "toàn bộ",
    "tổng thu nhập",
    "tất cả thu nhập",
    "năm qua",
    "một năm",
    "1 năm",
    "cả năm",
)
_EARNINGS_LIFETIME_EN = (
    "all time",
    "all-time",
    "alltime",
    "lifetime",
    "since i started",
    "total ever",
    "all earnings",
    "past year",
    "last year",
    "one year",
)
# Income split questions that mention giao hàng must still classify as earnings.
_EARNINGS_SPLIT_VN = (
    "chở khách",
    "bao nhiêu đến từ",
    "bao nhiêu từ",
    "từ giao hàng",
    "từ đơn giao",
    "từ đơn hàng",
)
_EARNINGS_SPLIT_EN = (
    "from deliveries",
    "from delivery",
    "from rides",
    "passenger vs",
    "delivery vs",
)
_CURRENT_VN = (
    "chuyến hiện tại",
    "chuyến đang chạy",
    "chuyến hiện giờ",
    "chuyến hiện tại của tôi",
)

_CONFIRM_EN = (
    "confirm the trip",
    "confirm trip",
    "accept the trip",
    "i'll take it",
    "ill take it",
    "i will take it",
)
_REJECT_EN = (
    "reject the trip",
    "reject trip",
    "decline the trip",
    "i won't take it",
    "do not take it",
)
_CALL_EN = ("call the customer", "call customer", "phone the customer")
_UPCOMING_EN = ("upcoming trips", "my trips", "what trips", "how many trips")

_CURRENT_EN = ("current trip", "this trip", "active trip")

_CONFIRM_BLOCK_VN = ("chưa xác nhận", "không xác nhận", "hủy xác nhận")
_CONFIRM_BLOCK_EN = ("dont confirm", "do not confirm", "not confirming")

# Plain substring matching above fires on the trigger phrase regardless of a
# negation/hedge word anywhere else in the utterance — "tôi không muốn nhận
# chuyến này đâu" (rejecting) still contains "nhận chuyến" and used to
# fast-path straight to 'confirm', the opposite of what the driver said.
# "đừng gọi khách nữa" / "khỏi cần gọi khách" similarly fired call_customer,
# and "tôi có nên nhận chuyến này không" (asking for advice, not accepting)
# fired confirm too — Vietnamese yes/no questions end in "không". None of
# these are unambiguous, so when a negation/hedge marker is present the
# confirm/call/phone-lookup fast paths must bail to the full LLM instead of
# committing to a polarity guessed from a bare substring match.
_NEGATION_GUARD_VN = ("không", "đừng", "khỏi", "chưa", "hông")
_NEGATION_GUARD_EN = ("don't", "dont", "do not", "not ", "no need", "stop ", "never")


def _looks_negated(t: str, lang: str) -> bool:
    markers = _NEGATION_GUARD_EN if lang == "en" else _NEGATION_GUARD_VN
    return any(m in t for m in markers)


def _earnings_period_from_text(text: str, lang: str) -> str:
    """Return today | week | month | lifetime for earnings fast-path routing."""
    t = _norm(text)
    if lang == "en":
        if any(p in t for p in _EARNINGS_LIFETIME_EN):
            return "lifetime"
        if any(
            p in t
            for p in (
                "this month",
                "past month",
                "last month",
                "last 30",
                "monthly",
                "previous month",
            )
        ):
            return "month"
        if any(p in t for p in ("this week", "past week", "last week", "last 7", "weekly")):
            return "week"
        return "today"
    if any(p in t for p in _EARNINGS_LIFETIME_VN):
        return "lifetime"
    # "tháng vừa rồi" must be listed — "tháng rồi" is NOT a substring of it.
    if any(
        p in t
        for p in (
            "tháng vừa rồi",
            "tháng vừa qua",
            "tháng trước",
            "tháng này",
            "tháng rồi",
            "30 ngày",
            "cả tháng",
            "theo tháng",
        )
    ):
        return "month"
    if any(
        p in t
        for p in (
            "tuần vừa rồi",
            "tuần vừa qua",
            "tuần trước",
            "tuần này",
            "tuần rồi",
            "7 ngày",
            "cả tuần",
            "theo tuần",
        )
    ):
        return "week"
    return "today"


def _is_earnings_split_query(t: str, lang: str) -> bool:
    """Earnings + ride/delivery split phrasing → still earnings (no delivery tools)."""
    if lang == "en":
        if not any(p in t for p in _EARNINGS_EN):
            return False
        return any(p in t for p in _EARNINGS_SPLIT_EN)
    if not any(p in t for p in _EARNINGS_VN):
        return False
    return any(p in t for p in _EARNINGS_SPLIT_VN)


def _is_cancelled_history(text: str, lang: str) -> bool:
    t = _norm(text)
    if lang == "en":
        return "cancel" in t
    return "hủy" in t or "huỷ" in t


_TOOL_LLM_HINTS_VN = (
    "chuyến",
    "thu nhập",
    "kiếm",
    "doanh thu",
    "hoàn thành",
    "hủy",
    "huỷ",
    "thống kê",
    "thưởng",
    "bonus",
    "gọi",
    "sms",
    "nhắn",
    "hủy",
    "lộ trình",
    "tắc đường",
    "giao thông",
    "vị trí",
    "ứng dụng",
    "app",
    "nhắc nhở",
    "xác nhận",
    "từ chối",
    "khách",
    "tài xế",
    "đón",
    "trả",
    "faq",
    "hướng dẫn",
    "làm mới",
    "cập nhật",
    "lịch",
    "lịch trình",
    "đến nơi",
    "lên xe",
    "xong chuyến",
    "chờ thêm",
    "gia hạn",
    "đánh giá",
    "rating",
    "nghỉ",
    "offline",
    "báo cáo",
    "sự cố",
    "vắng",
    "giúp gì",
    "điểm đón",
)
_TOOL_LLM_HINTS_EN = (
    "trip",
    "earnings",
    "bonus",
    "call",
    "sms",
    "text",
    "cancel",
    "route",
    "traffic",
    "location",
    "app",
    "reminder",
    "confirm",
    "reject",
    "customer",
    "driver",
    "refresh",
    "update",
)


def _norm(text: str) -> str:
    folded = unicodedata.normalize("NFC", text).lower().strip()
    folded = folded.replace("'", "").replace("’", "")
    folded = re.sub(r"[.!?…,;:“”]+", " ", folded)
    return re.sub(r"\s+", " ", folded).strip()


def parse_trip_index(text: str) -> int | None:
    """Follow-up: 'chuyến số 1', 'chuyến 1', 'số 2', bare '3'."""
    t = _norm(text)
    m = re.search(r"(?:chuyến|trip)\s*(?:số|thứ|number)?\s*(\d+)", t)
    if m:
        return int(m.group(1))
    m = re.search(r"(?:số|thứ)\s*(\d+)", t)
    if m:
        idx = int(m.group(1))
        if idx <= 99:
            return idx
    if re.fullmatch(r"\d+", t):
        return int(t)
    return None


def _is_phone_lookup(t: str, lang: str) -> bool:
    """Driver asked to hear the number, not to place a call."""
    needles = _PHONE_EN if lang == "en" else _PHONE_VN
    if not any(p in t for p in needles):
        return False
    if lang == "en":
        return not any(p in t for p in _CALL_EN)
    return not any(p in t for p in ("gọi khách", "gọi giúp"))


def _is_call_request(t: str, lang: str) -> bool:
    if lang == "en":
        return any(p in t for p in _CALL_EN)
    # "khách nào" = "which customer" (asking, not commanding) — live session
    # 2026-09-06: "gọi khách nào" after two "...như nào?" (how does this
    # work?) turns fast-pathed straight to a real call_customer, placing an
    # actual outbound call off an exploratory question. Bail to the LLM,
    # which has the fuller instruction to ask for/confirm a target before
    # calling instead of committing off a bare substring match.
    if any(p in t for p in _CALL_VN) and not any(q in t for q in ("khách nào", "chuyến nào")):
        return True
    if "gọi cho" not in t:
        return False
    rest = t.split("gọi cho", 1)[1].strip()
    if not rest or rest.startswith("tôi") or rest in {"ai", "ai đó"}:
        return False
    return len(rest) >= 3


def _is_end_session(t: str, lang: str) -> bool:
    if lang == "en":
        return any(p in t for p in _END_EN)
    if any(p in t for p in _END_VN):
        return True
    if "thế thôi" in t and any(p in t for p in ("cảm ơn", "cam on", "không có gì", "khong co gi")):
        return True
    if t.startswith("cảm ơn") and "không có gì" in t:
        return True
    return False


def _is_trip_identity_query(t: str, lang: str) -> bool:
    if lang != "vn":
        return False
    if any(
        p in t
        for p in (
            "lịch trình",
            "mấy chuyến",
            "bao nhiêu chuyến",
            "kiểm tra trình",
            "kiểm tra lịch",
            "thu nhập",
        )
    ):
        return False
    return any(p in t for p in _TRIP_IDENTITY_VN)


def _classify_trip_lookup(text: str, lang: str, userdata: dict | None) -> bool:
    if not userdata or not _is_trip_identity_query(_norm(text), lang):
        return False
    from app.voicebot.processors.trip_target import resolve_trips_from_text

    return resolve_trips_from_text(userdata, text).kind == "matched"


def classify_driver_intent(
    text: str, lang: str, userdata: dict | None = None
) -> Intent | None:
    """Return a tool intent when the transcript is unambiguous, else None."""
    t = _norm(text)
    if not t:
        return None
    if _is_end_session(t, lang):
        return "end_conversation"
    if lang == "en":
        if any(p in t for p in _CONFIRM_BLOCK_EN):
            return None
        if any(p in t for p in _REJECT_EN):
            return "reject"
        if any(p in t for p in _CONFIRM_EN) and not _looks_negated(t, "en"):
            return "confirm"
        if _is_earnings_split_query(t, "en"):
            return "earnings"
        if _is_phone_lookup(t, "en") and not _looks_negated(t, "en"):
            return "customer_phone"
        if _is_call_request(t, "en") and not _looks_negated(t, "en"):
            return "call_customer"
        if any(p in t for p in _UPCOMING_EN):
            return "upcoming"
        if any(p in t for p in _EARNINGS_EN):
            return "earnings"
        if any(p in t for p in _EARNINGS_PERIOD_FOLLOWUP_EN):
            return "earnings"
        if any(p in t for p in ("completed today", "finished today", "cancelled today", "cancellations today")):
            return "trip_history"
        if any(p in t for p in _CURRENT_EN):
            return "current"
        return None
    if any(p in t for p in _CONFIRM_BLOCK_VN):
        return None
    if any(p in t for p in _REJECT_VN):
        return "reject"
    # Schedule/browse phrases ("xác nhận chuyến sắp tới") must not fast-path accept-offer.
    # "nhận chuyến" must not match inside "xác nhận chuyến".
    if not _looks_negated(t, "vn") and not any(b in t for b in _CONFIRM_NOT_VN) and (
        t in _CONFIRM_EXACT_VN
        or any(
            (p == "nhận chuyến" and re.search(r"(?<!xác )nhận chuyến", t) is not None)
            or (p != "nhận chuyến" and p in t)
            for p in _CONFIRM_VN
        )
    ):
        return "confirm"
    if _is_earnings_split_query(t, "vn"):
        return "earnings"
    if _is_phone_lookup(t, "vn") and not _looks_negated(t, "vn"):
        return "customer_phone"
    if _is_call_request(t, "vn") and not _looks_negated(t, "vn"):
        return "call_customer"
    if any(p in t for p in _UPCOMING_VN):
        return "upcoming"
    if parse_trip_index(text) is not None:
        return "upcoming"
    if any(p in t for p in _EARNINGS_VN):
        return "earnings"
    if any(p in t for p in _EARNINGS_PERIOD_FOLLOWUP_VN):
        return "earnings"
    if any(p in t for p in ("hoàn thành hôm nay", "chuyến hoàn thành", "chuyến bị hủy", "hủy hôm nay")):
        return "trip_history"
    if any(p in t for p in _CURRENT_VN):
        return "current"
    if _classify_trip_lookup(text, lang, userdata):
        return "trip_lookup"
    if driving_advice_reply(text, lang):
        return "driving_advice"
    if conversational_ack_reply(text, lang):
        return "conversational_ack"
    return None


def needs_tool_llm(text: str, lang: str) -> bool:
    """Trip/app/data keyword signal — kept for classify/tests; routing always uses tools."""
    t = _norm(text)
    if not t:
        return False
    hints = _TOOL_LLM_HINTS_EN if lang == "en" else _TOOL_LLM_HINTS_VN
    return any(h in t for h in hints)


_STT_TAIL_FRAGMENTS_VN = frozenset({
    "cua toi",
    "cua em",
    "cua ban",
    "của tôi",
    "của em",
    "của bạn",
    "nhe",
    "nhé",
    "a",
    "a a",
    "uh",
    "um",
    "u",
    "o",
    "roi",
    "rồi",
    "the",
    "thế",
    "the a",
    "thế à",
    "vay",
    "vậy",
    "vay a",
    "vậy à",
    "dung roi",
    "đúng rồi",
    "dung vay",
    "đúng vậy",
})

_STT_TAIL_FRAGMENTS_EN = frozenset({
    "mine",
    "of mine",
    "yeah",
    "yep",
    "uh huh",
    "uh",
    "um",
    "ok",
    "okay",
    "right",
})


def is_stt_tail_fragment(text: str, lang: str) -> bool:
    """Drop STT tails split from the prior utterance (e.g. 'của tôi' after lịch trình)."""
    t = _norm(text)
    if not t or len(t) > 24 or "?" in text:
        return False
    if classify_driver_intent(text, lang) is not None:
        return False
    if needs_tool_llm(text, lang):
        return False
    words = t.split()
    if len(words) > 4:
        return False
    fragments = _STT_TAIL_FRAGMENTS_EN if lang == "en" else _STT_TAIL_FRAGMENTS_VN
    if t in fragments:
        return True
    if lang != "en" and len(words) <= 3 and words[0] in {"cua", "của"}:
        return True
    return False


def apply_auto_tool_choice(model_settings: Any) -> None:
    """Leave an explicit choice alone. Unset means the model may call a tool or answer."""
    if model_settings is None:
        return
    if not is_given(getattr(model_settings, "tool_choice", NOT_GIVEN)):
        model_settings.tool_choice = "auto"


def route_full_llm(session: Any, text: str, *, lang: str, hint: str | None = None) -> None:
    """Single turn path: LLM with agent tools (no tool-less chitchat fork)."""
    mark_user_stopped(session, if_unset=True)
    schedule_turn_filler(session, lang=lang)
    kwargs: dict[str, Any] = {"user_input": text, "tool_choice": "auto"}
    if hint and hint.strip():
        kwargs["instructions"] = hint.strip()
    session.generate_reply(**kwargs)


def route_conversational_llm(session: Any, text: str, lang: str) -> None:
    """Deprecated: tool-less chitchat fork — redirects to full LLM+tools."""
    route_full_llm(session, text, lang=lang)


from app.voicebot.processors.call_mode import resolve_call_mode


def call_tool_arguments(text: str, lang: str = "vn", userdata: dict | None = None) -> dict:
    """Pull call mode + custom message + trip context from driver utterance."""
    t = _norm(text)
    raw = text.strip()
    args: dict = {}
    message_seps = (
        "bảo là",
        "báo là",
        "báo khách là",
        "bảo khách là",
        "báo khách",
        "bảo khách",
        "nói là",
        "tell them",
        "tell the customer",
    )
    for sep in message_seps:
        idx = t.find(sep)
        if idx < 0:
            continue
        raw_lower = raw.lower()
        raw_idx = raw_lower.find(sep)
        if raw_idx < 0:
            continue
        msg = raw[raw_idx + len(sep):].strip()
        if msg.lower().startswith("là "):
            msg = msg[3:].strip()
        if msg:
            args["message"] = msg
        break

    default_mode = "agent"
    if userdata is not None:
        default_mode = context_store.get_default_customer_call_mode(userdata)
    args["mode"] = resolve_call_mode(text, lang=lang, default_mode=default_mode)
    if args.get("message") and args["mode"] != "bridge":
        args["mode"] = "agent"
    if userdata is not None:
        idx = parse_trip_index(text)
        if idx is None:
            idx = context_store.get_target_trip_index(userdata)
        if idx is None:
            last = userdata.get("context", {}).get("_last_tool_response") or {}
            for blob in (last.get("spoken") or "", *(last.get("follow_up") or [])):
                if context_store.match_callable_trip_by_text(userdata, blob):
                    idx = context_store.get_target_trip_index(userdata)
                    break
        if idx is not None:
            args["trip_index"] = idx
    return args


def _tool(lang: str, vn_path: str, en_path: str, name: str):
    if lang == "en":
        mod = __import__(en_path, fromlist=[name])
    else:
        mod = __import__(vn_path, fromlist=[name])
    return getattr(mod, name)


async def _apply_call_customer_result(session: Any, result: Any) -> None:
    """Speak disambiguation, or hand off to CustomerCallAgent on fast path."""
    if isinstance(result, tuple) and len(result) == 2:
        agent, handoff_msg = result
        if isinstance(agent, Agent):
            update = getattr(session, "update_agent", None)
            if callable(update):
                update(agent)
            if isinstance(handoff_msg, str) and handoff_msg.strip():
                await context_store.speak_and_stop(session, handoff_msg)
                return
            raise StopResponse()
    if isinstance(result, str) and result.strip():
        await context_store.speak_and_stop(session, result)


async def _log_driver_turn(userdata: dict, text: str) -> None:
    """Fast-path skips RoomIO chat events — log driver turns for conv transcript."""
    clean = (text or "").strip()
    if not clean:
        return
    conv = userdata.get("_conv_service")
    if conv is not None:
        conv.append_labeled_turn(clean, speaker="driver", role="user")


async def _execute_pending_action(session: Any, userdata: dict, *, lang: str) -> None:
    pending = context_store.pop_pending_driver_action(userdata)
    if not pending:
        return
    intent = pending.get("intent")
    args = dict(pending.get("args") or {})
    ctx = SimpleNamespace(session=session, userdata=userdata)
    event("pending_action", ok=True, intent=intent or "-", lang=lang)
    logger.info("pending_action execute intent=%s args=%s", intent, args)

    if intent == "call_customer":
        fn = _tool(lang, "app.voicebot.locales.vn.tools.call_customer", "app.voicebot.locales.en.tools.call_customer", "call_customer")
        utterance = context_store.get_last_driver_utterance(userdata) or pending.get("source") or ""
        context_store.set_pending_call_utterance(userdata, utterance)
        result = await fn.__wrapped__(args, ctx)
        await _apply_call_customer_result(session, result)
        return
    if intent == "upcoming":
        fn = _tool(
            lang,
            "app.voicebot.locales.vn.tools.check_upcoming_trips",
            "app.voicebot.locales.en.tools.check_upcoming_trips",
            "check_upcoming_trips",
        )
        await fn.__wrapped__(args, ctx)
        return
    if intent == "earnings":
        period = str(args.get("period") or "today")
        if period in ("week", "month"):
            fn = _tool(
                lang,
                "app.voicebot.locales.vn.tools.get_earnings_summary",
                "app.voicebot.locales.en.tools.get_earnings_summary",
                "get_earnings_summary",
            )
            await fn.__wrapped__({"period": period}, ctx)
            return
        fn = _tool(
            lang,
            "app.voicebot.locales.vn.tools.get_today_earnings",
            "app.voicebot.locales.en.tools.get_today_earnings",
            "get_today_earnings",
        )
        await fn.__wrapped__({}, ctx)
        return
    logger.warning("pending_action unknown intent=%s", intent)


async def _try_interrupt(session: Any, *, reason: str) -> None:
    interrupt = getattr(session, "interrupt", None)
    if not callable(interrupt):
        return
    try:
        result = interrupt()
        if asyncio.iscoroutine(result):
            await result
    except RuntimeError:
        logger.debug("interrupt skipped before %s", reason)


async def _execute_end_conversation(ctx: SimpleNamespace, *, lang: str) -> None:
    if lang == "en":
        from app.voicebot.locales.en.tools.end_call import end_call

        await end_call.__wrapped__({}, ctx)
        return
    from app.voicebot.locales.vn.tools.end_conversation import end_conversation

    await end_conversation.__wrapped__({}, ctx)


async def _execute_trip_lookup(
    session: Any, userdata: dict, text: str, *, lang: str
) -> None:
    from app.voicebot.processors.trip_response import build_trip_detail_response
    from app.voicebot.processors.trip_target import resolve_and_select_trip

    trip = resolve_and_select_trip(userdata, text)
    if not trip:
        return
    schedule = context_store.get_schedule_trips(userdata)
    id_to_index = {t.get("trip_id"): i + 1 for i, t in enumerate(schedule)}
    idx = id_to_index.get(trip.get("trip_id")) or context_store.get_target_trip_index(userdata) or 1
    spoken_lang = "en" if lang == "en" else "vi"
    resp = build_trip_detail_response(trip, idx, spoken_lang)
    await context_store.speak_and_stop(session, resp.spoken())


async def handle_driver_utterance(session: Any, message: Any, *, lang: str) -> None:
    """Pending-action safety (+ optional gated auto-tool). Raises StopResponse when spoken."""
    text = getattr(message, "text_content", None) or ""
    userdata = getattr(session, "userdata", None)
    if not isinstance(userdata, dict):
        return

    will_handle = (
        pending_action.should_execute(userdata, text, lang)
        or (
            SPOKEN_INTENT_AUTO_TOOL
            and classify_driver_intent(text, lang, userdata) is not None
        )
    )
    if will_handle:
        await _log_driver_turn(userdata, text)

    if pending_action.should_execute(userdata, text, lang):
        await _try_interrupt(session, reason="pending_action")
        await _execute_pending_action(session, userdata, lang=lang)
        return

    intent = classify_driver_intent(text, lang, userdata)
    if intent is None:
        return

    if intent == "conversational_ack" and pending_action.has_pending(userdata):
        if pending_action.is_action_confirm(text, lang):
            await _try_interrupt(session, reason="pending_action")
            await _execute_pending_action(session, userdata, lang=lang)
            return

    if not SPOKEN_INTENT_AUTO_TOOL:
        return

    ctx = SimpleNamespace(session=session, userdata=userdata)
    event("spoken_intent", ok=True, intent=intent, lang=lang)
    logger.info("spoken_intent intent=%s lang=%s", intent, lang)

    if intent == "end_conversation":
        await _try_interrupt(session, reason="end_conversation")
        await _execute_end_conversation(ctx, lang=lang)
        raise StopResponse()

    if intent in ("confirm", "reject"):
        await _try_interrupt(session, reason=intent)

    if intent == "confirm":
        fn = _tool(lang, "app.voicebot.locales.vn.tools.confirm_trip", "app.voicebot.locales.en.tools.confirm_trip", "confirm_trip")
        await fn.__wrapped__({}, ctx)
        return
    if intent == "reject":
        fn = _tool(lang, "app.voicebot.locales.vn.tools.reject_trip", "app.voicebot.locales.en.tools.reject_trip", "reject_trip")
        await fn.__wrapped__({}, ctx)
        return
    if intent == "customer_phone":
        trips = context_store.get_schedule_trips(userdata)
        spoken = "en" if lang == "en" else "vi"
        await context_store.speak_and_stop(
            session, format_primary_customer_phone(trips, spoken)
        )
        return
    if intent == "call_customer":
        fn = _tool(lang, "app.voicebot.locales.vn.tools.call_customer", "app.voicebot.locales.en.tools.call_customer", "call_customer")
        context_store.set_pending_call_utterance(userdata, text)
        context_store.clear_pending_driver_action(userdata)
        result = await fn.__wrapped__(call_tool_arguments(text, lang=lang, userdata=userdata), ctx)
        await _apply_call_customer_result(session, result)
        return
    if intent == "upcoming":
        fn = _tool(
            lang,
            "app.voicebot.locales.vn.tools.check_upcoming_trips",
            "app.voicebot.locales.en.tools.check_upcoming_trips",
            "check_upcoming_trips",
        )
        args = {"scope": "all"}
        idx = parse_trip_index(text)
        if idx is not None:
            args["trip_index"] = idx
        context_store.clear_pending_driver_action(userdata)
        await fn.__wrapped__(args, ctx)
        return
    if intent == "earnings":
        period = _earnings_period_from_text(text, lang)
        if period == "lifetime":
            msg = (
                "I only have today, this week, or this month — not lifetime totals."
                if lang == "en"
                else "Em chỉ xem được hôm nay, tuần này hoặc tháng này — chưa có tổng từ trước đến nay."
            )
            await context_store.speak_and_stop(session, msg)
            return
        if period in ("week", "month"):
            fn = _tool(
                lang,
                "app.voicebot.locales.vn.tools.get_earnings_summary",
                "app.voicebot.locales.en.tools.get_earnings_summary",
                "get_earnings_summary",
            )
            await fn.__wrapped__({"period": period}, ctx)
            return
        fn = _tool(
            lang,
            "app.voicebot.locales.vn.tools.get_today_earnings",
            "app.voicebot.locales.en.tools.get_today_earnings",
            "get_today_earnings",
        )
        await fn.__wrapped__({}, ctx)
        return
    if intent == "trip_history":
        scope = "cancelled_today" if _is_cancelled_history(text, lang) else "completed_today"
        fn = _tool(
            lang,
            "app.voicebot.locales.vn.tools.check_trip_history",
            "app.voicebot.locales.en.tools.check_trip_history",
            "check_trip_history",
        )
        await fn.__wrapped__({"scope": scope}, ctx)
        return
    if intent == "driving_advice":
        reply = driving_advice_reply(text, lang)
        if reply:
            await context_store.speak_and_stop(session, reply)
        return
    if intent == "trip_lookup":
        await _execute_trip_lookup(session, userdata, text, lang=lang)
        return
    if intent == "conversational_ack":
        reply = conversational_ack_reply(text, lang)
        if reply:
            await context_store.speak_and_stop(session, reply)
        return
    fn = _tool(
        lang,
        "app.voicebot.locales.vn.tools.get_current_trip_info",
        "app.voicebot.locales.en.tools.get_current_trip_info",
        "get_current_trip_info",
    )
    await fn.__wrapped__({}, ctx)


async def driver_text_input_cb(sess: Any, ev: Any) -> None:
    """lk.chat turn — pending_action then single LLM+tools path (RoomIO skips voice hook)."""
    mark_user_stopped(sess)
    lang = "vn"
    agent = getattr(sess, "current_agent", None)
    if agent is not None:
        lang = getattr(agent, "_spoken_intent_lang", "vn")

    async with sess._claim_user_turn():
        try:
            await sess.interrupt()
        except RuntimeError:
            logger.debug("interrupt skipped — current speech not interruptible")
        message = SimpleNamespace(text_content=ev.text)
        userdata = sess.userdata
        if isinstance(userdata, dict):
            context_store.set_last_driver_utterance(userdata, ev.text)
            pending_action.infer_from_driver_utterance(ev.text, userdata, lang=lang)
        try:
            await handle_driver_utterance(sess, message, lang=lang)
        except StopResponse:
            return
        if is_stt_tail_fragment(ev.text, lang):
            logger.debug("skip stt tail fragment (chat): %r", ev.text)
            return
        hint = None
        if isinstance(sess.userdata, dict):
            hint = context_store.get_last_tool_response_hint(
                sess.userdata, "en" if lang == "en" else "vi"
            )
        route_full_llm(sess, ev.text, lang=lang, hint=hint)


_DRIVER_PREEMPTIVE_MODES = frozenset({"driver", "outbound"})


def attach_spoken_intent_preemptive_cancel(
    session: Any,
    *,
    lang: str,
    mode: str,
) -> None:
    """Cancel preemptive LLM only when pending_action will run (not for classify matches)."""
    if mode not in _DRIVER_PREEMPTIVE_MODES:
        return

    @session.on("user_input_transcribed")
    def _on_spoken_intent_stt(ev: Any) -> None:
        if not ev.is_final:
            return
        transcript = (getattr(ev, "transcript", None) or "").strip()
        if not transcript:
            return
        userdata = session.userdata if isinstance(session.userdata, dict) else None
        if userdata is None or not pending_action.should_execute(userdata, transcript, lang):
            return
        asyncio.create_task(
            _try_interrupt(session, reason="pending_action_preemptive")
        )


class SpokenIntentMixin:
    """DriverAgent mixin — must stay before Agent in the MRO."""

    _spoken_intent_lang: str = "vn"

    async def on_user_turn_completed(self, turn_ctx: Any, new_message: Any) -> None:
        if cap_chat_context(turn_ctx):
            event("chat_window", ok=True, max_items=MAX_CHAT_ITEMS)
            logger.info("chat_window truncated max_items=%s", MAX_CHAT_ITEMS)
            update = getattr(self, "update_chat_ctx", None)
            if callable(update):
                await update(turn_ctx)
        text = getattr(new_message, "text_content", None) or ""
        userdata = self.session.userdata
        lang = self._spoken_intent_lang
        if isinstance(userdata, dict):
            context_store.set_last_driver_utterance(userdata, text)
            pending_action.infer_from_driver_utterance(text, userdata, lang=lang)
        try:
            await handle_driver_utterance(self.session, new_message, lang=lang)
        except StopResponse:
            raise
        if is_stt_tail_fragment(text, lang):
            logger.debug("skip stt tail fragment: %r", text)
            raise StopResponse()
        hint = None
        if isinstance(userdata, dict):
            hint = context_store.get_last_tool_response_hint(
                userdata,
                "en" if lang == "en" else "vi",
            )
        if hint and hasattr(turn_ctx, "add_message"):
            turn_ctx.add_message(role="system", content=hint.strip())
        schedule_turn_filler(self.session, lang=lang)
        # Return without StopResponse → Agent continues with full tools.

    def llm_node(self, chat_ctx: Any, tools: list[Any], model_settings: Any):
        apply_auto_tool_choice(model_settings)
        return Agent.default.llm_node(self, chat_ctx, tools, model_settings)
