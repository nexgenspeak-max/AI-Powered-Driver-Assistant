"""Regression tests for session context mutations.

`current_trip` / `active_trip` are stored as explicit None when the driver
has no in-progress trip (that's what /drivers/me/context returns). dict.get
with a {} default does not protect that case — the key exists, so get
returns None and `.get("trip_id")` raises. That crash is what made
confirm_trip look like a tool failure after the backend had already
confirmed, triggering an LLM retry loop (multi-second delay).
"""

from app.voicebot.processors import context_store


def _driver_userdata(**payload):
    userdata: dict = {}
    context_store.load_driver_context(userdata, payload)
    return userdata


def test_patch_trip_by_id_when_current_trip_is_none():
    userdata = _driver_userdata(
        current_trip=None,
        upcoming_trips=[
            {
                "trip_id": "t1",
                "status": "notified",
                "customer_name": "Chinh",
            }
        ],
        active_trip=None,
    )

    context_store.patch_trip_by_id(userdata, "t1", status="confirmed")

    upcoming = context_store.get_upcoming_trips(userdata)
    assert upcoming[0]["status"] == "confirmed"


def test_patch_trip_by_id_promotes_confirmed_trip_when_no_current():
    userdata = _driver_userdata(
        current_trip=None,
        upcoming_trips=[
            {
                "trip_id": "t1",
                "status": "notified",
                "customer_name": "Chinh",
            }
        ],
    )

    context_store.patch_trip_by_id(userdata, "t1", status="confirmed")

    current = context_store.get_current_trip(userdata)
    assert current is not None
    assert current["trip_id"] == "t1"
    assert current["status"] == "confirmed"


def test_patch_trip_by_id_does_not_replace_an_existing_current_trip():
    userdata = _driver_userdata(
        current_trip={
            "trip_id": "active",
            "status": "picked_up",
            "customer_name": "A",
        },
        upcoming_trips=[
            {
                "trip_id": "t2",
                "status": "notified",
                "customer_name": "B",
            }
        ],
    )

    context_store.patch_trip_by_id(userdata, "t2", status="confirmed")

    current = context_store.get_current_trip(userdata)
    assert current is not None
    assert current["trip_id"] == "active"
    assert context_store.get_upcoming_trips(userdata)[0]["status"] == "confirmed"


def test_remove_trip_from_lists_when_current_trip_is_none():
    userdata = _driver_userdata(
        current_trip=None,
        upcoming_trips=[{"trip_id": "t1", "status": "notified"}],
        active_trip=None,
    )

    context_store.remove_trip_from_lists(userdata, "t1")

    assert context_store.get_upcoming_trips(userdata) == []
    assert context_store.get_current_trip(userdata) is None


def test_patch_trip_by_id_updates_matching_current_trip():
    userdata = _driver_userdata(
        current_trip={"trip_id": "t1", "status": "confirmed", "customer_name": "A"},
        upcoming_trips=[{"trip_id": "t1", "status": "confirmed", "customer_name": "A"}],
    )

    context_store.patch_trip_by_id(userdata, "t1", status="arrived_pickup")

    current = context_store.get_current_trip(userdata)
    assert current is not None
    assert current["status"] == "arrived_pickup"
    assert context_store.get_upcoming_trips(userdata)[0]["status"] == "arrived_pickup"


def test_patch_trip_by_id_does_not_promote_rejected_trip():
    userdata = _driver_userdata(
        current_trip=None,
        upcoming_trips=[{"trip_id": "t1", "status": "notified"}],
    )

    context_store.patch_trip_by_id(userdata, "t1", status="rejected")

    assert context_store.get_current_trip(userdata) is None
    assert context_store.get_upcoming_trips(userdata)[0]["status"] == "rejected"


def test_with_refresh_offer_sets_pending_and_does_not_block():
    userdata = _driver_userdata(current_trip=None, upcoming_trips=[])
    reply = context_store.with_refresh_offer(
        userdata, "current_trip", "Anh/chị chưa có chuyến đang chạy.", lang="vi"
    )
    topic, args = context_store.pop_pending_refresh(userdata)
    assert topic == "current_trip"
    assert args == {}
    assert reply == "Anh/chị chưa có chuyến đang chạy."
    assert "dữ liệu lúc" not in reply
    assert "mới nhất" not in reply
    assert "muốn em lấy" not in reply


