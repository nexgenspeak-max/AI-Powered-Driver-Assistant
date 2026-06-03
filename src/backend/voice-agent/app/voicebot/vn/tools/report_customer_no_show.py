import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.report_customer_no_show")


@function_tool(raw_schema=raw_schema["report_customer_no_show"])
async def report_customer_no_show(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]
    try:
        current = await backend_api.get_current_trip(driver_phone)
    except Exception:
        return "Không thể tìm thấy chuyến đi lúc này."

    if not current:
        return "Không có chuyến đang hoạt động."

    try:
        await backend_api.report_no_show(current["trip_id"], driver_phone)
    except Exception:
        logger.error("report_customer_no_show failed", exc_info=True)
        return "Không thể báo cáo lúc này. Vui lòng thử lại."

    customer = current.get("customer_name", "khách hàng")
    return (
        f"Đã báo cáo {customer} không xuất hiện. "
        "Hệ thống sẽ xử lý và chuyến đi sẽ được hủy. "
        "Anh/chị sẽ không bị trừ điểm."
    )
