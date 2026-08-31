from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_response import build_bonus_response
from app.voicebot.prompts.tool_response import ToolResponse


def _format_bonus_reply(userdata: dict) -> ToolResponse:
    bonuses = context_store.get(userdata, "active_bonuses", []) or []
    return build_bonus_response(bonuses, lang="en")


@function_tool(raw_schema=raw_schema["get_bonus_info"])
async def get_bonus_info(raw_arguments: dict, context: RunContext) -> str:
    reply = _format_bonus_reply(context.userdata)
    return await context_store.speak_with_refresh_offer(
        context.session, context.userdata, "active_bonuses", reply, lang="en"
    )
