import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.processors import prefetch as prefetch_processor
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.get_today_earnings")


@function_tool(raw_schema=raw_schema["get_today_earnings"])
async def get_today_earnings(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]

    # Use prefetched data if fresh
    data = prefetch_processor.get(context.userdata, "today_earnings")
    if not data:
        try:
            data = await backend_api.get_today_earnings(driver_phone)
        except Exception:
            logger.error("get_today_earnings failed", exc_info=True)
            return "Không thể lấy thông tin thu nhập lúc này."

    if not data:
        return "Chưa có dữ liệu thu nhập hôm nay."

    total      = data.get("total_earnings", 0)
    trips      = data.get("trip_count", 0)
    bonus      = data.get("bonus_earnings", 0)
    hours      = data.get("hours_online", 0)

    msg = f"Hôm nay anh/chị đã hoàn thành {trips} chuyến, thu nhập {total:,.0f}đ."
    if bonus:
        msg += f" Trong đó thưởng {bonus:,.0f}đ."
    if hours:
        msg += f" Thời gian online: {hours:.1f} giờ."
    return msg
