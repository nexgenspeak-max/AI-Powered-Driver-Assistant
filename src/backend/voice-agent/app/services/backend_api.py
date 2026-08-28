"""
Thin async HTTP client for trip-service and call-center APIs.
All methods raise httpx.HTTPStatusError on non-2xx — callers handle it.
"""
import asyncio
import logging
import httpx
from app.config.settings import get_settings
from app.services.service_token import auth_headers

logger = logging.getLogger("voice-agent.backend-api")

# Shared, pooled client — reused across every call in this module instead of
# opening (and immediately closing) a brand new TCP/TLS connection per
# request, so tool invocations within the SAME session don't re-handshake.
#
# BUT a LiveKit job process is reused for multiple sequential jobs, each on a
# fresh event loop. httpx's connection pool binds anyio locks/events to the
# loop that was running when a connection was first opened — reusing this
# client from a later job's loop then raises "Event is bound to a different
# event loop". So the client is pinned to the loop it was built on and
# transparently rebuilt whenever a different running loop is seen.
_client: httpx.AsyncClient | None = None
_client_loop: asyncio.AbstractEventLoop | None = None


def _new_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        limits=httpx.Limits(max_keepalive_connections=20, max_connections=20),
    )


def _get_client() -> httpx.AsyncClient:
    global _client, _client_loop
    loop = asyncio.get_running_loop()
    if _client is None or _client.is_closed or _client_loop is not loop:
        # Stale client from a previous job's (now-dead) event loop, or none
        # yet. Can't aclose() the old one — its loop is gone — just drop the
        # reference and let GC reap its sockets.
        _client = _new_client()
        _client_loop = loop
    return _client


async def aclose() -> None:
    """Close the shared client — call from the job's shutdown callback."""
    global _client, _client_loop
    client, _client, _client_loop = _client, None, None
    if client is not None:
        try:
            await client.aclose()
        except Exception:
            logger.debug("backend_api client aclose failed (ignored)", exc_info=True)


def _trip_base() -> str:
    return get_settings().trip_service_url


# ── Trips ─────────────────────────────────────────────────────────────────────

async def create_trip(
    customer_name: str,
    customer_phone: str,
    pickup_address: str,
    dropoff_address: str,
    pickup_time: str = "",
) -> dict:
    """Book a new trip on behalf of a customer talking to the voice agent.

    pickup_time is ISO 8601 (Vietnam time) when the customer scheduled the
    trip ahead of time; empty means the trip is booked for right now.
    """
    c = _get_client()
    r = await c.post(
        f"{_trip_base()}/api/v1/trips",
        json={
            "customer_name":   customer_name,
            "customer_phone":  customer_phone,
            "pickup_address":  pickup_address,
            "dropoff_address": dropoff_address,
            "pickup_time":     pickup_time,
            "booked_via":      "voice",
        },
        headers=auth_headers(),
        timeout=15,
    )
    r.raise_for_status()
    logger.info("trip booked via voice-agent | customer=%s", customer_phone)
    return r.json()


