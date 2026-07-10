"""Shared driver handback after in-room customer calls (agent or bridge mode)."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from livekit import api
from livekit.agents import AgentSession
from livekit.agents.job import get_job_context

from app.voicebot import get_voicebot
from app.voicebot.processors import context_store

if TYPE_CHECKING:
    from app.services.silence_tracker import SilenceTracker

logger = logging.getLogger("voice-agent.processors.handback")


def restore_session_audio(session: AgentSession) -> None:
    session.input.set_audio_enabled(True)
    session.output.set_audio_enabled(True)


async def disconnect_sip_participant(userdata: dict) -> None:
    """
    Actually hang up the other side's phone line (SIP leg) after a manual
    'trợ lý kết thúc' command — end_*_call only restored the AI's own audio
    and switched agents, it never removed the SIP participant from the room,
    so the driver/customer phone stayed connected on the other end.
    """
    sip_identity = (userdata.get("customer_call") or {}).get("sip_identity", "")
    if not sip_identity:
        return
    try:
        job_ctx = get_job_context()
        await job_ctx.api.room.remove_participant(
            api.RoomParticipantIdentity(room=job_ctx.room.name, identity=sip_identity)
        )
        logger.info("SIP participant disconnected | identity=%s", sip_identity)
    except Exception:
        logger.warning(
            "failed to disconnect SIP participant | identity=%s", sip_identity, exc_info=True,
        )


def enter_bridge_listen_mode(session: AgentSession) -> None:
    """
    Bridge mode — driver and customer talk via room audio.
    Keep STT on so the driver can say a wake phrase; mute TTS so the agent never talks over them.
    """
    session.input.set_audio_enabled(True)
    session.output.set_audio_enabled(False)


def cancel_bridge_timeout(userdata: dict) -> None:
    task = userdata.pop("_bridge_timeout_task", None)
    if task and not task.done():
        task.cancel()


def build_driver_agent(userdata: dict, summary: str = ""):
    lang = userdata.get("lang", "vn")
    hint = context_store.build_context_hint(
        userdata,
        lang="en" if lang == "en" else "vi",
    )
    voicebot = get_voicebot(lang)
    return voicebot.DriverAgent(
        driver_phone=userdata.get("driver_phone", ""),
        context_hint=hint,
        resume_summary=summary,
    )


def build_customer_agent(userdata: dict, summary: str = ""):
    lang = userdata.get("lang", "vn")
    voicebot = get_voicebot(lang)
    return voicebot.CustomerAgent(
        customer_phone=userdata.get("customer_phone", ""),
        resume_summary=summary,
    )


def store_call_summary(userdata: dict, summary: str, mode: str) -> None:
    call_meta = userdata.get("customer_call") or {}
    call_id = call_meta.get("call_id", "")
    if call_id:
        context_store.set_last_call(
            userdata,
            str(call_id),
            trip_id=call_meta.get("trip_id", ""),
            mode=mode,
            summary=summary,
        )


async def handback_to_driver(
    session: AgentSession,
    userdata: dict,
    summary: str,
    *,
    mode: str,
    silence_tracker: SilenceTracker | None = None,
) -> None:
    if userdata.get("_handback_in_progress"):
        return
    userdata["_handback_in_progress"] = True
    try:
        cancel_bridge_timeout(userdata)
        store_call_summary(userdata, summary, mode)
        userdata["customer_call_active"] = False
        userdata["bridge_call_active"] = False
        restore_session_audio(session)

        driver = build_driver_agent(userdata, summary=summary)
        session.update_agent(driver)

        if silence_tracker:
            silence_tracker.resume()

        logger.info("handback to DriverAgent | mode=%s summary=%s", mode, summary[:80])
    except Exception:
        logger.error("handback_to_driver failed | mode=%s", mode, exc_info=True)
    finally:
        userdata["_handback_in_progress"] = False


async def handback_to_customer(
    session: AgentSession,
    userdata: dict,
    summary: str,
    *,
    silence_tracker: SilenceTracker | None = None,
) -> None:
    if userdata.get("_handback_in_progress"):
        return
    userdata["_handback_in_progress"] = True
    try:
        from app.voicebot.processors.customer_bridge_timeout import cancel_customer_bridge_timeout

        cancel_customer_bridge_timeout(userdata)
        store_call_summary(userdata, summary, mode="bridge")
        userdata["bridge_call_active"] = False
        userdata["driver_call_active"] = False
        restore_session_audio(session)

        customer = build_customer_agent(userdata, summary=summary)
        session.update_agent(customer)

        if silence_tracker:
            silence_tracker.resume()

        logger.info("handback to CustomerAgent | summary=%s", summary[:80])
    except Exception:
        logger.error("handback_to_customer failed", exc_info=True)
    finally:
        userdata["_handback_in_progress"] = False
