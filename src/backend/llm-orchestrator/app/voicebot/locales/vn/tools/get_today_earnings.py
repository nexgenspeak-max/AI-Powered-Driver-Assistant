from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_response import build_earnings_response
from app.voicebot.prompts.tool_response import ToolResponse


def _format_earnings_reply(userdata: dict) -> ToolResponse:
    data = context_store.get(userdata, "today_earnings", {}) or {}
    return build_earnings_response(data, lang="vi")


@function_tool(raw_schema=raw_schema["get_today_earnings"])
async def get_today_earnings(raw_arguments: dict, context: RunContext) -> str:
    reply = _format_earnings_reply(context.userdata)
    return await context_store.speak_with_refresh_offer(
        context.session, context.userdata, "today_earnings", reply, lang="vi"
    )
