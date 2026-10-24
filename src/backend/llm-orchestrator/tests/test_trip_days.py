"""Day windows and speakable pickup times shared by the trip tools."""
from datetime import datetime, timedelta, timezone

from app.voicebot.processors.trip_days import in_day_window, local_date, speak_pickup_time


def _iso(days: int, hour: int = 9) -> str:
    local = datetime.now(timezone.utc).astimezone().replace(hour=hour, minute=30, second=0, microsecond=0)
    return (local + timedelta(days=days)).astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def test_windows_today_tomorrow_yesterday_week():
    assert in_day_window(_iso(0), "today") and not in_day_window(_iso(0), "tomorrow")
    assert in_day_window(_iso(1), "tomorrow") and not in_day_window(_iso(1), "today")
    assert in_day_window(_iso(-1), "yesterday") and not in_day_window(_iso(-1), "today")
    assert in_day_window(_iso(-6), "last_7_days") and not in_day_window(_iso(-7), "last_7_days")
    assert in_day_window(_iso(0), "last_7_days") and not in_day_window(_iso(1), "last_7_days")
    assert in_day_window(_iso(5), "all")


def test_undated_pickup_counts_as_today_only():
    # Walk-ups and "đi ngay" bookings carry "" or "12:30" — happening now, not tomorrow.
    for raw in ("", None, "12:30"):
        assert in_day_window(raw, "today")
        assert not in_day_window(raw, "tomorrow")
        assert not in_day_window(raw, "yesterday")


def test_local_date_handles_naive_and_garbage():
    assert local_date("2026-10-25T01:00:00Z") is not None
    assert local_date("2026-10-25T08:00:00") is not None  # naive → treated as UTC
    assert local_date("garbage") is None and local_date("12:30") is None


def test_speak_pickup_time():
    assert speak_pickup_time("12:30", "vi") == "12:30"           # free text untouched
    assert speak_pickup_time("", "vi") == ""
    today = speak_pickup_time(_iso(0, 14), "vi")
    assert today == "14:30"                                       # today: time only
    assert speak_pickup_time(_iso(1, 7), "vi") == "07:30 ngày mai"
    assert speak_pickup_time(_iso(1, 7), "en") == "07:30 tomorrow"
    later = datetime.now(timezone.utc).astimezone() + timedelta(days=3)
    spoken = speak_pickup_time(_iso(3, 18), "vi")
    assert spoken == f"18:30 ngày {later.day}/{later.month}"
