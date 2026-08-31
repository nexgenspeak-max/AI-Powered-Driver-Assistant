import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import ERR_NO_TRIP_REMINDER
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_reply import as_llm, trip_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("voice-agent.vn.tools.create_reminder")


@function_tool(raw_schema=raw_schema["create_reminder"])
async def create_reminder(raw_arguments: dict, context: RunContext) -> str:
    minutes_before = raw_arguments.get("minutes_before") or 10
    driver_phone = context.userdata["driver_phone"]
    actions = trip_actions(lang="vi")
    current = context_store.resolve_driver_trip(context.userdata)
    if not current:
        return as_llm(
            context.userdata,
            build_mutation_response(
                ERR_NO_TRIP_REMINDER,
                tool="create_reminder",
                lang="vi",
                action=actions,
            ),
        )

    trip_id = current["trip_id"]

    async def _sync() -> None:
        try:
            await backend_api.create_reminder(
                driver_id=driver_phone,
                trip_id=trip_id,
                remind_before_minutes=int(minutes_before),
            )
        except Exception:
            logger.error("create_reminder API failed", exc_info=True)

    context_store.schedule_sync(_sync())
    return as_llm(
        context.userdata,
        build_mutation_response(
            f"Đã đặt nhắc nhở trước {minutes_before} phút khi đến giờ đón khách.",
            tool="create_reminder",
            lang="vi",
            knowledge=[f"trip_id: {trip_id}", f"minutes_before: {minutes_before}"],
            action=actions,
        ),
    )
