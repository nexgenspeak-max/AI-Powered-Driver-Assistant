import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_PENDING_REFRESH
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.vn.tools.get_today_earnings import _format_earnings_reply
from app.voicebot.vn.tools.check_upcoming_trips import _format_trips_reply

logger = logging.getLogger("voice-agent.vn.tools.refresh_latest_data")


@function_tool(raw_schema=raw_schema["refresh_latest_data"])
async def refresh_latest_data(raw_arguments: dict, context: RunContext) -> str:
    topic, args = context_store.pop_pending_refresh(context.userdata)
    if not topic:
        return ERR_NO_PENDING_REFRESH

    driver_phone = context.userdata.get("driver_phone", "")

    if topic == "today_earnings":
        try:
            fresh = await backend_api.get_today_earnings(driver_phone)
            context_store.set_context(context.userdata, "today_earnings", fresh)
        except Exception:
            logger.warning("refresh_latest_data(today_earnings) failed, using cached data", exc_info=True)
        return _format_earnings_reply(context.userdata)

    if topic == "upcoming_trips":
        try:
            fresh = await backend_api.get_upcoming_trips(driver_phone)
            context_store.set_upcoming_trips(context.userdata, fresh)
        except Exception:
            logger.warning("refresh_latest_data(upcoming_trips) failed, using cached data", exc_info=True)
        return _format_trips_reply(context.userdata, args)

    return ERR_NO_PENDING_REFRESH
