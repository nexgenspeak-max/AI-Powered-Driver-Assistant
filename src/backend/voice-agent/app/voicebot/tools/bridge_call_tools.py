"""Tools for BridgeCallAgent — driver ↔ customer direct conversation."""
import logging

from livekit.agents import Agent, RunContext, function_tool

from app.voicebot.processors.handback import (
    build_driver_agent,
    cancel_bridge_timeout,
    restore_session_audio,
    store_call_summary,
)

logger = logging.getLogger("voice-agent.tools.bridge_call")


@function_tool(
    name="end_bridge_call",
    description=(
        "End the bridge call ONLY when the driver says a wake phrase "
        "(e.g. 'trợ lý kết thúc', 'assistant hang up'). "
        "Provide a one-line summary of the call for the driver."
    ),
)
async def end_bridge_call(context: RunContext, summary: str = "") -> tuple[Agent, str]:
    lang = context.userdata.get("lang", "vn")
    default_summary = (
        "Bridge call ended by driver request."
        if lang == "en"
        else "Tài xế yêu cầu kết thúc cuộc gọi trực tiếp."
    )
    final_summary = summary.strip() or default_summary

    try:
        cancel_bridge_timeout(context.userdata)
        store_call_summary(context.userdata, final_summary, mode="bridge")
        context.userdata["customer_call_active"] = False
        context.userdata["bridge_call_active"] = False
        restore_session_audio(context.session)

        tracker = context.userdata.get("_silence_tracker")
        if tracker:
            tracker.resume()

        logger.info("bridge call ended by wake phrase | summary=%s", final_summary[:120])

        driver = build_driver_agent(context.userdata, summary=final_summary)
    except Exception:
        logger.error("end_bridge_call failed", exc_info=True)
        raise
    if lang == "en":
        return driver, f"Bridge call ended. {final_summary}"
    return driver, f"Đã kết thúc cuộc gọi trực tiếp. {final_summary}"
