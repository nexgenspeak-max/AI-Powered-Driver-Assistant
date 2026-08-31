"""Cache-first tools must speak immediately so the LLM does not rewrite TTS."""
from unittest.mock import AsyncMock, MagicMock

from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.locales.vn.tools.check_upcoming_trips import check_upcoming_trips


def _userdata():
    userdata: dict = {"driver_phone": "0888887798"}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {
                    "trip_id": "t1",
                    "status": "notified",
                    "customer_name": "Trương Bá Chính",
                    "pickup_address": "Quận 1",
                }
            ],
        },
    )
    return userdata


async def test_check_upcoming_trips_speaks_count_first_not_full_list():
    context = MagicMock()
    context.userdata = _userdata()
    context.session.say = AsyncMock()

    try:
        await check_upcoming_trips.__wrapped__({"scope": "all"}, context)
    except StopResponse:
        pass
    else:
        raise AssertionError("check_upcoming_trips should StopResponse after speaking")

    spoken = context.session.say.await_args.args[0]
    assert "chuyến với" in spoken
    assert "Trương Bá Chính" in spoken
    assert "chi tiết" not in spoken.lower()


async def test_check_upcoming_trips_list_all_reads_customers():
    userdata = _userdata()
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {
                    "trip_id": "t1",
                    "status": "notified",
                    "customer_name": "An",
                    "pickup_address": "Q1",
                },
                {
                    "trip_id": "t2",
                    "status": "notified",
                    "customer_name": "Bình",
                    "pickup_address": "Q3",
                },
            ],
        },
    )
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()

    try:
        await check_upcoming_trips.__wrapped__(
            {"scope": "all", "list_all": True}, context
        )
    except StopResponse:
        pass

    spoken = context.session.say.await_args.args[0]
    assert "An" in spoken
    assert "Bình" in spoken
