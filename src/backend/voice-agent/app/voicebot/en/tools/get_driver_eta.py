import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_ETA_UNCONFIRMED
from app.services import backend_api

logger = logging.getLogger("voice-agent.en.tools.get_driver_eta")


@function_tool(raw_schema=raw_schema["get_driver_eta"])
async def get_driver_eta(raw_arguments: dict, context: RunContext) -> str:
    customer_phone = context.userdata["customer_phone"]
    try:
        trips = await backend_api.get_customer_trips(customer_phone)
    except Exception:
        logger.error("get_driver_eta failed", exc_info=True)
        return "Unable to retrieve information right now."

    active = [t for t in trips if t.get("status") == "confirmed"]
    if not active:
        return ERR_ETA_UNCONFIRMED

    t   = active[0]
    eta = t.get("eta_minutes")
    if not eta or int(eta) <= 0:
        return "Your driver has confirmed the trip and is on the way."
    return f"Your driver is expected to arrive in about {eta} minutes."
