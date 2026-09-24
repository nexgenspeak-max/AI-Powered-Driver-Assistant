"""Tools for CustomerBridgeCallAgent — customer <-> driver direct conversation."""
import logging

from livekit.agents import Agent, RunContext, function_tool

from app.voicebot.processors.customer_bridge_timeout import cancel_customer_bridge_timeout
from app.voicebot.processors.handback import (
    build_customer_agent,
    disconnect_sip_participant,
    restore_session_audio,
    store_call_summary,
)

logger = logging.getLogger("llm-orchestrator.tools.customer_bridge_call")


@function_tool(
    name="end_customer_bridge_call",
    description=(
        "End the bridge call ONLY when the customer says a wake phrase "
        "(e.g. 'trợ lý kết thúc', 'assistant hang up'). "
        "Provide a one-line summary of the call for the customer."
    ),
)
async def end_customer_bridge_call(context: RunContext, summary: str = "") -> tuple[Agent, str]:
    lang = context.userdata.get("lang", "vn")
    default_summary = (
        "Customer ended the bridge call."
        if lang == "en"
        else "Khách yêu cầu kết thúc cuộc gọi trực tiếp."
    )
    final_summary = summary.strip() or default_summary

    try:
        cancel_customer_bridge_timeout(context.userdata)
        await store_call_summary(context.userdata, final_summary, mode="bridge")
        context.userdata["bridge_call_active"] = False
        context.userdata["driver_call_active"] = False
        restore_session_audio(context.session)
        await disconnect_sip_participant(context.userdata)

        tracker = context.userdata.get("_silence_tracker")
        if tracker:
            tracker.resume()

        logger.info("customer bridge call ended by wake phrase | summary=%s", final_summary[:120])

        customer = build_customer_agent(context.userdata, summary=final_summary)
    except Exception:
        logger.error("end_customer_bridge_call failed", exc_info=True)
        raise
    if lang == "en":
        return customer, f"Bridge call ended. {final_summary}"
    return customer, f"Đã kết thúc cuộc gọi trực tiếp. {final_summary}"
