from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.processors.next_stop import build_next_stop_suggestion
from app.voicebot.processors.tool_response_builders import build_next_stop_response


@function_tool(raw_schema=raw_schema["suggest_next_stop"])
async def suggest_next_stop(raw_arguments: dict, context: RunContext) -> str:
    spoken = build_next_stop_suggestion(context.userdata, lang="en")
    reply = build_next_stop_response(spoken, lang="en")
    return await context_store.speak_with_refresh_offer(
        context.session, context.userdata, "next_stop", reply, lang="en"
    )
