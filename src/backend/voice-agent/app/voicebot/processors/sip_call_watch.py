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
from app.voicebot.processors.handback import (
    disconnect_sip_participant,
    handback_to_customer,
    handback_to_driver,
    notify_driver_of_background_call_result,
)

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
) -> bool:
    """Wait until the dialed party's SIP leg is actually answered before the
    caller speaks — used by BridgeCallAgent/CustomerCallAgent's `on_enter()`.

    Without this, the greeting/relayed message was spoken the instant the
    agent joined the room, while the phone was often still just ringing
    (ringback tone, no one listening yet), so the other person missed the
    start of it. `post_answer_delay` gives them a beat after pickup to
    actually get the phone to their ear before the agent starts talking.

    Returns True only once pickup is genuinely confirmed (and
    `post_answer_delay` has elapsed) — False for every other case: no SIP
    identity/room available, the participant disconnected first, OR the wait
    simply timed out with the call still just ringing. That last case used
    to be conflated with "confirmed answered" here (a real phone can easily
    ring 20-30s+ before voicemail, well past a short answer_timeout) — a
    caller that pressed ahead and spoke as soon as this returned ended up
    greeting a customer who hadn't picked up yet, followed moments later by
    the SIP leg's own genuine no-answer disconnect reporting "call ended" to
    the driver, which looked like the call had barely started ringing before
    being called finished. Callers MUST treat a False return as "pickup was
    never confirmed" and hold off acting like the customer is on the line —
    not as license to proceed anyway.
    """
    sip_identity = (userdata.get("customer_call") or {}).get("sip_identity", "")
    if not sip_identity:
        return False

    try:
        room = get_job_context().room
    except RuntimeError:
        return False

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
            "wait_for_sip_pickup: answer wait failed/timed out — pickup not confirmed",
            exc_info=True,
        )
        return False

    await asyncio.sleep(post_answer_delay)
    return True


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


def _was_answered(participant: rtc.RemoteParticipant) -> bool:
    """True if this SIP leg's own `sip.callStatus` ever reached "active" —
    i.e. the other side genuinely picked up at some point before this
    disconnect, as opposed to still just ringing (declined, no answer,
    voicemail, ring timeout, carrier reject: all of these end the SIP leg
    the same way a real hangup does, but the callee never actually heard
    anything). `participant.attributes` is kept live-synced by the SDK from
    `participant_attributes_changed` events (see wait_for_participant_attribute
    above), so the last-known value is still readable here even though the
    participant is already on its way out."""
    return participant.attributes.get(_SIP_CALL_STATUS_ATTR) == _SIP_CALL_STATUS_ACTIVE


