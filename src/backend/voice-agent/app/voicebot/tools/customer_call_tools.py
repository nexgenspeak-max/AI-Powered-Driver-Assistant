"""Tools used by CustomerCallAgent during customer calls."""
import logging

from livekit import api
from livekit.agents import Agent, RunContext, function_tool
from livekit.agents.job import get_job_context

from app.services import backend_api
from app.voicebot.processors.handback import (
    build_driver_agent,
    disconnect_sip_participant,
    restore_session_audio,
    store_call_summary,
)

logger = logging.getLogger("voice-agent.tools.customer_call")


async def _finish_isolated_call(context: RunContext, summary: str) -> str:
    driver_phone = context.userdata.get("driver_phone", "")
    call_meta = context.userdata.get("customer_call") or {}
    call_id = call_meta.get("call_id", "")
    if not call_id:
        try:
            latest = await backend_api.get_latest_call_record(driver_phone)
            call_id = latest.get("call_id", "")
        except Exception:
            pass
    if driver_phone and call_id:
        try:
            await backend_api.complete_background_call(driver_phone, call_id, summary)
        except Exception:
            logger.error("complete_background_call failed", exc_info=True)
    else:
        logger.warning(
            "complete_background_call skipped | driver_phone=%r call_id=%r",
            driver_phone,
            call_id,
        )

    try:
        job_ctx = get_job_context()
        await job_ctx.api.room.delete_room(
            api.DeleteRoomRequest(room=job_ctx.room.name)
        )
    except Exception:
        logger.warning("failed to delete isolated call room", exc_info=True)

    logger.info("isolated customer call ended | summary=%s", summary[:120])
    return summary


@function_tool(
    name="end_customer_call",
    description=(
        "End the customer call and save a summary for the driver. "
        "Call when the conversation is finished or the customer hung up."
    ),
)
async def end_customer_call(context: RunContext, summary: str):
    if context.userdata.get("isolated_call"):
        try:
            await _finish_isolated_call(context, summary)
        except Exception:
            logger.error("end_customer_call (isolated) failed", exc_info=True)
            raise
        return f"Background call completed. Summary: {summary}"

    lang = context.userdata.get("lang", "vn")
    try:
        store_call_summary(context.userdata, summary, mode="agent")
        context.userdata["customer_call_active"] = False
        context.userdata["bridge_call_active"] = False
        restore_session_audio(context.session)
        await disconnect_sip_participant(context.userdata)

        tracker = context.userdata.get("_silence_tracker")
        if tracker:
            tracker.resume()

        logger.info("customer call ended | summary=%s", summary[:120])

        driver = build_driver_agent(context.userdata, summary=summary)
    except Exception:
        logger.error("end_customer_call failed", exc_info=True)
        raise
    if lang == "en":
        return driver, f"Customer call ended. Summary: {summary}"
    return driver, f"Cuộc gọi với khách đã kết thúc. Tóm tắt: {summary}"
