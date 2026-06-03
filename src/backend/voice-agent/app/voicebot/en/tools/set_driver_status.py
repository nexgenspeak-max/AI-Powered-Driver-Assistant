import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.services import backend_api

logger = logging.getLogger("voice-agent.en.tools.set_driver_status")


@function_tool(raw_schema=raw_schema["set_driver_status"])
async def set_driver_status(raw_arguments: dict, context: RunContext) -> str:
    online       = bool(raw_arguments.get("online", True))
    driver_phone = context.userdata["driver_phone"]

    try:
        await backend_api.set_driver_online_status(driver_phone, online)
    except Exception:
        logger.error("set_driver_status failed", exc_info=True)
        action = "enable" if online else "disable"
        return f"Unable to {action} trip acceptance right now."

    if online:
        return "You're now online and accepting trips. Have a great shift!"
    return "You're now offline. You won't receive new trip requests."
