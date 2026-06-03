import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.processors import prefetch as prefetch_processor
from app.services import backend_api

logger = logging.getLogger("voice-agent.en.tools.get_bonus_info")


@function_tool(raw_schema=raw_schema["get_bonus_info"])
async def get_bonus_info(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]

    bonuses = prefetch_processor.get(context.userdata, "active_bonuses")
    if bonuses is None:
        try:
            bonuses = await backend_api.get_active_bonuses(driver_phone)
        except Exception:
            logger.error("get_bonus_info failed", exc_info=True)
            return "Unable to retrieve bonus information right now."

    if not bonuses:
        return "No active bonuses or surge zones right now."

    lines = []
    for b in bonuses:
        desc   = b.get("description", "")
        amount = b.get("amount", "")
        expire = b.get("expires_at", "")
        line   = desc
        if amount:
            line += f" (+${amount})"
        if expire:
            line += f" (expires {expire})"
        lines.append(line)

    return "Active bonuses: " + "; ".join(lines) + "."
