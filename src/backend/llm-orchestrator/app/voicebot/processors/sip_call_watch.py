"""Auto handback when the SIP customer participant leaves the LiveKit room."""
from __future__ import annotations

import asyncio
import logging
import time
from typing import TYPE_CHECKING

from livekit import api, rtc
from livekit.agents import AgentSession
from livekit.agents.job import get_job_context

from app.services import backend_api
from app.devlog import event as dev_event
from app.voicebot.processors.handback import (
    disconnect_sip_participant,
    handback_to_customer,
    handback_to_driver,
    notify_driver_of_background_call_result,
)

if TYPE_CHECKING:
    from app.services.silence_tracker import SilenceTracker

logger = logging.getLogger("llm-orchestrator.processors.sip_call_watch")

# Same attribute LiveKit's own AMD (Answering Machine Detection) feature uses
# to tell a SIP leg has actually been picked up vs. still ringing (ringback/
# early media) — see livekit.agents.voice.amd.detector._SIP_CALL_STATUS_ATTR.
_SIP_CALL_STATUS_ATTR = "sip.callStatus"
_SIP_CALL_STATUS_ACTIVE = "active"
# Beat after sip.callStatus=active so the callee can get the phone to their
# ear. Must stay well under 1s — stacking another 3s wait in CustomerCallAgent
# used to make outbound calls sit silent ~6s after pickup.
_DEFAULT_POST_ANSWER_DELAY = 0.6
# Max ring time before treating the dial as unanswered — matches
# wait_for_sip_pickup's default answer_timeout and product ask (~20s).
DEFAULT_RING_TIMEOUT_SECONDS = 20.0


async def wait_for_participant_attribute(
    room: rtc.Room,
    *,
    identity: str,
    attribute: str,
    value: str,
) -> None:
    """Wait until a remote participant attribute equals ``value``.

    Mirrors livekit-agents >=1.6 helper — our env may still pin 1.5.x.
    """
    if not room.isconnected():
        raise RuntimeError("room is not connected")
    if identity not in room.remote_participants:
        raise RuntimeError(f"participant {identity!r} is not in the room")

    fut: asyncio.Future[None] = asyncio.get_running_loop().create_future()

    def _is_match(p: rtc.Participant) -> bool:
        return (
            isinstance(p, rtc.RemoteParticipant)
            and p.identity == identity
            and p.attributes.get(attribute) == value
        )

    def _on_attributes_changed(_changed: list[str], p: rtc.Participant) -> None:
        if _is_match(p) and not fut.done():
            fut.set_result(None)

    def _on_participant_disconnected(p: rtc.RemoteParticipant) -> None:
        if p.identity == identity and not fut.done():
            fut.set_exception(
                RuntimeError(
                    f"participant {identity!r} disconnected while waiting for {attribute}"
                )
            )

    def _on_connection_state_changed(state: int) -> None:
        if state == rtc.ConnectionState.CONN_DISCONNECTED and not fut.done():
            fut.set_exception(
                RuntimeError(
                    f"room disconnected while waiting for {identity!r} {attribute}"
                )
            )

    room.on("participant_attributes_changed", _on_attributes_changed)
    room.on("participant_disconnected", _on_participant_disconnected)
    room.on("connection_state_changed", _on_connection_state_changed)

    try:
        existing = room.remote_participants.get(identity)
        if existing is None:
            raise RuntimeError(f"participant {identity!r} is not in the room")
        if existing.attributes.get(attribute) == value:
            return
        await fut
    finally:
        room.off("participant_attributes_changed", _on_attributes_changed)
        room.off("participant_disconnected", _on_participant_disconnected)
        room.off("connection_state_changed", _on_connection_state_changed)


def sip_identity_of(userdata: dict) -> str:
    """Dialed SIP participant id — customer_call first, then driver outbound."""
    return str(
        (userdata.get("customer_call") or {}).get("sip_identity")
        or userdata.get("sip_identity")
        or ""
    ).strip()


_DEFAULT_IN_APP_AUDIO_DELAY = 0.25
# Slow mobile connects (ICE over cellular) measured up to ~11 s.
_DEFAULT_DRIVER_JOIN_TIMEOUT = 20.0


def _has_remote_listener(room) -> bool:
    """True once someone other than an agent is in the room."""
    try:
        participants = list(room.remote_participants.values())
    except Exception:
        return True  # can't tell — don't block speech on it
    return any(
        not str(getattr(p, "identity", "") or "").startswith("agent-")
        for p in participants
    )


