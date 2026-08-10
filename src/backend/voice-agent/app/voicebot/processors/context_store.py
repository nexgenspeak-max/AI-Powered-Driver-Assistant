"""
Session context store — prefetched driver/customer data for zero-latency tool reads.

Flow:
  1. prefetch at session start (single API call)
  2. tools read from context (no await)
  3. mutations update context immediately, sync API in background
"""
from __future__ import annotations

import asyncio
import copy
import logging
import time
from typing import Any

logger = logging.getLogger("voice-agent.context_store")

STALE_SECONDS = 300


def _now() -> float:
    return time.monotonic()


def init_context(userdata: dict) -> None:
    userdata.setdefault("context", {})
    userdata["context"]["fetched_at"] = _now()


def load_driver_context(userdata: dict, payload: dict) -> None:
    """Replace session context from /drivers/me/context response."""
    userdata["context"] = {
        **payload,
        "fetched_at": _now(),
    }


def load_customer_context(userdata: dict, payload: dict) -> None:
    """Replace session context from /customers/me/context response."""
    userdata["context"] = {
        **payload,
        "fetched_at": _now(),
    }


def load_customer_trips(userdata: dict, trips: list[dict]) -> None:
    """Legacy: build customer context from trip list."""
    load_customer_context(userdata, _customer_payload_from_trips(trips))


def _customer_payload_from_trips(trips: list[dict]) -> dict:
    active = [
        t for t in trips
        if t.get("status") not in ("completed", "rejected", "no_answer", "cancelled", "cancelled_by_driver")
    ]
    return {
        "trips": trips,
        "active_trip": active[0] if active else None,
    }


def is_stale(userdata: dict) -> bool:
    ctx = userdata.get("context", {})
    age = _now() - ctx.get("fetched_at", 0)
    return age > STALE_SECONDS


def get(userdata: dict, key: str, default: Any = None) -> Any:
    return userdata.get("context", {}).get(key, default)


def set_context(userdata: dict, key: str, value: Any) -> None:
    userdata.setdefault("context", {})[key] = value


def get_current_trip(userdata: dict) -> dict | None:
    return get(userdata, "current_trip")


def get_current_location(userdata: dict) -> dict | None:
    """Driver's last GPS ping (~every 10 min while online) — {lat, lng,
    updated_at}, or None if they've never gone online. See
    driverContextService.ts's `current_location` field."""
    loc = get(userdata, "current_location")
    if isinstance(loc, dict) and "lat" in loc and "lng" in loc:
        return loc
    return None


def get_upcoming_trips(userdata: dict) -> list[dict]:
    """Upcoming trips from prefetched driver context."""
    upcoming = get(userdata, "upcoming_trips")
    if isinstance(upcoming, list):
        return upcoming
    return []


def set_upcoming_trips(userdata: dict, trips: list[dict]) -> None:
    """Overwrite the cached upcoming-trips list — used by check_upcoming_trips
    to fold in a live re-fetch (see that tool for why: this is a one-time
    session-start snapshot otherwise, so a trip booked mid-session never
    shows up until something replaces it)."""
    userdata.setdefault("context", {})["upcoming_trips"] = trips


def resolve_trip(userdata: dict, trip_index: int | None = None) -> dict | None:
    """Current trip, or trip by schedule index (1-based), or nearest upcoming."""
    if trip_index is not None:
        schedule = get_schedule_trips(userdata)
        idx = int(trip_index) - 1
        if 0 <= idx < len(schedule):
            return schedule[idx]
        return None

    current = get_current_trip(userdata)
    if current:
        return current

    schedule = get_schedule_trips(userdata)
    return schedule[0] if schedule else None


def get_schedule_trips(userdata: dict) -> list[dict]:
    """Current trip first, then upcoming — deduplicated."""
    current = get_current_trip(userdata)
    upcoming = get_upcoming_trips(userdata)
    seen: set[str] = set()
    result: list[dict] = []
    if current and current.get("trip_id"):
        seen.add(current["trip_id"])
        result.append(current)
    for t in upcoming:
        tid = t.get("trip_id")
        if tid and tid not in seen:
            seen.add(tid)
            result.append(t)
    return result


# Trips where the driver actually has a customer worth calling — accepted
# and currently in progress, not just a new offer still awaiting response.
# Mirrors check_upcoming_trips.py's own IN_PROGRESS_STATUSES tuple (kept as
# a separate copy there rather than importing this, to avoid coupling one
# tool file to another — same values, intentionally duplicated).
CALLABLE_TRIP_STATUSES = ("confirmed", "arrived_pickup", "picked_up")


def get_callable_trips(userdata: dict) -> list[dict]:
    """Trips with a customer to call, in schedule order (see get_schedule_trips)."""
    return [
        t for t in get_schedule_trips(userdata)
        if t.get("status") in CALLABLE_TRIP_STATUSES and t.get("customer_phone")
    ]


def build_context_hint(userdata: dict, lang: str = "vi") -> str:
    """Short hint injected into agent instructions after prefetch."""
    schedule = get_schedule_trips(userdata)
    current = get_current_trip(userdata)
    earnings = get(userdata, "today_earnings", {}) or {}
    if lang == "en":
        parts = []
        if current:
            parts.append("1 active trip loaded")
        if schedule:
            parts.append(f"{len(schedule)} scheduled trip(s) loaded")
        if earnings.get("total_earnings"):
            parts.append("today's earnings loaded")
        if not parts:
            return ""
        return (
            "PREFETCHED DATA (always use tools for details): "
            + ", ".join(parts)
            + ". Never say you lack trip/earnings data when tools can answer."
        )
    parts = []
    if current:
        parts.append("1 chuyến đang active")
    if schedule:
        parts.append(f"{len(schedule)} chuyến trong lịch")
    if earnings.get("total_earnings") is not None:
        parts.append("thu nhập hôm nay")
    if not parts:
        return ""
    return (
        "DỮ LIỆU ĐÃ TẢI (luôn gọi tool để đọc chi tiết): "
        + ", ".join(parts)
        + ". KHÔNG nói 'không có thông tin' khi tool trả lời được."
    )


