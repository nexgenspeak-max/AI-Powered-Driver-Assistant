"""Voice 'đã đến rồi' must obey the same 200 m arrival geofence as the app."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from livekit.agents import StopResponse

from app.services import backend_api
from app.voicebot.processors import context_store


def _resp(status: int, body: dict):
    r = MagicMock()
    r.status_code = status
    r.json.return_value = body
    r.raise_for_status = MagicMock(side_effect=None if status < 400 else RuntimeError(f"HTTP {status}"))
    return r


@pytest.mark.asyncio
async def test_arrival_status_sends_enforce_flag_and_raises_when_far():
    client = MagicMock()
    client.patch = AsyncMock(return_value=_resp(409, {
        "detail": "Bạn còn cách điểm đón khoảng 1,4 km. Khi đến gần (trong khoảng 200 m) mới xác nhận đã đến được, bạn vẫn có thể gọi khách ngay.",
        "distance_meters": 1400, "required_radius_meters": 200,
    }))
    with patch.object(backend_api, "_get_client", return_value=client):
        with pytest.raises(backend_api.ArrivalBlocked) as exc:
            await backend_api.update_trip_status("t1", "ARRIVED_PICKUP")
    assert client.patch.await_args.kwargs["json"] == {"status": "ARRIVED_PICKUP", "enforce_arrival": True}
    assert exc.value.distance_m == 1400 and exc.value.radius_m == 200


@pytest.mark.asyncio
async def test_non_arrival_status_has_no_enforce_flag():
    client = MagicMock()
    client.patch = AsyncMock(return_value=_resp(200, {"trip_id": "t1", "status": "confirmed"}))
    with patch.object(backend_api, "_get_client", return_value=client):
        await backend_api.update_trip_status("t1", "confirmed")
    assert client.patch.await_args.kwargs["json"] == {"status": "confirmed"}


@pytest.mark.asyncio
async def test_vn_tool_speaks_the_distance_when_blocked():
    from app.voicebot.locales.vn.tools.update_trip_status import update_trip_status

    userdata: dict = {"context": {}}
    context_store.load_driver_context(userdata, {"active_trips": [
        {"trip_id": "t1", "status": "confirmed", "customer_name": "Nam", "customer_phone": "+84901111111"},
    ]})
    ctx = MagicMock()
    ctx.userdata = userdata
    ctx.session.say = AsyncMock()
    blocked = backend_api.ArrivalBlocked("Bạn còn cách điểm đón khoảng 1,4 km. …", 1400, 200)
    with patch.object(backend_api, "update_trip_status", AsyncMock(side_effect=blocked)), \
         patch.object(context_store, "resolve_customer_trip", return_value={"trip_id": "t1"}):
        with pytest.raises(StopResponse):
            await update_trip_status.__wrapped__({"status": "ARRIVED_PICKUP"}, ctx)
    assert "1,4 km" in ctx.session.say.await_args.args[0]


def test_en_message_formats_distance():
    from app.voicebot.locales.en.tools.update_trip_status import _en_blocked

    msg = _en_blocked(backend_api.ArrivalBlocked("", 1400, 200))
    assert "1.4 km" in msg and "within 200 m" in msg and "call the customer" in msg
