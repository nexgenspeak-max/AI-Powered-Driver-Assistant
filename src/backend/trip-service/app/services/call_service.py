"""
Outbound customer calls — proxies to call-center (Twilio).

Twilio trial accounts can only dial verified numbers. When
CALL_FORCE_VERIFIED_TO=true, any customer phone is mapped to TWILIO_VERIFIED_TO.
"""
import logging
import re

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def normalize_phone(phone: str) -> str:
    p = re.sub(r"[\s\-()]", "", phone.strip())
    if not p:
        return ""
    if p.startswith("00"):
        p = "+" + p[2:]
    bare = p.lstrip("+")
    if bare.startswith("84"):
        return f"+{bare}"
    if bare.startswith("0") and len(bare) >= 10:
        return f"+84{bare[1:]}"
    if not p.startswith("+"):
        return f"+{bare}"
    return p


def resolve_dial_to(customer_phone: str) -> tuple[str, str | None]:
    """Return (number_to_dial, optional_override_note)."""
    target = normalize_phone(customer_phone)
    if not target:
        raise ValueError("customer phone is empty")

    s = get_settings()
    verified = normalize_phone(s.twilio_verified_to) if s.twilio_verified_to else ""

    if s.call_force_verified_to and verified and target != verified:
        logger.warning(
            "Twilio trial override: dialing %s instead of customer %s",
            verified,
            target,
        )
        note = (
            f"Đang gọi số Twilio đã xác minh {verified} "
            f"(trên đơn ghi {target})."
        )
        return verified, note

    return target, None


async def start_customer_call(
    *,
    driver_phone: str,
    customer_phone: str,
    trip_id: str,
    mode: str,
) -> dict:
    s = get_settings()
    if not s.call_center_url:
        raise RuntimeError("CALL_CENTER_URL is not set")

    dial_to, override_note = resolve_dial_to(customer_phone)

    async with httpx.AsyncClient(timeout=20) as client:
        try:
            r = await client.post(
                f"{s.call_center_url.rstrip('/')}/api/v1/calls/outbound/dial",
                json={"to_number": dial_to},
            )
            r.raise_for_status()
        except httpx.ConnectError as exc:
            raise RuntimeError(
                f"call-center unreachable at {s.call_center_url} — start call-center on :8000"
            ) from exc

    data = r.json()
    if data.get("error"):
        raise RuntimeError(data["error"])

    return {
        "call_sid": data.get("call_sid"),
        "status": data.get("status", "initiated"),
        "mode": mode,
        "dialed_number": dial_to,
        "customer_phone": normalize_phone(customer_phone),
        "override_note": override_note,
        "trip_id": trip_id,
        "driver_phone": driver_phone,
    }
