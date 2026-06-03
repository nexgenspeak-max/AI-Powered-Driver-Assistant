import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_CONFIRM_FAIL
from app.services import backend_api

logger = logging.getLogger("voice-agent.en.tools.confirm_trip_with_customer")


@function_tool(raw_schema=raw_schema["confirm_trip_with_customer"])
async def confirm_trip_with_customer(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]
    try:
        current = await backend_api.get_current_trip(driver_phone)
    except Exception:
        logger.error("confirm_trip_with_customer failed", exc_info=True)
        return ERR_CONFIRM_FAIL
    if not current:
        return "No active trip to confirm."
    try:
        await backend_api.confirm_trip_with_customer(current["trip_id"])
    except Exception:
        logger.error("confirm_trip_with_customer API failed", exc_info=True)
        return ERR_CONFIRM_FAIL
    customer = current.get("customer_name", "the customer")
    return f"SMS confirmation sent to {customer}."
