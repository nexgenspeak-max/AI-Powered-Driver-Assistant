"""Proactive driver nudges — trip-service (Node) decides WHEN to reach the
driver (see driverReachService.ts), this module renders WHAT the AI says.

Two delivery paths, same payload shape either way:
  - driver already has a session open -> pushed via LiveKit data message on
    DRIVER_NUDGE_TOPIC (see session.py's `_on_driver_nudge` listener)
  - driver has no session open -> a new one is dialed, with the same
    `{nudge_kind, ...payload}` shape in room metadata (see session.py's
    `elif meta.get("nudge_kind")` branch and agent.py's `proactive_nudge`)
"""
from __future__ import annotations

import logging

from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.next_stop import build_next_stop_suggestion
from app.voicebot.processors.trip_format import short_address

logger = logging.getLogger("llm-orchestrator.processors.nudge")

# Must match trip-service's driverReachService.ts DRIVER_NUDGE_TOPIC exactly.
DRIVER_NUDGE_TOPIC = "driver_proactive_nudge"

# Reload context_store only — no spoken line (see session.py live push).
SILENT_NUDGE_KINDS = frozenset({"schedule_updated"})


async def _refresh_schedule(userdata: dict) -> None:
    """Live re-fetch the driver's schedule before ranking/counting stops —
    trip-service intentionally sends no schedule data in nudge payloads (see
    driverReachService.ts) so this always reflects trip status right as it
    changed, rather than whatever this session's context snapshot happened to
    hold (can be stale: e.g. a pickup/dropoff completed via the driver-app UI
    button, a path this voice session's own context_store never observes on
    its own). Best-effort — a failed refresh just means the nudge falls back
    to the cached snapshot instead of blocking."""
    driver_phone = userdata.get("driver_phone", "")
    if not driver_phone:
        return
    try:
        fresh = await backend_api.get_driver_context(driver_phone)
        context_store.load_driver_context(userdata, fresh)
    except Exception:
        logger.warning("nudge — live schedule refresh failed, using cached data", exc_info=True)


async def build_nudge_message(
    nudge_kind: str, payload: dict, lang: str = "vi", userdata: dict | None = None,
) -> str:
    """Render the spoken text for a nudge, or "" if nudge_kind is unrecognized
    (callers must treat that as "don't say anything", not a crash)."""
    if nudge_kind == "debug_ping":
        text = payload.get("text")
        if text:
            return str(text)
        return "Đây là tin nhắn thử nghiệm." if lang != "en" else "This is a test message."

    if nudge_kind == "proximity_pickup":
        # 1km checkpoint: purely the call-offer, nothing more. Whether this
        # trip is genuinely the "next" stop in an optimal route is NOT
        # checked here (this fires per-trip, independent of the driver's
        # other pending stops) — that claim belongs solely to the 200m
        # suggest_next_stop nudge below, which actually computes it. Keeping
        # this one plain avoids asserting an ordering this code never verified.
        customer = payload.get("customer_name") or ("khách" if lang != "en" else "the customer")
        pickup = payload.get("pickup_address", "")
        if lang == "en":
            return (
                f"You're about to reach {customer}'s pickup point at {pickup}. "
                "Would you like me to call and let them know to head out?"
            )
        return (
            f"Bạn sắp đến điểm đón khách {customer} ở {pickup}. "
            "Bạn có muốn mình gọi báo khách di chuyển ra điểm đón không?"
        )

    if nudge_kind == "proximity_dropoff":
        customer = payload.get("customer_name") or ("khách" if lang != "en" else "the customer")
        dropoff = payload.get("dropoff_address", "")
        if lang == "en":
            return (
                f"You're about to reach the dropoff point for {customer} at {dropoff}. "
                "Would you like me to call and remind them to check their belongings?"
            )
        return (
            f"Bạn sắp đến điểm trả khách {customer} ở {dropoff}. "
            "Bạn có muốn mình gọi nhắc khách kiểm tra hành lý và chuẩn bị xuống xe không?"
        )

    if nudge_kind == "suggest_next_stop":
        if userdata is None:
            logger.warning("build_nudge_message: suggest_next_stop called without userdata")
            return ""
        await _refresh_schedule(userdata)
        # related_trip_id is only set by the 200m GPS-arrival trigger (see
        # proximityService.ts's maybeAnnounce*ArrivalNextStop) — that trip is
        # still sitting at confirmed/picked_up (arrival not yet confirmed),
        # so without excluding it here it would win its own ranking (the
        # driver is standing right on top of it) and this would announce
        # "go to A" to someone already at A. The post-status-change trigger
        # (trips.ts) sends no related_trip_id, so it's unaffected — there the
        # trip's candidacy already changed for real (pickup -> dropoff).
        exclude_trip_id = payload.get("related_trip_id", "")
        return build_next_stop_suggestion(userdata, lang=lang, exclude_trip_id=exclude_trip_id)

    if nudge_kind == "new_trip_offer":
        # Mid-session booking: prefetch snapshot is stale until this GET.
        # related_trip_id (never trip_id) keeps DriverAgent on the full
        # inbound toolset so the driver can confirm without a new outbound room.
        if userdata is not None:
            await _refresh_schedule(userdata)
        related_id = payload.get("related_trip_id", "")
        trip = None
        if userdata is not None and related_id:
            trip = next(
                (t for t in context_store.get_schedule_trips(userdata) if t.get("trip_id") == related_id),
                None,
            )
        customer = (
            (trip or {}).get("customer_name")
            or payload.get("customer_name")
            or ("khách" if lang != "en" else "the customer")
        )
        pickup = short_address(
            (trip or {}).get("pickup_address") or payload.get("pickup_address") or "",
            40,
        )
        pickup_bit = f" at {pickup}" if pickup and lang == "en" else (f" ở {pickup}" if pickup else "")
        if lang == "en":
            return (
                f"You have a new trip: pick up {customer}{pickup_bit}. "
                "Would you like to accept it?"
            )
        return (
            f"Bạn có chuyến mới: đón {customer}{pickup_bit}. "
            "Bạn nhận chuyến này không?"
        )

    if nudge_kind == "schedule_updated":
        if userdata is not None:
            await _refresh_schedule(userdata)
        return ""

    logger.warning("build_nudge_message: unhandled nudge_kind=%s", nudge_kind)
    return ""


