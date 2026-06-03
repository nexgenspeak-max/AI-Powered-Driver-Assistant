import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.processors import prefetch as prefetch_processor
from app.services import backend_api

logger = logging.getLogger("voice-agent.en.tools.get_today_earnings")


@function_tool(raw_schema=raw_schema["get_today_earnings"])
async def get_today_earnings(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]

    data = prefetch_processor.get(context.userdata, "today_earnings")
    if not data:
        try:
            data = await backend_api.get_today_earnings(driver_phone)
        except Exception:
            logger.error("get_today_earnings failed", exc_info=True)
            return "Unable to retrieve earnings information right now."

    if not data:
        return "No earnings data available for today yet."

    total  = data.get("total_earnings", 0)
    trips  = data.get("trip_count", 0)
    bonus  = data.get("bonus_earnings", 0)
    hours  = data.get("hours_online", 0)

    msg = f"Today you've completed {trips} trip(s) and earned ${total:,.2f}."
    if bonus:
        msg += f" Bonuses included: ${bonus:,.2f}."
    if hours:
        msg += f" Time online: {hours:.1f} hours."
    return msg
