import logging

from livekit.agents import RunContext, function_tool

from app.services.session_control import end_room_session
from app.voicebot.vn.tools_definition import raw_schema

logger = logging.getLogger("voice-agent.vn.tools.end_conversation")


@function_tool(raw_schema=raw_schema["end_conversation"])
async def end_conversation(raw_arguments: dict, context: RunContext) -> str:
    await context.session.say("Vâng, tạm biệt anh/chị! Hẹn gặp lại.", allow_interruptions=False)

    tracker = context.userdata.get("_silence_tracker")
    if tracker:
        await tracker.stop()

    ctx = context.userdata.get("_job_ctx")
    if ctx:
        await end_room_session(ctx, reason="ended by driver voice command")

    return "Đã kết thúc cuộc trò chuyện theo yêu cầu của tài xế."
