import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.en.constants import ERR_NO_CANCELLABLE, ERR_CUSTOMER_CANCEL_FAIL
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_response_builders import build_mutation_response
from app.voicebot.processors.tool_reply import customer_trip_actions

logger = logging.getLogger("voice-agent.en.tools.cancel_my_trip")

# Mirrors the backend's CANCEL_RULES.cancelled window (trip-service/src/
# routes/trips.ts) — the customer can cancel any time from booking through
# the driver arriving at pickup, right up until they're actually in the
# vehicle (`picked_up`), including rejected/no_answer: those just mean
# *this* driver didn't take it, not that the trip itself is resolved (still
# awaiting redispatch via POST /:tripId/dispatch).
CUSTOMER_CANCELLABLE_STATUSES = ("pending", "notified", "calling", "confirmed", "arrived_pickup", "rejected", "no_answer")


@function_tool(raw_schema=raw_schema["cancel_my_trip"])
async def cancel_my_trip(raw_arguments: dict, context: RunContext) -> str:
    trips = context_store.get(context.userdata, "trips", [])
    active = [t for t in trips if t.get("status") in CUSTOMER_CANCELLABLE_STATUSES]
    if not active:
        return await context_store.speak_and_stop(
            context.session,
                build_mutation_response(
                ERR_NO_CANCELLABLE,
                tool="cancel_my_trip",
                lang="en",
                action=customer_trip_actions(lang="en"),
            ),
        )

    trip = active[0]
    trip_id = trip["trip_id"]

    # Awaited, not fire-and-forget (schedule_sync) — the backend now
    # actually rejects this transition outside the allowed window (see
    # CANCEL_RULES), so claiming success before confirming the call
    # succeeded would tell the caller "cancelled" on a trip that's still
    # active server-side.
    try:
        await backend_api.update_trip_status(trip_id, "cancelled")
    except Exception:
        logger.error("cancel_my_trip — update failed", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
                build_mutation_response(
                ERR_CUSTOMER_CANCEL_FAIL,
                tool="cancel_my_trip",
                lang="en",
                knowledge=[f"trip_id: {trip_id}"],
                action=customer_trip_actions(lang="en"),
            ),
        )

    context_store.patch_trip_by_id(context.userdata, trip_id, status="cancelled")
    context_store.remove_trip_from_lists(context.userdata, trip_id)
    spoken = "Your trip has been cancelled. Thank you for using our service."
    return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
            spoken,
            tool="cancel_my_trip",
            lang="en",
            knowledge=[f"trip_id: {trip_id}", "status: cancelled"],
            action=customer_trip_actions(lang="en"),
        ),
    )
