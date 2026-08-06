import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_ETA_UNCONFIRMED
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.vn.tools.get_driver_eta")


@function_tool(raw_schema=raw_schema["get_driver_eta"])
async def get_driver_eta(raw_arguments: dict, context: RunContext) -> str:
    # Live re-fetch — see check_upcoming_trips.py for why (same staleness
    # class, just customer-side: driver confirming/updating status mid-
    # session must show up the instant the customer asks).
    customer_phone = context.userdata.get("customer_phone", "")
    if customer_phone:
        try:
            ctx = await backend_api.get_customer_context(customer_phone)
            context_store.set_context(context.userdata, "active_trip", ctx.get("active_trip"))
        except Exception:
            logger.warning("get_driver_eta — live refresh failed, using cached data", exc_info=True)

    t = context_store.get_active_customer_trip(context.userdata)
    if not t or t.get("status") != "confirmed":
        return ERR_ETA_UNCONFIRMED

    eta = t.get("eta_minutes")
    if not eta or int(eta) <= 0:
        return "Tài xế đã xác nhận nhận chuyến và đang trên đường đến."
    return f"Tài xế dự kiến đến trong khoảng {eta} phút nữa."
