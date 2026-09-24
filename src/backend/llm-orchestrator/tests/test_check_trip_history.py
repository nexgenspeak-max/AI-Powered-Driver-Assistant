"""check_trip_history speaks from context and stops the LLM rewrite."""
from datetime import datetime, timezone
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
    userdata: dict = {"driver_phone": "0888887798"}
    context_store.load_driver_context(userdata, {"completed_trips": []})
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()

    await _run(context, {"scope": "completed_today"})
    assert "chưa có chuyến" in context.session.say.await_args.args[0].lower()


async def test_completed_today_counts_and_speaks():
    userdata: dict = {"driver_phone": "0888887798"}
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
    userdata: dict = {"driver_phone": "0888887798"}
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
