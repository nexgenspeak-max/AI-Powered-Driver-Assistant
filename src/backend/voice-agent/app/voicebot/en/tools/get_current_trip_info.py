import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_NO_CURRENT_TRIP
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import format_trip_detail

logger = logging.getLogger("voice-agent.en.tools.get_current_trip_info")


@function_tool(raw_schema=raw_schema["get_current_trip_info"])
async def get_current_trip_info(raw_arguments: dict, context: RunContext) -> str:
    # Live re-fetch, not the session-start cache — trip-service invalidates
    # its own cache on every trip create/update, so this reflects reality
    # the instant it's asked.
    driver_phone = context.userdata.get("driver_phone", "")
    if driver_phone:
        try:
            fresh_current = await backend_api.get_current_trip(driver_phone)
            context_store.set_current_trip(context.userdata, fresh_current)
            fresh_upcoming = await backend_api.get_upcoming_trips(driver_phone)
            context_store.set_upcoming_trips(context.userdata, fresh_upcoming)
        except Exception:
            logger.warning("get_current_trip_info — live refresh failed, using cached data", exc_info=True)

    current = context_store.get_current_trip(context.userdata)
    if not current:
        schedule = context_store.get_schedule_trips(context.userdata)
        if schedule:
            return (
                "You don't have an active trip in progress. "
                + format_trip_detail(schedule[0], 1, lang="en")
            )
        return ERR_NO_CURRENT_TRIP
    return format_trip_detail(current, 1, lang="en")
