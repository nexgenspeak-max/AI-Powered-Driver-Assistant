import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_UPCOMING
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import format_traffic_info

logger = logging.getLogger("voice-agent.vn.tools.get_trip_traffic")


@function_tool(raw_schema=raw_schema["get_trip_traffic"])
async def get_trip_traffic(raw_arguments: dict, context: RunContext) -> str:
    # Live re-fetch — see check_upcoming_trips.py for why.
    driver_phone = context.userdata.get("driver_phone", "")
    if driver_phone:
        try:
            fresh_current = await backend_api.get_current_trip(driver_phone)
            context_store.set_current_trip(context.userdata, fresh_current)
            fresh_upcoming = await backend_api.get_upcoming_trips(driver_phone)
            context_store.set_upcoming_trips(context.userdata, fresh_upcoming)
        except Exception:
            logger.warning("get_trip_traffic — live refresh failed, using cached data", exc_info=True)

    trip_index = raw_arguments.get("trip_index")
    trip = context_store.resolve_trip(context.userdata, trip_index)
    if not trip:
        return ERR_NO_UPCOMING
    return format_traffic_info(trip, lang="vi")
