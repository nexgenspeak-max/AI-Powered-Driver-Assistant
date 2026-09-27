"""Phrase labels for a driver transcript.

These labels do not call tools and do not choose the reply. The turn path in
``spoken_intent`` always sends the utterance to the LLM. Labels are used to
drop STT tail fragments and to recognize a confirmation of a promised action.
"""
from __future__ import annotations

import re
import unicodedata
from typing import Literal

from app.voicebot.processors.conversational_ack import conversational_ack_reply
from app.voicebot.processors.driving_advice import driving_advice_reply

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
    """Label an unambiguous phrase, or None. Does not call a tool."""
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