async def get_customer_context(customer_phone: str) -> dict:
    """Single prefetch endpoint — trips and active trip."""
    c = _get_client()
    r = await c.get(
        f"{_trip_base()}/api/v1/customers/me/context",
        headers=auth_headers({"X-Customer-Phone": customer_phone}),
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


async def get_customer_trips(customer_phone: str) -> list[dict]:
    """Return all trips for a customer (by phone), most recent first."""
    c = _get_client()
    r = await c.get(
        f"{_trip_base()}/api/v1/trips",
        params={"customer_phone": customer_phone},
        headers=auth_headers(),
        timeout=8,
    )
    r.raise_for_status()
    return r.json()


async def get_upcoming_trips(driver_phone: str) -> list[dict]:
    c = _get_client()
    r = await c.get(
        f"{_trip_base()}/api/v1/drivers/me/trips/upcoming",
        headers=auth_headers({"X-Driver-Phone": driver_phone}),
        timeout=8,
    )
    r.raise_for_status()
    return r.json()


async def get_driver_context(driver_phone: str) -> dict:
    """Single prefetch endpoint — profile, earnings, bonuses, trips."""
    c = _get_client()
    r = await c.get(
        f"{_trip_base()}/api/v1/drivers/me/context",
        headers=auth_headers({"X-Driver-Phone": driver_phone}),
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


async def get_current_trip(driver_phone: str) -> dict | None:
    c = _get_client()
    r = await c.get(
        f"{_trip_base()}/api/v1/drivers/me/trips/current",
        headers=auth_headers({"X-Driver-Phone": driver_phone}),
        timeout=8,
    )
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.json()


async def update_trip_status(trip_id: str, status: str) -> dict:
    c = _get_client()
    r = await c.patch(
        f"{_trip_base()}/api/v1/trips/{trip_id}",
        json={"status": status},
        headers=auth_headers(),
        timeout=8,
    )
    r.raise_for_status()
    logger.info("trip %s → %s", trip_id, status)
    return r.json()


async def get_trip_location(trip_id: str) -> dict:
    c = _get_client()
    r = await c.get(
        f"{_trip_base()}/api/v1/trips/{trip_id}/location",
        headers=auth_headers(),
        timeout=8,
    )
    r.raise_for_status()
    return r.json()


async def confirm_trip_with_customer(trip_id: str) -> None:
    c = _get_client()
    r = await c.post(
        f"{_trip_base()}/api/v1/trips/{trip_id}/confirm-with-customer",
        json={
            "method": "sms",
            "message": "Tài xế đã xác nhận chuyến đi và sẽ đến đón đúng giờ.",
        },
        headers=auth_headers(),
        timeout=8,
    )
    r.raise_for_status()


# ── Calls ─────────────────────────────────────────────────────────────────────

async def start_call(
    driver_id: str,
    customer_id: str,
    trip_id: str,
    phone_number: str,
    mode: str = "bridge",
    room_name: str = "",
    *,
    lang: str = "vn",
    customer_name: str = "",
    pickup_address: str = "",
) -> dict:
    c = _get_client()
    r = await c.post(
        f"{_trip_base()}/api/v1/calls/start",
        json={
            "driverId":       driver_id,
            "customerId":     customer_id,
            "tripId":         trip_id,
            "phoneNumber":    phone_number,
            "mode":           mode,
            "roomName":       room_name,
            "lang":           lang,
            "customerName":   customer_name,
            "pickupAddress":  pickup_address,
        },
        headers=auth_headers(),
        timeout=25,
    )
    r.raise_for_status()
    return r.json()


async def send_sms(message: str, phone_number: str = "", trip_id: str = "") -> dict:
    c = _get_client()
    r = await c.post(
        f"{_trip_base()}/api/v1/sms/send",
        json={"phoneNumber": phone_number, "tripId": trip_id, "message": message},
        headers=auth_headers(),
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


async def call_driver(customer_phone: str, trip_id: str, room_name: str) -> dict:
    """Customer-initiated call: dial the trip's driver into the customer's room."""
    c = _get_client()
    r = await c.post(
        f"{_trip_base()}/api/v1/calls/call-driver",
        json={
            "customerPhone": customer_phone,
            "tripId":        trip_id,
            "roomName":      room_name,
        },
        headers=auth_headers(),
        timeout=25,
    )
    r.raise_for_status()
    return r.json()


async def get_latest_call_record(driver_phone: str) -> dict:
    c = _get_client()
    r = await c.get(
        f"{_trip_base()}/api/v1/calls/latest",
        headers=auth_headers({"X-Driver-Phone": driver_phone}),
        timeout=10,
    )
    r.raise_for_status()
    record = r.json()

    # trip-service's cache is just a pointer (call_id/status) now — the
    # actual transcript+summary lives in call-logger's DynamoDB table
    # (local-driver-assistant-call-records), saved by ConversationService
    # when the call ends. Fetch it here, once, so every caller of this
    # function (check_call_status, summarize_last_call, ...) still sees a
    # populated `summary` without each needing to know about this extra hop.
    # Skipped while still in_progress — the call hasn't ended, so
    # call-logger has no record for it yet.
    if record.get("status") != "in_progress" and not record.get("summary"):
        call_id = record.get("call_id")
        if call_id:
            record["summary"] = await _fetch_summary_by_call_id(call_id)

    return record


async def _fetch_summary_by_call_id(call_id: str) -> str:
    c = _get_client()
    try:
        r = await c.post(
            f"{_trip_base()}/api/v1/calls/{call_id}/summary",
            headers=auth_headers(),
            timeout=10,
        )
        if r.status_code == 404:
            return ""
        r.raise_for_status()
        return r.json().get("summary", "")
    except Exception:
        logger.warning("failed to fetch call summary | call_id=%s", call_id, exc_info=True)
        return ""


async def complete_background_call(
    driver_phone: str, call_id: str, summary: str
) -> None:
    c = _get_client()
    r = await c.post(
        f"{_trip_base()}/api/v1/calls/complete",
        json={
            "driverPhone": driver_phone,
            "callId":      call_id,
            "summary":     summary,
        },
        headers=auth_headers(),
        timeout=10,
    )
    r.raise_for_status()


async def get_latest_call_summary(driver_phone: str) -> str:
    # get_latest_call_record already resolves the call-logger fallback by
    # call_id — this is now just a thin convenience wrapper.
    try:
        call = await get_latest_call_record(driver_phone)
    except Exception:
        return ""
    return call.get("summary", "")


# ── Reminders ─────────────────────────────────────────────────────────────────

async def create_reminder(
    driver_id: str, trip_id: str, remind_before_minutes: int
) -> dict:
    c = _get_client()
    r = await c.post(
        f"{_trip_base()}/api/v1/reminders",
        json={
            "driverId":             driver_id,
            "tripId":               trip_id,
            "remindBeforeMinutes":  remind_before_minutes,
            "type":                 "PICKUP_REMINDER",
        },
        headers=auth_headers(),
        timeout=8,
    )
    r.raise_for_status()
    return r.json()


# ── Driver profile & stats ────────────────────────────────────────────────────

async def get_driver_profile(driver_phone: str) -> dict:
    """Return driver rating, acceptance rate, completion rate, total trips."""
    c = _get_client()
    r = await c.get(
        f"{_trip_base()}/api/v1/drivers/me/profile",
        headers=auth_headers({"X-Driver-Phone": driver_phone}),
        timeout=8,
    )
    r.raise_for_status()
    return r.json()


async def get_today_earnings(driver_phone: str) -> dict:
    """Return today's earnings: total, trip count, bonuses, hours online."""
    c = _get_client()
    r = await c.get(
        f"{_trip_base()}/api/v1/drivers/me/earnings/today",
        headers=auth_headers({"X-Driver-Phone": driver_phone}),
        timeout=8,
    )
    r.raise_for_status()
    return r.json()


async def get_earnings_summary(driver_phone: str, period: str = "week") -> dict:
    """Return earnings summary for the given period ('week' | 'month')."""
    c = _get_client()
    r = await c.get(
        f"{_trip_base()}/api/v1/drivers/me/earnings/summary",
        headers=auth_headers({"X-Driver-Phone": driver_phone}),
        params={"period": period},
        timeout=8,
    )
    r.raise_for_status()
    return r.json()


async def get_active_bonuses(driver_phone: str) -> list[dict]:
    """Return active bonuses or surge-zone info for the driver."""
    c = _get_client()
    r = await c.get(
        f"{_trip_base()}/api/v1/drivers/me/bonuses",
        headers=auth_headers({"X-Driver-Phone": driver_phone}),
        timeout=8,
    )
    r.raise_for_status()
    return r.json()


async def register_driver_session(driver_phone: str, room_name: str) -> None:
    """Mark this room as the driver's currently open voice session — read by
    trip-service's driverReachService.reachDriver() to decide whether to
    push a proactive nudge into it instead of dialing a new one."""
    c = _get_client()
    r = await c.put(
        f"{_trip_base()}/api/v1/drivers/me/session",
        headers=auth_headers({"X-Driver-Phone": driver_phone}),
        json={"room_name": room_name},
        timeout=8,
    )
    r.raise_for_status()


async def clear_driver_session(driver_phone: str) -> None:
    """Clear the presence marker set by register_driver_session — called on
    session teardown so a later nudge dials a fresh session instead of
    trying to push into this now-closed room."""
    c = _get_client()
    r = await c.delete(
        f"{_trip_base()}/api/v1/drivers/me/session",
        headers=auth_headers({"X-Driver-Phone": driver_phone}),
        timeout=8,
    )
    r.raise_for_status()


async def end_voice_session(room_name: str, participant_identities: list[str]) -> None:
    """Remove the given participant(s) from a LiveKit room via trip-service,
    which owns the RoomServiceClient/admin credentials — see
    session_control.py's end_room_session(), the only caller. Centralizes
    room administration in trip-service instead of voice-agent holding its
    own separate LiveKit admin client just for this one teardown step.
    Best-effort from the caller's perspective (session_control.py already
    treats this as non-fatal); raises on a genuine HTTP failure like every
    other method here, left to the caller to catch."""
    c = _get_client()
    r = await c.post(
        f"{_trip_base()}/api/v1/voice/end-session",
        json={"room_name": room_name, "participant_identities": participant_identities},
        headers=auth_headers(),
        timeout=8,
    )
    r.raise_for_status()


async def set_driver_online_status(driver_phone: str, online: bool) -> None:
    """Set driver availability: online=True to accept trips, False to go offline."""
    c = _get_client()
    r = await c.patch(
        f"{_trip_base()}/api/v1/drivers/me/status",
        headers=auth_headers({"X-Driver-Phone": driver_phone}),
        json={"online": online},
        timeout=8,
    )
    r.raise_for_status()


# ── Trip issue reporting ──────────────────────────────────────────────────────

async def report_no_show(trip_id: str, driver_phone: str) -> None:
    """Report that the customer did not show up for the pickup."""
    c = _get_client()
    r = await c.post(
        f"{_trip_base()}/api/v1/trips/{trip_id}/no-show",
        headers=auth_headers({"X-Driver-Phone": driver_phone}),
        timeout=8,
    )
    r.raise_for_status()


async def report_trip_issue(
    trip_id: str, driver_phone: str, issue_type: str, description: str = ""
) -> None:
    """Report an issue with a trip (safety, damage, behavior, etc.)."""
    c = _get_client()
    r = await c.post(
        f"{_trip_base()}/api/v1/trips/{trip_id}/issues",
        headers=auth_headers({"X-Driver-Phone": driver_phone}),
        json={"issueType": issue_type, "description": description},
        timeout=10,
    )
    r.raise_for_status()


async def extend_wait_time(trip_id: str, driver_phone: str, extra_minutes: int) -> dict:
    """Request additional wait time at the pickup point."""
    c = _get_client()
    r = await c.post(
        f"{_trip_base()}/api/v1/trips/{trip_id}/extend-wait",
        headers=auth_headers({"X-Driver-Phone": driver_phone}),
        json={"extraMinutes": extra_minutes},
        timeout=8,
    )
    r.raise_for_status()
    return r.json()
