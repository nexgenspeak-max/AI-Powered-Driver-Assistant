import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import format_route_order

logger = logging.getLogger("voice-agent.vn.tools.get_optimal_route")


@function_tool(raw_schema=raw_schema["get_optimal_route"])
async def get_optimal_route(raw_arguments: dict, context: RunContext) -> str:
    # Live re-fetch — same reasoning as suggest_next_stop.py: trip-service
    # recomputes optimized_route lazily on cache-miss, so this refresh is
    # what actually surfaces a fresh route after the active stop set changed
    # since session start.
    driver_phone = context.userdata.get("driver_phone", "")
    if driver_phone:
        try:
            fresh = await backend_api.get_driver_context(driver_phone)
            context_store.load_driver_context(context.userdata, fresh)
        except Exception:
            logger.warning("get_optimal_route — live refresh failed, using cached data", exc_info=True)

    route = context_store.get_optimized_route(context.userdata)
    if not route:
        return "Hiện anh/chị không có nhiều điểm dừng cần sắp xếp thứ tự."

    return format_route_order(route, lang="vi")
