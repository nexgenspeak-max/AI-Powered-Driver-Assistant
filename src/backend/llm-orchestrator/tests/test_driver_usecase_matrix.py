"""Full VN driver spoken-intent matrix — text-in, no mic/TTS.

This is the regression gate that phone roleplay alone cannot replace.
Add a row when a live session fails; pytest must fail on old code, pass after fix.

Live sources: 7937d495 (month/ack/pending), a8b1f311 (lifetime + earnings split).
"""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.voicebot.processors.conversational_ack import conversational_ack_reply
from app.voicebot.processors.spoken_intent import (
    _earnings_period_from_text,
    classify_driver_intent,
    handle_driver_utterance,
)


# (utterance, expected_intent | None, expected_period | None)
# period only asserted when intent == earnings
USECASE_CLASSIFY: tuple[tuple[str, str | None, str | None], ...] = (
    # --- confirm / reject / end ---
    ("Xác nhận nhận chuyến", "confirm", None),
    ("nhận chuyến", "confirm", None),
    ("từ chối chuyến", "reject", None),
    ("không nhận", "reject", None),
    ("tắt máy", "end_conversation", None),
    ("tạm biệt", "end_conversation", None),
    ("Thế thôi, cảm ơn, không có gì.", "end_conversation", None),
    ("chưa xác nhận", None, None),
    # --- schedule / current / history ---
    ("lịch trình hôm nay", "upcoming", None),
    ("chuyến sắp tới", "upcoming", None),
    ("Tôi muốn kiểm tra trình hôm nay", "upcoming", None),
    ("chuyến hiện tại", "current", None),
    ("chuyến hoàn thành hôm nay", "trip_history", None),
    ("chuyến bị hủy hôm nay", "trip_history", None),
    # --- call / phone ---
    ("Gọi cho khách giúp tôi.", "call_customer", None),
    ("gọi khách", "call_customer", None),
    ("số điện thoại khách", "customer_phone", None),
    # --- delivery removed: no fast-path intent ---
    ("Tôi còn mấy đơn hàng?", None, None),
    ("có bao nhiêu đơn", None, None),
    ("Thế ngoài ra tôi có hàng hóa nào cần giao không?", None, None),
    ("Tôi hỏi về đơn hàng mà.", None, None),
    ("gọi người gửi", None, None),
    ("gọi người nhận", None, None),
    ("đã giao xong", None, None),
    # --- earnings periods ---
    ("thu nhập", "earnings", "today"),
    ("thu nhập hôm nay", "earnings", "today"),
    ("thu nhập tuần này", "earnings", "week"),
    ("Thế còn tuần vừa rồi thì sao?", "earnings", "week"),
    ("hỏi về phần thu nhập của tôi trong tháng vừa rồi.", "earnings", "month"),
    ("trong tháng vừa rồi mà", "earnings", "month"),
    ("từ khi bắt đầu kiếm bao nhiêu", "earnings", "lifetime"),
    ("toàn bộ dữ liệu thu nhập của tôi là bao nhiêu?", "earnings", "lifetime"),
    (
        "Không, tôi hỏi là toàn bộ thu nhập của tôi từ trước đến giờ, "
        "tôi không hỏi hôm nay, tuần này hay tháng này.",
        "earnings",
        "lifetime",
    ),
    ("1 năm qua", "earnings", "lifetime"),
    ("năm qua thu nhập", "earnings", "lifetime"),
    # --- earnings split mentions giao hàng (a8b1f311) ---
    (
        "Ô thế thì phần trong cái phần thu nhập tuần này của tôi ấy thì có bao nhiêu "
        "thu nhập từ đơn giao hàng, bao nhiêu đơn thu",
        "earnings",
        "week",
    ),
    (
        "Không, tôi hỏi thu nhập của tôi trong tuần vừa rồi thì có bao nhiêu đến từ "
        "giao hàng, bao nhiêu đến từ chở khách?",
        "earnings",
        "week",
    ),
    (
        "Không, bạn hiểu sai ý tôi rồi, tôi chưa hỏi về đơn giao hàng.",
        None,
        None,
    ),
    # --- ack must not steal period follow-ups ---
    ("ok", "conversational_ack", None),
    ("ừ", "conversational_ack", None),
    # --- taxi call ---
    ("Gọi cho khách giúp tôi", "call_customer", None),
    # --- negation must not flip confirm/call/phone-lookup polarity ---
    # (live session 2026-09-06: "tôi không muốn nhận chuyến này đâu" fast-
    # pathed straight to 'confirm' — the opposite of what the driver said)
    ("Tôi không muốn nhận chuyến này đâu.", "reject", None),
    ("Chuyến này thôi không nhận nữa.", "reject", None),
    ("Tôi có nên nhận chuyến này không?", None, None),
    ("Đừng gọi khách nữa.", None, None),
    ("Khỏi cần gọi khách.", None, None),
    ("Không cần biết số khách.", None, None),
    # --- "tiền" earnings phrasing must not be swallowed as an ack ---
    # ("chạy được bao nhiêu tiền" contains ack-needle "được")
    ("Hôm qua tôi chạy được bao nhiêu tiền?", None, None),
    # --- "which customer/trip?" must not fast-path a real outbound call ---
    # (live session 2026-09-06: "gọi khách nào" after two "...như nào?"
    # exploratory turns fast-pathed straight into an actual call_customer)
    ("Gọi khách nào?", None, None),
    ("Gọi khách của chuyến nào?", None, None),
)


