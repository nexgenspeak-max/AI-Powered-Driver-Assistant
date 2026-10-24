"""Active bonuses / promotions — read from the prefetched context (active_bonuses).

Data comes from GET /drivers/me/context at session start, so the tool makes
no network call; there is no dedicated refresh endpoint, so no refresh offer.
"""
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.vn.tools.get_active_bonuses import build_bonuses_response
from app.voicebot.processors import context_store


@function_tool(raw_schema=raw_schema["get_active_bonuses"])
async def get_active_bonuses(raw_arguments: dict, context: RunContext) -> str:
    bonuses = context_store.get(context.userdata, "active_bonuses", []) or []
    reply = build_bonuses_response(bonuses, lang="en")
    context_store.set_last_tool_response(context.userdata, reply)
    await context_store.speak_reply(context.session, reply, lang="en")
