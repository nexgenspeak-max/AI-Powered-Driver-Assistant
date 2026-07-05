import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_ETA_UNCONFIRMED
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.en.tools.get_driver_eta")


@function_tool(raw_schema=raw_schema["get_driver_eta"])
async def get_driver_eta(raw_arguments: dict, context: RunContext) -> str:
    t = context_store.get_active_customer_trip(context.userdata)
    if not t or t.get("status") != "confirmed":
        return ERR_ETA_UNCONFIRMED

    eta = t.get("eta_minutes")
    if not eta or int(eta) <= 0:
        return "Your driver has accepted the trip and is on the way."
    return f"Your driver is expected to arrive in about {eta} minutes."
