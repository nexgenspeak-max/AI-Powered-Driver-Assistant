import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_NO_ACTIVE_CANCEL
from app.voicebot.processors import context_store, tool_reply
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("voice-agent.en.tools.request_cancel_trip")

# Mirrors the backend's CANCEL_RULES.cancelled_by_driver window (trip-
# service/src/routes/trips.ts) — a driver can only back out of a trip they've
# actually confirmed. `get_current_trip` alone isn't enough: its underlying
# ACTIVE set also matches notified/calling (a request the driver hasn't
# accepted yet), which the backend now rejects with a 409 for this status —
# that's `reject`, not a cancel.
DRIVER_CANCELLABLE_STATUSES = ("confirmed", "arrived_pickup", "picked_up")


@function_tool(raw_schema=raw_schema["request_cancel_trip"])
async def request_cancel_trip(raw_arguments: dict, context: RunContext) -> str:
    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    if not trip or trip.get("status") not in DRIVER_CANCELLABLE_STATUSES:
        return tool_reply.as_llm(
            context.userdata,
            build_mutation_response(
                ERR_NO_ACTIVE_CANCEL,
                tool="request_cancel_trip",
                lang="en",
                action=["request_cancel_trip() when a confirmed trip is active"],
            ),
        )

    context.userdata["pending_cancel_trip_id"] = trip["trip_id"]
    customer = trip.get("customer_name", "the customer")
    pickup_time = trip.get("pickup_time", "")
    spoken = (
        f"Are you sure you want to cancel the trip with {customer}"
        + (f" at {pickup_time}" if pickup_time else "")
        + "? Say 'yes' to confirm cancellation."
    )
    return tool_reply.as_llm(
        context.userdata,
        build_mutation_response(
            spoken,
            tool="request_cancel_trip",
            lang="en",
            knowledge=[
                f"trip_id: {trip['trip_id']}",
                f"customer: {customer}",
                f"pickup_time: {pickup_time or '-'}",
            ],
            action=[
                "Confirm cancellation: confirm_cancel_trip()",
                "Keep trip: driver declines — no tool call",
            ],
        ),
    )
