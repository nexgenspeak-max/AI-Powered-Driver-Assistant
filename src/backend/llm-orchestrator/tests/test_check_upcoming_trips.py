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


def _pickup_iso(days: int, hour: int = 8) -> str:
    from datetime import datetime, timedelta, timezone
    local = datetime.now(timezone.utc).astimezone().replace(hour=hour, minute=0, second=0, microsecond=0)
    return (local + timedelta(days=days)).astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _day_userdata():
    userdata: dict = {"driver_phone": "0900000001"}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {"trip_id": "now", "status": "confirmed", "customer_name": "Nam", "pickup_address": "Mỹ Đình", "pickup_time": ""},
                {"trip_id": "tmr1", "status": "confirmed", "customer_name": "Hà", "pickup_address": "Cầu Giấy", "pickup_time": _pickup_iso(1, 7)},
                {"trip_id": "tmr2", "status": "notified", "customer_name": "Long", "pickup_address": "Hà Đông", "pickup_time": _pickup_iso(1, 15)},
            ],
        },
    )
    return userdata


def test_day_tomorrow_filters_by_pickup_date_and_labels_count():
    reply = format_schedule_reply(_day_userdata(), {"scope": "all", "day": "tomorrow"}, lang="vi")
    assert reply.response_knowledge == "Bạn có 2 chuyến ngày mai."
    reply_en = format_schedule_reply(_day_userdata(), {"scope": "all", "day": "tomorrow"}, lang="en")
    assert reply_en.response_knowledge == "You have 2 trips tomorrow."


def test_day_today_counts_undated_trip_and_speaks_time_for_single():
    reply = format_schedule_reply(_day_userdata(), {"scope": "all", "day": "today"}, lang="vi")
    assert reply.response_knowledge.startswith("Bạn có 1 chuyến hôm nay: đón Nam")
    only_tmr = format_schedule_reply(_day_userdata(), {"scope": "in_progress", "day": "tomorrow"}, lang="vi")
    assert only_tmr.response_knowledge.startswith("Bạn có 1 chuyến đang chạy ngày mai: đón Hà lúc 07:00 ngày mai")


def test_day_tomorrow_empty_message():
    userdata = _userdata()  # one undated notified trip → nothing tomorrow
    assert format_schedule_reply(userdata, {"scope": "all", "day": "tomorrow"}, lang="vi") == "Ngày mai bạn không có chuyến nào."
    assert format_schedule_reply(userdata, {"scope": "all", "day": "tomorrow"}, lang="en") == "You don't have any trips tomorrow."
    assert format_schedule_reply(userdata, {"scope": "picked_up", "day": "tomorrow"}, lang="vi") == "Bạn không có chuyến nào đã đón khách ngày mai."


def test_trip_index_zero_means_not_provided():
    reply = format_schedule_reply(_day_userdata(), {"scope": "all", "trip_index": 0, "list_all": False}, lang="vi")
    assert reply.response_knowledge == "Bạn có 3 chuyến sắp tới."


def test_day_all_means_no_filter_and_ordinals_count_every_day():
    # The greeting counts trips of every day, so "chuyến thứ ba" must index the
    # same list: day="all" (the schema default the model fills in) is a no-op.
    userdata = _day_userdata()
    all_days = format_schedule_reply(userdata, {"scope": "all", "day": "all"}, lang="vi")
    no_day = format_schedule_reply(userdata, {"scope": "all"}, lang="vi")
    assert all_days.response_knowledge == no_day.response_knowledge == "Bạn có 3 chuyến sắp tới."
    third = format_schedule_reply(userdata, {"scope": "all", "day": "all", "trip_index": 3}, lang="vi")
    assert third.response_knowledge.startswith("Chuyến 3 với Long, đón tại Hà Đông. Giờ đón 15:00 ngày mai.")
    # The bug this guards against: a self-filled day="today" shrinks the list to 1 trip.
    narrowed = format_schedule_reply(userdata, {"scope": "all", "day": "today", "trip_index": 3}, lang="vi")
    assert narrowed == "Bạn chỉ có 1 chuyến. Vui lòng chọn từ 1 đến 1."


def test_day_enum_has_all_first_in_both_locales():
    from app.voicebot.locales.vn.tools_definition import raw_schema as vn
    from app.voicebot.locales.en.tools_definition import raw_schema as en
    for schema in (vn, en):
        day = schema["check_upcoming_trips"]["parameters"]["properties"]["day"]
        assert day["enum"] == ["all", "today", "tomorrow"]
