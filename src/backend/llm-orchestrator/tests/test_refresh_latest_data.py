"""refresh_latest_data speaks the fresh reply and skips a second LLM pass."""
from unittest.mock import AsyncMock, MagicMock, patch

from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.locales.vn.constants import ERR_NO_PENDING_REFRESH
from app.voicebot.locales.vn.tools.refresh_latest_data import refresh_latest_data


async def _run(context, args=None):
    try:
        await refresh_latest_data.__wrapped__(args or {}, context)
    except StopResponse:
        return
    raise AssertionError("refresh_latest_data should StopResponse after speaking")


async def test_refresh_without_pending_speaks_error():
    context = MagicMock()
    context.userdata = {"driver_phone": "0900000001", "context": {}}
    context.session.say = AsyncMock()

    await _run(context)

    context.session.say.assert_awaited_once()
    assert context.session.say.await_args.args[0] == ERR_NO_PENDING_REFRESH


async def test_refresh_today_earnings_speaks_fresh_totals():
    userdata: dict = {"driver_phone": "0900000001"}
    context_store.load_driver_context(
        userdata,
        {"today_earnings": {"total_earnings": 1000, "trip_count": 1}},
    )
    context_store.set_pending_refresh(userdata, "today_earnings")
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()

    with patch(
        "app.voicebot.locales.vn.tools.refresh_latest_data.backend_api.get_today_earnings",
        new_callable=AsyncMock,
        return_value={"total_earnings": 500000, "trip_count": 6, "bonus_earnings": 0},
    ):
        await _run(context)

    spoken = context.session.say.await_args.args[0]
    assert "6 chuyến" in spoken
    assert context_store.pop_pending_refresh(userdata) == ("", {})
