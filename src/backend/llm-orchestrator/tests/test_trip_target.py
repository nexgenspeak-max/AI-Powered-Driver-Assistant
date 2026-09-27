"""Trip target resolution — name, address, time, index."""
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_target import resolve_trips_from_text


def _userdata():
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
                    "customer_phone": "+848900000001",
                    "pickup_address": "123 Lê Lợi, Quận 1, TP.HCM",
                    "scheduled_pickup": "2026-08-30T12:30:00+07:00",
                },
                {
                    "trip_id": "t-bob",
                    "status": "confirmed",
                    "customer_name": "Bob Nguyen",
                    "customer_phone": "+84901111111",
                    "pickup_address": "88 Pasteur, Quận 3",
                    "dropoff_address": "Landmark 81, Bình Thạnh",
                    "scheduled_pickup": "2026-08-30T18:00:00+07:00",
                },
            ],
        },
    )
    return userdata


def test_resolve_by_address():
    userdata = _userdata()
    result = resolve_trips_from_text(userdata, "Gọi khách ở 123 Lê Lợi.")
    assert result.kind == "matched"
    assert result.trip["trip_id"] == "t-nexgen"
    assert "address" in result.candidates[0].signals


def test_resolve_by_time_and_name():
    userdata = _userdata()
    result = resolve_trips_from_text(userdata, "NexGen Speak đón lúc 12 giờ 30.")
    assert result.kind == "matched"
    assert result.trip["trip_id"] == "t-nexgen"


def test_resolve_landmark_dropoff():
    userdata = _userdata()
    result = resolve_trips_from_text(userdata, "Khách Landmark 81.")
    assert result.kind == "matched"
    assert result.trip["trip_id"] == "t-bob"


def test_resolve_stt_nextgen():
    userdata = _userdata()
    result = resolve_trips_from_text(userdata, "Gọi cho NextGen Speak.")
    assert result.kind == "matched"
    assert result.trip["trip_id"] == "t-nexgen"


def test_resolve_no_match():
    userdata = _userdata()
    result = resolve_trips_from_text(userdata, "Gọi khách ở Đà Lạt.")
    assert result.kind == "none"


def test_resolve_trip_with_utterance():
    userdata = _userdata()
    trip = context_store.resolve_trip(userdata, utterance="Gọi Bob chuyến 18 giờ.")
    assert trip is not None
    assert trip["trip_id"] == "t-bob"
