import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import TRIP_STATUS_MAP, ERR_NO_CUSTOMER_TRIP
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.vn.tools.get_my_trip")


@function_tool(raw_schema=raw_schema["get_my_trip"])
async def get_my_trip(raw_arguments: dict, context: RunContext) -> str:
    # Live re-fetch — see check_upcoming_trips.py / get_driver_eta.py for why.
    customer_phone = context.userdata.get("customer_phone", "")
    if customer_phone:
        try:
            ctx = await backend_api.get_customer_context(customer_phone)
            context_store.set_context(context.userdata, "active_trip", ctx.get("active_trip"))
        except Exception:
            logger.warning("get_my_trip — live refresh failed, using cached data", exc_info=True)

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
