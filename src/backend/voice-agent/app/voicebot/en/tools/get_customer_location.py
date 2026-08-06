import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_NO_CURRENT_TRIP, ERR_NO_LOCATION
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.en.tools.get_customer_location")


@function_tool(raw_schema=raw_schema["get_customer_location"])
async def get_customer_location(raw_arguments: dict, context: RunContext) -> str:
    # Live re-fetch — see get_current_trip_info.py for why.
    driver_phone = context.userdata.get("driver_phone", "")
    if driver_phone:
        try:
            fresh_current = await backend_api.get_current_trip(driver_phone)
            context_store.set_current_trip(context.userdata, fresh_current)
        except Exception:
            logger.warning("get_customer_location — live refresh failed, using cached data", exc_info=True)

    current = context_store.get_current_trip(context.userdata)
    if not current:
        return ERR_NO_CURRENT_TRIP
    address = current.get("pickup_address", "")
    return f"Customer is at the pickup point: {address}." if address else ERR_NO_LOCATION
