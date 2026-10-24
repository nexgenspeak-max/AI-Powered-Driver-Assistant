"""check_trip_history speaks from context and stops the LLM rewrite."""
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.locales.vn.tools.check_trip_history import check_trip_history


def _today_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _run(context, args):
    try:
        await check_trip_history.__wrapped__(args, context)
    except StopResponse:
        return
    raise AssertionError("check_trip_history should StopResponse")


async def test_completed_today_empty():
    userdata: dict = {"driver_phone": "0900000001"}
    context_store.load_driver_context(userdata, {"completed_trips": []})
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()

    await _run(context, {"scope": "completed_today"})
    assert "chưa có chuyến" in context.session.say.await_args.args[0].lower()


async def test_completed_today_counts_and_speaks():
    userdata: dict = {"driver_phone": "0900000001"}
    context_store.load_driver_context(
        userdata,
        {
            "completed_trips": [
                {
                    "trip_id": "c1",
                    "status": "completed",
                    "customer_name": "An",
                    "pickup_address": "Q1",
                    "updated_at": _today_iso(),
                },
                {
                    "trip_id": "old",
                    "status": "completed",
                    "customer_name": "Cũ",
                    "updated_at": "2020-01-01T00:00:00+00:00",
                },
            ]
        },
    )
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()

    await _run(context, {"scope": "completed_today"})
    spoken = context.session.say.await_args.args[0]
    assert "1 chuyến" in spoken
    assert "An" in spoken
    assert "Cũ" not in spoken


async def test_cancelled_today_empty_and_with_rows():
    userdata: dict = {"driver_phone": "0900000001"}
    context_store.load_driver_context(userdata, {"cancelled_trips": []})
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()
    await _run(context, {"scope": "cancelled_today"})
    assert "hủy" in context.session.say.await_args.args[0].lower()

    context_store.load_driver_context(
        userdata,
        {
            "cancelled_trips": [
                {
                    "trip_id": "x",
                    "status": "cancelled",
                    "customer_name": "Bình",
                    "updated_at": _today_iso(),
                }
            ]
        },
    )
    context.session.say = AsyncMock()
    await _run(context, {"scope": "cancelled_today"})
    assert "Bình" in context.session.say.await_args.args[0]


def _days_ago_iso(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


async def test_yesterday_and_last_7_days_windows():
    userdata: dict = {"driver_phone": "0900000001"}
    context_store.load_driver_context(
        userdata,
        {
            "completed_trips": [
                {"trip_id": "a", "status": "completed", "customer_name": "An", "updated_at": _today_iso()},
                {"trip_id": "b", "status": "completed", "customer_name": "Bình", "updated_at": _days_ago_iso(1)},
                {"trip_id": "c", "status": "completed", "customer_name": "Cúc", "updated_at": _days_ago_iso(3)},
                {"trip_id": "d", "status": "completed", "customer_name": "Dũng", "updated_at": _days_ago_iso(9)},
            ]
        },
    )
    context = MagicMock()
    context.userdata = userdata

    context.session.say = AsyncMock()
    await _run(context, {"scope": "completed", "day": "yesterday"})
    spoken = context.session.say.await_args.args[0]
    assert spoken.startswith("Hôm qua") and "1 chuyến" in spoken and "Bình" in spoken

    context.session.say = AsyncMock()
    await _run(context, {"scope": "completed", "day": "last_7_days"})
    spoken = context.session.say.await_args.args[0]
    assert spoken.startswith("Bảy ngày qua") and "3 chuyến" in spoken  # a, b, c — not d

    # Legacy scope values from older prompts still resolve to today.
    context.session.say = AsyncMock()
    await _run(context, {"scope": "completed_today"})
    assert "Hôm nay" in context.session.say.await_args.args[0]


async def test_en_twin_and_capped_note():
    from app.voicebot.locales.en.tools.check_trip_history import check_trip_history as en_tool
    from app.voicebot.processors.trip_history_reply import CONTEXT_TRIP_CAP

    rows = [
        {"trip_id": f"t{i}", "status": "completed", "customer_name": "X", "updated_at": _days_ago_iso(i % 5)}
        for i in range(CONTEXT_TRIP_CAP)
    ]
    userdata: dict = {"driver_phone": "0900000001"}
    context_store.load_driver_context(userdata, {"completed_trips": rows})
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()
    try:
        await en_tool.__wrapped__({"scope": "completed", "day": "last_7_days"}, context)
    except StopResponse:
        pass
    spoken = context.session.say.await_args.args[0]
    assert spoken.startswith("In the last 7 days") and f"{CONTEXT_TRIP_CAP} trips" in spoken
    assert "most recent trips only" in spoken
