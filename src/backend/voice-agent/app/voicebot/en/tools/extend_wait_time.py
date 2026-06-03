import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.services import backend_api

logger = logging.getLogger("voice-agent.en.tools.extend_wait_time")


@function_tool(raw_schema=raw_schema["extend_wait_time"])
async def extend_wait_time(raw_arguments: dict, context: RunContext) -> str:
    minutes      = int(raw_arguments.get("minutes") or 3)
    minutes      = max(1, min(minutes, 10))
    driver_phone = context.userdata["driver_phone"]

    try:
        current = await backend_api.get_current_trip(driver_phone)
    except Exception:
        return "Unable to find your trip right now."

    if not current:
        return "No active trip found."

    try:
        result = await backend_api.extend_wait_time(
            trip_id=current["trip_id"],
            driver_phone=driver_phone,
            extra_minutes=minutes,
        )
    except Exception:
        logger.error("extend_wait_time failed", exc_info=True)
        return "Unable to extend the wait time right now."

    total_wait = result.get("total_wait_minutes", minutes)
    customer   = current.get("customer_name", "the customer")
    return (
        f"Wait time extended by {minutes} minute(s). "
        f"Total wait for {customer}: {total_wait} minutes."
    )