async def _wait_for_driver_participant(session: AgentSession, *, timeout: float) -> None:
    userdata = getattr(session, "userdata", None) or {}
    job_ctx = userdata.get("_job_ctx") if isinstance(userdata, dict) else None
    room = getattr(job_ctx, "room", None)
    if room is None or timeout <= 0:
        return
    deadline = time.monotonic() + timeout
    while not _has_remote_listener(room):
        if time.monotonic() >= deadline:
            logger.warning("driver did not join within %.1fs — speaking anyway", timeout)
            return
        await asyncio.sleep(0.1)


async def wait_for_in_app_audio_ready(
    session: AgentSession,
    *,
    timeout: float = 5.0,
    participant_timeout: float = _DEFAULT_DRIVER_JOIN_TIMEOUT,
    post_ready_delay: float = _DEFAULT_IN_APP_AUDIO_DELAY,
) -> None:
    """Wait until RoomIO output is wired so in-app TTS reaches the mobile client.

    Also waits for the driver's own participant: a nudge-opened room (new trip
    offer) gets its agent dispatched before the phone has joined. Live
    2026-10-18: the app took 10.8 s to connect and the offer was spoken 6 s
    before it arrived — the driver heard nothing and saw no transcript.

    Live 2026-08-30: DriverAgent.on_enter() runs during session.start(), before
    RoomIO attaches. The connect filler TTS finished into an empty pipe; drivers
    only heard the later prefetch prompt (or silence).
    """
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if (
            getattr(session, "agent_state", None) == "listening"
            and getattr(session, "room_io", None) is not None
        ):
            break
        await asyncio.sleep(0.05)
    else:
        logger.warning(
            "in-app audio ready wait timed out after %.1fs — speaking anyway",
            timeout,
        )
    await _wait_for_driver_participant(session, timeout=participant_timeout)
    if post_ready_delay > 0:
        await asyncio.sleep(post_ready_delay)


async def speak_after_sip_pickup(session: AgentSession, text: str) -> None:
    """Speak only after audio is actually reachable by the driver.

    SIP outbound: wait for pickup (ringback otherwise eats the greeting).
    In-app WebRTC: wait for RoomIO + listening — on_enter fires mid-start().
    Link RoomIO to the SIP identity so STT/TTS attach to the phone leg.
    """
    userdata = session.userdata
    sip_id = sip_identity_of(userdata)
    if sip_id:
        room_io = getattr(session, "room_io", None)
        if room_io is not None:
            try:
                room_io.set_participant(sip_id)
            except Exception:
                logger.debug("set_participant before SIP pickup failed", exc_info=True)
        answered = await wait_for_sip_pickup(userdata)
        if not answered:
            logger.info("SIP pickup not confirmed — staying silent")
            return
        # Participant may not exist until pickup; retarget again so TTS
        # rides the SIP leg instead of an empty first-participant slot.
        if room_io is not None:
            try:
                room_io.set_participant(sip_id)
            except Exception:
                logger.warning("set_participant after SIP pickup failed", exc_info=True)
    else:
        await wait_for_in_app_audio_ready(session)
    try:
        await session.say(text, allow_interruptions=False)
    except Exception:
        logger.warning("speak_after_sip_pickup say failed", exc_info=True)


async def wait_for_sip_pickup(
    userdata: dict,
    *,
    answer_timeout: float = DEFAULT_RING_TIMEOUT_SECONDS,
    post_answer_delay: float = _DEFAULT_POST_ANSWER_DELAY,
) -> bool:
    """Wait until the dialed party's SIP leg is actually answered before the
    caller speaks — used by BridgeCallAgent/CustomerCallAgent's `on_enter()`.

    Without this, the greeting/relayed message was spoken the instant the
    agent joined the room, while the phone was often still just ringing
    (ringback tone, no one listening yet), so the other person missed the
    start of it.     `post_answer_delay` (default 0.6s) gives them a beat after pickup to
    actually get the phone to their ear before the agent starts talking.
    Do not add a second sleep in CustomerCallAgent — that stacked to ~6s of
    dead air after the customer had already answered.

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

    On success, sets ``userdata["_sip_leg_answered"]=True`` so later hangup
    summaries still know pickup happened even when LiveKit clears
    ``sip.callStatus`` before ``participant_disconnected`` (live 2026-09-05:
    agent pickup ok → transfer_to_driver → disconnect reported answered=False
    → driver heard "khách không bắt máy").
    """
    if userdata.get("_sip_leg_answered"):
        return True

    sip_identity = sip_identity_of(userdata)
    if not sip_identity:
        return False

    try:
        room = get_job_context().room
    except RuntimeError:
        return False

    started_at = time.perf_counter()
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
        dev_event(
            "sip_pickup",
            ok=False,
            duration_ms=(time.perf_counter() - started_at) * 1000,
            error="timeout_or_missing",
        )
        return False

    if post_answer_delay > 0:
        await asyncio.sleep(post_answer_delay)
    userdata["_sip_leg_answered"] = True
    dev_event(
        "sip_pickup",
        ok=True,
        duration_ms=(time.perf_counter() - started_at) * 1000,
        post_answer_delay_ms=post_answer_delay * 1000,
    )
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