# proximity_* is said before suggest_next_stop: "bạn sắp đến điểm đón X"
# then "điểm kế tiếp là Y" reads in the right order, and the proximity line is
# guaranteed non-empty so the driver always hears *something* even if the
# suggestion can't be computed.
_NUDGE_ORDER = {
    "schedule_updated": -1,
    "new_trip_offer": 0,
    "proximity_pickup": 1,
    "proximity_dropoff": 1,
    "debug_ping": 2,
    "suggest_next_stop": 3,
}


async def speak_nudges(
    session, nudges: list[dict], *, lang: str = "vi", userdata: dict | None = None,
) -> bool:
    """Render + speak every deliverable nudge in `nudges`, in a sensible order.

    Each item: {"nudge_kind": str, ...payload}. Used by DriverAgent.on_enter for
    the no-open-session delivery path, where trip-service can now hand over more
    than one pending nudge at once (1km "gần điểm đón" + 200m "gợi ý điểm kế" —
    they used to share one overwritable Redis slot, so only the last one
    survived). Nudges that render empty (e.g. suggest_next_stop with no rankable
    stop) are skipped, NOT turned into a fallback greeting.

    Returns True if at least one line was spoken.
    """
    ordered = sorted(
        (n for n in nudges if isinstance(n, dict) and n.get("nudge_kind")),
        key=lambda n: _NUDGE_ORDER.get(n["nudge_kind"], 9),
    )
    said = False
    for n in ordered:
        kind = n.get("nudge_kind", "")
        payload = {k: v for k, v in n.items() if k != "nudge_kind"}
        text = await build_nudge_message(kind, payload, lang=lang, userdata=userdata)
        if not text:
            logger.info("speak_nudges: nothing to say for kind=%s — skipped", kind)
            continue
        # Same guard as session.py's live-push _speak_driver_nudge: for
        # suggest_next_stop, payload.related_trip_id is the trip to EXCLUDE, not
        # the announced one — next_stop.py sets last_nudge_trip itself there.
        # new_trip_offer uses related_trip_id for the NEW booking; pointing
        # last_nudge_trip at it would send "gọi khách" at an unconfirmed offer.
        if kind not in ("suggest_next_stop", "new_trip_offer", "schedule_updated") and userdata is not None:
            related_trip_id = payload.get("related_trip_id", "")
            if related_trip_id:
                context_store.set_last_nudge_trip(userdata, related_trip_id)
        # Match session.py live-push nudges: trip offers must be interruptible
        # so confirm/reject fast-path can cut in under the 2s bar.
        allow_interrupt = kind in ("new_trip_offer", "proximity_pickup", "proximity_dropoff")
        await session.say(text, allow_interruptions=allow_interrupt)
        said = True
    return said
