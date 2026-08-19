import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.next_stop import build_next_stop_suggestion

logger = logging.getLogger("voice-agent.vn.tools.suggest_next_stop")


@function_tool(raw_schema=raw_schema["suggest_next_stop"])
async def suggest_next_stop(raw_arguments: dict, context: RunContext) -> str:
    # Live re-fetch — same reasoning as check_upcoming_trips.py: the driver's
    # schedule/location can change between session start and this question,
    # and the driver explicitly asked, so don't trust a stale snapshot.
    driver_phone = context.userdata.get("driver_phone", "")
    if driver_phone:
        try:
            fresh = await backend_api.get_driver_context(driver_phone)
            context_store.load_driver_context(context.userdata, fresh)
        except Exception:
            logger.warning("suggest_next_stop — live refresh failed, using cached data", exc_info=True)

    return build_next_stop_suggestion(context.userdata, lang="vi")
