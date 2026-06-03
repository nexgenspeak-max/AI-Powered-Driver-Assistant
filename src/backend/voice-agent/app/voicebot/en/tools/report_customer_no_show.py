import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.services import backend_api

logger = logging.getLogger("voice-agent.en.tools.report_customer_no_show")


@function_tool(raw_schema=raw_schema["report_customer_no_show"])
async def report_customer_no_show(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]
    try:
        current = await backend_api.get_current_trip(driver_phone)
    except Exception:
        return "Unable to find your trip right now."

    if not current:
        return "No active trip found."

    try:
        await backend_api.report_no_show(current["trip_id"], driver_phone)
    except Exception:
        logger.error("report_customer_no_show failed", exc_info=True)
        return "Unable to submit the no-show report right now. Please try again."

    customer = current.get("customer_name", "the customer")
    return (
        f"{customer} has been reported as a no-show. "
        "The trip will be cancelled and your rating will not be affected."
    )
