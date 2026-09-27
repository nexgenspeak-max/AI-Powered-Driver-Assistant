"""get_today_earnings must speak from cache and skip the LLM rewrite."""
from unittest.mock import AsyncMock, MagicMock

from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.locales.vn.tools.get_today_earnings import get_today_earnings


def _userdata():
    userdata: dict = {"driver_phone": "0900000001"}
    context_store.load_driver_context(
        userdata,
        {
            "today_earnings": {
                "total_earnings": 350000,
                "trip_count": 4,
                "bonus_earnings": 20000,
                "hours_online": 3.5,
            }
        },
    )
    return userdata


async def test_get_today_earnings_speaks_and_stops_llm_rewrite():
    context = MagicMock()
    context.userdata = _userdata()
    context.session.say = AsyncMock()

    try:
        await get_today_earnings.__wrapped__({}, context)
    except StopResponse:
        pass
    else:
        raise AssertionError("get_today_earnings should StopResponse after speaking")

    context.session.say.assert_awaited_once()
    spoken = context.session.say.await_args.args[0]
    assert "4 chuyến" in spoken
    assert "350.000đ" in spoken
    assert "mới nhất" not in spoken
    topic, _args = context_store.pop_pending_refresh(context.userdata)
    assert topic == "today_earnings"
