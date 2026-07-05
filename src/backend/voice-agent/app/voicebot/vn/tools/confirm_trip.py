import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import TRIP_CONFIRMED
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.vn.tools.confirm_trip")


@function_tool(raw_schema=raw_schema["confirm_trip"])
async def confirm_trip(raw_arguments: dict, context: RunContext) -> str:
    trip = context.userdata.get("trip") or context_store.resolve_driver_trip(context.userdata)
    if not trip:
        return "Không có chuyến nào đang chờ xác nhận."

    trip_id = trip["trip_id"]
    context_store.patch_trip_by_id(context.userdata, trip_id, status="confirmed")

    async def _sync() -> None:
        try:
            updated = await backend_api.update_trip_status(trip_id, "confirmed")
            context_store.patch_trip_by_id(context.userdata, trip_id, **updated)
        except Exception:
            logger.error("confirm_trip failed", exc_info=True)

    context_store.schedule_sync(_sync())
    await context.session.say(TRIP_CONFIRMED, allow_interruptions=False)
    return "confirmed"