def _trip(tid: str, name: str, status: str = "confirmed") -> dict:
    return {
        "trip_id": tid,
        "status": status,
        "customer_name": name,
        "customer_phone": "+84901234567",
        "pickup_address": "123 Test St",
    }


def test_target_trip_persists_after_check_upcoming_detail():
    userdata = _driver_userdata(
        current_trip=None,
        upcoming_trips=[
            _trip("t1", "Alice"),
            _trip("t2", "Bob"),
        ],
    )
    context_store.set_target_trip(userdata, userdata["context"]["upcoming_trips"][0])
    assert context_store.get_target_trip_index(userdata) == 1
    assert context_store.get_target_trip(userdata)["customer_name"] == "Alice"


def test_resolve_call_target_uses_target_trip_without_reasking():
    userdata = _driver_userdata(
        current_trip=None,
        upcoming_trips=[
            _trip("t1", "Alice"),
            _trip("t2", "Bob"),
            _trip("t3", "Carol"),
        ],
    )
    context_store.set_target_trip(userdata, userdata["context"]["upcoming_trips"][0])
    resolved = context_store.resolve_call_target(userdata, lang="vi")
    assert isinstance(resolved, dict)
    assert resolved["trip_id"] == "t1"

def test_legacy_selected_trip_id_migrates_to_target():
    userdata = _driver_userdata(
        current_trip=None,
        upcoming_trips=[_trip("t1", "Alice")],
    )
    userdata["context"]["_selected_trip_id"] = "t1"
    trip = context_store.get_target_trip(userdata)
    assert trip is not None
    assert trip["trip_id"] == "t1"
    assert userdata["context"].get("_target_trip_id") == "t1"
    assert "_selected_trip_id" not in userdata["context"]


def test_match_callable_trip_by_text_sets_target():
    userdata = _driver_userdata(
        current_trip=None,
        upcoming_trips=[
            _trip("t1", "NexGen Speak"),
            _trip("t2", "Bob"),
        ],
    )
    matched = context_store.match_callable_trip_by_text(
        userdata, "Số điện thoại khách NexGen Speak là 0888887798"
    )
    assert matched is not None
    assert matched["trip_id"] == "t1"
    resolved = context_store.resolve_call_target(userdata, lang="vi")
    assert isinstance(resolved, dict)
    assert resolved["customer_name"] == "NexGen Speak"


def test_match_callable_trip_stt_nextgen_variant():
    userdata = _driver_userdata(
        current_trip=None,
        upcoming_trips=[_trip("t1", "NexGen Speak"), _trip("t2", "Bob")],
    )
    matched = context_store.match_callable_trip_by_text(
        userdata, "Tôi muốn gọi cho NextGen Speak."
    )
    assert matched is not None
    assert matched["trip_id"] == "t1"


def test_match_callable_trip_stt_nick_and_speak_variant():
    userdata = _driver_userdata(
        current_trip=None,
        upcoming_trips=[_trip("t1", "NexGen Speak"), _trip("t2", "Bob")],
    )
    matched = context_store.match_callable_trip_by_text(
        userdata, "Gọi cho Nick and Speak."
    )
    assert matched is not None
    assert matched["trip_id"] == "t1"


def test_resolve_call_target_disambiguates_without_selection():
    userdata = _driver_userdata(
        current_trip=None,
        upcoming_trips=[
            _trip("t1", "Alice"),
            _trip("t2", "Bob"),
        ],
    )
    resolved = context_store.resolve_call_target(userdata, lang="vi")
    assert isinstance(resolved, str)
    assert "nhiều chuyến" in resolved


def test_resolve_trip_prefers_selected_over_first_schedule():
    userdata = _driver_userdata(
        current_trip=None,
        upcoming_trips=[
            _trip("t1", "Alice"),
            _trip("t2", "Bob"),
        ],
    )
    context_store.set_target_trip(userdata, userdata["context"]["upcoming_trips"][1])
    trip = context_store.resolve_trip(userdata)
    assert trip is not None
    assert trip["trip_id"] == "t2"
