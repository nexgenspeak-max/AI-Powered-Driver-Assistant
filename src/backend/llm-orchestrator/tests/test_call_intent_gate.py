"""Ambiguous call requests must ask first; stale confirmations must not dial.

Replays live session 2026-10-18 (driver-0888…798, 09:17–09:18): a menu
question armed a call, the talk moved to traffic, and the driver's "Ok."
about traffic dialled the customer.
"""
from __future__ import annotations

import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from livekit.agents import StopResponse

from app.voicebot.processors import context_store, pending_action
from app.voicebot.locales.vn.tools.call_customer import call_customer as call_vn
from app.voicebot.locales.en.tools.call_customer import call_customer as call_en

DIAL = "app.voicebot.processors.customer_call.backend_api.start_call"


def _ctx(userdata: dict) -> MagicMock:
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()
    return context


def _userdata(n: int = 2) -> dict:
    userdata: dict = {"driver_phone": "0900000001", "room_name": "driver-0900000001-test", "context": {}}
    trips = [
        {"trip_id": "t1", "status": "confirmed", "customer_name": "Nguyễn Văn Nam", "customer_phone": "+84901111111", "pickup_address": "Mỹ Đình"},
        {"trip_id": "t2", "status": "confirmed", "customer_name": "Bình", "customer_phone": "+84902222222", "pickup_address": "Pasteur"},
    ][:n]
    context_store.load_driver_context(userdata, {"upcoming_trips": trips})
    return userdata


async def _run(fn, context, args):
    try:
        return await fn.__wrapped__(args, context)
    except StopResponse:
        return "stopped"


@pytest.mark.asyncio
@pytest.mark.parametrize("clarity", ["ambiguous", None, "maybe"])
async def test_non_explicit_asks_and_never_dials(clarity):
    userdata = _userdata()
    context = _ctx(userdata)
    args = {"mode": "agent", "trip_index": 1}
    if clarity is not None:
        args["intent_clarity"] = clarity
    with patch(DIAL, new_callable=AsyncMock) as dial:
        assert await _run(call_vn, context, args) == "stopped"
    dial.assert_not_awaited()
    assert context.session.say.await_args.args[0] == "Bạn muốn mình gọi cho Nguyễn Văn Nam không?"
    pending = context_store.get_pending_driver_action(userdata)
    assert pending["intent"] == "call_customer"
    assert pending["args"] == {"mode": "agent", "intent_clarity": "explicit", "trip_index": 1}


@pytest.mark.asyncio
async def test_en_tool_asks_in_english():
    context = _ctx(_userdata(1))
    with patch(DIAL, new_callable=AsyncMock) as dial:
        assert await _run(call_en, context, {"mode": "agent", "intent_clarity": "ambiguous"}) == "stopped"
    dial.assert_not_awaited()
    assert context.session.say.await_args.args[0] == "Do you want me to call Nguyễn Văn Nam?"


@pytest.mark.asyncio
async def test_ambiguous_keeps_the_customer_message():
    userdata = _userdata(1)
    with patch(DIAL, new_callable=AsyncMock):
        await _run(call_vn, _ctx(userdata), {"mode": "agent", "intent_clarity": "ambiguous", "message": "Tài xế đến sau 5 phút"})
    assert context_store.get_pending_driver_action(userdata)["args"]["message"] == "Tài xế đến sau 5 phút"


def test_immediate_yes_executes_the_gated_call():
    userdata = _userdata()
    context_store.set_pending_driver_action(userdata, "call_customer", {"mode": "agent", "intent_clarity": "explicit", "trip_index": 1})
    assert pending_action.expire_stale(userdata, "Có", "vn") is False
    assert pending_action.should_execute(userdata, "Có", "vn") is True


def test_live_replay_menu_question_does_not_arm_a_call():
    userdata = _userdata()
    pending_action.infer_from_bot_line(
        "Mình nghe đây. Bạn muốn xem chuyến đang chạy hay cần gọi khách ngay lúc này?", userdata, lang="vn"
    )
    assert context_store.get_pending_driver_action(userdata) is None


