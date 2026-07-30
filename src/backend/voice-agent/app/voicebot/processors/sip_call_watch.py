"""Auto handback when the SIP customer participant leaves the LiveKit room."""
from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING

from livekit import api, rtc
from livekit.agents import AgentSession
from livekit.agents.job import get_job_context
from livekit.agents.utils.participant import wait_for_participant_attribute

from app.services import backend_api
from app.voicebot.processors.handback import handback_to_customer, handback_to_driver

if TYPE_CHECKING:
    from app.services.silence_tracker import SilenceTracker

logger = logging.getLogger("voice-agent.processors.sip_call_watch")

# Same attribute LiveKit's own AMD (Answering Machine Detection) feature uses
# to tell a SIP leg has actually been picked up vs. still ringing (ringback/
# early media) — see livekit.agents.voice.amd.detector._SIP_CALL_STATUS_ATTR.
_SIP_CALL_STATUS_ATTR = "sip.callStatus"
_SIP_CALL_STATUS_ACTIVE = "active"


async def wait_for_sip_pickup(
    userdata: dict,
    *,
    answer_timeout: float = 20.0,
    post_answer_delay: float = 3.0,
) -> None:
    """Wait until the dialed party's SIP leg is actually answered before the
    caller speaks — used by BridgeCallAgent/CustomerCallAgent's `on_enter()`.

    Without this, the greeting/relayed message was spoken the instant the
    agent joined the room, while the phone was often still just ringing
    (ringback tone, no one listening yet), so the other person missed the
    start of it. `post_answer_delay` gives them a beat after pickup to
    actually get the phone to their ear before the agent starts talking.

    Best-effort: if the SIP identity/room/answer signal aren't available for
    any reason, this just returns (speak immediately, today's behavior) —
    `answer_timeout` bounds the worst case the same way, so a plumbing issue
    here can never silently mute the agent forever.
    """
    sip_identity = (userdata.get("customer_call") or {}).get("sip_identity", "")
    if not sip_identity:
        return

    try:
        room = get_job_context().room
    except RuntimeError:
        return

    try:
        await asyncio.wait_for(
            wait_for_participant_attribute(
                room,
                identity=sip_identity,
                attribute=_SIP_CALL_STATUS_ATTR,
                value=_SIP_CALL_STATUS_ACTIVE,
            ),
            timeout=answer_timeout,
        )
    except Exception:
        logger.debug(
            "wait_for_sip_pickup: answer wait failed/timed out — speaking anyway",
            exc_info=True,
        )
        return

    await asyncio.sleep(post_answer_delay)


def _run_logged(coro, *, name: str) -> None:
    """asyncio.create_task, but a raised exception is logged instead of silently dropped."""
    task = asyncio.create_task(coro, name=name)

    def _done(t: asyncio.Task) -> None:
        if t.cancelled():
            return
        exc = t.exception()
        if exc:
            logger.error("%s crashed", name, exc_info=exc)

    task.add_done_callback(_done)


def _is_customer_sip_participant(participant: rtc.RemoteParticipant, userdata: dict) -> bool:
    pid = participant.identity
    sip_id = (userdata.get("customer_call") or {}).get("sip_identity", "")
    if sip_id and pid == sip_id:
        return True
    return pid.startswith("customer-")


def _is_driver_sip_participant(participant: rtc.RemoteParticipant, userdata: dict) -> bool:
    pid = participant.identity
    sip_id = (userdata.get("customer_call") or {}).get("sip_identity", "")
    if sip_id and pid == sip_id:
        return True
    return pid.startswith("driver-")


def _disconnect_summary(lang: str, mode: str) -> str:
    if mode == "bridge":
        return (
            "Customer hung up. Bridge call ended."
            if lang == "en"
            else "Khách đã cúp máy. Cuộc gọi kết nối trực tiếp đã kết thúc."
        )
    if mode == "background":
        return (
            "Customer hung up during background call."
            if lang == "en"
            else "Khách cúp máy trong cuộc gọi nền."
        )
    return (
        "Customer hung up before the conversation finished."
        if lang == "en"
        else "Khách đã cúp máy trước khi cuộc trò chuyện kết thúc."
    )


