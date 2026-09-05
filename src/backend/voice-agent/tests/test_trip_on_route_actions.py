"""F6 on-route tools: update status, extend wait, no-show, trip issue — speak + stop."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.locales.vn.tools.update_trip_status import update_trip_status
from app.voicebot.locales.vn.tools.extend_wait_time import extend_wait_time
from app.voicebot.locales.vn.tools.report_customer_no_show import report_customer_no_show
from app.voicebot.locales.vn.tools.report_trip_issue import report_trip_issue
from app.voicebot.testing.conversation_quality import assert_no_raw_template


def _active_userdata() -> dict:
    userdata: dict = {"driver_phone": "0888887798"}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": {
                "trip_id": "t-active",
                "status": "confirmed",
                "customer_name": "An",
                "customer_phone": "+84901111111",
                "pickup_address": "Lotte",
                "wait_extra_minutes": 2,
            },
            "upcoming_trips": [],
        },
    )
    return userdata


def _ctx(userdata: dict) -> MagicMock:
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()
    return context


async def _run(fn, context, args):
    try:
        await fn.__wrapped__(args, context)
    except StopResponse:
        return
    raise AssertionError(f"{fn.__name__} should StopResponse")


async def test_update_status_no_trip_speaks():
    userdata: dict = {"driver_phone": "0888887798"}
    context_store.load_driver_context(userdata, {"current_trip": None, "upcoming_trips": []})
    context = _ctx(userdata)
    await _run(update_trip_status, context, {"status": "ARRIVED_PICKUP"})
    spoken = context.session.say.await_args.args[0]
    assert_no_raw_template(spoken)
    assert "không có chuyến" in spoken.lower()


async def test_update_status_arrived_patches_and_speaks():
    userdata = _active_userdata()
    context = _ctx(userdata)
    with patch(
        "app.voicebot.locales.vn.tools.update_trip_status.backend_api.update_trip_status",
        new_callable=AsyncMock,
        return_value={"trip_id": "t-active", "status": "arrived_pickup"},
    ):
        await _run(update_trip_status, context, {"status": "ARRIVED_PICKUP"})
    spoken = context.session.say.await_args.args[0]
    assert "đã đến điểm đón" in spoken
    assert context_store.get_current_trip(userdata)["status"] == "arrived_pickup"


def _swallow_sync(coro):
    if hasattr(coro, "close"):
        coro.close()


async def test_extend_wait_adds_minutes():
    userdata = _active_userdata()
    context = _ctx(userdata)
    with patch(
        "app.voicebot.locales.vn.tools.extend_wait_time.context_store.schedule_sync",
        side_effect=_swallow_sync,
    ):
        await _run(extend_wait_time, context, {"minutes": 5})
    spoken = context.session.say.await_args.args[0]
    assert "5 phút" in spoken
    assert "7 phút" in spoken  # 2 + 5
    assert context_store.get_current_trip(userdata)["wait_extra_minutes"] == 7


async def test_extend_wait_no_trip():
    userdata: dict = {"driver_phone": "0888887798"}
    context_store.load_driver_context(userdata, {"current_trip": None})
    context = _ctx(userdata)
    await _run(extend_wait_time, context, {"minutes": 3})
    assert "Không có chuyến" in context.session.say.await_args.args[0]


async def test_no_show_clears_current_trip():
    userdata = _active_userdata()
    context = _ctx(userdata)
    with patch(
        "app.voicebot.locales.vn.tools.report_customer_no_show.context_store.schedule_sync",
        side_effect=_swallow_sync,
    ):
        await _run(report_customer_no_show, context, {})
    spoken = context.session.say.await_args.args[0]
    assert "không xuất hiện" in spoken
    assert context_store.get_current_trip(userdata) is None


async def test_trip_issue_records_label():
    userdata = _active_userdata()
    context = _ctx(userdata)
    with patch(
        "app.voicebot.locales.vn.tools.report_trip_issue.context_store.schedule_sync",
        side_effect=_swallow_sync,
    ):
        await _run(
            report_trip_issue,
            context,
            {"issue_type": "wrong_address", "description": "sai số nhà"},
        )
    spoken = context.session.say.await_args.args[0]
    assert "địa chỉ sai" in spoken
    trip = context_store.get_current_trip(userdata)
    assert trip["last_issue"]["issue_type"] == "wrong_address"
