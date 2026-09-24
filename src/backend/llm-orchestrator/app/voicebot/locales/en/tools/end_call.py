import logging

from livekit.agents import RunContext, function_tool

from app.services.session_control import end_room_session
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("llm-orchestrator.en.tools.end_call")


@function_tool(raw_schema=raw_schema["end_call"])
async def end_call(raw_arguments: dict, context: RunContext) -> str:
    if (
        context.userdata.get("background_call_active")
        or context.userdata.get("customer_call_active")
        or context.userdata.get("bridge_call_active")
    ):
        logger.info("end_call refused | a customer/contact call is still active")
        spoken = (
            "Can't end the session right now — a customer or contact call is still in progress. "
            "Wait for that call to finish, then you can end the session."
        )
        return await context_store.speak_and_stop(
            context.session,
                build_mutation_response(
                spoken,
                tool="end_call",
                lang="en",
                action=["check_customer_call_status()", "summarize_last_call()"],
            ),
        )

    goodbye = "Alright, goodbye! Talk soon."
    context_store.set_last_tool_response(
        context.userdata,
        build_mutation_response(goodbye, tool="end_call", lang="en"),
    )
    await context.session.say(goodbye, allow_interruptions=False)

    tracker = context.userdata.get("_silence_tracker")
    if tracker:
        await tracker.stop()

    ctx = context.userdata.get("_job_ctx")
    if ctx:
        await end_room_session(ctx, reason="ended by driver voice command")

    spoken = "Ended the conversation at the driver's request."
    return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(spoken, tool="end_call", lang="en"),
    )
