import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import TRIP_CONFIRMED, ERR_CANNOT_UPDATE
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.vn.tools.confirm_trip")


@function_tool(raw_schema=raw_schema["confirm_trip"])
async def confirm_trip(raw_arguments: dict, context: RunContext) -> str:
    trip = context.userdata.get("trip") or context_store.resolve_driver_trip(context.userdata)
    if not trip:
        return "Không có chuyến nào đang chờ xác nhận."

    trip_id = trip["trip_id"]

    try:
        updated = await backend_api.update_trip_status(trip_id, "confirmed")
    except Exception:
        logger.error("confirm_trip failed", exc_info=True)
        return ERR_CANNOT_UPDATE

    fields = {k: v for k, v in updated.items() if k != "trip_id"}
    context_store.patch_trip_by_id(context.userdata, trip_id, **fields)
    await context.session.say(TRIP_CONFIRMED, allow_interruptions=False)
    return "confirmed"