async def complete_isolated_call(session: AgentSession, userdata: dict, summary: str) -> None:
    """Mark a background (isolated) customer call finished and tear down its room.

    Shared by: SIP disconnect watcher, the no-answer watchdog, and the
    SilenceTracker timeout callback — every path that can end a background
    call must go through here so the driver's "tóm tắt cuộc gọi" query never
    gets stuck on status=in_progress.
    """
    if userdata.get("_handback_in_progress"):
        return
    userdata["_handback_in_progress"] = True
    try:
        driver_phone = userdata.get("driver_phone", "")
        call_id = (userdata.get("customer_call") or {}).get("call_id", "")
        await backend_api.complete_background_call(driver_phone, call_id, summary)
        try:
            job_ctx = get_job_context()
            await job_ctx.api.room.delete_room(
                api.DeleteRoomRequest(room=job_ctx.room.name)
            )
        except Exception:
            logger.warning("failed to delete isolated room", exc_info=True)
        logger.info("isolated call auto-completed | summary=%s", summary[:120])
    finally:
        userdata["_handback_in_progress"] = False


def register_sip_call_watchers(
    room: rtc.Room,
    session: AgentSession,
    *,
    silence_tracker: SilenceTracker | None = None,
) -> None:
    """Watch for customer SIP disconnect and auto-return to DriverAgent."""

    @room.on("participant_disconnected")
    def _on_participant_left(participant: rtc.RemoteParticipant) -> None:
        userdata = session.userdata
        if userdata.get("isolated_call"):
            if not _is_customer_sip_participant(participant, userdata):
                logger.info(
                    "participant_disconnected ignored | identity=%s reason=identity_mismatch "
                    "isolated_call=True expected_sip_identity=%s",
                    participant.identity,
                    (userdata.get("customer_call") or {}).get("sip_identity", ""),
                )
                return
            lang = userdata.get("lang", "vn")
            summary = _disconnect_summary(lang, "background")
            _run_logged(
                complete_isolated_call(session, userdata, summary),
                name="auto_complete_isolated",
            )
            return

        if not userdata.get("customer_call_active") and not userdata.get("bridge_call_active"):
            logger.info(
                "participant_disconnected ignored | identity=%s reason=no_active_call "
                "customer_call_active=%s bridge_call_active=%s",
                participant.identity,
                userdata.get("customer_call_active"),
                userdata.get("bridge_call_active"),
            )
            return
        if not _is_customer_sip_participant(participant, userdata):
            logger.info(
                "participant_disconnected ignored | identity=%s reason=identity_mismatch "
                "expected_sip_identity=%s",
                participant.identity,
                (userdata.get("customer_call") or {}).get("sip_identity", ""),
            )
            return

        lang = userdata.get("lang", "vn")
        mode = (userdata.get("customer_call") or {}).get("mode", "agent")
        summary = _disconnect_summary(lang, mode)
        logger.info(
            "customer SIP disconnected | identity=%s mode=%s",
            participant.identity,
            mode,
        )

        _run_logged(
            handback_to_driver(
                session,
                userdata,
                summary,
                mode=mode,
                silence_tracker=silence_tracker,
            ),
            name="handback_to_driver",
        )


def register_customer_room_sip_watchers(
    room: rtc.Room,
    session: AgentSession,
    *,
    silence_tracker: SilenceTracker | None = None,
) -> None:
    """Watch for the driver's SIP participant leaving a customer-room bridge call
    and auto-return to CustomerAgent (mirrors register_sip_call_watchers)."""

    @room.on("participant_disconnected")
    def _on_participant_left(participant: rtc.RemoteParticipant) -> None:
        userdata = session.userdata
        if not userdata.get("bridge_call_active"):
            logger.info(
                "participant_disconnected ignored | identity=%s reason=no_active_bridge_call",
                participant.identity,
            )
            return
        if not _is_driver_sip_participant(participant, userdata):
            logger.info(
                "participant_disconnected ignored | identity=%s reason=identity_mismatch "
                "expected_sip_identity=%s",
                participant.identity,
                (userdata.get("customer_call") or {}).get("sip_identity", ""),
            )
            return

        lang = userdata.get("lang", "vn")
        summary = (
            "Driver hung up. Bridge call ended."
            if lang == "en"
            else "Tài xế đã cúp máy. Cuộc gọi kết nối trực tiếp đã kết thúc."
        )
        logger.info("driver SIP disconnected | identity=%s", participant.identity)

        _run_logged(
            handback_to_customer(
                session,
                userdata,
                summary,
                silence_tracker=silence_tracker,
            ),
            name="handback_to_customer",
        )
