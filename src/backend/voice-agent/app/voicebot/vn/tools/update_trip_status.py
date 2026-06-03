import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import STATUS_LABELS, ERR_CANNOT_UPDATE, ERR_NO_CURRENT_TRIP
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.update_trip_status")


@function_tool(raw_schema=raw_schema["update_trip_status"])
async def update_trip_status(raw_arguments: dict, context: RunContext) -> str:
    status = raw_arguments.get("status", "").upper()
    label  = STATUS_LABELS.get(status, status)
    driver_phone = context.userdata["driver_phone"]
    try:
        current = await backend_api.get_current_trip(driver_phone)
    except Exception:
        logger.error("update_trip_status — get_current_trip failed", exc_info=True)
        return ERR_CANNOT_UPDATE
    if not current:
        return ERR_NO_CURRENT_TRIP
    try:
        await backend_api.update_trip_status(current["trip_id"], status)
    except Exception:
        logger.error("update_trip_status API failed", exc_info=True)
        return ERR_CANNOT_UPDATE
    return f"Đã cập nhật trạng thái: {label}."
