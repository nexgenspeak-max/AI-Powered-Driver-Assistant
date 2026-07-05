import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import STATUS_LABELS, ERR_CANNOT_UPDATE, ERR_NO_CURRENT_TRIP
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.vn.tools.update_trip_status")


@function_tool(raw_schema=raw_schema["update_trip_status"])
async def update_trip_status(raw_arguments: dict, context: RunContext) -> str:
    status = raw_arguments.get("status", "").upper()
    label = STATUS_LABELS.get(status, status)
    current = context_store.get_current_trip(context.userdata)
    if not current:
        return ERR_NO_CURRENT_TRIP

    trip_id = current["trip_id"]
    context_store.patch_current_trip(context.userdata, status=status)

    async def _sync() -> None:
        try:
            updated = await backend_api.update_trip_status(trip_id, status)
            context_store.patch_current_trip(context.userdata, **updated)
        except Exception:
            logger.error("update_trip_status API failed", exc_info=True)

    context_store.schedule_sync(_sync())
    return f"Đã cập nhật trạng thái: {label}."
