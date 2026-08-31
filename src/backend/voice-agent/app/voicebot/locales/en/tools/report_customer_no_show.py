import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.services import backend_api
from app.voicebot.processors import context_store, tool_reply
from app.voicebot.processors.tool_response_builders import build_mutation_response
from app.voicebot.processors.tool_reply import trip_actions

logger = logging.getLogger("voice-agent.en.tools.report_customer_no_show")


@function_tool(raw_schema=raw_schema["report_customer_no_show"])
async def report_customer_no_show(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]
    actions = trip_actions(lang="en")

    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    if not trip:
        return tool_reply.as_llm(
            context.userdata,
            build_mutation_response(
                "No active trip found.",
                tool="report_customer_no_show",
                lang="en",
                action=actions,
            ),
        )

    trip_id = trip["trip_id"]
    customer = trip.get("customer_name", "the customer")
    context_store.patch_current_trip(context.userdata, status="no_show")
    context_store.set_current_trip(context.userdata, None)
    context_store.remove_trip_from_lists(context.userdata, trip_id)

    async def _sync() -> None:
        try:
            await backend_api.report_no_show(trip_id, driver_phone)
        except Exception:
            logger.error("report_customer_no_show failed", exc_info=True)

    context_store.schedule_sync(_sync())
    spoken = (
        f"Reported that {customer} did not show up. "
        "The system will process this and cancel the trip. "
        "Your rating will not be affected."
    )
    return tool_reply.as_llm(
        context.userdata,
        build_mutation_response(
            spoken,
            tool="report_customer_no_show",
            lang="en",
            knowledge=[
                f"trip_id: {trip_id}",
                f"customer: {customer}",
                "status: no_show",
            ],
            action=["check_upcoming_trips() for next trips"],
        ),
    )
