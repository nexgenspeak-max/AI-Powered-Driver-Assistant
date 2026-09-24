from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import ERR_ETA_UNCONFIRMED
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_response_builders import build_customer_eta_response


@function_tool(raw_schema=raw_schema["get_driver_eta"])
async def get_driver_eta(raw_arguments: dict, context: RunContext) -> str:
    trip = context_store.get_active_customer_trip(context.userdata)
    if not trip or trip.get("status") != "confirmed":
        reply = build_customer_eta_response(None, lang="vi", error=ERR_ETA_UNCONFIRMED)
    else:
        reply = build_customer_eta_response(trip, lang="vi")
    return await context_store.speak_with_refresh_offer(
        context.session, context.userdata, "driver_eta", reply, lang="vi"
    )
