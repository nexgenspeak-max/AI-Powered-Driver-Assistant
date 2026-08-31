import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.en.constants import STATUS_LABELS, ERR_NO_CURRENT_TRIP
from app.services import backend_api
from app.voicebot.processors import context_store, tool_reply
from app.voicebot.processors.tool_response_builders import build_mutation_response
from app.voicebot.processors.tool_reply import trip_actions

logger = logging.getLogger("voice-agent.en.tools.update_trip_status")


@function_tool(raw_schema=raw_schema["update_trip_status"])
async def update_trip_status(raw_arguments: dict, context: RunContext) -> str:
    status = raw_arguments.get("status", "").upper()
    label = STATUS_LABELS.get(status, status)
    actions = trip_actions(lang="en")

    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    if not trip:
        return tool_reply.as_llm(
            context.userdata,
            build_mutation_response(
                ERR_NO_CURRENT_TRIP,
                tool="update_trip_status",
                lang="en",
                action=actions,
            ),
        )

    trip_id = trip["trip_id"]
    context_store.patch_current_trip(context.userdata, status=status)

    async def _sync() -> None:
        try:
            updated = await backend_api.update_trip_status(trip_id, status)
            context_store.patch_current_trip(context.userdata, **updated)
        except Exception:
            logger.error("update_trip_status API failed", exc_info=True)

    context_store.schedule_sync(_sync())
    spoken = f"Status updated: {label}."
    return tool_reply.as_llm(
        context.userdata,
        build_mutation_response(
            spoken,
            tool="update_trip_status",
            lang="en",
            knowledge=[f"trip_id: {trip_id}", f"status: {status}"],
            action=actions,
        ),
    )
