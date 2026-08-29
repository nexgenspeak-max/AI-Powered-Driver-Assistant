from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_CUSTOMER_TRIP
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_response_builders import build_my_trip_response


@function_tool(raw_schema=raw_schema["get_my_trip"])
async def get_my_trip(raw_arguments: dict, context: RunContext) -> str:
    trip = context_store.get_active_customer_trip(context.userdata)
    reply = (
        build_my_trip_response(trip, lang="vi")
        if trip
        else build_my_trip_response(None, lang="vi", error=ERR_NO_CUSTOMER_TRIP)
    )
    return await context_store.speak_with_refresh_offer(
        context.session, context.userdata, "my_trip", reply, lang="vi"
    )
