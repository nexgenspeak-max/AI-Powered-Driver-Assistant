import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_NO_CURRENT_TRIP, ERR_NO_LOCATION
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.en.tools.get_customer_location")


@function_tool(raw_schema=raw_schema["get_customer_location"])
async def get_customer_location(raw_arguments: dict, context: RunContext) -> str:
    current = context_store.get_current_trip(context.userdata)
    if not current:
        return ERR_NO_CURRENT_TRIP
    address = current.get("pickup_address", "")
    return f"Customer is at the pickup point: {address}." if address else ERR_NO_LOCATION
