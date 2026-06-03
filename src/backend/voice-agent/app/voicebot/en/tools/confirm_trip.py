import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import TRIP_CONFIRMED
from app.services import backend_api

logger = logging.getLogger("voice-agent.en.tools.confirm_trip")


@function_tool(raw_schema=raw_schema["confirm_trip"])
async def confirm_trip(raw_arguments: dict, context: RunContext) -> str:
    trip = context.userdata.get("trip")
    if not trip:
        return "No trip is waiting for confirmation."
    try:
        await backend_api.update_trip_status(trip["trip_id"], "confirmed")
    except Exception:
        logger.error("confirm_trip failed", exc_info=True)
    await context.session.say(TRIP_CONFIRMED, allow_interruptions=False)
    return "confirmed"
