"""Suggests which pickup/dropoff the driver should head to next, based on
their last known GPS ping (~every 10 min while online) and current schedule.

Shared by three callers, all reading the exact same candidate list + distance
ranking here so the answer is always consistent regardless of which triggered it:
  - the on-demand suggest_next_stop tool (driver asks directly)
  - the proactive nudge fired after a pickup/dropoff completes
    (trip-service's PATCH /:tripId, nudge_kind='suggest_next_stop')
  - the proactive nudge fired when GPS gets within ~200m of any pending stop
    (trip-service's proximityService.ts maybeAnnounce*ArrivalNextStop, same
    nudge_kind — see nudge.py's build_nudge_message)
"""
from __future__ import annotations

import math

from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import short_address

_EARTH_RADIUS_METERS = 6371000

# Trips a driver could plausibly be heading to next: an accepted trip not
# yet picked up (head to pickup) or one already picked up (head to dropoff).
# Mirrors trip-service's driverContextService.ts IN_PROGRESS set.
_NOT_PICKED_UP_STATUSES = ("confirmed", "arrived_pickup")


def _distance_meters(a: dict, b: dict) -> float:
    lat1, lng1 = math.radians(a["lat"]), math.radians(a["lng"])
    lat2, lng2 = math.radians(b["lat"]), math.radians(b["lng"])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 2 * _EARTH_RADIUS_METERS * math.asin(math.sqrt(h))


def _candidates(userdata: dict, exclude_trip_id: str = "") -> list[dict]:
    candidates: list[dict] = []
    for trip in context_store.get_schedule_trips(userdata):
        if exclude_trip_id and trip.get("trip_id") == exclude_trip_id:
            # The 200m arrival nudge fires WHILE this trip is still sitting
            # at confirmed/picked_up (arrival hasn't been confirmed yet), so
            # without this exclusion it would trivially win its own ranking
            # (distance ~0, since the driver is standing right there) and the
            # nudge would announce "go to A" to a driver already AT A. Only
            # ever set by that GPS-triggered path (see nudge.py's
            # suggest_next_stop branch) — the on-demand tool and the
            # post-status-change nudge both leave this empty, since there
            # the current trip's OWN candidacy already reflects reality
            # (e.g. pickup -> dropoff right after a real status transition).
            continue
        status = trip.get("status")
        if status in _NOT_PICKED_UP_STATUSES:
            kind, lat, lng, address = "pickup", trip.get("pickup_lat"), trip.get("pickup_lng"), trip.get("pickup_address", "")
        elif status == "picked_up":
            kind, lat, lng, address = "dropoff", trip.get("dropoff_lat"), trip.get("dropoff_lng"), trip.get("dropoff_address", "")
        else:
            continue
        if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
            continue
        candidates.append({"trip": trip, "kind": kind, "address": address, "lat": lat, "lng": lng})
    return candidates


def _best_next_stop(location: dict, candidates: list[dict]) -> dict:
    """Nearest pending stop (pickup and dropoff pooled together) to the
    driver's current position. Recomputed fresh from live GPS + a live
    schedule refetch every time this fires, so "next stop" always tracks
    where the driver actually is right now. Since this is always called with
    the just-arrived trip already excluded (see _candidates'
    exclude_trip_id), picking the nearest REMAINING candidate is equivalent
    to picking the 2nd-nearest point overall — the excluded trip is
    trivially nearest, being wherever the driver is currently standing."""
    return min(candidates, key=lambda c: _distance_meters(location, c))


def _stop_reason(kind: str, lang: str) -> str:
    if kind == "pickup":
        return "khách đã đặt chuyến này" if lang != "en" else "the customer booked this trip"
    return "cần hoàn tất chuyến đang chở" if lang != "en" else "to complete the trip currently underway"


