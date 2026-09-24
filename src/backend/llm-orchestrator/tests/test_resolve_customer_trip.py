"""resolve_customer_trip and resolve_trip_from_subset."""
from app.voicebot.processors import context_store


def _schedule_userdata():
    userdata: dict = {}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {
                    "trip_id": "t-nexgen",
                    "status": "confirmed",
                    "customer_name": "NexGen Speak",
                    "customer_phone": "+848888887798",
                    "pickup_address": "123 Lê Lợi, Quận 1",
                    "scheduled_pickup": "2026-08-30T12:30:00+07:00",
                },
                {
                    "trip_id": "t-bob",
                    "status": "confirmed",
                    "customer_name": "Bob Nguyen",
                    "customer_phone": "+84901111111",
                    "pickup_address": "88 Pasteur, Quận 3",
                    "scheduled_pickup": "2026-08-30T18:00:00+07:00",
                },
            ],
        },
    )
    return userdata


def _pending_userdata():
    userdata: dict = {}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {
                    "trip_id": "t-p1",
                    "status": "notified",
                    "customer_name": "NexGen Speak",
                    "pickup_address": "123 Lê Lợi",
                },
                {
                    "trip_id": "t-p2",
                    "status": "notified",
                    "customer_name": "Bob Nguyen",
                    "pickup_address": "88 Pasteur",
                },
            ],
        },
    )
    return userdata


def test_resolve_customer_trip_by_name():
    userdata = _schedule_userdata()
    context_store.set_last_driver_utterance(userdata, "Nhắn khách NexGen Speak.")
    trip = context_store.resolve_customer_trip(userdata, {})
    assert trip["trip_id"] == "t-nexgen"


def test_resolve_customer_trip_by_address():
    userdata = _schedule_userdata()
    context_store.set_last_driver_utterance(userdata, "Khách ở Pasteur Quận 3.")
    trip = context_store.resolve_customer_trip(userdata, {})
    assert trip["trip_id"] == "t-bob"


def test_resolve_trip_from_subset_by_name():
    userdata = _pending_userdata()
    trips = [
        t
        for t in context_store.get_schedule_trips(userdata)
        if t.get("status") == "notified"
    ]
    context_store.set_last_driver_utterance(userdata, "Xác nhận chuyến Bob Nguyen.")
    matched = context_store.resolve_trip_from_subset(userdata, trips, {})
    assert matched["trip_id"] == "t-p2"


def test_resolve_trip_from_subset_by_index():
    userdata = _pending_userdata()
    trips = [
        t
        for t in context_store.get_schedule_trips(userdata)
        if t.get("status") == "notified"
    ]
    matched = context_store.resolve_trip_from_subset(userdata, trips, {"trip_index": 1})
    assert matched["trip_id"] == "t-p1"
