import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_ACTIVE_CANCEL
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.vn.tools.request_cancel_trip")

# Mirrors the backend's CANCEL_RULES.cancelled_by_driver window (trip-
# service/src/routes/trips.ts) — a driver can only back out of a trip they've
# actually confirmed. `get_current_trip` alone isn't enough: its underlying
# ACTIVE set also matches notified/calling (a request the driver hasn't
# accepted yet), which the backend now rejects with a 409 for this status —
# that's `reject`, not a cancel.
DRIVER_CANCELLABLE_STATUSES = ("confirmed", "arrived_pickup", "picked_up")


@function_tool(raw_schema=raw_schema["request_cancel_trip"])
async def request_cancel_trip(raw_arguments: dict, context: RunContext) -> str:
    current = context_store.get_current_trip(context.userdata)
    if not current or current.get("status") not in DRIVER_CANCELLABLE_STATUSES:
        return ERR_NO_ACTIVE_CANCEL
    context.userdata["pending_cancel_trip_id"] = current["trip_id"]
    customer = current.get("customer_name", "khách hàng")
    pickup_time = current.get("pickup_time", "")
    return (
        f"Anh/chị có chắc muốn hủy chuyến với {customer}"
        + (f" lúc {pickup_time}" if pickup_time else "")
        + " không? Nói 'có' để xác nhận hủy."
    )