def describe_stop(kind: str, customer: str, address: str, lang: str = "vi") -> str:
    """"Điểm tiếp theo cần đến là X, để đón/trả khách Y, vì Z." — the fixed
    phrasing template (WHERE, WHO, WHY) used by build_next_stop_suggestion
    below, the one place that ranks all pending stops by distance and picks
    the nearest (see _best_next_stop). Deliberately NOT used by the plain 1km
    proximity_pickup/proximity_dropoff nudges in nudge.py — those fire
    per-trip based on raw distance alone, with no visibility into the
    driver's other pending stops, so they have no basis to claim "this is
    your next stop" the way this function's callers do."""
    reason = _stop_reason(kind, lang)
    if lang == "en":
        verb = "pick up" if kind == "pickup" else "drop off"
        return f"The next stop you need to reach is {address}, to {verb} {customer}, because {reason}."
    verb = "đón" if kind == "pickup" else "trả"
    return f"Điểm tiếp theo cần đến là {address}, để {verb} khách {customer}, vì {reason}."


def extra_stops_suffix(extra: int, lang: str) -> str:
    if not extra:
        return ""
    if lang == "en":
        return f" You have {extra} more stop{'s' if extra != 1 else ''} waiting after that."
    return f" Anh/chị còn {extra} điểm dừng khác đang chờ sau đó."


# Mirrors trip-service's config.proximityAlertMeters default (1km) — only
# merge the "want me to call them?" question into the next-stop announcement
# when the announced stop is already close enough for that to be actionable
# right now, not for a next stop that's still far away.
_CALL_OFFER_DISTANCE_METERS = 1000


def build_next_stop_suggestion(userdata: dict, lang: str = "vi", exclude_trip_id: str = "") -> str:
    candidates = _candidates(userdata, exclude_trip_id=exclude_trip_id)
    if not candidates:
        if exclude_trip_id:
            return (
                "Sau điểm này, anh/chị không còn điểm đón hay trả khách nào khác đang chờ."
                if lang != "en" else
                "After this one, you don't have any other pending pickup or dropoff waiting."
            )
        return (
            "Hiện anh/chị không có điểm đón hay trả khách nào đang chờ."
            if lang != "en" else
            "You don't have any pending pickup or dropoff right now."
        )

    location = context_store.get_current_location(userdata)
    # No GPS fix yet (driver never went online long enough for a ping) —
    # can't rank by distance, just name the first one instead of failing.
    best = _best_next_stop(location, candidates) if location else candidates[0]

    trip = best["trip"]
    customer = trip.get("customer_name") or ("khách" if lang != "en" else "the customer")
    address = short_address(best["address"])
    extra = len(candidates) - 1

    msg = describe_stop(best["kind"], customer, address, lang) + extra_stops_suffix(extra, lang)

    # Merge in the call-offer for a close-enough pickup, so the driver can
    # act immediately instead of waiting for a separate 1km proximity_pickup
    # nudge to fire later for this same trip. Only pickup — dropoff has no
    # equivalent "call ahead" question in this flow (see proximity_dropoff in
    # nudge.py, which is about reminding a customer already in the car).
    if best["kind"] == "pickup" and location and _distance_meters(location, best) <= _CALL_OFFER_DISTANCE_METERS:
        msg += (
            " Would you like me to call and let them know to head out?"
            if lang == "en"
            else " Anh/chị có muốn tôi gọi báo khách di chuyển ra điểm đón không?"
        )
        # So a driver's "yes, gọi đi" resolves straight to THIS trip (the
        # announced next stop) instead of re-asking which customer — mirrors
        # the one-shot mechanism proximity_pickup/dropoff nudges already use.
        # Must win over any related_trip_id already in this nudge's payload:
        # for the 200m GPS-arrival trigger, that field means something else
        # entirely (the trip to EXCLUDE from ranking — see _candidates), so
        # session.py/agent.py skip their own related_trip_id-based set for
        # nudge_kind=="suggest_next_stop" and defer to this call instead.
        context_store.set_last_nudge_trip(userdata, trip.get("trip_id", ""))

    return msg
