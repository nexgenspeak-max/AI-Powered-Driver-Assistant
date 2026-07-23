import logging

from livekit.agents import RunContext, function_tool

from app.services.session_control import end_room_session
from app.voicebot.en.tools_definition import raw_schema

logger = logging.getLogger("voice-agent.en.tools.end_call")


@function_tool(raw_schema=raw_schema["end_call"])
async def end_call(raw_arguments: dict, context: RunContext) -> str:
    await context.session.say("Alright, goodbye! Talk soon.", allow_interruptions=False)

    tracker = context.userdata.get("_silence_tracker")
    if tracker:
        await tracker.stop()

    ctx = context.userdata.get("_job_ctx")
    if ctx:
        await end_room_session(ctx, reason="ended by driver voice command")

    return "Ended the conversation at the driver's request."
