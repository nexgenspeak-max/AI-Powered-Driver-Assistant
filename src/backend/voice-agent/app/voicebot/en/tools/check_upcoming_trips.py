from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.processors.schedule_reply import format_schedule_reply


@function_tool(raw_schema=raw_schema["check_upcoming_trips"])
async def check_upcoming_trips(raw_arguments: dict, context: RunContext) -> str:
    reply = format_schedule_reply(context.userdata, raw_arguments, lang="en")
    return await context_store.speak_with_refresh_offer(
        context.session,
        context.userdata,
        "upcoming_trips",
        reply,
        lang="en",
        args=dict(raw_arguments),
    )