def get_active_customer_trip(userdata: dict) -> dict | None:
    return get(userdata, "active_trip")


def add_customer_trip(userdata: dict, trip: dict) -> None:
    """Register a newly booked trip so later tool calls in the same session see it immediately."""
    ctx = userdata.setdefault("context", {})
    ctx["active_trip"] = trip
    trips = ctx.setdefault("trips", [])
    trips.insert(0, trip)


def resolve_driver_trip(userdata: dict) -> dict | None:
    """Current trip, else first upcoming, else outbound room trip metadata."""
    current = get_current_trip(userdata)
    if current:
        return current
    upcoming = get_upcoming_trips(userdata)
    if upcoming:
        return upcoming[0]
    outbound = userdata.get("trip")
    if isinstance(outbound, dict) and outbound.get("trip_id"):
        return outbound
    return None


def patch_trip_by_id(userdata: dict, trip_id: str, **fields: Any) -> None:
    ctx = userdata.setdefault("context", {})
    if ctx.get("current_trip", {}).get("trip_id") == trip_id:
        patch_current_trip(userdata, **fields)
        return
    for key in ("upcoming_trips", "trips"):
        items = ctx.get(key)
        if not isinstance(items, list):
            continue
        ctx[key] = [
            {**t, **fields} if t.get("trip_id") == trip_id else t
            for t in items
        ]
    if ctx.get("active_trip", {}).get("trip_id") == trip_id:
        ctx["active_trip"] = {**ctx["active_trip"], **fields}
    outbound = userdata.get("trip")
    if isinstance(outbound, dict) and outbound.get("trip_id") == trip_id:
        outbound.update(fields)


def set_last_call(userdata: dict, call_id: str, **fields: Any) -> None:
    ctx = userdata.setdefault("context", {})
    ctx["last_call"] = {"call_id": call_id, **fields}


def set_last_nudge_trip(userdata: dict, trip_id: str) -> None:
    """Remembers which trip a just-delivered proactive nudge
    (proximity_pickup/dropoff) was about — see session.py's
    `_speak_driver_nudge` and agent.py's `on_enter` proactive_nudge branch,
    both call this right after speaking the nudge. Lets call_customer.py
    resolve "gọi khách đó" without asking the driver to disambiguate again
    when they simply say yes to the nudge's own question — the LLM
    shouldn't have to re-derive which trip from the just-spoken sentence.
    """
    userdata.setdefault("context", {})["_last_nudge_trip_id"] = trip_id


def pop_last_nudge_trip(userdata: dict) -> str:
    """One-shot read — cleared on read so it only resolves the very next
    call_customer, not some unrelated one much later in the conversation."""
    ctx = userdata.setdefault("context", {})
    return ctx.pop("_last_nudge_trip_id", "") or ""


def patch_current_trip(userdata: dict, **fields: Any) -> None:
    ctx = userdata.setdefault("context", {})
    trip = ctx.get("current_trip")
    if not trip:
        return
    trip.update(fields)
    ctx["current_trip"] = trip
    _refresh_trip_lists(userdata, trip)


def set_current_trip(userdata: dict, trip: dict | None) -> None:
    userdata.setdefault("context", {})["current_trip"] = copy.deepcopy(trip) if trip else None


def remove_trip_from_lists(userdata: dict, trip_id: str) -> None:
    ctx = userdata.setdefault("context", {})
    for key in ("upcoming_trips", "trips"):
        items = ctx.get(key)
        if isinstance(items, list):
            ctx[key] = [t for t in items if t.get("trip_id") != trip_id]
    if ctx.get("current_trip", {}).get("trip_id") == trip_id:
        ctx["current_trip"] = None
    if ctx.get("active_trip", {}).get("trip_id") == trip_id:
        ctx["active_trip"] = None


def _refresh_trip_lists(userdata: dict, trip: dict) -> None:
    ctx = userdata.setdefault("context", {})
    trip_id = trip.get("trip_id")
    if not trip_id:
        return
    for key in ("upcoming_trips", "trips"):
        items = ctx.get(key)
        if not isinstance(items, list):
            continue
        ctx[key] = [
            trip if t.get("trip_id") == trip_id else t
            for t in items
        ]


def patch_driver_profile(userdata: dict, **fields: Any) -> None:
    ctx = userdata.setdefault("context", {})
    profile = ctx.setdefault("driver_profile", {})
    profile.update(fields)


def set_driver_status(userdata: dict, online: bool) -> None:
    ctx = userdata.setdefault("context", {})
    driver = ctx.setdefault("driver", {})
    driver["status"] = "online" if online else "offline"


def schedule_sync(coro) -> None:
    """Fire-and-forget API sync — does not block tool response."""
    task = asyncio.create_task(coro)

    def _done(t: asyncio.Task) -> None:
        if t.cancelled():
            return
        exc = t.exception()
        if exc:
            logger.warning("background sync failed: %s", exc)

    task.add_done_callback(_done)