def _disconnect_summary(lang: str, mode: str, *, answered: bool) -> str:
    if not answered:
        # Never actually reached "active" — this is a failed/unanswered dial
        # (declined, no answer, voicemail, ring timeout), NOT a real hangup.
        # Reporting this to the driver as "khách cúp máy" implied a
        # conversation happened and the customer ended it, which is
        # misleading when in fact nobody ever picked up.
        if mode == "bridge":
            return (
                "Could not reach the customer — no answer. Bridge call cancelled."
                if lang == "en"
                else "Không kết nối được với khách — khách không bắt máy. Cuộc gọi kết nối trực tiếp đã hủy."
            )
        if mode == "background":
            return (
                "Could not reach the customer — no answer or the call was declined."
                if lang == "en"
                else "Không gọi được cho khách — khách không bắt máy hoặc đã từ chối cuộc gọi."
            )
        return (
            "Could not reach the customer before the conversation began."
            if lang == "en"
            else "Không kết nối được với khách trước khi cuộc trò chuyện bắt đầu."
        )

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
    # _handback_in_progress alone only guards against two OVERLAPPING calls —
    # it resets to False once the first one finishes, so a second, later
    # caller (e.g. the SIP disconnect watcher and the SilenceTracker timeout
    # both firing for the same hangup within the same second) still sails
    # through and redundantly re-runs the whole thing: pushes the same
    # summary to the driver's room a second time, then fails its own
    # disconnect/delete_room calls against a room that's already gone
    # (confirmed in production — back-to-back identical "Cuộc gọi nền đã kết
    # thúc..." announcements, followed by 404s tearing down an already-torn-
    # down room). This flag persists across separate calls, not just
    # concurrent ones.
    if userdata.get("_isolated_call_done"):
        return
    if userdata.get("_handback_in_progress"):
        return
    userdata["_handback_in_progress"] = True
    userdata["_isolated_call_done"] = True
    try:
        driver_phone = userdata.get("driver_phone", "")
        call_id = (userdata.get("customer_call") or {}).get("call_id", "")

        # Prefer the real, transcript-based summary over the generic
        # disconnect-reason text above whenever the customer actually said
        # something before hanging up — a bare "khách cúp máy" tells the
        # driver nothing about what was discussed. Persist it now and read it
        # straight back via this exact call_id, same reasoning as
        # customer_call_tools.py::_finish_isolated_call: the driver should
        # only ever hear something verifiably already saved under this call,
        # not a value that might not match what's actually in
        # local-driver-assistant-call-records.
        conv_service = userdata.get("_conv_service")
        if userdata.get("_customer_spoke") and conv_service is not None:
            try:
                generated = await conv_service.finish_and_get_summary()
                if generated:
                    summary = generated
            except Exception:
                logger.error(
                    "finish_and_get_summary failed — using disconnect-reason summary",
                    exc_info=True,
                )

        await backend_api.complete_background_call(driver_phone, call_id, summary)

        if driver_phone and call_id:
            try:
                confirmed = await backend_api.get_latest_call_record(driver_phone)
                if confirmed.get("call_id") == call_id and confirmed.get("summary"):
                    summary = confirmed["summary"]
            except Exception:
                logger.warning(
                    "failed to confirm persisted summary via cache/call_id lookup — "
                    "using the disconnect-reason summary instead",
                    exc_info=True,
                )

        # Proactively tell the driver's own room the result, right after
        # marking it complete — the driver doesn't have to ask "tóm tắt cuộc
        # gọi" first.
        await notify_driver_of_background_call_result(userdata, summary)
        # Explicitly hang up the SIP leg — delete_room alone was relied on to
        # tear this down, but LiveKit's telephony dashboard has shown the SIP
        # call session still ACTIVE after this ran (room gone, backend
        # marked completed, driver already told "cuộc gọi đã kết thúc", but
        # the actual phone call kept going). remove_participant targets the
        # SIP leg directly instead of hoping room deletion cascades to it;
        # harmless if the participant is already gone (e.g. this ran from the
        # participant_disconnected watcher itself).
        await disconnect_sip_participant(userdata)
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
            summary = _disconnect_summary(lang, "background", answered=_was_answered(participant))
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
        answered = _was_answered(participant)
        summary = _disconnect_summary(lang, mode, answered=answered)
        logger.info(
            "customer SIP disconnected | identity=%s mode=%s answered=%s",
            participant.identity,
            mode,
            answered,
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
        if _was_answered(participant):
            summary = (
                "Driver hung up. Bridge call ended."
                if lang == "en"
                else "Tài xế đã cúp máy. Cuộc gọi kết nối trực tiếp đã kết thúc."
            )
        else:
            summary = (
                "Could not reach the driver — no answer. Bridge call cancelled."
                if lang == "en"
                else "Không kết nối được với tài xế — tài xế không bắt máy. Cuộc gọi kết nối trực tiếp đã hủy."
            )
        logger.info("driver SIP disconnected | identity=%s answered=%s", participant.identity, _was_answered(participant))

        _run_logged(
            handback_to_customer(
                session,
                userdata,
                summary,
                silence_tracker=silence_tracker,
            ),
            name="handback_to_customer",
        )
