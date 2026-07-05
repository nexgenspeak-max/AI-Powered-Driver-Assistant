import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_NO_PENDING_CANCEL, TRIP_CANCELLED
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.en.tools.confirm_cancel_trip")


@function_tool(raw_schema=raw_schema["confirm_cancel_trip"])
async def confirm_cancel_trip(raw_arguments: dict, context: RunContext) -> str:
    trip_id = context.userdata.get("pending_cancel_trip_id")
    if not trip_id:
        return ERR_NO_PENDING_CANCEL

    context.userdata["pending_cancel_trip_id"] = None
    context_store.remove_trip_from_lists(context.userdata, trip_id)
    context_store.set_current_trip(context.userdata, None)

    async def _sync() -> None:
        try:
            await backend_api.update_trip_status(trip_id, "CANCELLED_BY_DRIVER")
        except Exception:
            logger.error("confirm_cancel_trip API failed", exc_info=True)

    context_store.schedule_sync(_sync())
    return TRIP_CANCELLED
