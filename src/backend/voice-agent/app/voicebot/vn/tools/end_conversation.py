import logging

from livekit.agents import RunContext, function_tool

from app.services.session_control import end_room_session
from app.voicebot.vn.tools_definition import raw_schema

logger = logging.getLogger("voice-agent.vn.tools.end_conversation")


@function_tool(raw_schema=raw_schema["end_conversation"])
async def end_conversation(raw_arguments: dict, context: RunContext) -> str:
    # A background/agent/bridge call to a customer or contact is still
    # running — tearing down the driver's whole LiveKit room now (via
    # end_room_session below) would kill it mid-call: for a background call
    # specifically, its own separate job/room keeps running orphaned (with
    # nothing left to push the eventual summary to, since driver_room_name no
    # longer exists — confirmed in production: "failed to push background
    # call summary... requested room does not exist"), and for agent/bridge
    # calls (dialed straight into THIS room) it would disconnect the
    # customer/contact outright, mid-conversation. Refuse instead — the
    # driver can end the session once the call itself has actually
    # finished (see the various call-ended paths, which resume normal
    # conversation with a summary).
    if (
        context.userdata.get("background_call_active")
        or context.userdata.get("customer_call_active")
        or context.userdata.get("bridge_call_active")
    ):
        logger.info("end_conversation refused | a customer/contact call is still active")
        return (
            "Chưa thể kết thúc phiên làm việc lúc này vì đang có cuộc gọi với khách/liên hệ "
            "chưa xong — đợi cuộc gọi đó kết thúc rồi mới kết thúc phiên được."
        )

    await context.session.say("Vâng, tạm biệt anh/chị! Hẹn gặp lại.", allow_interruptions=False)

    tracker = context.userdata.get("_silence_tracker")
    if tracker:
        await tracker.stop()

    ctx = context.userdata.get("_job_ctx")
    if ctx:
        await end_room_session(ctx, reason="ended by driver voice command")

    return "Đã kết thúc cuộc trò chuyện theo yêu cầu của tài xế."
