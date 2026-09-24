"""Live-session driver QA — fixtures from real logs, text-in only (no mic/TTS).

Pattern (auto-fix loop):
1. Capture failing turns from voice-agent log (`[DRIVER]` / `[AI]` / spoken_intent).
2. Add a CASE here with expected intent / period / pending.
3. `pytest tests/test_live_session_driver_qa.py` must fail on old code, pass after fix.
4. Prefer this over ad-hoc phone roleplay for routing bugs.

Source session: room …7937d495… (2026-09-05 ~19:52–19:57).
"""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.voicebot.processors import context_store, pending_action
from app.voicebot.processors.conversational_ack import conversational_ack_reply
from app.voicebot.processors.spoken_intent import (
    _earnings_period_from_text,
    classify_driver_intent,
    handle_driver_utterance,
)


# (utterance, expected_intent, expected_period_or_None)
LIVE_7937_CLASSIFY = (
    (
        "hỏi về phần thu nhập của tôi trong tháng vừa rồi.",
        "earnings",
        "month",
    ),
    (
        "trong tháng vừa rồi mà",
        "earnings",
        "month",
    ),
    (
        "Vâng cái gì? Tôi đang hỏi trong tháng vừa rồi thu nhập của tôi bao nhiêu?",
        "earnings",
        "month",
    ),
    # Delivery removed — no fast-path
    (
        "Thế ngoài ra tôi có hàng hóa nào cần giao không?",
        None,
        None,
    ),
    (
        "Tôi hỏi về đơn hàng mà.",
        None,
        None,
    ),
)


# Bot promise → pending intent (not upcoming trip sticky).
LIVE_7937_PENDING_BOT = (
    (
        "Ừ, bạn hỏi thu nhập tháng vừa rồi. Em kiểm tra lại theo tháng nhé.",
        "earnings",
    ),
    (
        "Em kiểm tra lịch chuyến cho bạn nhé.",
        "upcoming",
    ),
)


def test_live_7937_earnings_period_not_today():
    """Bug: 'tháng vừa rồi' fell through to today because only 'tháng rồi' matched."""
    assert _earnings_period_from_text("tháng vừa rồi", "vn") == "month"
    assert (
        _earnings_period_from_text(
            "hỏi về phần thu nhập của tôi trong tháng vừa rồi.",
            "vn",
        )
        == "month"
    )


@pytest.mark.parametrize("utterance,intent,period", LIVE_7937_CLASSIFY)
def test_live_7937_classify_cases(utterance: str, intent: str, period: str | None):
    assert classify_driver_intent(utterance, "vn") == intent
    if period is not None:
        assert _earnings_period_from_text(utterance, "vn") == period


def test_live_7937_ack_does_not_eat_month_followup():
    """Bug: needle 'ừ' matched inside 'vừa' → conversational_ack 'Vâng.'"""
    assert conversational_ack_reply("trong tháng vừa rồi mà", "vn") is None
    assert classify_driver_intent("trong tháng vừa rồi mà", "vn") == "earnings"
    assert conversational_ack_reply("ừ", "vn") is not None
    assert conversational_ack_reply("ok", "vn") is not None


@pytest.mark.parametrize("bot_line,intent", LIVE_7937_PENDING_BOT)
def test_live_7937_pending_from_bot_promise(bot_line: str, intent: str):
    userdata: dict = {"driver_phone": "0888887798", "context": {}}
    context_store.load_driver_context(
        userdata,
        {
            "upcoming_trips": [
                {
                    "trip_id": "t1",
                    "status": "confirmed",
                    "customer_name": "A",
                    "pickup_address": "Lotte",
                    "scheduled_pickup": "2026-09-05T12:30:00",
                },
                {
                    "trip_id": "t2",
                    "status": "confirmed",
                    "customer_name": "B",
                    "pickup_address": "Lotte",
                    "scheduled_pickup": "2026-09-05T15:30:00",
                },
            ],
        },
    )
    context_store.set_target_trip(userdata, userdata["context"]["upcoming_trips"][1])
    pending_action.infer_from_bot_line(bot_line, userdata, lang="vn")
    pending = context_store.get_pending_driver_action(userdata)
    assert pending is not None, bot_line
    assert pending["intent"] == intent, bot_line
    if intent == "earnings":
        assert pending["args"].get("period") == "month"
    if intent == "upcoming":
        assert pending["args"].get("trip_index") == 2


def test_live_7937_orphan_delivery_promise_does_not_arm_upcoming():
    """Delivery removed: 'Em kiểm tra đơn hàng…' must not sticky-arm trip_index=2."""
    userdata: dict = {"driver_phone": "0888887798", "context": {}}
    context_store.load_driver_context(
        userdata,
        {
            "upcoming_trips": [
                {
                    "trip_id": "t1",
                    "status": "confirmed",
                    "customer_name": "A",
                    "pickup_address": "Lotte",
                    "scheduled_pickup": "2026-09-05T12:30:00",
                },
                {
                    "trip_id": "t2",
                    "status": "confirmed",
                    "customer_name": "B",
                    "pickup_address": "Lotte",
                    "scheduled_pickup": "2026-09-05T15:30:00",
                },
            ],
        },
    )
    context_store.set_target_trip(userdata, userdata["context"]["upcoming_trips"][1])
    pending_action.infer_from_bot_line(
        "Em kiểm tra đơn hàng cho bạn nhé.",
        userdata,
        lang="vn",
    )
    assert context_store.get_pending_driver_action(userdata) is None


@pytest.mark.asyncio
async def test_live_7937_month_earnings_defers_to_llm():
    utterance = "hỏi về phần thu nhập của tôi trong tháng vừa rồi."
    assert classify_driver_intent(utterance, "vn") == "earnings"
    assert _earnings_period_from_text(utterance, "vn") == "month"
    userdata: dict = {"driver_phone": "0888887798", "context": {}}
    session = MagicMock()
    session.userdata = userdata
    session.say = AsyncMock()
    await handle_driver_utterance(
        session, SimpleNamespace(text_content=utterance), lang="vn"
    )
    session.say.assert_not_called()
