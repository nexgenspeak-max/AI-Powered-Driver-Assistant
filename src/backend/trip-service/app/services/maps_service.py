"""
Google Maps Directions API — fetch route, ETA, and traffic info for a trip.
Returns a Vietnamese-friendly summary the voice-agent can read to the driver.
"""
import logging

import httpx

logger = logging.getLogger(__name__)

_DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"


async def get_route(pickup: str, dropoff: str, api_key: str) -> dict:
    """
    Returns:
        distance_km, eta_minutes, traffic_note (Vietnamese), summary (main road)
    Returns {} if Maps API key is not set or the request fails.
    """
    if not api_key:
        return {}

    params = {
        "origin": pickup,
        "destination": dropoff,
        "language": "vi",
        "region": "vn",
        "departure_time": "now",
        "traffic_model": "best_guess",
        "key": api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(_DIRECTIONS_URL, params=params)
            data = resp.json()
    except Exception:
        logger.warning("Google Maps request failed", exc_info=True)
        return {}

    if data.get("status") != "OK" or not data.get("routes"):
        logger.warning("Maps API status: %s", data.get("status"))
        return {}

    route = data["routes"][0]
    leg   = route["legs"][0]

    distance_km    = leg["distance"]["value"] / 1000
    eta_minutes    = (leg.get("duration_in_traffic") or leg["duration"])["value"] // 60
    normal_minutes = leg["duration"]["value"] // 60
    delay          = eta_minutes - normal_minutes

    if delay >= 10:
        traffic_note = f"Kẹt xe nặng, thêm khoảng {delay} phút so với bình thường"
    elif delay >= 4:
        traffic_note = f"Giao thông chậm, thêm khoảng {delay} phút"
    else:
        traffic_note = "Giao thông thông thoáng"

    return {
        "distance_km":  round(distance_km, 1),
        "eta_minutes":  eta_minutes,
        "traffic_note": traffic_note,
        "summary":      route.get("summary", ""),
    }
