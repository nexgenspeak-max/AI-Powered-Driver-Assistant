"""Mid-session trip_offer must refresh context_store so cache tools see the new trip."""
from unittest.mock import AsyncMock, patch

from app.voicebot.processors import context_store
from app.voicebot.processors.nudge import build_nudge_message


def _three_trips() -> dict:
    return {
        "current_trip": None,
        "upcoming_trips": [
            {"trip_id": "t1", "status": "confirmed", "customer_name": "A", "pickup_address": "Q1"},
            {"trip_id": "t2", "status": "confirmed", "customer_name": "B", "pickup_address": "Q3"},
            {"trip_id": "t3", "status": "confirmed", "customer_name": "C", "pickup_address": "Q5"},
        ],
    }


def _four_trips() -> dict:
    payload = _three_trips()
    payload["upcoming_trips"] = [
        *payload["upcoming_trips"],
        {
            "trip_id": "t4",
            "status": "notified",
            "customer_name": "Trương Bá Chính",
            "pickup_address": "12 Nguyễn Huệ, Quận 1, Hồ Chí Minh",
        },
    ]
    return payload


async def test_new_trip_offer_reloads_context_and_names_the_fourth_trip():
    userdata = {"driver_phone": "0900000001"}
    context_store.load_driver_context(userdata, _three_trips())
    assert len(context_store.get_schedule_trips(userdata)) == 3

    with patch(
        "app.voicebot.processors.nudge.backend_api.get_driver_context",
        new_callable=AsyncMock,
        return_value=_four_trips(),
    ) as fetch:
        text = await build_nudge_message(
            "new_trip_offer",
            {
                "related_trip_id": "t4",
                "customer_name": "stale-name",
                "pickup_address": "stale-addr",
            },
            lang="vi",
            userdata=userdata,
        )

    fetch.assert_awaited_once_with("0900000001")
    assert len(context_store.get_schedule_trips(userdata)) == 4
    assert "Trương Bá Chính" in text
    assert "stale-name" not in text
    assert "nhận chuyến" in text


async def test_new_trip_offer_english_and_payload_fallback_when_refresh_fails():
    userdata = {"driver_phone": "0900000001"}
    context_store.load_driver_context(userdata, _three_trips())

    with patch(
        "app.voicebot.processors.nudge.backend_api.get_driver_context",
        new_callable=AsyncMock,
        side_effect=RuntimeError("trip-service down"),
    ):
        text = await build_nudge_message(
            "new_trip_offer",
            {
                "related_trip_id": "t4",
                "customer_name": "Lan",
                "pickup_address": "Quận 7",
            },
            lang="en",
            userdata=userdata,
        )

    assert len(context_store.get_schedule_trips(userdata)) == 3
    assert "Lan" in text
    assert "accept" in text.lower()


async def test_schedule_updated_silent_refresh_only():
    userdata = {"driver_phone": "0900000001"}
    context_store.load_driver_context(userdata, _three_trips())

    with patch(
        "app.voicebot.processors.nudge.backend_api.get_driver_context",
        new_callable=AsyncMock,
        return_value=_four_trips(),
    ) as fetch:
        text = await build_nudge_message("schedule_updated", {}, lang="vi", userdata=userdata)

    fetch.assert_awaited_once_with("0900000001")
    assert text == ""
    assert len(context_store.get_schedule_trips(userdata)) == 4


async def test_new_trip_offer_long_address_has_no_double_period():
    userdata = {"driver_phone": "0900000001"}
    with patch(
        "app.voicebot.processors.nudge.backend_api.get_driver_context",
        new_callable=AsyncMock,
        side_effect=RuntimeError("down"),
    ):
        text = await build_nudge_message(
            "new_trip_offer",
            {
                "related_trip_id": "tx",
                "customer_name": "Nguyễn Thu Hà",
                "pickup_address": "Đền Quán Thánh, 190 Quán Thánh, Ba Đình, Hà Nội",
            },
            lang="vi",
            userdata=userdata,
        )
    assert "Quán Thánh" in text
    assert ".." not in text and "…." not in text
