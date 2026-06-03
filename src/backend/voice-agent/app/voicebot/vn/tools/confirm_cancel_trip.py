import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_PENDING_CANCEL, ERR_CANNOT_CANCEL, TRIP_CANCELLED
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.confirm_cancel_trip")


@function_tool(raw_schema=raw_schema["confirm_cancel_trip"])
async def confirm_cancel_trip(raw_arguments: dict, context: RunContext) -> str:
    trip_id = context.userdata.get("pending_cancel_trip_id")
    if not trip_id:
        return ERR_NO_PENDING_CANCEL
    try:
        await backend_api.update_trip_status(trip_id, "CANCELLED_BY_DRIVER")
        context.userdata["pending_cancel_trip_id"] = None
    except Exception:
        logger.error("confirm_cancel_trip failed", exc_info=True)
        return ERR_CANNOT_CANCEL
    return TRIP_CANCELLED
