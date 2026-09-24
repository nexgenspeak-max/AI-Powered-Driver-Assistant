import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.en.constants import ERR_SUMMARY_FAIL, ERR_NO_SUMMARY
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_response_builders import build_summarize_call_response

logger = logging.getLogger("llm-orchestrator.en.tools.summarize_last_call")


@function_tool(raw_schema=raw_schema["summarize_last_call"])
async def summarize_last_call(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]

    try:
        record = await backend_api.get_latest_call_record(driver_phone)
    except Exception:
        logger.error("summarize_last_call failed", exc_info=True)
        resp = build_summarize_call_response(ERR_SUMMARY_FAIL, lang="en")
        return await context_store.speak_and_stop(context.session, resp)

    if record.get("status") == "in_progress":
        spoken = (
            "The AI is still on the call with the customer. "
            "You can ask other questions — try again in a few minutes."
        )
        resp = build_summarize_call_response(spoken, lang="en", in_progress=True)
        return await context_store.speak_and_stop(context.session, resp)

    summary = record.get("summary", "")
    if summary:
        context_store.set_last_call(
            context.userdata,
            record.get("call_id", ""),
            summary=summary,
            mode=record.get("mode", ""),
        )
        spoken = f"The last call: {summary}"
        resp = build_summarize_call_response(spoken, lang="en", summary=summary)
        return await context_store.speak_and_stop(context.session, resp)

    last_call = context_store.get(context.userdata, "last_call", {}) or {}
    if last_call.get("summary"):
        summary = last_call["summary"]
        spoken = f"The last call: {summary}"
        resp = build_summarize_call_response(spoken, lang="en", summary=summary)
        return await context_store.speak_and_stop(context.session, resp)

    resp = build_summarize_call_response(ERR_NO_SUMMARY, lang="en")
    return await context_store.speak_and_stop(context.session, resp)
