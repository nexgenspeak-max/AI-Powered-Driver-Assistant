import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_ETA_UNCONFIRMED
from app.voicebot.processors import context_store, driver_call

logger = logging.getLogger("voice-agent.vn.tools.call_driver")


@function_tool(raw_schema=raw_schema["call_driver"])
async def call_driver(raw_arguments: dict, context: RunContext):
    trip = context_store.get_active_customer_trip(context.userdata)
    if not trip or trip.get("status") != "confirmed":
        return ERR_ETA_UNCONFIRMED

    return await driver_call.start_bridge_call_to_driver(context, trip, lang="vn")
