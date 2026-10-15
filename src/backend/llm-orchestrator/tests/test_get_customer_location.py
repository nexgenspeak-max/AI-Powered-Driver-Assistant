"""AVDA-47: get_customer_location reads the pickup address of the current trip in one short sentence."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from livekit.agents import StopResponse

from app.voicebot.locales.vn.constants import ERR_NO_CURRENT_TRIP, ERR_NO_LOCATION
from app.voicebot.locales.vn.tools.get_customer_location import get_customer_location
from app.voicebot.processors import context_store


def _ctx(trip: dict | None) -> MagicMock:
    userdata: dict = {"driver_phone": "0900000001", "context": {}}
    if trip:
        context_store.load_driver_context(userdata, {"upcoming_trips": [trip], "current_trip": trip})
    ctx = MagicMock()
    ctx.userdata = userdata
    ctx.session.say = AsyncMock()
    ctx.session.generate_reply = AsyncMock()
    return ctx


async def _spoken(ctx) -> str:
    try:
        await get_customer_location.__wrapped__({}, ctx)
    except StopResponse:
        pass
    calls = [c.args[0] for c in ctx.session.say.await_args_list if c.args]
    return " ".join(str(c) for c in calls)


def _trip(address: str) -> dict:
    return {"trip_id": "t1", "status": "confirmed", "customer_name": "An",
            "customer_phone": "0901111111", "pickup_address": address}


@pytest.mark.asyncio
async def test_reads_pickup_address():
    spoken = await _spoken(_ctx(_trip("12 Lê Lợi, Quận 1")))
    assert "12 Lê Lợi, Quận 1" in spoken


@pytest.mark.asyncio
async def test_missing_address_is_reported():
    spoken = await _spoken(_ctx(_trip("")))
    assert ERR_NO_LOCATION in spoken


@pytest.mark.asyncio
async def test_no_trip_is_reported():
    spoken = await _spoken(_ctx(None))
    assert ERR_NO_CURRENT_TRIP in spoken
