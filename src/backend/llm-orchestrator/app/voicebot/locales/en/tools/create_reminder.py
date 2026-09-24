import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.en.constants import ERR_NO_TRIP_REMINDER, ERR_CANNOT_REMINDER
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_response_builders import build_mutation_response
from app.voicebot.processors.tool_reply import trip_actions

logger = logging.getLogger("llm-orchestrator.en.tools.create_reminder")


@function_tool(raw_schema=raw_schema["create_reminder"])
async def create_reminder(raw_arguments: dict, context: RunContext) -> str:
    minutes_before = raw_arguments.get("minutes_before") or 10
    driver_phone = context.userdata["driver_phone"]
    actions = trip_actions(lang="en")

    current = context_store.resolve_driver_trip(context.userdata)
    if not current:
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                ERR_NO_TRIP_REMINDER,
                tool="create_reminder",
                lang="en",
                action=actions,
            ),
        )

    trip_id = current["trip_id"]

    try:
        await backend_api.create_reminder(
            driver_id=driver_phone,
            trip_id=trip_id,
            remind_before_minutes=int(minutes_before),
        )
    except Exception:
        logger.error("create_reminder API failed", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                ERR_CANNOT_REMINDER,
                tool="create_reminder",
                lang="en",
                action=actions,
            ),
        )

    spoken = f"Reminder set for {minutes_before} minutes before pickup time."
    return await context_store.speak_and_stop(
        context.session,
        build_mutation_response(
            spoken,
            tool="create_reminder",
            lang="en",
            knowledge=[
                f"trip_id: {trip_id}",
                f"minutes_before: {minutes_before}",
            ],
            action=actions,
        ),
    )
