import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_SUMMARY_FAIL, ERR_NO_SUMMARY
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.vn.tools.summarize_last_call")


@function_tool(raw_schema=raw_schema["summarize_last_call"])
async def summarize_last_call(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]

    try:
        record = await backend_api.get_latest_call_record(driver_phone)
    except Exception:
        logger.error("summarize_last_call failed", exc_info=True)
        return ERR_SUMMARY_FAIL

    if record.get("status") == "in_progress":
        return (
            "AI vẫn đang gọi khách. Anh/chị có thể hỏi việc khác — thử lại sau vài phút."
        )

    summary = record.get("summary", "")
    if summary:
        context_store.set_last_call(
            context.userdata,
            record.get("call_id", ""),
            summary=summary,
            mode=record.get("mode", ""),
        )
        return f"Cuộc gọi vừa rồi: {summary}"

    last_call = context_store.get(context.userdata, "last_call", {}) or {}
    if last_call.get("summary"):
        return f"Cuộc gọi vừa rồi: {last_call['summary']}"

    return ERR_NO_SUMMARY
