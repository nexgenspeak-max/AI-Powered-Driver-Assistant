import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_ACTIVE_CANCEL
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.request_cancel_trip")


@function_tool(raw_schema=raw_schema["request_cancel_trip"])
async def request_cancel_trip(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]
    try:
        current = await backend_api.get_current_trip(driver_phone)
    except Exception:
        return "Không thể tìm thấy chuyến đi lúc này."
    if not current:
        return ERR_NO_ACTIVE_CANCEL
    context.userdata["pending_cancel_trip_id"] = current["trip_id"]
    customer    = current.get("customer_name", "khách hàng")
    pickup_time = current.get("pickup_time", "")
    return (
        f"Anh/chị có chắc muốn hủy chuyến với {customer}"
        + (f" lúc {pickup_time}" if pickup_time else "")
        + " không? Nói 'có' để xác nhận hủy."
    )
