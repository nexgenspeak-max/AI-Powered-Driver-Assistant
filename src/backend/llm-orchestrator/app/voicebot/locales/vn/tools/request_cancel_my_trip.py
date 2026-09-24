import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import ERR_NO_CANCELLABLE
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_reply import customer_trip_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("llm-orchestrator.vn.tools.request_cancel_my_trip")

# Mirrors the backend's CANCEL_RULES.cancelled window (trip-service/src/
# routes/trips.ts) — the customer can cancel any time from booking through
# the driver arriving at pickup, right up until they're actually in the
# vehicle (`picked_up`), including rejected/no_answer: those just mean
# *this* driver didn't take it, not that the trip itself is resolved (still
# awaiting redispatch via POST /:tripId/dispatch).
CUSTOMER_CANCELLABLE_STATUSES = ("pending", "notified", "calling", "confirmed", "arrived_pickup", "rejected", "no_answer")


@function_tool(raw_schema=raw_schema["request_cancel_my_trip"])
async def request_cancel_my_trip(raw_arguments: dict, context: RunContext) -> str:
    trips = context_store.get(context.userdata, "trips", [])
    active = [t for t in trips if t.get("status") in CUSTOMER_CANCELLABLE_STATUSES]
    actions = customer_trip_actions(lang="vi")
    if not active:
        return await context_store.speak_and_stop(
            context.session,
                build_mutation_response(
                ERR_NO_CANCELLABLE,
                tool="request_cancel_my_trip",
                lang="vi",
                action=actions,
            ),
        )

    trip = active[0]
    context.userdata["pending_cancel_my_trip_id"] = trip["trip_id"]
    pickup = trip.get("pickup_address", "")
    dropoff = trip.get("dropoff_address", "")
    spoken = (
        f"Bạn có chắc muốn hủy chuyến từ {pickup} đến {dropoff} không? "
        "Nói 'có' để xác nhận hủy."
    )
    return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
            spoken,
            tool="request_cancel_my_trip",
            lang="vi",
            knowledge=[f"trip_id: {trip['trip_id']}"],
            action=["confirm_cancel_my_trip()"],
        ),
    )
