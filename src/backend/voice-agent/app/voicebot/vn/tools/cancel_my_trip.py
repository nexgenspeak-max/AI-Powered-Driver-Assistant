import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_CANCELLABLE, ERR_CUSTOMER_CANCEL_FAIL
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.cancel_my_trip")


@function_tool(raw_schema=raw_schema["cancel_my_trip"])
async def cancel_my_trip(raw_arguments: dict, context: RunContext) -> str:
    customer_phone = context.userdata["customer_phone"]
    try:
        trips = await backend_api.get_customer_trips(customer_phone)
    except Exception:
        logger.error("cancel_my_trip — fetch failed", exc_info=True)
        return "Không thể tìm thấy chuyến đi lúc này."

    active = [t for t in trips if t.get("status") in ("pending", "notified", "calling")]
    if not active:
        return ERR_NO_CANCELLABLE

    trip = active[0]
    try:
        await backend_api.update_trip_status(trip["trip_id"], "rejected")
    except Exception:
        logger.error("cancel_my_trip — update failed", exc_info=True)
        return ERR_CUSTOMER_CANCEL_FAIL
    return "Đã hủy chuyến đi của bạn. Cảm ơn bạn đã sử dụng dịch vụ."
