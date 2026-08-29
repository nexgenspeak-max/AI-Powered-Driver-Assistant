import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.services import backend_api
from app.voicebot.processors import context_store, tool_reply
from app.voicebot.processors.tool_response_builders import build_mutation_response
from app.voicebot.processors.tool_reply import trip_actions

logger = logging.getLogger("voice-agent.en.tools.confirm_trip_with_customer")


@function_tool(raw_schema=raw_schema["confirm_trip_with_customer"])
async def confirm_trip_with_customer(raw_arguments: dict, context: RunContext) -> str:
    actions = trip_actions(lang="en")

    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    if not trip:
        return tool_reply.as_llm(
            context.userdata,
            build_mutation_response(
                "No active trip to confirm with the customer.",
                tool="confirm_trip_with_customer",
                lang="en",
                action=actions,
            ),
        )

    trip_id = trip["trip_id"]
    customer = trip.get("customer_name", "the customer")

    async def _sync() -> None:
        try:
            await backend_api.confirm_trip_with_customer(trip_id)
        except Exception:
            logger.error("confirm_trip_with_customer API failed", exc_info=True)

    context_store.schedule_sync(_sync())
    spoken = f"Confirmation message sent to {customer}."
    return tool_reply.as_llm(
        context.userdata,
        build_mutation_response(
            spoken,
            tool="confirm_trip_with_customer",
            lang="en",
            knowledge=[f"trip_id: {trip_id}", f"customer: {customer}"],
            action=actions,
        ),
    )
