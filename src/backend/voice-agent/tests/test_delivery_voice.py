"""Delivery voice: list orders + call sender/recipient (text-in)."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.processors.spoken_intent import (
    classify_driver_intent,
    delivery_call_party_from_text,
    handle_driver_utterance,
)
from app.voicebot.locales.vn.tools.check_delivery_orders import check_delivery_orders
from app.voicebot.locales.vn.tools.call_delivery_party import call_delivery_party
from app.voicebot.testing.conversation_quality import assert_no_raw_template


def _orders_userdata(*statuses: str) -> dict:
    userdata: dict = {"driver_phone": "0888887798", "room_name": "driver-test"}
    orders = []
    for i, st in enumerate(statuses, 1):
        orders.append(
            {
                "order_id": f"o{i}",
                "status": st,
                "sender_phone": f"+84901{i:07d}",
                "recipient_name": f"Nhận {i}",
                "recipient_phone": f"+84902{i:07d}",
                "recipient_address": f"Địa chỉ {i}",
            }
        )
    context_store.load_driver_context(userdata, {"delivery_orders": orders})
    return userdata


def _ctx(userdata: dict) -> MagicMock:
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()
    return context


async def _run_tool(fn, context, args):
    try:
        return await fn.__wrapped__(args, context)
    except StopResponse:
        return "stopped"


def test_intent_delivery_orders_and_calls():
    assert classify_driver_intent("Tôi còn mấy đơn hàng?", "vn") == "delivery_orders"
    assert classify_driver_intent("có bao nhiêu đơn", "vn") == "delivery_orders"
    assert classify_driver_intent("đơn giao hàng", "vn") == "delivery_orders"
    assert classify_driver_intent("how many deliveries", "en") == "delivery_orders"
    assert classify_driver_intent("Gọi người gửi giúp", "vn") == "call_delivery_party"
    assert classify_driver_intent("gọi người giao", "vn") == "call_delivery_party"
    assert classify_driver_intent("gọi người nhận", "vn") == "call_delivery_party"
    assert classify_driver_intent("call the sender", "en") == "call_delivery_party"
    assert classify_driver_intent("call the recipient", "en") == "call_delivery_party"
    # Must not steal taxi call
    assert classify_driver_intent("Gọi cho khách giúp tôi", "vn") == "call_customer"
    assert delivery_call_party_from_text("gọi người giao", "vn") == "sender"
    assert delivery_call_party_from_text("gọi người nhận", "vn") == "recipient"


@pytest.mark.asyncio
async def test_check_delivery_orders_speaks_count():
    context = _ctx(_orders_userdata("pending", "delivering", "delivered"))
    result = await _run_tool(check_delivery_orders, context, {"active_only": True})
    assert result == "stopped"
    spoken = context.session.say.await_args.args[0]
    assert_no_raw_template(spoken)
    assert "2 đơn" in spoken


@pytest.mark.asyncio
async def test_check_delivery_orders_detail():
    context = _ctx(_orders_userdata("pending"))
    await _run_tool(check_delivery_orders, context, {"order_index": 1})
    spoken = context.session.say.await_args.args[0]
    assert "Nhận 1" in spoken or "Địa chỉ 1" in spoken


@pytest.mark.asyncio
async def test_utterance_mấy_đơn_speaks():
    userdata = _orders_userdata("picked_up")
    session = MagicMock()
    session.userdata = userdata
    session.say = AsyncMock()
    try:
        await handle_driver_utterance(
            session, SimpleNamespace(text_content="còn mấy đơn hàng"), lang="vn"
        )
    except StopResponse:
        pass
    assert session.say.await_count >= 1
    assert "1 đơn" in session.say.await_args.args[0]


@pytest.mark.asyncio
async def test_call_recipient_dials_contact():
    context = _ctx(_orders_userdata("delivering"))
    with patch(
        "app.voicebot.locales.vn.tools.call_delivery_party.contact_call.start_agent_call_to_contact",
        new_callable=AsyncMock,
        return_value=("agent", ""),
    ) as dial:
        result = await _run_tool(
            call_delivery_party, context, {"party": "recipient", "mode": "agent"}
        )
    assert result == ("agent", "")
    dial.assert_awaited_once()
    assert dial.await_args.args[1].startswith("+84902")


@pytest.mark.asyncio
async def test_call_sender_self_blocked():
    userdata = _orders_userdata("pending")
    userdata["context"]["delivery_orders"][0]["sender_phone"] = "0888887798"
    context = _ctx(userdata)
    with patch(
        "app.voicebot.locales.vn.tools.call_delivery_party.contact_call.start_agent_call_to_contact",
        new_callable=AsyncMock,
    ) as dial:
        result = await _run_tool(call_delivery_party, context, {"party": "sender"})
    assert result == "stopped"
    dial.assert_not_awaited()
    assert "số của bạn" in context.session.say.await_args.args[0].lower()


@pytest.mark.asyncio
async def test_call_disambiguates_multiple():
    context = _ctx(_orders_userdata("pending", "delivering"))
    with patch(
        "app.voicebot.locales.vn.tools.call_delivery_party.contact_call.start_agent_call_to_contact",
        new_callable=AsyncMock,
    ) as dial:
        result = await _run_tool(call_delivery_party, context, {"party": "recipient"})
    assert result == "stopped"
    dial.assert_not_awaited()
    assert "nhiều đơn" in context.session.say.await_args.args[0].lower()


@pytest.mark.asyncio
async def test_mark_delivered_by_utterance():
    userdata = _orders_userdata("delivering")
    session = MagicMock()
    session.userdata = userdata
    session.say = AsyncMock()
    with patch(
        "app.voicebot.locales.vn.tools.update_delivery_order_status.backend_api.update_delivery_order_status",
        new_callable=AsyncMock,
        return_value={"order_id": "o1", "status": "delivered"},
    ):
        try:
            await handle_driver_utterance(
                session, SimpleNamespace(text_content="đã giao xong đơn 1"), lang="vn"
            )
        except StopResponse:
            pass
    spoken = session.say.await_args.args[0]
    assert "đã giao" in spoken.lower() or "ghi nhận" in spoken.lower()
    assert userdata["context"]["delivery_orders"][0]["status"] == "delivered"


@pytest.mark.asyncio
async def test_list_asks_and_confirm_marks_delivered():
    userdata = _orders_userdata("delivering")
    session = MagicMock()
    session.userdata = userdata
    session.say = AsyncMock()
    try:
        await handle_driver_utterance(
            session, SimpleNamespace(text_content="còn mấy đơn hàng"), lang="vn"
        )
    except StopResponse:
        pass
    assert "giao xong chưa" in session.say.await_args.args[0].lower()
    pending = context_store.get_pending_driver_action(userdata)
    assert pending and pending["intent"] == "update_delivery_order_status"

    session.say = AsyncMock()
    with patch(
        "app.voicebot.locales.vn.tools.update_delivery_order_status.backend_api.update_delivery_order_status",
        new_callable=AsyncMock,
        return_value={"order_id": "o1", "status": "delivered"},
    ):
        try:
            await handle_driver_utterance(
                session, SimpleNamespace(text_content="rồi"), lang="vn"
            )
        except StopResponse:
            pass
    assert "ghi nhận" in session.say.await_args.args[0].lower() or "đã giao" in session.say.await_args.args[0].lower()


@pytest.mark.asyncio
async def test_picked_up_and_start_delivering():
    from app.voicebot.locales.vn.tools.update_delivery_order_status import (
        update_delivery_order_status,
    )

    context = _ctx(_orders_userdata("pending"))
    with patch(
        "app.voicebot.locales.vn.tools.update_delivery_order_status.backend_api.update_delivery_order_status",
        new_callable=AsyncMock,
        return_value={"order_id": "o1", "status": "picked_up"},
    ):
        await _run_tool(update_delivery_order_status, context, {"status": "picked_up"})
    assert "đã lấy" in context.session.say.await_args.args[0].lower()

    context = _ctx(_orders_userdata("picked_up"))
    with patch(
        "app.voicebot.locales.vn.tools.update_delivery_order_status.backend_api.update_delivery_order_status",
        new_callable=AsyncMock,
        return_value={"order_id": "o1", "status": "delivering"},
    ):
        await _run_tool(update_delivery_order_status, context, {"status": "delivering"})
    assert "đang giao" in context.session.say.await_args.args[0].lower()


def test_status_intent_phrases():
    assert classify_driver_intent("đã giao xong đơn 1", "vn") == "update_delivery_status"
    assert classify_driver_intent("đã lấy hàng", "vn") == "update_delivery_status"
    assert classify_driver_intent("bắt đầu giao", "vn") == "update_delivery_status"
    assert classify_driver_intent("trả hàng", "vn") == "update_delivery_status"
    assert classify_driver_intent("delivery complete", "en") == "update_delivery_status"
