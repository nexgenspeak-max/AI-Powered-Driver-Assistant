from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import ERR_NO_CURRENT_TRIP, ERR_NO_LOCATION
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_response_builders import build_location_response


@function_tool(raw_schema=raw_schema["get_customer_location"])
async def get_customer_location(raw_arguments: dict, context: RunContext) -> str:
    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    if not trip:
        reply = build_location_response("", lang="vi", error=ERR_NO_CURRENT_TRIP)
    else:
        address = trip.get("pickup_address", "")
        reply = (
            build_location_response(address, lang="vi")
            if address
            else build_location_response("", lang="vi", error=ERR_NO_LOCATION)
        )
    return await context_store.speak_with_refresh_offer(
        context.session, context.userdata, "customer_location", reply, lang="vi"
    )
