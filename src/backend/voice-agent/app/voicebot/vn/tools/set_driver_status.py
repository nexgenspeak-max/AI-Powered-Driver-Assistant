import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.set_driver_status")


@function_tool(raw_schema=raw_schema["set_driver_status"])
async def set_driver_status(raw_arguments: dict, context: RunContext) -> str:
    online       = bool(raw_arguments.get("online", True))
    driver_phone = context.userdata["driver_phone"]

    try:
        await backend_api.set_driver_online_status(driver_phone, online)
    except Exception:
        logger.error("set_driver_status failed", exc_info=True)
        action = "bật" if online else "tắt"
        return f"Không thể {action} trạng thái nhận chuyến lúc này."

    if online:
        return "Đã bật trạng thái nhận chuyến. Chúc anh/chị có nhiều chuyến tốt!"
    return "Đã chuyển sang chế độ nghỉ. Anh/chị sẽ không nhận chuyến mới."
