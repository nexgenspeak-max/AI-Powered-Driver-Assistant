import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_NO_UPCOMING
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import format_trip_detail, format_trip_list

logger = logging.getLogger("voice-agent.en.tools.check_upcoming_trips")


@function_tool(raw_schema=raw_schema["check_upcoming_trips"])
async def check_upcoming_trips(raw_arguments: dict, context: RunContext) -> str:
    trips = context_store.get_schedule_trips(context.userdata)
    if not trips:
        return ERR_NO_UPCOMING

    trip_index = raw_arguments.get("trip_index")
    if trip_index is not None:
        idx = int(trip_index)
        if idx < 1 or idx > len(trips):
            return f"You only have {len(trips)} trip(s). Please choose 1 to {len(trips)}."
        return format_trip_detail(trips[idx - 1], idx, lang="en")

    return format_trip_list(trips, lang="en")
