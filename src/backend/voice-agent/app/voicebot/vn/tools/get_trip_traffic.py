import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_UPCOMING
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import format_traffic_info

logger = logging.getLogger("voice-agent.vn.tools.get_trip_traffic")


@function_tool(raw_schema=raw_schema["get_trip_traffic"])
async def get_trip_traffic(raw_arguments: dict, context: RunContext) -> str:
    trip_index = raw_arguments.get("trip_index")
    trip = context_store.resolve_trip(context.userdata, trip_index)
    if not trip:
        return ERR_NO_UPCOMING
    return format_traffic_info(trip, lang="vi")