def test_live_replay_ok_about_traffic_does_not_dial():
    userdata = _userdata()
    # Even if something armed a call earlier…
    context_store.set_pending_driver_action(userdata, "call_customer", {"mode": "agent"})
    # …the driver changes topic: the pending call is dropped.
    assert pending_action.expire_stale(userdata, "Bạn kiểm tra tình hình giao thông không?", "vn") is True
    assert context_store.get_pending_driver_action(userdata) is None
    # The later "Ok." (about the traffic answer) has nothing to confirm.
    assert pending_action.should_execute(userdata, "Ok.", "vn") is False


def test_yes_no_offer_question_still_arms_without_a_message():
    userdata = _userdata(1)
    pending_action.infer_from_bot_line("Mình gọi cho Nguyễn Văn Nam nhé?", userdata, lang="vn")
    pending = context_store.get_pending_driver_action(userdata)
    assert pending and pending["intent"] == "call_customer"
    assert not pending["args"].get("message")


def test_pending_expires_after_ttl():
    userdata = _userdata()
    context_store.set_pending_driver_action(userdata, "call_customer", {"mode": "agent"})
    userdata["context"]["_pending_driver_action"]["at"] = time.monotonic() - pending_action.PENDING_TTL_S - 1
    assert pending_action.should_execute(userdata, "Ok", "vn") is False
    assert pending_action.expire_stale(userdata, "Ok", "vn") is True


def test_gate_question_is_not_overwritten_by_bot_line_inference():
    userdata = _userdata()
    gated = {"mode": "agent", "intent_clarity": "explicit", "trip_index": 2}
    context_store.set_pending_driver_action(userdata, "call_customer", gated)
    pending_action.infer_from_bot_line("Bạn muốn mình gọi cho Bình không?", userdata, lang="vn")
    assert context_store.get_pending_driver_action(userdata)["args"] == gated


@pytest.mark.asyncio
async def test_no_to_a_gated_call_declines_without_dialling():
    from app.voicebot.processors import spoken_intent

    userdata = _userdata()
    context_store.set_pending_driver_action(userdata, "call_customer", {"mode": "agent", "intent_clarity": "explicit", "trip_index": 1})
    session = MagicMock()
    session.userdata = userdata
    session.say = AsyncMock()
    session.interrupt = MagicMock(return_value=None)
    message = MagicMock()
    message.text_content = "Không"
    with patch(DIAL, new_callable=AsyncMock) as dial:
        try:
            await spoken_intent.handle_driver_utterance(session, message, lang="vn")
        except StopResponse:
            pass
    dial.assert_not_awaited()
    assert context_store.get_pending_driver_action(userdata) is None
    assert "không làm nữa" in session.say.await_args.args[0].lower()


import pytest as _pytest

from app.voicebot.processors import call_intent as _ci


@_pytest.mark.parametrize("text", [
    "Hay là gọi khách nhỉ?",
    "hay là mình gọi khách",
    "Có nên gọi khách không?",
    "Chắc là gọi khách đi nhỉ",
    "Không biết có nên gọi không",
])
def test_vietnamese_hedges_force_a_confirmation(text):
    assert _ci.is_hedged(text, "vn")
    assert _ci.should_confirm({"intent_clarity": "explicit"}, text, "vn")


@_pytest.mark.parametrize("text", [
    "Gọi cho khách giúp tôi.",
    "Gọi khách đi",
    "Báo khách tôi đến rồi",
    "Có",
    "Gọi khách được không?",
])
def test_clear_requests_are_not_hedges(text):
    assert not _ci.is_hedged(text, "vn")
    assert not _ci.should_confirm({"intent_clarity": "explicit"}, text, "vn")


def test_english_hedges():
    assert _ci.is_hedged("Maybe call the customer?", "en")
    assert _ci.is_hedged("Should I call her?", "en")
    assert not _ci.is_hedged("Call the customer", "en")


def test_faq_advice_about_calling_does_not_arm_a_call():
    from app.voicebot.processors import context_store, pending_action

    userdata = {"driver_phone": "0900000001"}
    pending_action.infer_from_bot_line(
        "Tài xế nên chờ thêm một chút, gọi khách qua AI để nhắc nhở, hoặc báo khách vắng mặt.",
        userdata,
    )
    assert context_store.get_pending_driver_action(userdata) is None
