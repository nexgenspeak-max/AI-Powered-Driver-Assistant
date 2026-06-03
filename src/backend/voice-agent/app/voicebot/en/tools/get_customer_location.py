import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_LOCATION_FAIL, ERR_NO_CURRENT_TRIP, ERR_NO_LOCATION
from app.services import backend_api

logger = logging.getLogger("voice-agent.en.tools.get_customer_location")


@function_tool(raw_schema=raw_schema["get_customer_location"])
async def get_customer_location(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]
    try:
        current = await backend_api.get_current_trip(driver_phone)
    except Exception:
        logger.error("get_customer_location failed", exc_info=True)
        return ERR_LOCATION_FAIL
    if not current:
        return ERR_NO_CURRENT_TRIP
    try:
        loc     = await backend_api.get_trip_location(current["trip_id"])
        address = loc.get("pickupAddress", current.get("pickup_address", ""))
    except Exception:
        address = current.get("pickup_address", "")
    return f"Customer pickup location: {address}." if address else ERR_NO_LOCATION
