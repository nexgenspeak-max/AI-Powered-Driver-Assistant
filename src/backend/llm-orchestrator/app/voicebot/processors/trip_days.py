"""Day arithmetic shared by the trip tools (upcoming by day, history by window).

Trip timestamps come in two shapes: ISO-8601 from the apps/trip-service
(created_at/updated_at always; pickup_time when the rider scheduled a time)
and free text such as "12:30" for pickup_time typed on the web form. Only
ISO values carry a date, so day filters treat undated values as "today" —
an active trip without a date is one that is happening now.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone


def parse_local(iso: str | None) -> datetime | None:
    """ISO string → aware datetime in the machine's local zone, else None."""
    if not iso or not isinstance(iso, str):
        return None
    text = iso.strip()
    if len(text) < 10 or not text[:4].isdigit():
        return None
    try:
        ts = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return ts.astimezone()


def local_date(iso: str | None) -> date | None:
    ts = parse_local(iso)
    return ts.date() if ts else None


def _today() -> date:
    return datetime.now(timezone.utc).astimezone().date()


def in_day_window(iso: str | None, day: str, *, undated_is_today: bool = True) -> bool:
    """day ∈ today | tomorrow | yesterday | last_7_days | all."""
    if day in ("", "all", None):
        return True
    d = local_date(iso)
    today = _today()
    if d is None:
        return undated_is_today and day in ("today", "last_7_days")
    if day == "today":
        return d == today
    if day == "tomorrow":
        return d == today + timedelta(days=1)
    if day == "yesterday":
        return d == today - timedelta(days=1)
    if day == "last_7_days":
        return today - timedelta(days=6) <= d <= today
    return True


def speak_pickup_time(raw: str | None, lang: str = "vi") -> str:
    """ISO pickup_time → "14:30 ngày 25/10" (vi) / "14:30 on 25/10" (en);
    today's date is dropped; non-ISO text is returned unchanged."""
    text = (raw or "").strip()
    ts = parse_local(text)
    if ts is None:
        return text
    hm = ts.strftime("%H:%M")
    if ts.date() == _today():
        return hm
    dm = f"{ts.day}/{ts.month}"
    if ts.date() == _today() + timedelta(days=1):
        return f"{hm} ngày mai" if lang != "en" else f"{hm} tomorrow"
    return f"{hm} ngày {dm}" if lang != "en" else f"{hm} on {dm}"
