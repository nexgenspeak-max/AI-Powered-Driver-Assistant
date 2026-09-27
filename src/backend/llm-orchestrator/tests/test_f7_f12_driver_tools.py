"""F7–F12 coverage: FAQ already covered; cancel, SMS, status, end, traffic speak fast."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.locales.vn.tools.request_cancel_trip import request_cancel_trip
from app.voicebot.locales.vn.tools.confirm_cancel_trip import confirm_cancel_trip
from app.voicebot.locales.vn.tools.send_sms_to_customer import send_sms_to_customer
from app.voicebot.locales.vn.tools.set_driver_status import set_driver_status
from app.voicebot.locales.vn.tools.end_conversation import end_conversation
from app.voicebot.locales.vn.tools.get_trip_traffic import get_trip_traffic
from app.voicebot.locales.vn.tools.get_current_trip_info import get_current_trip_info
from app.voicebot.locales.vn.tools.get_driver_stats import get_driver_stats
from app.voicebot.testing.conversation_quality import assert_no_raw_template


def _active() -> dict:
    userdata: dict = {"driver_phone": "0900000001"}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": {
                "trip_id": "t1",
                "status": "confirmed",
                "customer_name": "An",
                "customer_phone": "+84901111111",
                "pickup_address": "Lotte",
                "eta_minutes": 8,
                "distance_km": 3.2,
                "traffic_note": "Kẹt nhẹ",
                "route_summary": "via Liễu Giai",
            },
            "bonus_info": {"today_bonus": 20000, "trips_toward_bonus": 2},
            "driver_stats": {"rating": 4.9, "acceptance_rate": 0.92},
        },
    )
    return userdata


def _ctx(userdata: dict) -> MagicMock:
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()
    return context


async def _run(fn, context, args=None):
    try:
        await fn.__wrapped__(args or {}, context)
    except StopResponse:
        return
    raise AssertionError(f"{getattr(fn, '__name__', fn)} should StopResponse")


def _swallow(coro):
    if hasattr(coro, "close"):
        coro.close()


async def test_f8_request_and_confirm_cancel():
    userdata = _active()
    context = _ctx(userdata)
    await _run(request_cancel_trip, context, {})
    spoken = context.session.say.await_args.args[0]
    assert_no_raw_template(spoken)
    assert "hủy" in spoken.lower()
    assert userdata["pending_cancel_trip_id"] == "t1"

    context.session.say = AsyncMock()
    with patch(
        "app.voicebot.locales.vn.tools.confirm_cancel_trip.backend_api.update_trip_status",
        new_callable=AsyncMock,
    ):
        await _run(confirm_cancel_trip, context, {})
    assert "hủy" in context.session.say.await_args.args[0].lower() or "Đã hủy" in context.session.say.await_args.args[0]
    assert userdata.get("pending_cancel_trip_id") is None
    assert context_store.get_current_trip(userdata) is None


async def test_f9_sms_empty_and_send():
    userdata = _active()
    context = _ctx(userdata)
    await _run(send_sms_to_customer, context, {"message": ""})
    assert "nhắn" in context.session.say.await_args.args[0].lower()

    context.session.say = AsyncMock()
    with patch(
        "app.voicebot.locales.vn.tools.send_sms_to_customer.backend_api.send_sms",
        new_callable=AsyncMock,
        return_value={"ok": True},
    ):
        await _run(send_sms_to_customer, context, {"message": "Tôi đến sau 5 phút"})
    spoken = context.session.say.await_args.args[0]
    assert_no_raw_template(spoken)
    assert "sms" in spoken.lower() or "nhắn" in spoken.lower() or "đã" in spoken.lower()


async def test_f10_traffic_and_current_speak():
    userdata = _active()
    context = _ctx(userdata)
    await _run(get_trip_traffic, context, {})
    spoken = context.session.say.await_args.args[0]
    assert_no_raw_template(spoken)
    assert "Kẹt" in spoken or "Liễu" in spoken or "8" in spoken

    context.session.say = AsyncMock()
    await _run(get_current_trip_info, context, {})
    assert "An" in context.session.say.await_args.args[0] or "Lotte" in context.session.say.await_args.args[0]


async def test_f12_status_stats_bonus_and_end_guard():
    userdata = _active()
    context = _ctx(userdata)
    with patch(
        "app.voicebot.locales.vn.tools.set_driver_status.backend_api.set_driver_online_status",
        new_callable=AsyncMock,
    ):
        await _run(set_driver_status, context, {"online": False})
    assert "offline" in context.session.say.await_args.args[0].lower() or "nghỉ" in context.session.say.await_args.args[0].lower() or "tắt" in context.session.say.await_args.args[0].lower()

    context.session.say = AsyncMock()
    await _run(get_driver_stats, context, {})
    assert context.session.say.await_count >= 1

    userdata["customer_call_active"] = True
    context.session.say = AsyncMock()
    await _run(end_conversation, context, {})
    spoken = context.session.say.await_args.args[0]
    assert "cuộc gọi" in spoken.lower() or "chưa" in spoken.lower()
