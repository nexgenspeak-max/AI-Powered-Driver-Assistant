import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_SUMMARY_FAIL, ERR_NO_SUMMARY
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.summarize_last_call")


@function_tool(raw_schema=raw_schema["summarize_last_call"])
async def summarize_last_call(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]
    try:
        summary = await backend_api.get_latest_call_summary(driver_phone)
    except Exception:
        logger.error("summarize_last_call failed", exc_info=True)
        return ERR_SUMMARY_FAIL
    if not summary:
        return ERR_NO_SUMMARY
    return f"Cuộc gọi vừa rồi: {summary}"