def call_leg_was_answered(userdata: dict, participant: rtc.RemoteParticipant) -> bool:
    """Prefer live attribute, then sticky pickup flag from wait_for_sip_pickup.

    Hangup often clears ``sip.callStatus`` before our disconnect handler runs,
    so attribute-only checks falsely report unanswered after a real conversation.
    """
    if _was_answered(participant):
        return True
    return bool(
        userdata.get("_sip_leg_answered")
        or userdata.get("_agent_call_answered")
        or userdata.get("_isolated_call_answered")
    )


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
            "The customer didn't pick up. You can wait a little or ask me to call again."
            if lang == "en"
            else "Khách chưa bắt máy. Bạn chờ thêm chút hoặc nhờ mình gọi lại nhé."
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


async def complete_isolated_call(
    session: AgentSession, userdata: dict, summary: str, *, notify_driver: bool = True,
) -> None:
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
    if userdata.get("_redial_pending"):
        # A no-answer redial is waiting out its delay in this job; deleting the
        # room now would kill it. _background_no_answer finishes the call itself.
        logger.info("complete_isolated_call skipped | redial pending")
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
        if notify_driver:
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


def cancel_no_answer_watch(userdata: dict) -> None:
    task = userdata.pop("_no_answer_watch_task", None)
    if task and not task.done():
        task.cancel()


def _pickup_confirmed(userdata: dict) -> bool:
    return bool(
        userdata.get("_customer_spoke")
        or userdata.get("_isolated_call_answered")
        or userdata.get("_agent_call_answered")
    )


async def teardown_unanswered_call(session: AgentSession, userdata: dict) -> None:
    """Hang up + mark complete when nobody picked up within the ring window.

    Without this, wait_for_sip_pickup timing out only made the agent stay
    silent while trip-service kept status=in_progress — the driver kept
    hearing "AI vẫn đang gọi khách" even with no audio on the line.
    """
    if userdata.get("_isolated_call_done") or userdata.get("_handback_in_progress"):
        return
    if _pickup_confirmed(userdata):
        return
    if not userdata.get("isolated_call") and not (
        userdata.get("customer_call_active") or userdata.get("bridge_call_active")
    ):
        # Already over (e.g. the driver pressed Huỷ cuộc gọi): a second
        # handback said "Khách chưa bắt máy" right after "Mình đã dừng cuộc gọi".
        logger.info("teardown_unanswered_call | call already ended — skipped")
        return

    cancel_no_answer_watch(userdata)

    lang = userdata.get("lang", "vn")
    call_meta = userdata.get("customer_call") or {}
    mode = call_meta.get("mode", "agent")
    silence_tracker: SilenceTracker | None = userdata.get("_silence_tracker")

    await disconnect_sip_participant(userdata)

    if userdata.get("isolated_call") or mode == "background":
        await _background_no_answer(session, userdata, lang)
        return

    if userdata.get("bridge_call_active") or mode == "bridge":
        from app.voicebot.processors.handback import cancel_bridge_timeout, handback_to_driver

        cancel_bridge_timeout(userdata)
        summary = _disconnect_summary(lang, "bridge", answered=False)
        await handback_to_driver(
            session, userdata, summary, mode="bridge", silence_tracker=silence_tracker,
        )
        dev_event("call_no_answer", ok=True, mode="bridge")
        return

    if userdata.get("customer_call_active") or mode == "agent":
        from app.voicebot.processors.agent_call_silence import cancel_agent_call_silence_watch
        from app.voicebot.processors.handback import handback_to_driver

        cancel_agent_call_silence_watch(userdata)
        summary = _disconnect_summary(lang, "agent", answered=False)
        await handback_to_driver(
            session, userdata, summary, mode="agent", silence_tracker=silence_tracker,
        )
        dev_event("call_no_answer", ok=True, mode="agent")
        return

    logger.warning("teardown_unanswered_call | no active call flags — skipped")


