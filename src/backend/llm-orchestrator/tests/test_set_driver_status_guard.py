"""AVDA-119: going offline with a trip in progress is refused and the driver is told why."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from livekit.agents import StopResponse

from app.voicebot.locales.en.constants import ERR_OFFLINE_ACTIVE_TRIP as EN_ACTIVE
from app.voicebot.locales.en.tools.set_driver_status import set_driver_status as en_tool
from app.voicebot.locales.vn.constants import ERR_DRIVER_STATUS_FAIL, ERR_OFFLINE_ACTIVE_TRIP
from app.voicebot.locales.vn.tools.set_driver_status import set_driver_status as vn_tool

VN_PATCH = "app.voicebot.locales.vn.tools.set_driver_status.backend_api.set_driver_online_status"
EN_PATCH = "app.voicebot.locales.en.tools.set_driver_status.backend_api.set_driver_online_status"


def _http_error(status: int) -> httpx.HTTPStatusError:
    req = httpx.Request("PATCH", "http://trip/api/v1/drivers/me/status")
    return httpx.HTTPStatusError("err", request=req, response=httpx.Response(status, request=req))


def _ctx() -> MagicMock:
    ctx = MagicMock()
    ctx.userdata = {"driver_phone": "0900000001", "context": {}}
    ctx.session.say = AsyncMock()
    return ctx


async def _run(tool, ctx, args):
    try:
        await tool.__wrapped__(args, ctx)
    except StopResponse:
        pass
    return ctx.session.say.await_args.args[0]


@pytest.mark.asyncio
async def test_offline_refused_when_trip_in_progress():
    ctx = _ctx()
    with patch(VN_PATCH, new_callable=AsyncMock, side_effect=_http_error(409)):
        spoken = await _run(vn_tool, ctx, {"online": False})
    assert ERR_OFFLINE_ACTIVE_TRIP in spoken
    assert "driver" not in ctx.userdata["context"]  # session state not switched to offline


@pytest.mark.asyncio
async def test_offline_refused_english():
    ctx = _ctx()
    with patch(EN_PATCH, new_callable=AsyncMock, side_effect=_http_error(409)):
        spoken = await _run(en_tool, ctx, {"online": False})
    assert EN_ACTIVE in spoken


@pytest.mark.asyncio
async def test_other_http_error_uses_generic_message():
    ctx = _ctx()
    with patch(VN_PATCH, new_callable=AsyncMock, side_effect=_http_error(503)):
        spoken = await _run(vn_tool, ctx, {"online": False})
    assert ERR_DRIVER_STATUS_FAIL in spoken


@pytest.mark.asyncio
async def test_offline_allowed_without_active_trip():
    ctx = _ctx()
    with patch(VN_PATCH, new_callable=AsyncMock, return_value=None) as api:
        spoken = await _run(vn_tool, ctx, {"online": False})
    api.assert_awaited_once_with("0900000001", False)
    assert ctx.userdata["context"]["driver"]["status"] == "offline"
    assert ERR_OFFLINE_ACTIVE_TRIP not in spoken and ERR_DRIVER_STATUS_FAIL not in spoken
