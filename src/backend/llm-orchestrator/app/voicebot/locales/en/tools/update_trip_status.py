import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.en.constants import STATUS_LABELS, ERR_CANNOT_UPDATE, ERR_NO_CURRENT_TRIP
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_response_builders import build_mutation_response
from app.voicebot.processors.tool_reply import trip_actions

logger = logging.getLogger("llm-orchestrator.en.tools.update_trip_status")


def _en_blocked(b) -> str:
    if b.distance_m is None:
        return "You're not at the stop yet. You can confirm once you're close."
    d = f"{round(b.distance_m / 100) / 10:g} km" if b.distance_m >= 1000 else f"{max(10, round(b.distance_m / 10) * 10)} m"
    within = f" (within {b.radius_m} m)" if b.radius_m else ""
    return f"You're still about {d} from the stop. You can confirm once you're close{within}; you can still call the customer now."


@function_tool(raw_schema=raw_schema["update_trip_status"])
async def update_trip_status(raw_arguments: dict, context: RunContext) -> str:
    status = raw_arguments.get("status", "").upper()
    label = STATUS_LABELS.get(status, status)
    actions = trip_actions(lang="en")

    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    if not trip:
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                ERR_NO_CURRENT_TRIP,
                tool="update_trip_status",
                lang="en",
                action=actions,
            ),
        )

    trip_id = trip["trip_id"]

    try:
        updated = await backend_api.update_trip_status(trip_id, status)
    except backend_api.ArrivalBlocked as blocked:
        # Not there yet: say how far, and that calling the customer is fine.
        return await context_store.speak_and_stop(context.session, _en_blocked(blocked))
    except Exception:
        logger.error("update_trip_status API failed", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                ERR_CANNOT_UPDATE,
                tool="update_trip_status",
                lang="en",
                action=actions,
            ),
        )

    if not isinstance(updated, dict):
        updated = {"status": status}
    context_store.patch_current_trip(context.userdata, **updated)
    spoken = f"Status updated: {label}."
    return await context_store.speak_and_stop(
        context.session,
        build_mutation_response(
            spoken,
            tool="update_trip_status",
            lang="en",
            knowledge=[f"trip_id: {trip_id}", f"status: {status}"],
            action=actions,
        ),
    )
