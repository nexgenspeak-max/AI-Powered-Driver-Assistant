"""Shared driver handback after in-room customer calls (agent or bridge mode)."""
from __future__ import annotations

import json
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

# Topic the driver's own room listens on for a proactive background-call
# summary announcement — see notify_driver_of_background_call_result below
# and session.py's handler for mode in ("driver", "outbound").
BACKGROUND_CALL_SUMMARY_TOPIC = "background_call_summary"


async def notify_driver_of_background_call_result(userdata: dict, summary: str) -> None:
    """Push the finished background call's summary into the DRIVER'S OWN
    room — a different room/job than the isolated custcall room this runs
    from (see customer_call.py::start_background_call and
    callService.ts::startCustomerCall for how driver_room_name gets there).
    LiveKit's server-side send_data can publish into any room by name, not
    just the one the current job is connected to, which is what makes this
    possible without the driver's own agent needing to poll anything.

    Best-effort and silent on failure: the driver may have closed the app or
    started a fresh session (a new room, so this one is stale) by the time
    the background call actually finishes — the driver can always still ask
    "tóm tắt cuộc gọi" the old way, so a missed push here must never raise.
    """
    call_meta = userdata.get("customer_call") or {}
    driver_room_name = call_meta.get("driver_room_name", "")
    if not driver_room_name:
        return
    try:
        job_ctx = get_job_context()
        await job_ctx.api.room.send_data(
            api.SendDataRequest(
                room=driver_room_name,
                data=json.dumps({"summary": summary}).encode("utf-8"),
                kind=api.DataPacket.Kind.RELIABLE,
                topic=BACKGROUND_CALL_SUMMARY_TOPIC,
            )
        )
        logger.info("background call summary pushed to driver room=%s", driver_room_name)
    except Exception:
        logger.warning(
            "failed to push background call summary to driver room=%s",
            driver_room_name, exc_info=True,
        )


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


async def store_call_summary(userdata: dict, summary: str, mode: str) -> None:
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

    # Agent/bridge sub-calls (customer, contact, or custom-number — see
    # customer_call.py/contact_call.py/custom_call.py) are dialed straight
    # into the driver's own room and have no room/job of their own to save a
    # call-logger record from when they end, unlike background calls. This
    # is the one point common to every one of those "call ended" paths, so
    # persist the sub-call's own transcript+summary here — reusing the
    # summary already computed above instead of asking the LLM again.
    conv_service = userdata.get("_conv_service")
    turns_from = call_meta.get("turns_from")
    if conv_service is not None and turns_from is not None:
        try:
            await conv_service.save_subcall(
                call_id=str(call_id),
                caller=call_meta.get("customer_phone", ""),
                mode=mode,
                turns_from=turns_from,
                summary=summary,
            )
        except Exception:
            logger.error("failed to save sub-call record | call_id=%s", call_id, exc_info=True)

    # Also mark trip-service's shared "last call" record (driverLastCallKey)
    # as completed. Background-mode calls already did this on their own
    # completion paths (customer_call_tools.py::_finish_isolated_call,
    # sip_call_watch.py::complete_isolated_call) — agent/bridge-mode calls
    # never did, even though starting ANY of the three modes writes
    # status='in_progress' to that exact same shared key (see
    # callService.ts::startCustomerCall). Net effect: a driver could finish
    # a background call (correctly marked 'completed'), then place/receive
    # an agent or bridge call, whose own start silently clobbered that same
    # key back to 'in_progress' — with nothing to ever complete it again, so
    # every later "gọi xong chưa" query kept reporting the (long-finished)
    # background call as still in progress. Doing the completion write here,
    # the one place already common to every "call ended" path
    # (handback_to_driver/_to_customer, end_bridge_call, end_customer_call),
    # closes the gap for all three modes at once.
    driver_phone = userdata.get("driver_phone", "")
    if driver_phone and call_id:
        try:
            from app.services import backend_api

            await backend_api.complete_background_call(driver_phone, str(call_id), summary)
        except Exception:
            logger.warning(
                "failed to mark call completed in trip-service | call_id=%s", call_id, exc_info=True,
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
        await store_call_summary(userdata, summary, mode)
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
        await store_call_summary(userdata, summary, mode="bridge")
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
