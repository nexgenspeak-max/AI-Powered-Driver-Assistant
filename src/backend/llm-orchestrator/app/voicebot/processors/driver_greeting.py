"""Two-phase inbound driver connect greeting — filler first, then schedule context."""
from __future__ import annotations

from app.services.locale import load_locale_section, routing_from_spoken
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import fmt_money, format_trip_count_summary


def build_inbound_context_greeting(userdata: dict, lang: str = "vi") -> str:
    """Spoken follow-up after the connect filler — trip/schedule snapshot from prefetch."""
    routing = routing_from_spoken(lang)
    copy = load_locale_section(routing, "greeting").get("inbound_context") or {}
    current = context_store.get_current_trip(userdata)
    schedule = context_store.get_schedule_trips(userdata)
    earnings = context_store.get(userdata, "today_earnings", {}) or {}

    if current:
        customer = current.get("customer_name") or copy.get("default_customer", "")
        # Other scheduled trips besides the one in progress — "còn N chuyến
        # nữa" so the driver knows the day's load without asking.
        current_id = current.get("trip_id")
        remaining = len([t for t in schedule if not current_id or t.get("trip_id") != current_id])
        with_more = copy.get("on_current_trip_with_more")
        if remaining > 0 and with_more:
            return str(with_more).format(customer=customer, remaining=remaining)
        return str(copy.get("on_current_trip", "")).format(customer=customer)

    if schedule:
        scope = copy.get("scope_today", "")
        return format_trip_count_summary(schedule, lang, scope_label=str(scope))

    total = earnings.get("total_earnings")
    if total is not None:
        money = fmt_money(total, lang)
        return str(copy.get("no_trips_with_earnings", "")).format(money=money)

    return str(copy.get("no_trips", ""))
