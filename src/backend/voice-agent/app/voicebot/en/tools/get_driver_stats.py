from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_response_builders import build_stats_response


@function_tool(raw_schema=raw_schema["get_driver_stats"])
async def get_driver_stats(raw_arguments: dict, context: RunContext) -> str:
    data = context_store.get(context.userdata, "driver_profile", {})
    reply = build_stats_response(data, lang="en")
    return await context_store.speak_with_refresh_offer(
        context.session, context.userdata, "driver_profile", reply, lang="en"
    )
