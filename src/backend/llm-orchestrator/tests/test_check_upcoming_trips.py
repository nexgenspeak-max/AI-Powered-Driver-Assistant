"""Cache-first tools must speak immediately so the LLM does not rewrite TTS."""
from unittest.mock import AsyncMock, MagicMock

from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.processors.schedule_reply import format_schedule_reply
from app.voicebot.locales.vn.tools.check_upcoming_trips import check_upcoming_trips


def _userdata():
    userdata: dict = {"driver_phone": "0900000001"}
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
    assert "Bạn có 1 chuyến" in spoken
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


async def test_check_upcoming_trips_empty_schedule():
    userdata: dict = {"driver_phone": "0900000001"}
    context_store.load_driver_context(
        userdata, {"current_trip": None, "upcoming_trips": [], "active_trip": None}
    )
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()

    try:
        await check_upcoming_trips.__wrapped__({"scope": "all"}, context)
    except StopResponse:
        pass

    spoken = context.session.say.await_args.args[0]
    assert "không có chuyến" in spoken.lower()


async def test_check_upcoming_trips_index_sets_target_and_detail():
    userdata = _userdata()
    context_store.load_driver_context(
        userdata,
        {
            "upcoming_trips": [
                {
                    "trip_id": "t1",
                    "status": "notified",
                    "customer_name": "An",
                    "pickup_address": "Lotte Liễu Giai",
                },
                {
                    "trip_id": "t2",
                    "status": "confirmed",
                    "customer_name": "Bình",
                    "pickup_address": "Pasteur",
                },
            ]
        },
    )
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()

    try:
        await check_upcoming_trips.__wrapped__(
            {"scope": "all", "trip_index": 2}, context
        )
    except StopResponse:
        pass

    target = context_store.get_target_trip(userdata)
    assert target is not None
    assert target["trip_id"] == "t2"
    spoken = context.session.say.await_args.args[0]
    assert "Bình" in spoken
    assert "Pasteur" in spoken


def test_format_schedule_awaiting_scope_and_en_empty():
    userdata: dict = {"driver_phone": "0900000001"}
    context_store.load_driver_context(
        userdata,
        {
            "upcoming_trips": [
                {
                    "trip_id": "t1",
                    "status": "confirmed",
                    "customer_name": "An",
                    "pickup_address": "Q1",
                },
                {
                    "trip_id": "t2",
                    "status": "notified",
                    "customer_name": "Bình",
                    "pickup_address": "Q3",
                },
            ]
        },
    )
    reply = format_schedule_reply(
        userdata, {"scope": "awaiting_confirmation"}, lang="vi"
    )
    spoken = getattr(reply, "response_knowledge", reply)
    assert "Bình" in spoken

    empty: dict = {"driver_phone": "x", "context": {}}
    context_store.load_driver_context(empty, {"upcoming_trips": []})
    assert format_schedule_reply(empty, {"scope": "all"}, lang="en") == (
        "You don't have any upcoming trips."
    )


def test_format_schedule_out_of_range_index():
    userdata = _userdata()
    msg = format_schedule_reply(userdata, {"scope": "all", "trip_index": 9}, lang="vi")
    assert "chỉ có" in msg
