import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import TRIP_STATUS_MAP, ERR_NO_CUSTOMER_TRIP
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.vn.tools.get_my_trip")


@function_tool(raw_schema=raw_schema["get_my_trip"])
async def get_my_trip(raw_arguments: dict, context: RunContext) -> str:
    t = context_store.get_active_customer_trip(context.userdata)
    if not t:
        return ERR_NO_CUSTOMER_TRIP

    eta = t.get("eta_minutes")
    status_txt = TRIP_STATUS_MAP.get(t.get("status", ""), t.get("status", ""))
    msg = (
        f"Chuyến của bạn: {status_txt}. "
        f"Đón tại {t.get('pickup_address', '')}, đến {t.get('dropoff_address', '')}."
    )
    if eta and int(eta) > 0:
        msg += f" Tài xế sẽ đến trong khoảng {eta} phút."
    if t.get("driver_phone"):
        msg += f" Tài xế: {t.get('driver_phone')}."
    return msg
