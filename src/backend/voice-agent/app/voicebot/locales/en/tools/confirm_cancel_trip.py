import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.en.constants import ERR_NO_PENDING_CANCEL, ERR_CANNOT_CANCEL, TRIP_CANCELLED
from app.services import backend_api
from app.voicebot.processors import context_store, tool_reply
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("voice-agent.en.tools.confirm_cancel_trip")


@function_tool(raw_schema=raw_schema["confirm_cancel_trip"])
async def confirm_cancel_trip(raw_arguments: dict, context: RunContext) -> str:
    trip_id = context.userdata.get("pending_cancel_trip_id")
    if not trip_id:
        return tool_reply.as_llm(
            context.userdata,
            build_mutation_response(
                ERR_NO_PENDING_CANCEL,
                tool="confirm_cancel_trip",
                lang="en",
                action=["request_cancel_trip() first to start cancellation"],
            ),
        )

    # Awaited, not fire-and-forget (schedule_sync) — the backend now
    # actually rejects this transition outside the driver's cancel window
    # (see trip-service's CANCEL_RULES: confirmed/arrived_pickup/picked_up
    # only), so claiming success before confirming the call succeeded would
    # tell the driver "cancelled" on a trip that's still active server-side.
    try:
        await backend_api.update_trip_status(trip_id, "cancelled_by_driver")
    except Exception:
        logger.error("confirm_cancel_trip API failed", exc_info=True)
        return tool_reply.as_llm(
            context.userdata,
            build_mutation_response(
                ERR_CANNOT_CANCEL,
                tool="confirm_cancel_trip",
                lang="en",
                knowledge=[f"trip_id: {trip_id}"],
                action=["request_cancel_trip() to retry"],
            ),
        )

    context.userdata["pending_cancel_trip_id"] = None
    context_store.remove_trip_from_lists(context.userdata, trip_id)
    context_store.set_current_trip(context.userdata, None)
    return tool_reply.as_llm(
        context.userdata,
        build_mutation_response(
            TRIP_CANCELLED,
            tool="confirm_cancel_trip",
            lang="en",
            knowledge=[f"trip_id: {trip_id}", "status: cancelled_by_driver"],
            action=["check_upcoming_trips() for next trips"],
        ),
    )
