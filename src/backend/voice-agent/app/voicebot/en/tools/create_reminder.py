import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_NO_TRIP_REMINDER
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.en.tools.create_reminder")


@function_tool(raw_schema=raw_schema["create_reminder"])
async def create_reminder(raw_arguments: dict, context: RunContext) -> str:
    minutes_before = raw_arguments.get("minutes_before") or 10
    driver_phone = context.userdata["driver_phone"]
    current = context_store.resolve_driver_trip(context.userdata)
    if not current:
        return ERR_NO_TRIP_REMINDER

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
    return f"Reminder set for {minutes_before} minutes before pickup time."
