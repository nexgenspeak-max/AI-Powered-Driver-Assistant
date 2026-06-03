import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.processors import prefetch as prefetch_processor
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.get_driver_stats")


@function_tool(raw_schema=raw_schema["get_driver_stats"])
async def get_driver_stats(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]

    data = prefetch_processor.get(context.userdata, "driver_profile")
    if not data:
        try:
            data = await backend_api.get_driver_profile(driver_phone)
        except Exception:
            logger.error("get_driver_stats failed", exc_info=True)
            return "Không thể lấy thống kê lúc này."

    if not data:
        return "Chưa có dữ liệu thống kê."

    rating      = data.get("rating", 0)
    accept_rate = data.get("acceptance_rate", 0)
    complete    = data.get("completion_rate", 0)
    total       = data.get("total_trips", 0)

    msg = f"Điểm đánh giá: {rating:.1f}/5."
    if accept_rate:
        msg += f" Tỷ lệ chấp nhận: {accept_rate:.0f}%."
    if complete:
        msg += f" Tỷ lệ hoàn thành: {complete:.0f}%."
    if total:
        msg += f" Tổng chuyến: {total}."
    return msg
