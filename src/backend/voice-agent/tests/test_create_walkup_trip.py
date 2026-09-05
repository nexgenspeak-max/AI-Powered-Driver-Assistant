"""Driver create_walkup_trip tool — street-hail lands as confirmed."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.locales.vn.tools.create_walkup_trip import create_walkup_trip
from app.voicebot.testing.conversation_quality import assert_no_raw_template


def _ctx(driver_phone: str = "0888887798") -> MagicMock:
    userdata = {"driver_phone": driver_phone, "room_name": "driver-test", "context": {}}
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()
    return context


async def _run_tool(fn, context, args):
    try:
        return await fn.__wrapped__(args, context)
    except StopResponse:
        return "stopped"


@pytest.mark.asyncio
async def test_create_walkup_trip_success():
    context = _ctx()
    trip = {
        "trip_id": "t-walk-1",
        "status": "confirmed",
        "customer_phone": "0901234567",
        "pickup_address": "1 Nguyễn Huệ",
        "dropoff_address": "2 Lê Lợi",
        "booked_via": "driver",
        "has_bulky_goods": True,
        "with_children": False,
    }
    with patch(
        "app.voicebot.locales.vn.tools.create_walkup_trip.backend_api.create_walkup_trip",
        new=AsyncMock(return_value=trip),
    ) as mock_create:
        result = await _run_tool(
            create_walkup_trip,
            context,
            {
                "customer_phone": "0901234567",
                "pickup_address": "1 Nguyễn Huệ",
                "dropoff_address": "2 Lê Lợi",
                "has_bulky_goods": True,
                "with_children": False,
            },
        )
    assert result == "stopped"
    mock_create.assert_awaited_once()
    kwargs = mock_create.await_args.kwargs
    assert kwargs["driver_phone"] == "0888887798"
    assert kwargs["has_bulky_goods"] is True
    assert kwargs["with_children"] is False
    spoken = context.session.say.await_args.args[0]
    assert_no_raw_template(spoken)
    assert "vãng lai" in spoken
    assert "cồng kềnh" in spoken
    assert context_store.get_current_trip(context.userdata)["trip_id"] == "t-walk-1"


@pytest.mark.asyncio
async def test_create_walkup_trip_requires_phone():
    context = _ctx()
    result = await _run_tool(
        create_walkup_trip,
        context,
        {
            "customer_phone": "",
            "pickup_address": "A",
            "dropoff_address": "B",
        },
    )
    assert result == "stopped"
    spoken = context.session.say.await_args.args[0]
    assert "số điện thoại" in spoken.lower() or "SĐT" in spoken or "điện thoại" in spoken
