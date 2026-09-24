import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.processors import context_store
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.processors import call_status, tool_reply

logger = logging.getLogger("llm-orchestrator.vn.tools.check_customer_call_status")


@function_tool(raw_schema=raw_schema["check_customer_call_status"])
async def check_customer_call_status(raw_arguments: dict, context: RunContext) -> str:
    resp = await call_status.check_call_status(context.userdata, lang="vn")
    return await context_store.speak_and_stop(context.session, resp)
