import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_UPCOMING
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.check_upcoming_trips")


@function_tool(raw_schema=raw_schema["check_upcoming_trips"])
async def check_upcoming_trips(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]
    try:
        trips = await backend_api.get_upcoming_trips(driver_phone)
    except Exception:
        logger.error("check_upcoming_trips failed", exc_info=True)
        return "Hiện không thể lấy thông tin chuyến đi. Vui lòng thử lại sau."
    if not trips:
        return ERR_NO_UPCOMING
    t = trips[0]
    return (
        f"Anh/chị có {len(trips)} chuyến. "
        f"Chuyến gần nhất lúc {t.get('pickup_time', '')}: "
        f"đón {t.get('customer_name', 'khách')} tại {t.get('pickup_address', '')}, "
        f"đến {t.get('dropoff_address', '')}."
    )
