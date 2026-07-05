import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_CURRENT_TRIP
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import format_trip_detail

logger = logging.getLogger("voice-agent.vn.tools.get_current_trip_info")


@function_tool(raw_schema=raw_schema["get_current_trip_info"])
async def get_current_trip_info(raw_arguments: dict, context: RunContext) -> str:
    current = context_store.get_current_trip(context.userdata)
    if not current:
        schedule = context_store.get_schedule_trips(context.userdata)
        if schedule:
            return (
                "Anh/chị chưa có chuyến đang chạy. "
                + format_trip_detail(schedule[0], 1, lang="vi")
            )
        return ERR_NO_CURRENT_TRIP
    return format_trip_detail(current, 1, lang="vi")
