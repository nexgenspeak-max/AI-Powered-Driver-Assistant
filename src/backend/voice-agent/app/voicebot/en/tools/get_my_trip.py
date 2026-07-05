import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import TRIP_STATUS_MAP, ERR_NO_CUSTOMER_TRIP
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.en.tools.get_my_trip")


@function_tool(raw_schema=raw_schema["get_my_trip"])
async def get_my_trip(raw_arguments: dict, context: RunContext) -> str:
    t = context_store.get_active_customer_trip(context.userdata)
    if not t:
        return ERR_NO_CUSTOMER_TRIP

    eta = t.get("eta_minutes")
    status_txt = TRIP_STATUS_MAP.get(t.get("status", ""), t.get("status", ""))
    msg = (
        f"Your trip: {status_txt}. "
        f"Pickup at {t.get('pickup_address', '')}, drop off at {t.get('dropoff_address', '')}."
    )
    if eta and int(eta) > 0:
        msg += f" Driver ETA: about {eta} minutes."
    if t.get("driver_phone"):
        msg += f" Driver: {t.get('driver_phone')}."
    return msg
