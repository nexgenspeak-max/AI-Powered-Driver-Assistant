import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_CANCELLABLE
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.vn.tools.request_cancel_my_trip")


@function_tool(raw_schema=raw_schema["request_cancel_my_trip"])
async def request_cancel_my_trip(raw_arguments: dict, context: RunContext) -> str:
    trips = context_store.get(context.userdata, "trips", [])
    active = [t for t in trips if t.get("status") in ("pending", "notified", "calling", "confirmed")]
    if not active:
        return ERR_NO_CANCELLABLE

    trip = active[0]
    context.userdata["pending_cancel_my_trip_id"] = trip["trip_id"]
    pickup = trip.get("pickup_address", "")
    dropoff = trip.get("dropoff_address", "")
    return (
        f"Bạn có chắc muốn hủy chuyến từ {pickup} đến {dropoff} không? "
        "Nói 'có' để xác nhận hủy."
    )
