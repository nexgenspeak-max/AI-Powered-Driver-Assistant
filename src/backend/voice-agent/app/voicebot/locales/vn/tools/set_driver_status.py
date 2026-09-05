import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_response_builders import build_driver_status_response

logger = logging.getLogger("voice-agent.vn.tools.set_driver_status")


@function_tool(raw_schema=raw_schema["set_driver_status"])
async def set_driver_status(raw_arguments: dict, context: RunContext) -> str:
    online = bool(raw_arguments.get("online", True))
    driver_phone = context.userdata["driver_phone"]

    context_store.set_driver_status(context.userdata, online)

    async def _sync() -> None:
        try:
            await backend_api.set_driver_online_status(driver_phone, online)
        except Exception:
            logger.error("set_driver_status API failed", exc_info=True)

    context_store.schedule_sync(_sync())

    resp = build_driver_status_response(online, lang="vi")
    return await context_store.speak_and_stop(context.session, resp)