def _keep_job_alive_until(task: "asyncio.Future") -> None:
    """Have the job's shutdown wait for `task` (no-op outside a LiveKit job)."""
    try:
        from livekit.agents import get_job_context

        ctx = get_job_context()
    except Exception:
        return

    async def _await_task(_reason: str = "") -> None:
        try:
            await task
        except Exception:
            logger.warning("pending redial failed during shutdown", exc_info=True)

    ctx.add_shutdown_callback(_await_task)


async def _background_no_answer(session: AgentSession, userdata: dict, lang: str) -> None:
    """Background call not answered: redial (up to MAX_REDIALS, REDIAL_DELAY_SECONDS
    apart) or, once redials are used up, tell the driver it failed (AVDA-120)."""
    from app.voicebot.processors import no_answer_retry as retry

    if userdata.get("_redial_pending") or userdata.get("_isolated_call_done"):
        return  # watchdog and disconnect watcher can both fire for one no-answer
    cancel_no_answer_watch(userdata)
    call_meta = userdata.get("customer_call") or {}
    name = call_meta.get("customer_name") or ("the customer" if lang == "en" else "khách")
    attempt = retry.next_attempt(int(call_meta.get("retry_attempt") or 0))
    if attempt is None:
        await complete_isolated_call(session, userdata, retry.final_notice(lang, name))
        dev_event("call_no_answer", ok=True, mode="background", redials_exhausted=True)
        return

    # Tell the driver now, close this attempt's record and SIP leg, keep the
    # job alive through the delay, then dial again in a fresh room.
    userdata["_redial_pending"] = True
    try:
        await notify_driver_of_background_call_result(userdata, retry.redial_notice(lang, name, attempt))
        await disconnect_sip_participant(userdata)
        # The redial waits REDIAL_DELAY_SECONDS inside this job, but the job
        # can be shut down long before that: once the SIP leg is gone the
        # room empties, LiveKit closes it ~20 s later, and the process exits
        # (live 2026-10-18: redial 2/2 was silently lost 2 s after the room
        # closed). Run it as its own task, shielded from this coroutine's
        # cancellation, and make job shutdown wait for it (see
        # shutdown_process_timeout in app/main.py).
        redial_task = asyncio.ensure_future(retry.redial_after_delay(call_meta, attempt))
        _keep_job_alive_until(redial_task)
        dialled = await asyncio.shield(redial_task)
    finally:
        userdata["_redial_pending"] = False
    if dialled is None:  # trip cancelled / finished / customer on board meanwhile
        await complete_isolated_call(session, userdata, retry.redial_skipped_notice(lang, name), notify_driver=False)
        dev_event("call_no_answer", ok=True, mode="background", redial=attempt, redial_skipped=True)
        return
    summary = retry.redial_notice(lang, name, attempt) if dialled else retry.redial_failed_notice(lang, name)
    await complete_isolated_call(session, userdata, summary, notify_driver=not dialled)
    dev_event("call_no_answer", ok=True, mode="background", redial=attempt, redialled=dialled)


def schedule_no_answer_watch(
    session: AgentSession,
    userdata: dict,
    *,
    timeout: float = DEFAULT_RING_TIMEOUT_SECONDS,
) -> None:
    """Start a hard backstop from dial time — ends the call if still unanswered."""
    cancel_no_answer_watch(userdata)
    dial_at = userdata.get("_dial_started_at")
    if dial_at is None:
        dial_at = time.time()
        userdata["_dial_started_at"] = dial_at
    delay = max(0.0, timeout - (time.time() - dial_at))

    async def _worker() -> None:
        try:
            await asyncio.sleep(delay)
            await teardown_unanswered_call(session, userdata)
        except asyncio.CancelledError:
            return

    userdata["_no_answer_watch_task"] = asyncio.create_task(_worker(), name="no_answer_watch")
    logger.info("no-answer watch scheduled | delay=%.1fs", delay)


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
            answered = call_leg_was_answered(userdata, participant)
            if not answered and not _pickup_confirmed(userdata):
                # Carrier ended the ringing leg before our ring timeout: same
                # no-answer handling (redial policy) as the watchdog.
                _run_logged(_background_no_answer(session, userdata, lang), name="background_no_answer")
                return
            summary = _disconnect_summary(lang, "background", answered=answered)
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
        answered = call_leg_was_answered(userdata, participant)
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
        answered = call_leg_was_answered(userdata, participant)
        if answered:
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
        logger.info(
            "driver SIP disconnected | identity=%s answered=%s",
            participant.identity,
            answered,
        )

        _run_logged(
            handback_to_customer(
                session,
                userdata,
                summary,
                silence_tracker=silence_tracker,
            ),
            name="handback_to_customer",
        )
