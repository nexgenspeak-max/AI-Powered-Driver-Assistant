import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import TRIP_REJECTED
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.reject_trip")


@function_tool(raw_schema=raw_schema["reject_trip"])
async def reject_trip(raw_arguments: dict, context: RunContext) -> str:
    trip = context.userdata.get("trip")
    if not trip:
        return "Không có chuyến nào đang chờ xác nhận."
    try:
        await backend_api.update_trip_status(trip["trip_id"], "rejected")
    except Exception:
        logger.error("reject_trip failed", exc_info=True)
    await context.session.say(TRIP_REJECTED, allow_interruptions=False)
    return "rejected"