@pytest.mark.parametrize("utterance,intent,period", USECASE_CLASSIFY)
def test_usecase_classify_matrix(utterance: str, intent: str | None, period: str | None):
    assert classify_driver_intent(utterance, "vn") == intent
    if intent == "earnings" and period is not None:
        assert _earnings_period_from_text(utterance, "vn") == period


def test_ack_does_not_match_inside_vua():
    assert conversational_ack_reply("trong tháng vừa rồi mà", "vn") is None
    assert classify_driver_intent("trong tháng vừa rồi mà", "vn") == "earnings"


@pytest.mark.asyncio
async def test_a8b1_lifetime_defers_to_llm_not_today_tool():
    """Live a8b1f311: lifetime classify stays earnings/lifetime; no auto-tool."""
    utterance = "Thế à? Thế ok, thế toàn bộ dữ liệu thu nhập của tôi là bao nhiêu?"
    assert classify_driver_intent(utterance, "vn") == "earnings"
    assert _earnings_period_from_text(utterance, "vn") == "lifetime"
    session = MagicMock()
    session.userdata = {"driver_phone": "0900000001", "context": {}}
    session.say = AsyncMock()
    await handle_driver_utterance(
        session, SimpleNamespace(text_content=utterance), lang="vn"
    )
    session.say.assert_not_called()


@pytest.mark.asyncio
async def test_a8b1_earnings_split_classifies_week_defers_to_llm():
    """Live a8b1f311: week earnings split → classify week; LLM path (no auto-tool)."""
    utterance = (
        "Không, tôi hỏi thu nhập của tôi trong tuần vừa rồi thì có "
        "bao nhiêu đến từ giao hàng, bao nhiêu đến từ chở khách?"
    )
    assert classify_driver_intent(utterance, "vn") == "earnings"
    assert _earnings_period_from_text(utterance, "vn") == "week"
    session = MagicMock()
    session.userdata = {"driver_phone": "0900000001", "context": {}}
    session.say = AsyncMock()
    await handle_driver_utterance(
        session, SimpleNamespace(text_content=utterance), lang="vn"
    )
    session.say.assert_not_called()


# EN smoke — keep parity on collision + lifetime hyphen
EN_CLASSIFY = (
    ("how much did i make this week", "earnings", "week"),
    ("all-time earnings", "earnings", "lifetime"),
    ("earnings from deliveries vs rides this week", "earnings", "week"),
    ("how many deliveries", None, None),
    ("call the customer", "call_customer", None),
)


@pytest.mark.parametrize("utterance,intent,period", EN_CLASSIFY)
def test_en_usecase_smoke(utterance: str, intent: str | None, period: str | None):
    assert classify_driver_intent(utterance, "en") == intent
    if intent == "earnings" and period is not None:
        assert _earnings_period_from_text(utterance, "en") == period
