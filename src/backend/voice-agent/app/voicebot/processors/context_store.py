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
import re
import time
from typing import Any, NoReturn

from livekit.agents import StopResponse

from app.agent.turn_metrics import mark_user_stopped
from app.voicebot.prompts.tool_response import ToolResponse

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


def age_seconds(userdata: dict) -> float:
    ctx = userdata.get("context", {})
    return _now() - ctx.get("fetched_at", _now())


def format_age_note(userdata: dict, lang: str = "vi") -> str:
    """Human-readable, speakable age of the cached context data."""
    age = age_seconds(userdata)
    if lang == "en":
        if age < 60:
            return "moments ago"
        minutes = int(age // 60)
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    if age < 60:
        return "vài giây trước"
    minutes = int(age // 60)
    return f"{minutes} phút trước"


def with_refresh_offer(
    userdata: dict,
    topic: str,
    reply: str,
    *,
    lang: str = "vi",
    args: dict | None = None,
) -> str:
    """Cache-first reply; live fetch is refresh_latest_data when driver asks.

    Age disclaimers removed — schedule_updated LiveKit nudge keeps RAM in sync
    with app WS while Trợ lý is open.
    """
    set_pending_refresh(userdata, topic, args)
    return reply


def spoken_from_tool_output(text: str | ToolResponse) -> str:
    """TTS-safe line — never read raw ResponseTemplate XML aloud."""
    if isinstance(text, ToolResponse):
        return text.spoken()
    if ToolResponse.is_template(text):
        return ToolResponse.spoken_from_template(text)
    return text.strip()


async def speak_and_stop(
    session: Any,
    text: str | ToolResponse,
    *,
    allow_interruptions: bool = True,
) -> NoReturn:
    """Speak from the tool, then halt the LLM so it cannot rewrite TTS.

    Returning already_spoken still ran a second LLM pass (~2.1s live after
    confirm_trip, then 28s of schedule audio). StopResponse skips that pass.
    A TTS failure must not propagate — the backend/tool work already finished.
    """
    if isinstance(text, ToolResponse):
        set_last_tool_response(session.userdata, text)
    spoken = spoken_from_tool_output(text)
    mark_user_stopped(session)
    try:
        await session.say(spoken, allow_interruptions=allow_interruptions)
    except Exception:
        logger.warning("speak_and_stop say failed", exc_info=True)
    raise StopResponse()


async def speak_reply(session: Any, text: str | ToolResponse, *, lang: str = "vi") -> NoReturn:
    """Speak a fully-formatted tool reply and skip the LLM's second pass."""
    await speak_and_stop(session, text)


async def speak_with_refresh_offer(
    session: Any,
    userdata: dict,
    topic: str,
    reply: str | ToolResponse,
    *,
    lang: str = "vi",
    args: dict | None = None,
) -> NoReturn:
    from app.voicebot.processors.tool_reply import coerce

    if isinstance(reply, str):
        reply = coerce(topic, reply, lang=lang)
    set_last_tool_response(userdata, reply)
    spoken = reply.spoken()
    text = with_refresh_offer(userdata, topic, spoken, lang=lang, args=args)
    await speak_reply(session, text, lang=lang)


def set_last_tool_response(userdata: dict, response: ToolResponse) -> None:
    """Persist structured tool output so follow-ups can use FollowUpKnowledge."""
    userdata.setdefault("context", {})["_last_tool_response"] = {
        "tool": response.tool,
        "template": response.to_template(),
        "spoken": response.spoken(),
        "follow_up": list(response.follow_up_knowledge),
        "action": list(response.action_knowledge),
        "at": _now(),
    }
    _maybe_select_trip_from_tool_response(userdata, response)
    spoken = response.spoken()
    if spoken:
        match_callable_trip_by_text(userdata, spoken)


def _maybe_select_trip_from_tool_response(userdata: dict, response: ToolResponse) -> None:
    import re

    for row in response.response_knowledge:
        if row.startswith("trip_index:"):
            try:
                idx = int(row.split(":", 1)[1].strip())
            except ValueError:
                continue
            trip = resolve_trip(userdata, trip_index=idx)
            if trip:
                set_target_trip(userdata, trip)
            return
    for row in response.follow_up_knowledge:
        m = re.match(r"(?:Chuyến|Trip)\s+(\d+)", row.strip())
        if not m:
            continue
        trip = resolve_trip(userdata, trip_index=int(m.group(1)))
        if trip:
            set_target_trip(userdata, trip)
            return


_STT_NAME_ALIASES = (
    ("nextgen", "nexgen"),
    ("nickand", "nexgen"),
    ("nickandspeak", "nexgenspeak"),
)


def _name_match_key(text: str) -> str:
    """Collapse STT variants (NextGen/Nick and Speak → NexGen Speak)."""
    key = re.sub(r"[^a-z0-9]+", "", (text or "").lower())
    for src, dst in _STT_NAME_ALIASES:
        key = key.replace(src, dst)
    return key


def _customer_name_in_text(customer_name: str, text: str) -> bool:
    name = (customer_name or "").strip()
    if len(name) < 3:
        return False
    haystack = (text or "").lower()
    if name.lower() in haystack:
        return True
    name_key = _name_match_key(name)
    text_key = _name_match_key(text)
    if not name_key or not text_key:
        return False
    return name_key in text_key or text_key in name_key


def _extract_call_target_name(text: str) -> str:
    """Name fragment after 'gọi cho' / 'call' when driver names a customer."""
    lowered = (text or "").lower()
    for sep in ("gọi cho", "call "):
        if sep not in lowered:
            continue
        rest = lowered.split(sep, 1)[1].strip()
        for suffix in (" giúp tôi", " giúp", " please", " for me"):
            if rest.endswith(suffix):
                rest = rest[: -len(suffix)].strip()
        rest = rest.strip(".,!?… ")
        if rest and not rest.startswith("tôi") and rest not in {"ai", "ai đó", "khách"}:
            return rest
    return ""


def match_trip_by_text(
    userdata: dict,
    text: str,
    *,
    callable_only: bool = False,
) -> dict | None:
    """Match trip from utterance by customer name, address, time, or index."""
    from app.voicebot.processors.trip_target import resolve_and_select_trip

    call_target = _extract_call_target_name(text)
    for blob in (call_target, text):
        if not (blob or "").strip():
            continue
        matched = resolve_and_select_trip(userdata, blob, callable_only=callable_only)
        if matched:
            return matched
    return None


def match_callable_trip_by_text(userdata: dict, text: str) -> dict | None:
    """If spoken text identifies one callable trip, remember it as target."""
    return match_trip_by_text(userdata, text, callable_only=True)


_NO_XML_SPOKEN_HINT_EN = (
    "Reply in one short natural sentence. Do NOT read XML tags, ResponseTemplate, "
    "ResponseRule, ActionKnowledge, or tool syntax aloud. Use tools for actions."
)
_NO_XML_SPOKEN_HINT_VI = (
    "Trả lời một câu ngắn tự nhiên. KHÔNG đọc thẻ XML, ResponseTemplate, "
    "ResponseRule, ActionKnowledge hay cú pháp tool. Muốn hành động thì gọi tool."
)


def get_last_tool_response_hint(userdata: dict, lang: str = "vi") -> str:
    last = userdata.get("context", {}).get("_last_tool_response")
    if not last:
        return ""
    spoken = (last.get("spoken") or "").strip()
    if not spoken and last.get("template"):
        spoken = ToolResponse.spoken_from_template(last["template"])
    if not spoken:
        return ""
    tool = last.get("tool") or "tool"
    follow_up = last.get("follow_up") or []
    action = last.get("action") or []
    if lang == "en":
        lines = [
            f"\n\nLAST TOOL ({tool}) — driver already heard: {spoken}",
            _NO_XML_SPOKEN_HINT_EN,
        ]
        if follow_up:
            lines.append("Follow-up facts: " + "; ".join(follow_up[:6]))
        if action:
            lines.append("Actions (call tools, do not read aloud): " + "; ".join(action[:4]))
        return "\n".join(lines)
    lines = [
        f"\n\nTOOL GẦN NHẤT ({tool}) — tài xế đã nghe: {spoken}",
        _NO_XML_SPOKEN_HINT_VI,
    ]
    if follow_up:
        lines.append("Follow-up: " + "; ".join(follow_up[:6]))
    if action:
        lines.append("Hành động (gọi tool, không đọc to): " + "; ".join(action[:4]))
    return "\n".join(lines)


def set_pending_refresh(userdata: dict, topic: str, args: dict | None = None) -> None:
    """Remembers which cached topic to re-fetch if the driver asks for latest
    data — a single slot, like set_last_nudge_trip below. A later cache-read
    overwrites it, so "làm mới" / "get the latest" applies to the last answer."""
    userdata.setdefault("context", {})["_pending_refresh"] = {
        "topic": topic,
        "args": args or {},
    }


def pop_pending_refresh(userdata: dict) -> tuple[str, dict]:
    """One-shot read — cleared on read, mirrors pop_last_nudge_trip."""
    ctx = userdata.setdefault("context", {})
    pending = ctx.pop("_pending_refresh", None)
    if not pending:
        return "", {}
    return pending.get("topic", ""), pending.get("args", {})


def get(userdata: dict, key: str, default: Any = None) -> Any:
    return userdata.get("context", {}).get(key, default)


def _as_trip(value: Any) -> dict | None:
    """Prefetch stores current_trip/active_trip as explicit None, not missing."""
    return value if isinstance(value, dict) else None


def set_context(userdata: dict, key: str, value: Any) -> None:
    userdata.setdefault("context", {})[key] = value


def has_prefetched_context(userdata: dict) -> bool:
    return bool(userdata.get("context", {}).get("fetched_at"))


def get_current_trip(userdata: dict) -> dict | None:
    return _as_trip(get(userdata, "current_trip"))


def get_current_location(userdata: dict) -> dict | None:
    """Driver's last GPS ping (~every 10 min while online) — {lat, lng,
    updated_at}, or None if they've never gone online. See
    driverContextService.ts's `current_location` field."""
    loc = get(userdata, "current_location")
    if isinstance(loc, dict) and "lat" in loc and "lng" in loc:
        return loc
    return None


def get_driver_settings(userdata: dict) -> dict:
    """Per-driver feature toggles from auth-service's driver-settings table
    (hands_free_mode, notify_on_pickup_approach, auto_suggest_next_stop +
    radii, default_customer_call_mode), passed through unchanged inside the
    /drivers/me/context payload. All-false shape if missing so callers can
    treat a stale/failed prefetch the same as an explicitly-off setting."""
    settings = get(userdata, "driver_settings")
    if isinstance(settings, dict):
        return settings
    return {
        "hands_free_mode": False,
        "notify_on_pickup_approach": False,
        "auto_suggest_next_stop": False,
        "default_customer_call_mode": "agent",
    }


def get_default_customer_call_mode(userdata: dict) -> str:
    """Driver's saved outbound call preference — agent (AI speaks) or bridge (direct)."""
    mode = get_driver_settings(userdata).get("default_customer_call_mode", "agent")
    return mode if mode in ("agent", "bridge") else "agent"


def get_optimized_route(userdata: dict) -> dict | None:
    """Multi-stop optimized visiting order across ALL the driver's active
    stops, from trip-service's driverContextService.buildDriverContext
    (routeOptimizationService.ts) — {stops: [...], source, computed_at,
    driver_location}. None if the driver has 0-1 active stops (nothing to
    order), the field wasn't populated (older cached context), or trip-service
    computation was skipped/failed. Unlike get_driver_settings, there's no
    meaningful all-empty stub shape for a route, so callers handle None as
    "nothing to report" directly."""
    route = get(userdata, "optimized_route")
    if isinstance(route, dict) and isinstance(route.get("stops"), list):
        return route
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


def set_target_trip(userdata: dict, trip: dict | None) -> None:
    """Remember which schedule trip the conversation is focused on (resolved target)."""
    ctx = userdata.setdefault("context", {})
    tid = (trip or {}).get("trip_id")
    if tid:
        ctx["_target_trip_id"] = tid
        ctx.pop("_selected_trip_id", None)  # legacy key from before rename
    else:
        ctx.pop("_target_trip_id", None)
        ctx.pop("_selected_trip_id", None)


def get_target_trip(userdata: dict) -> dict | None:
    ctx = userdata.get("context", {})
    tid = ctx.get("_target_trip_id")
    if not tid:
        tid = ctx.pop("_selected_trip_id", None)
        if tid:
            ctx["_target_trip_id"] = tid
    if not tid:
        return None
    for t in get_schedule_trips(userdata):
        if t.get("trip_id") == tid:
            return t
    return None


def get_target_trip_index(userdata: dict) -> int | None:
    """1-based index in full schedule (current first, then upcoming)."""
    target = get_target_trip(userdata)
    if not target:
        return None
    tid = target.get("trip_id")
    for i, t in enumerate(get_schedule_trips(userdata), 1):
        if t.get("trip_id") == tid:
            return i
    return None


# Legacy aliases — remove after one release if nothing external imports these.
set_selected_trip = set_target_trip
get_selected_trip = get_target_trip
get_selected_trip_index = get_target_trip_index


def resolve_trip(
    userdata: dict,
    trip_index: int | None = None,
    *,
    utterance: str = "",
) -> dict | None:
    """Current trip, explicit index, utterance match, target trip, or nearest upcoming."""
    if utterance.strip():
        matched = match_trip_by_text(userdata, utterance, callable_only=False)
        if matched:
            return matched

    if trip_index is not None:
        schedule = get_schedule_trips(userdata)
        idx = int(trip_index) - 1
        if 0 <= idx < len(schedule):
            trip = schedule[idx]
            set_target_trip(userdata, trip)
            return trip
        return None

    target = get_target_trip(userdata)
    if target:
        return target

    current = get_current_trip(userdata)
    if current:
        return current

    schedule = get_schedule_trips(userdata)
    return schedule[0] if schedule else None


def resolve_customer_trip(
    userdata: dict,
    raw_arguments: dict | None = None,
) -> dict | None:
    """Trip for customer-facing tools — index, last utterance, target, current, nearest."""
    args = raw_arguments or {}
    trip_index = args.get("trip_index")
    utterance = get_last_driver_utterance(userdata) or ""
    return resolve_trip(userdata, trip_index, utterance=utterance)


def match_trip_in_subset(userdata: dict, text: str, trips: list[dict]) -> dict | None:
    """Match utterance to one trip within a filtered list (pending offers, callable, …)."""
    if not (text or "").strip() or not trips:
        return None
    allowed_ids = {t.get("trip_id") for t in trips}
    schedule = get_schedule_trips(userdata)
    id_to_index = {t.get("trip_id"): i + 1 for i, t in enumerate(schedule)}
    from app.voicebot.processors.trip_target import score_trip

    scored = []
    for trip in trips:
        idx = id_to_index.get(trip.get("trip_id"), 0)
        row = score_trip(trip, text, schedule_index=idx)
        if row.score > 0:
            scored.append(row)
    if not scored:
        return None
    scored.sort(key=lambda r: (-r.score, r.schedule_index))
    best = scored[0]
    if best.score < 28:
        return None
    if len(scored) == 1 or best.score - scored[1].score >= 6:
        set_target_trip(userdata, best.trip)
        return best.trip
    return None


def resolve_trip_from_subset(
    userdata: dict,
    trips: list[dict],
    raw_arguments: dict | None = None,
) -> dict | None:
    """Pick one trip from a filtered list by index or last driver utterance."""
    if not trips:
        return None
    if len(trips) == 1:
        set_target_trip(userdata, trips[0])
        return trips[0]
    args = raw_arguments or {}
    trip_index = args.get("trip_index")
    if trip_index is not None:
        idx = int(trip_index) - 1
        if 0 <= idx < len(trips):
            t = trips[idx]
            set_target_trip(userdata, t)
            return t
        return None
    utterance = get_last_driver_utterance(userdata) or ""
    return match_trip_in_subset(userdata, utterance, trips)


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


def _format_call_disambiguation(
    trip_rows: list[tuple[int, dict]],
    lang: str,
    *,
    location_hint: str = "",
) -> str:
    """Short prompt when several callable trips match — not the full schedule."""
    from app.voicebot.processors.trip_format import short_address

    if lang == "en":
        if len(trip_rows) == 2 and location_hint:
            n1 = trip_rows[0][1].get("customer_name") or "customer"
            n2 = trip_rows[1][1].get("customer_name") or "customer"
            return f"Which customer should I call — {n1} or {n2} at {location_hint}?"
        lines = [
            f"{i}. {t.get('customer_name') or 'unnamed customer'} "
            f"(pickup {short_address(t.get('pickup_address', ''), 30)})"
            for i, t in trip_rows
        ]
        return (
            "Which customer would you like to call: "
            + "; ".join(lines)
            + "? Tell me the number or the customer's name."
        )

    if len(trip_rows) == 2 and location_hint:
        n1 = trip_rows[0][1].get("customer_name") or "khách"
        n2 = trip_rows[1][1].get("customer_name") or "khách"
        return f"Bạn muốn gọi khách {n1} hay {n2} ở {location_hint}?"
    lines = [
        f"{i}. khách {t.get('customer_name') or 'không rõ tên'} "
        f"(đón {short_address(t.get('pickup_address', ''), 30)})"
        for i, t in trip_rows
    ]
    return (
        "Bạn muốn gọi khách nào: "
        + "; ".join(lines)
        + "? Bạn nói số thứ tự hoặc tên khách giúp em."
    )


def _resolve_call_target_from_utterance(
    userdata: dict,
    utterance: str,
    trips: list[dict],
    lang: str,
) -> dict | str | None:
    """Filter callable trips by address/name in utterance before listing all."""
    from app.voicebot.processors.trip_target import resolve_trips_from_text
    from app.voicebot.processors.trip_format import short_address

    result = resolve_trips_from_text(userdata, utterance, callable_only=True)
    if result.kind == "matched" and result.trip:
        set_target_trip(userdata, result.trip)
        return result.trip

    pool = list(result.candidates)
    if not pool:
        matched = match_callable_trip_by_text(userdata, utterance)
        if matched:
            sid = matched.get("trip_id")
            for t in trips:
                if t.get("trip_id") == sid:
                    set_target_trip(userdata, t)
                    return t
        return None

    addr_hits = [c for c in pool if "address" in c.signals]
    if addr_hits:
        pool = addr_hits

    if len(pool) == 1:
        set_target_trip(userdata, pool[0].trip)
        return pool[0].trip

    schedule = get_schedule_trips(userdata)
    id_to_index = {t.get("trip_id"): i + 1 for i, t in enumerate(schedule)}
    rows = sorted(
        (
            (id_to_index.get(c.trip.get("trip_id"), c.schedule_index), c.trip)
            for c in pool
        ),
        key=lambda row: row[0],
    )
    location_hint = ""
    if addr_hits:
        location_hint = short_address(addr_hits[0].trip.get("pickup_address", ""), 24)
    return _format_call_disambiguation(rows, lang, location_hint=location_hint)


def resolve_call_target(
    userdata: dict,
    *,
    trip_index: int | None = None,
    nudge_trip_id: str = "",
    utterance: str = "",
    lang: str = "vi",
) -> dict | str | None:
    """Pick trip for call_customer — by index, nudge, target trip, or disambiguation."""

    trips = get_callable_trips(userdata)
    if not trips:
        current = get_current_trip(userdata)
        if not current:
            return None
        trips = [current]

    if len(trips) == 1:
        set_target_trip(userdata, trips[0])
        return trips[0]

    if trip_index is not None:
        idx = int(trip_index) - 1
        if idx < 0 or idx >= len(trips):
            if lang == "en":
                return f"You only have {len(trips)} trip(s). Please choose 1 to {len(trips)}."
            return f"Bạn chỉ có {len(trips)} chuyến. Vui lòng chọn từ 1 đến {len(trips)}."
        target = trips[idx]
        set_target_trip(userdata, target)
        return target

    if utterance.strip():
        scoped = _resolve_call_target_from_utterance(
            userdata, utterance, trips, lang
        )
        if scoped is not None:
            return scoped

    if nudge_trip_id and any(t.get("trip_id") == nudge_trip_id for t in trips):
        target = next(t for t in trips if t.get("trip_id") == nudge_trip_id)
        set_target_trip(userdata, target)
        return target

    target = get_target_trip(userdata)
    if target:
        sid = target.get("trip_id")
        for t in trips:
            if t.get("trip_id") == sid:
                return t
        if target.get("customer_phone"):
            return target

    last = userdata.get("context", {}).get("_last_tool_response") or {}
    for blob in (last.get("spoken") or "", * (last.get("follow_up") or [])):
        matched = match_callable_trip_by_text(userdata, blob)
        if matched:
            sid = matched.get("trip_id")
            for t in trips:
                if t.get("trip_id") == sid:
                    return t

    if lang == "en":
        rows = [(i, t) for i, t in enumerate(trips, 1)]
        return _format_call_disambiguation(rows, lang)
    rows = [(i, t) for i, t in enumerate(trips, 1)]
    return _format_call_disambiguation(rows, lang)


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
        target_idx = get_target_trip_index(userdata)
        target = get_target_trip(userdata)
        if target_idx and target:
            name = target.get("customer_name") or "customer"
            parts.append(
                f"target trip #{target_idx} ({name}) — follow-ups apply to this trip unless driver switches"
            )
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
    target_idx = get_target_trip_index(userdata)
    target = get_target_trip(userdata)
    if target_idx and target:
        name = target.get("customer_name") or "khách"
        parts.append(
            f"chuyến đích số {target_idx} ({name}) — câu hỏi tiếp theo áp dụng chuyến này trừ khi tài xế đổi chuyến"
        )
    if not parts:
        return ""
    return (
        "DỮ LIỆU ĐÃ TẢI (luôn gọi tool để đọc chi tiết): "
        + ", ".join(parts)
        + ". KHÔNG nói 'không có thông tin' khi tool trả lời được."
    )


def get_active_customer_trip(userdata: dict) -> dict | None:
    return _as_trip(get(userdata, "active_trip"))


def add_customer_trip(userdata: dict, trip: dict) -> None:
    """Register a newly booked trip so later tool calls in the same session see it immediately."""
    ctx = userdata.setdefault("context", {})
    ctx["active_trip"] = trip
    trips = ctx.setdefault("trips", [])
    trips.insert(0, trip)


def add_driver_walkup_trip(userdata: dict, trip: dict) -> None:
    """Insert a just-created walk-up trip into the driver's session schedule.

    Walk-ups land as `confirmed`, so they belong in current/upcoming — not the
    customer `trips`/`active_trip` keys used by the customer agent.
    """
    if not isinstance(trip, dict) or not trip.get("trip_id"):
        return
    if not get_current_trip(userdata):
        set_current_trip(userdata, trip)
    upcoming = list(get_upcoming_trips(userdata))
    tid = trip["trip_id"]
    upcoming = [t for t in upcoming if t.get("trip_id") != tid]
    upcoming.insert(0, copy.deepcopy(trip))
    set_upcoming_trips(userdata, upcoming)


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
    current = _as_trip(ctx.get("current_trip"))
    if current and current.get("trip_id") == trip_id:
        patch_current_trip(userdata, **fields)
        return
    for key in ("upcoming_trips", "trips"):
        items = ctx.get(key)
        if not isinstance(items, list):
            continue
        ctx[key] = [
            {**t, **fields} if isinstance(t, dict) and t.get("trip_id") == trip_id else t
            for t in items
        ]
    active = _as_trip(ctx.get("active_trip"))
    if active and active.get("trip_id") == trip_id:
        ctx["active_trip"] = {**active, **fields}
    outbound = userdata.get("trip")
    if isinstance(outbound, dict) and outbound.get("trip_id") == trip_id:
        outbound.update(fields)

    # trip-service's current_trip is the in-progress trip (confirmed /
    # arrived_pickup / picked_up). After confirm, promote so later tools in
    # this session don't still see current_trip=None until the next prefetch.
    if fields.get("status") in CALLABLE_TRIP_STATUSES and not get_current_trip(userdata):
        for t in get_schedule_trips(userdata):
            if t.get("trip_id") == trip_id:
                set_current_trip(userdata, t)
                return
        if isinstance(outbound, dict) and outbound.get("trip_id") == trip_id:
            set_current_trip(userdata, outbound)


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


def set_pending_driver_action(
    userdata: dict,
    intent: str,
    args: dict,
    *,
    source: str = "",
) -> None:
    userdata.setdefault("context", {})["_pending_driver_action"] = {
        "intent": intent,
        "args": dict(args),
        "source": (source or "")[:200],
        "at": _now(),
    }


def get_pending_driver_action(userdata: dict) -> dict | None:
    pending = userdata.get("context", {}).get("_pending_driver_action")
    return pending if isinstance(pending, dict) else None


def pop_pending_driver_action(userdata: dict) -> dict | None:
    ctx = userdata.setdefault("context", {})
    pending = ctx.pop("_pending_driver_action", None)
    return pending if isinstance(pending, dict) else None


def clear_pending_driver_action(userdata: dict) -> None:
    userdata.get("context", {}).pop("_pending_driver_action", None)


def set_last_driver_utterance(userdata: dict, text: str) -> None:
    clean = (text or "").strip()
    if clean:
        userdata.setdefault("context", {})["_last_driver_utterance"] = clean


def get_last_driver_utterance(userdata: dict) -> str:
    return userdata.get("context", {}).get("_last_driver_utterance") or ""


def set_pending_call_utterance(userdata: dict, text: str) -> None:
    """Driver's latest call-customer phrase — consumed by call_customer tool."""
    ctx = userdata.setdefault("context", {})
    if text.strip():
        ctx["_pending_call_utterance"] = text.strip()


def pop_pending_call_utterance(userdata: dict) -> str:
    ctx = userdata.setdefault("context", {})
    return ctx.pop("_pending_call_utterance", "") or ""


def patch_current_trip(userdata: dict, **fields: Any) -> None:
    ctx = userdata.setdefault("context", {})
    trip = _as_trip(ctx.get("current_trip"))
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
            ctx[key] = [
                t for t in items
                if not (isinstance(t, dict) and t.get("trip_id") == trip_id)
            ]
    current = _as_trip(ctx.get("current_trip"))
    if current and current.get("trip_id") == trip_id:
        ctx["current_trip"] = None
    active = _as_trip(ctx.get("active_trip"))
    if active and active.get("trip_id") == trip_id:
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
