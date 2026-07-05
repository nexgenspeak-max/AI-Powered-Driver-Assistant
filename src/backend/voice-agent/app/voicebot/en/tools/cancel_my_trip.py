import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_NO_CANCELLABLE, ERR_CUSTOMER_CANCEL_FAIL
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.en.tools.cancel_my_trip")


@function_tool(raw_schema=raw_schema["cancel_my_trip"])
async def cancel_my_trip(raw_arguments: dict, context: RunContext) -> str:
    trips = context_store.get(context.userdata, "trips", [])
    active = [t for t in trips if t.get("status") in ("pending", "notified", "calling")]
    if not active:
        return ERR_NO_CANCELLABLE

    trip = active[0]
    trip_id = trip["trip_id"]
    context_store.patch_trip_by_id(context.userdata, trip_id, status="rejected")
    context_store.remove_trip_from_lists(context.userdata, trip_id)

    async def _sync() -> None:
        try:
            await backend_api.update_trip_status(trip_id, "rejected")
        except Exception:
            logger.error("cancel_my_trip — update failed", exc_info=True)

    context_store.schedule_sync(_sync())
    return "Your trip has been cancelled. Thank you for using our service."
