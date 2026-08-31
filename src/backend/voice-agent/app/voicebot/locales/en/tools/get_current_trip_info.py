from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.en.constants import ERR_NO_CURRENT_TRIP
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_response import build_current_trip_response
from app.voicebot.prompts.tool_response import ToolResponse


def _format_current_trip_reply(userdata: dict, raw_arguments: dict | None = None) -> ToolResponse | str:
    current = context_store.get_current_trip(userdata)
    if current:
        context_store.set_target_trip(userdata, current)
        return build_current_trip_response(current, "en")
    trip = context_store.resolve_customer_trip(userdata, raw_arguments)
    if trip:
        context_store.set_target_trip(userdata, trip)
        return build_current_trip_response(
            trip,
            "en",
            prefix="You don't have an active trip in progress. ",
        )
    return ERR_NO_CURRENT_TRIP


@function_tool(raw_schema=raw_schema["get_current_trip_info"])
async def get_current_trip_info(raw_arguments: dict, context: RunContext) -> str:
    reply = _format_current_trip_reply(context.userdata, raw_arguments)
    return await context_store.speak_with_refresh_offer(
        context.session, context.userdata, "current_trip", reply, lang="en"
    )
