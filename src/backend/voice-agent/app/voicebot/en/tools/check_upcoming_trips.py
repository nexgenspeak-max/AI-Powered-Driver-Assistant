import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_NO_UPCOMING
from app.services import backend_api

logger = logging.getLogger("voice-agent.en.tools.check_upcoming_trips")


@function_tool(raw_schema=raw_schema["check_upcoming_trips"])
async def check_upcoming_trips(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]
    try:
        trips = await backend_api.get_upcoming_trips(driver_phone)
    except Exception:
        logger.error("check_upcoming_trips failed", exc_info=True)
        return "Unable to retrieve trip information right now. Please try again."
    if not trips:
        return ERR_NO_UPCOMING
    t = trips[0]
    return (
        f"You have {len(trips)} trip(s). "
        f"Next trip at {t.get('pickup_time', '')}: "
        f"pick up {t.get('customer_name', 'the customer')} at {t.get('pickup_address', '')}, "
        f"drop off at {t.get('dropoff_address', '')}."
    )
