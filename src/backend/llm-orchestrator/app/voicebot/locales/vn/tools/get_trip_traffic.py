from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import ERR_NO_UPCOMING
from app.voicebot.processors import context_store
from app.voicebot.processors.live_context import driver_leg, refresh_driver_context
from app.voicebot.processors.trip_response import build_traffic_response
from app.voicebot.prompts.tool_response import ToolResponse


def _format_traffic_reply(userdata: dict, raw_arguments: dict) -> ToolResponse | str:
    trip = context_store.resolve_customer_trip(userdata, raw_arguments)
    if not trip:
        return ERR_NO_UPCOMING
    return build_traffic_response(trip, lang="vi", leg=driver_leg(userdata, trip))


@function_tool(raw_schema=raw_schema["get_trip_traffic"])
async def get_trip_traffic(raw_arguments: dict, context: RunContext) -> str:
    await refresh_driver_context(context.userdata)
    reply = _format_traffic_reply(context.userdata, raw_arguments)
    return await context_store.speak_with_refresh_offer(
        context.session, context.userdata, "trip_traffic", reply, lang="vi", args=dict(raw_arguments)
    )
