"""send_sms_to_customer: 'nhắn cho khách 15 phút nữa tôi đến đón' — success, failure, no trip."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from livekit.agents import StopResponse

from app.voicebot.locales.vn.constants import ERR_SMS_SEND_FAILED
from app.voicebot.locales.vn.tools.send_sms_to_customer import send_sms_to_customer
from app.voicebot.processors import context_store

PATCH = "app.voicebot.locales.vn.tools.send_sms_to_customer.backend_api.send_sms"


def _ctx(with_trip: bool = True) -> MagicMock:
    userdata: dict = {"driver_phone": "0900000001", "context": {}}
    if with_trip:
        trip = {"trip_id": "t1", "status": "confirmed", "customer_name": "An",
                "customer_phone": "0901111111", "pickup_address": "Lotte"}
        context_store.load_driver_context(userdata, {"upcoming_trips": [trip], "current_trip": trip})
    ctx = MagicMock()
    ctx.userdata = userdata
    ctx.session.say = AsyncMock()
    return ctx


async def _run(ctx, args):
    try:
        await send_sms_to_customer.__wrapped__(args, ctx)
    except StopResponse:
        pass
    return ctx.session.say.await_args.args[0]


@pytest.mark.asyncio
async def test_sends_driver_message_to_trip_customer():
    ctx = _ctx()
    with patch(PATCH, new_callable=AsyncMock, return_value={"status": "queued"}) as send:
        spoken = await _run(ctx, {"message": "15 phút nữa tôi đến đón"})
    send.assert_awaited_once()
    assert send.await_args.args[0] == "15 phút nữa tôi đến đón"
    assert send.await_args.kwargs["trip_id"] == "t1"  # backend uses the trip's customer phone
    assert "Đã gửi tin nhắn cho An" in spoken


@pytest.mark.asyncio
async def test_failure_is_reported_not_claimed_as_sent():
    ctx = _ctx()
    with patch(PATCH, new_callable=AsyncMock, side_effect=RuntimeError("Twilio 21408")):
        spoken = await _run(ctx, {"message": "15 phút nữa tôi đến đón"})
    assert ERR_SMS_SEND_FAILED in spoken
    assert "Đã gửi" not in spoken


@pytest.mark.asyncio
async def test_no_active_trip_does_not_send():
    ctx = _ctx(with_trip=False)
    with patch(PATCH, new_callable=AsyncMock) as send:
        spoken = await _run(ctx, {"message": "15 phút nữa tôi đến đón"})
    send.assert_not_awaited()
    assert "Không có chuyến" in spoken


@pytest.mark.asyncio
async def test_empty_message_asks_for_content():
    ctx = _ctx()
    with patch(PATCH, new_callable=AsyncMock) as send:
        spoken = await _run(ctx, {"message": "  "})
    send.assert_not_awaited()
    assert "nội dung" in spoken
