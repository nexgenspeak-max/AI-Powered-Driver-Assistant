"""Spoken trip text must include the customer phone from the app."""
from app.voicebot.processors.trip_format import (
    format_customer_phone,
    format_customer_phones,
    format_primary_customer_phone,
    format_trip_detail,
)


def test_trip_detail_reads_customer_phone_in_follow_up():
    from app.voicebot.processors.trip_response import build_trip_detail_response

    trip = {
        "customer_name": "Trương Bá Chính",
        "customer_phone": "0912012903",
        "pickup_address": "Lotte",
        "dropoff_address": "Mỹ Đình",
        "estimated_fare": 150000,
        "status": "confirmed",
    }
    vn = format_trip_detail(trip, 1, lang="vi")
    en = format_trip_detail(trip, 1, lang="en")
    assert "0912012903" not in vn
    assert "0912012903" not in en
    assert "Trương Bá Chính" in vn
    assert "Lotte" in vn
    resp = build_trip_detail_response(trip, 1, lang="vi")
    assert any("0912012903" in row for row in resp.follow_up_knowledge)


def test_format_customer_phone_missing():
    msg = format_customer_phone({"customer_name": "An"}, lang="vi")
    assert "chưa có số" in msg


def test_format_customer_phones_lists_loaded_trips():
    trips = [
        {"customer_name": "An", "customer_phone": "0900111000"},
        {"customer_name": "Bình", "customer_phone": "0900112000"},
    ]
    msg = format_customer_phones(trips, lang="vi")
    assert "0900111000" in msg
    assert "0900112000" in msg
    assert format_customer_phones([], lang="vi")


def test_format_primary_customer_phone_uses_first_trip_only():
    trips = [
        {"customer_name": "An", "customer_phone": "0900111000"},
        {"customer_name": "Bình", "customer_phone": "0900112000"},
    ]
    msg = format_primary_customer_phone(trips, lang="vi")
    assert "0900111000" in msg
    assert "0900112000" not in msg


def test_format_trip_count_summary_vn():
    from app.voicebot.processors.trip_format import format_trip_count_summary

    one = format_trip_count_summary(
        [{"customer_name": "NexGen"}], lang="vi"
    )
    assert "NexGen" in one
    assert "chi tiết" not in one.lower()

    many = format_trip_count_summary([{}, {}, {}], lang="vi")
    assert "3 chuyến" in many
    assert len(many) < 40
