"""Spoken trip text must include the customer phone from the app."""
from app.voicebot.processors.trip_format import (
    format_customer_phone,
    format_customer_phones,
    format_primary_customer_phone,
    format_trip_detail,
    format_trip_existence,
    short_address,
)


def test_short_address_does_not_cut_mid_word():
    """Live session 2026-09-06: a raw character-count cut split "ba đình"
    (Ba Đình district) into "...ba đ...", which the driver misread/misheard
    as "3D". Truncation must back up to a full word/comma boundary."""
    addr = "Tòa nhà lotte, 54 liễu giai, ba đình, hà nội"
    result = short_address(addr, 36)
    assert "đ..." not in result
    assert not result.endswith(".")
    assert len(result) <= 36


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


def test_single_trip_answer_states_the_count():
    """Daily report 2026-10-18: "Hôm nay tôi có bao nhiêu chuyến?" got
    "Bạn có chuyến với Nguyễn Thu Hà." with no number, judged incorrect."""
    vi = format_trip_existence({"customer_name": "Nguyễn Thu Hà"}, lang="vi")
    assert "1 chuyến" in vi and "Nguyễn Thu Hà" in vi
    assert "1 trip" in format_trip_existence({"customer_name": "Ha"}, lang="en")
