"""Q&A take 2026-10-18: 'còn bao xa tới điểm đón' answered with the ride
route, bulky luggage and fare were reported as unknown."""
from unittest.mock import AsyncMock, patch

import pytest

from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import (
    driver_leg_to_trip,
    format_driver_leg,
    format_traffic_info,
    format_trip_detail,
    trip_extras,
)
from app.voicebot.processors.trip_response import build_current_trip_response

TRIP = {
    "trip_id": "t1",
    "status": "confirmed",
    "customer_name": "Nguyễn Thu Hà",
    "pickup_address": "Đền Quán Thánh, 190 Quán Thánh, Ba Đình, Hà Nội",
    "dropoff_address": "Lotte Center, 54 Liễu Giai, Ba Đình, Hà Nội",
    "pickup_time": "13:16",
    "distance_km": 3.7,
    "eta_minutes": 11,
    "estimated_fare": 59400,
    "has_bulky_goods": True,
    "note": "Khách mang 1 vali lớn",
}
ROUTE = {
    "stops": [
        {"trip_id": "t0", "kind": "dropoff", "distance_m": 1000, "eta_minutes": 4},
        {"trip_id": "t1", "kind": "pickup", "distance_m": 2600, "eta_minutes": 10.6},
        {"trip_id": "t1", "kind": "dropoff", "distance_m": 3700, "eta_minutes": 11},
    ]
}


def test_driver_leg_sums_stops_up_to_the_trip_pickup():
    assert driver_leg_to_trip(ROUTE, TRIP) == {"kind": "pickup", "km": 3.6, "minutes": 15}
    picked = {**TRIP, "status": "picked_up"}
    assert driver_leg_to_trip(ROUTE, picked)["kind"] == "dropoff"
    assert driver_leg_to_trip(None, TRIP) is None
    assert driver_leg_to_trip({"stops": []}, TRIP) is None


def test_traffic_answer_leads_with_the_drivers_leg_and_has_no_double_period():
    text = format_traffic_info(TRIP, "vi", driver_leg_to_trip(ROUTE, TRIP))
    assert text.startswith("Từ chỗ bạn tới điểm đón khoảng 3,6 km, mất 15 phút.")
    assert "3,7 km" in text and ".." not in text
    assert "Google Maps" not in format_traffic_info({}, "vi")
    en = format_traffic_info(TRIP, "en", driver_leg_to_trip(ROUTE, TRIP))
    assert en.startswith("From where you are to the pickup: about 3.6 km, 15 minutes.")


def test_trip_extras_are_spoken_with_the_trip_detail():
    assert trip_extras(TRIP, "vi") == "Khách có hàng cồng kềnh. Ghi chú: Khách mang 1 vali lớn."
    assert "bulky luggage" in trip_extras(TRIP, "en")
    assert trip_extras({}, "vi") == ""
    assert "vali lớn" in format_trip_detail(TRIP, 1, "vi")


def test_current_trip_response_carries_fare_extras_and_leg():
    resp = build_current_trip_response(TRIP, "vi", leg=driver_leg_to_trip(ROUTE, TRIP))
    rows = "\n".join(resp.follow_up_knowledge)
    assert "59.400đ" in rows
    assert "hàng cồng kềnh" in rows
    assert "driver_to_next_stop: Từ chỗ bạn tới điểm đón khoảng 3,6 km" in rows
    assert "has_bulky_goods: yes" in "\n".join(resp.knowledge_data)
    assert format_driver_leg(None) == ""


@pytest.mark.asyncio
async def test_live_refresh_feeds_the_traffic_reply():
    from app.voicebot.locales.vn.tools.get_trip_traffic import _format_traffic_reply
    from app.voicebot.processors.live_context import refresh_driver_context

    userdata = {"driver_phone": "0900000001"}
    fresh = {"current_trip": TRIP, "upcoming_trips": [TRIP], "optimized_route": ROUTE}
    with patch("app.voicebot.processors.live_context.backend_api.get_driver_context",
               new_callable=AsyncMock, return_value=fresh) as fetch:
        assert await refresh_driver_context(userdata)
    fetch.assert_awaited_once_with("0900000001")
    reply = _format_traffic_reply(userdata, {})
    assert "3,6 km" in reply.response_knowledge


@pytest.mark.asyncio
async def test_live_refresh_failure_keeps_the_snapshot():
    from app.voicebot.processors.live_context import refresh_driver_context

    userdata = {"driver_phone": "0900000001"}
    with patch("app.voicebot.processors.live_context.backend_api.get_driver_context",
               new_callable=AsyncMock, side_effect=RuntimeError("down")):
        assert not await refresh_driver_context(userdata)


def test_trip_tools_refresh_before_answering():
    import inspect
    from app.voicebot.locales.vn.tools import get_current_trip_info, get_trip_traffic
    from app.voicebot.locales.en.tools import get_current_trip_info as en_cur, get_trip_traffic as en_tr

    for mod in (get_current_trip_info, get_trip_traffic, en_cur, en_tr):
        assert "await refresh_driver_context(context.userdata)" in inspect.getsource(mod)


def test_single_trip_count_states_the_count_and_time():
    from app.voicebot.processors.trip_format import format_trip_count_summary

    assert format_trip_count_summary([TRIP], "vi") == "Bạn có 1 chuyến: đón Nguyễn Thu Hà lúc 13:16."
    assert format_trip_count_summary([TRIP], "en") == "You have 1 trip: pick up Nguyễn Thu Hà at 13:16."
