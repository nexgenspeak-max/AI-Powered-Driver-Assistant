"""Two-phase inbound driver connect greeting — filler first, then schedule context."""
from __future__ import annotations

from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import (
    fmt_money,
    format_trip_count_summary,
)


def build_inbound_context_greeting(userdata: dict, lang: str = "vi") -> str:
    """Spoken follow-up after the connect filler — trip/schedule snapshot from prefetch."""
    vi = lang != "en"
    current = context_store.get_current_trip(userdata)
    schedule = context_store.get_schedule_trips(userdata)
    earnings = context_store.get(userdata, "today_earnings", {}) or {}

    if current:
        customer = current.get("customer_name") or ("khách" if vi else "customer")
        if vi:
            return f"Bạn đang có chuyến với {customer}."
        return f"You're on a trip with {customer}."

    if schedule:
        scope = "hôm nay" if vi else "today"
        return format_trip_count_summary(
            schedule,
            "en" if not vi else "vi",
            scope_label=scope,
        )

    total = earnings.get("total_earnings")
    if total is not None:
        money = fmt_money(total, "vi" if vi else "en")
        if vi:
            return f"Chưa thấy chuyến nào hôm nay. Thu nhập khoảng {money}."
        return f"No trips today. Earnings so far: {money}."

    if vi:
        return "Em chưa thấy chuyến nào hôm nay."
    return "I don't see any trips on your schedule today."
