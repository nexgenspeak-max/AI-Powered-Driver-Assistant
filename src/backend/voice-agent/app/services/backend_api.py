"""
Thin async HTTP client for trip-service and call-center APIs.
All methods raise httpx.HTTPStatusError on non-2xx — callers handle it.
"""
import logging
import httpx
from app.config.settings import get_settings

logger = logging.getLogger("voice-agent.backend-api")


def _trip_base() -> str:
    return get_settings().trip_service_url


# ── Trips ─────────────────────────────────────────────────────────────────────

async def get_customer_trips(customer_phone: str) -> list[dict]:
    """Return all trips for a customer (by phone), most recent first."""
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.get(
            f"{_trip_base()}/api/v1/trips",
            params={"customer_phone": customer_phone},
        )
        r.raise_for_status()
        return r.json()


async def get_upcoming_trips(driver_phone: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.get(
            f"{_trip_base()}/api/v1/drivers/me/trips/upcoming",
            headers={"X-Driver-Phone": driver_phone},
        )
        r.raise_for_status()
        return r.json()


async def get_current_trip(driver_phone: str) -> dict | None:
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.get(
            f"{_trip_base()}/api/v1/drivers/me/trips/current",
            headers={"X-Driver-Phone": driver_phone},
        )
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()


async def update_trip_status(trip_id: str, status: str) -> None:
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.patch(
            f"{_trip_base()}/api/v1/trips/{trip_id}",
            json={"status": status},
        )
        r.raise_for_status()
        logger.info("trip %s → %s", trip_id, status)


async def get_trip_location(trip_id: str) -> dict:
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.get(f"{_trip_base()}/api/v1/trips/{trip_id}/location")
        r.raise_for_status()
        return r.json()


async def confirm_trip_with_customer(trip_id: str) -> None:
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.post(
            f"{_trip_base()}/api/v1/trips/{trip_id}/confirm-with-customer",
            json={
                "method": "sms",
                "message": "Tài xế đã xác nhận chuyến đi và sẽ đến đón đúng giờ.",
            },
        )
        r.raise_for_status()


# ── Calls ─────────────────────────────────────────────────────────────────────

async def start_call(
    driver_id: str,
    customer_id: str,
    trip_id: str,
    phone_number: str,
    mode: str = "bridge",   # "agent" = AI-to-customer | "bridge" = driver talks directly
) -> dict:
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.post(
            f"{_trip_base()}/api/v1/calls/start",
            json={
                "driverId":    driver_id,
                "customerId":  customer_id,
                "tripId":      trip_id,
                "phoneNumber": phone_number,
                "mode":        mode,
            },
        )
        r.raise_for_status()
        return r.json()


async def get_latest_call_summary(driver_phone: str) -> str:
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(
            f"{_trip_base()}/api/v1/calls/latest",
            headers={"X-Driver-Phone": driver_phone},
        )
        r.raise_for_status()
        call = r.json()
        call_id = call.get("call_id") or call.get("id")
        if not call_id:
            return ""
        r2 = await c.post(f"{_trip_base()}/api/v1/calls/{call_id}/summary")
        r2.raise_for_status()
        return r2.json().get("summary", "")


# ── Reminders ─────────────────────────────────────────────────────────────────

async def create_reminder(
    driver_id: str, trip_id: str, remind_before_minutes: int
) -> dict:
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.post(
            f"{_trip_base()}/api/v1/reminders",
            json={
                "driverId":             driver_id,
                "tripId":               trip_id,
                "remindBeforeMinutes":  remind_before_minutes,
                "type":                 "PICKUP_REMINDER",
            },
        )
        r.raise_for_status()
        return r.json()


# ── Driver profile & stats ────────────────────────────────────────────────────

async def get_driver_profile(driver_phone: str) -> dict:
    """Return driver rating, acceptance rate, completion rate, total trips."""
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.get(
            f"{_trip_base()}/api/v1/drivers/me/profile",
            headers={"X-Driver-Phone": driver_phone},
        )
        r.raise_for_status()
        return r.json()


async def get_today_earnings(driver_phone: str) -> dict:
    """Return today's earnings: total, trip count, bonuses, hours online."""
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.get(
            f"{_trip_base()}/api/v1/drivers/me/earnings/today",
            headers={"X-Driver-Phone": driver_phone},
        )
        r.raise_for_status()
        return r.json()


async def get_earnings_summary(driver_phone: str, period: str = "week") -> dict:
    """Return earnings summary for the given period ('week' | 'month')."""
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.get(
            f"{_trip_base()}/api/v1/drivers/me/earnings/summary",
            headers={"X-Driver-Phone": driver_phone},
            params={"period": period},
        )
        r.raise_for_status()
        return r.json()


async def get_active_bonuses(driver_phone: str) -> list[dict]:
    """Return active bonuses or surge-zone info for the driver."""
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.get(
            f"{_trip_base()}/api/v1/drivers/me/bonuses",
            headers={"X-Driver-Phone": driver_phone},
        )
        r.raise_for_status()
        return r.json()


async def set_driver_online_status(driver_phone: str, online: bool) -> None:
    """Set driver availability: online=True to accept trips, False to go offline."""
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.patch(
            f"{_trip_base()}/api/v1/drivers/me/status",
            headers={"X-Driver-Phone": driver_phone},
            json={"online": online},
        )
        r.raise_for_status()


# ── Trip issue reporting ──────────────────────────────────────────────────────

async def report_no_show(trip_id: str, driver_phone: str) -> None:
    """Report that the customer did not show up for the pickup."""
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.post(
            f"{_trip_base()}/api/v1/trips/{trip_id}/no-show",
            headers={"X-Driver-Phone": driver_phone},
        )
        r.raise_for_status()


async def report_trip_issue(
    trip_id: str, driver_phone: str, issue_type: str, description: str = ""
) -> None:
    """Report an issue with a trip (safety, damage, behavior, etc.)."""
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(
            f"{_trip_base()}/api/v1/trips/{trip_id}/issues",
            headers={"X-Driver-Phone": driver_phone},
            json={"issueType": issue_type, "description": description},
        )
        r.raise_for_status()


async def extend_wait_time(trip_id: str, driver_phone: str, extra_minutes: int) -> dict:
    """Request additional wait time at the pickup point."""
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.post(
            f"{_trip_base()}/api/v1/trips/{trip_id}/extend-wait",
            headers={"X-Driver-Phone": driver_phone},
            json={"extraMinutes": extra_minutes},
        )
        r.raise_for_status()
        return r.json()
