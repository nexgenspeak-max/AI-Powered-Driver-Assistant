import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import TRIP_STATUS_MAP, ERR_CUSTOMER_TRIP_FAIL, ERR_NO_CUSTOMER_TRIP
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.get_my_trip")


@function_tool(raw_schema=raw_schema["get_my_trip"])
async def get_my_trip(raw_arguments: dict, context: RunContext) -> str:
    customer_phone = context.userdata["customer_phone"]
    try:
        trips = await backend_api.get_customer_trips(customer_phone)
    except Exception:
        logger.error("get_my_trip failed", exc_info=True)
        return ERR_CUSTOMER_TRIP_FAIL

    active = [t for t in trips if t.get("status") not in ("completed", "rejected", "no_answer")]
    if not active:
        return ERR_NO_CUSTOMER_TRIP

    t          = active[0]
    eta        = t.get("eta_minutes")
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
