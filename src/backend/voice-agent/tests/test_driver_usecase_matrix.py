"""Full VN driver spoken-intent matrix — text-in, no mic/TTS.

This is the regression gate that phone roleplay alone cannot replace.
Add a row when a live session fails; pytest must fail on old code, pass after fix.

Live sources: 7937d495 (month/ack/pending), a8b1f311 (lifetime + earnings vs delivery).
"""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from livekit.agents import StopResponse

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
    # --- delivery ---
    ("Tôi còn mấy đơn hàng?", "delivery_orders", None),
    ("có bao nhiêu đơn", "delivery_orders", None),
    ("Thế ngoài ra tôi có hàng hóa nào cần giao không?", "delivery_orders", None),
    ("Tôi hỏi về đơn hàng mà.", "delivery_orders", None),
    ("gọi người gửi", "call_delivery_party", None),
    ("gọi người nhận", "call_delivery_party", None),
    ("đã giao xong", "update_delivery_status", None),
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
    # --- earnings vs delivery collision (a8b1f311) ---
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
    # --- taxi call not stolen by delivery ---
    ("Gọi cho khách giúp tôi", "call_customer", None),
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
async def test_a8b1_lifetime_speaks_limit_not_today():
    """Live a8b1f311: 'toàn bộ thu nhập' must not call get_today_earnings."""
    session = MagicMock()
    session.userdata = {"driver_phone": "0888887798", "context": {}}
    session.say = AsyncMock()
    session.interrupt = AsyncMock()

    today = AsyncMock(side_effect=StopResponse())
    summary = AsyncMock(side_effect=StopResponse())

    def _tool(lang, vn_path, en_path, name):
        if name == "get_today_earnings":
            return SimpleNamespace(__wrapped__=today)
        if name == "get_earnings_summary":
            return SimpleNamespace(__wrapped__=summary)
        raise AssertionError(f"unexpected tool {name}")

    with patch("app.voicebot.processors.spoken_intent._tool", side_effect=_tool):
        try:
            await handle_driver_utterance(
                session,
                SimpleNamespace(
                    text_content="Thế à? Thế ok, thế toàn bộ dữ liệu thu nhập của tôi là bao nhiêu?"
                ),
                lang="vn",
            )
        except StopResponse:
            pass
    today.assert_not_awaited()
    summary.assert_not_awaited()
    spoken = session.say.await_args.args[0]
    assert "hôm nay" in spoken.lower() or "tháng" in spoken.lower()
    assert "353" not in spoken


@pytest.mark.asyncio
async def test_a8b1_earnings_split_not_delivery_list():
    """Live a8b1f311: week earnings split must not list delivery orders."""
    session = MagicMock()
    session.userdata = {"driver_phone": "0888887798", "context": {}}
    session.say = AsyncMock()
    session.interrupt = AsyncMock()

    summary = AsyncMock(side_effect=StopResponse())
    delivery = AsyncMock(side_effect=StopResponse())

    def _tool(lang, vn_path, en_path, name):
        if name == "get_earnings_summary":
            return SimpleNamespace(__wrapped__=summary)
        if name == "check_delivery_orders":
            return SimpleNamespace(__wrapped__=delivery)
        if name == "get_today_earnings":
            return SimpleNamespace(__wrapped__=AsyncMock(side_effect=StopResponse()))
        raise AssertionError(f"unexpected tool {name}")

    with patch("app.voicebot.processors.spoken_intent._tool", side_effect=_tool):
        try:
            await handle_driver_utterance(
                session,
                SimpleNamespace(
                    text_content=(
                        "Không, tôi hỏi thu nhập của tôi trong tuần vừa rồi thì có "
                        "bao nhiêu đến từ giao hàng, bao nhiêu đến từ chở khách?"
                    )
                ),
                lang="vn",
            )
        except StopResponse:
            pass
    summary.assert_awaited_once()
    assert summary.await_args.args[0].get("period") == "week"
    delivery.assert_not_awaited()


# EN smoke — keep parity on collision + lifetime hyphen
EN_CLASSIFY = (
    ("how much did i make this week", "earnings", "week"),
    ("all-time earnings", "earnings", "lifetime"),
    ("earnings from deliveries vs rides this week", "earnings", "week"),
    ("how many deliveries", "delivery_orders", None),
    ("call the customer", "call_customer", None),
)


@pytest.mark.parametrize("utterance,intent,period", EN_CLASSIFY)
def test_en_usecase_smoke(utterance: str, intent: str, period: str | None):
    assert classify_driver_intent(utterance, "en") == intent
    if intent == "earnings" and period is not None:
        assert _earnings_period_from_text(utterance, "en") == period
