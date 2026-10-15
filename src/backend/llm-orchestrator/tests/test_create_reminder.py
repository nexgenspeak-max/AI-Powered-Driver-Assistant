"""create_reminder (FR-W01): success, API failure, no trip."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from livekit.agents import StopResponse

from app.voicebot.locales.vn.constants import ERR_CANNOT_REMINDER, ERR_NO_TRIP_REMINDER
from app.voicebot.locales.vn.tools.create_reminder import create_reminder
from app.voicebot.processors import context_store

PATCH = "app.voicebot.locales.vn.tools.create_reminder.backend_api.create_reminder"


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
        await create_reminder.__wrapped__(args, ctx)
    except StopResponse:
        pass
    return ctx.session.say.await_args.args[0]


@pytest.mark.asyncio
async def test_reminder_created_for_current_trip():
    ctx = _ctx()
    with patch(PATCH, new_callable=AsyncMock, return_value={}) as api:
        spoken = await _run(ctx, {"minutes_before": 15})
    api.assert_awaited_once_with(driver_id="0900000001", trip_id="t1", remind_before_minutes=15)
    assert "15 phút" in spoken


@pytest.mark.asyncio
async def test_reminder_defaults_to_10_minutes():
    ctx = _ctx()
    with patch(PATCH, new_callable=AsyncMock, return_value={}) as api:
        await _run(ctx, {})
    assert api.await_args.kwargs["remind_before_minutes"] == 10


@pytest.mark.asyncio
async def test_reminder_api_failure_is_reported():
    ctx = _ctx()
    with patch(PATCH, new_callable=AsyncMock, side_effect=RuntimeError("503")):
        spoken = await _run(ctx, {"minutes_before": 5})
    assert ERR_CANNOT_REMINDER in spoken and "Đã đặt" not in spoken


@pytest.mark.asyncio
async def test_reminder_without_trip_does_not_call_api():
    ctx = _ctx(with_trip=False)
    with patch(PATCH, new_callable=AsyncMock) as api:
        spoken = await _run(ctx, {"minutes_before": 5})
    api.assert_not_awaited()
    assert ERR_NO_TRIP_REMINDER in spoken
