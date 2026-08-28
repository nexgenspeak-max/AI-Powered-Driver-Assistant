"""Tools used by CustomerCallAgent during customer calls."""
import asyncio
import logging
import time

from livekit import api
from livekit.agents import Agent, RunContext, function_tool
from livekit.agents.job import get_job_context

from app.services import backend_api
from app.voicebot.processors.handback import (
    build_driver_agent,
    disconnect_sip_participant,
    notify_driver_of_background_call_result,
    restore_room_participant,
    restore_session_audio,
    store_call_summary,
)

logger = logging.getLogger("voice-agent.tools.customer_call")

# Grace period between the AI's closing line and actually hanging up, once the
# customer has confirmed they have nothing more to say — ending the call the
# instant end_customer_call was invoked used to cut the customer off
# mid-goodbye (or hang up on them with zero warning). Mirrors the same
# await-before-acting pattern already used for pre-dial announcements
# (customer_call.py/custom_call.py) and post-pickup delays (sip_call_watch.py).
_HANGUP_GRACE_SECONDS = 5.0


def _closing_line(lang: str) -> str:
    return "Vâng, cảm ơn anh/chị nhé, tạm biệt ạ." if lang != "en" else "Alright, thank you, goodbye!"


async def _customer_still_on_line(userdata: dict) -> bool:
    """True if the dialed party's SIP leg is still actually in the room —
    skip the goodbye/grace-period entirely if they already hung up
    themselves, since there's nobody left to hear it or wait for."""
    sip_identity = (userdata.get("customer_call") or {}).get("sip_identity", "")
    if not sip_identity:
        return False
    try:
        room = get_job_context().room
    except RuntimeError:
        return False
    return sip_identity in room.remote_participants


async def _say_goodbye_and_wait(context: RunContext, lang: str) -> None:
    """Speak a brief closing line and give the customer a moment before the
    call actually ends — only if they're still connected (see
    _customer_still_on_line)."""
    if not await _customer_still_on_line(context.userdata):
        return
    try:
        await context.session.say(_closing_line(lang), allow_interruptions=False)
    except Exception:
        logger.warning("failed to speak closing goodbye", exc_info=True)
    await asyncio.sleep(_HANGUP_GRACE_SECONDS)


# Background (isolated) calls: the LLM is instructed via prompt to wait for
# <speech_not_detected> before concluding "no answer", but that is a soft
# instruction the model does not reliably follow (confirmed in production —
# calls ending after ~1s with zero customer turns). This is the hard,
# deterministic backstop: refuse to end the call this early unless the
# customer has actually said something at least once.
_MIN_ISOLATED_CALL_SECONDS = 20.0

# Same problem, once the customer HAS spoken at least once (the check above
# no longer applies past that point): the prompt requires asking "do you
# have any question or anything to relay to the driver" before ending
# normally (build_customer_call_prompt's REQUIRED-before-ending line), but
# that too is a soft instruction — confirmed in production for a proximity
# notify call: the customer acknowledged the message ("dạ vâng"), and the
# LLM called end_customer_call right after, on its own initiative, without
# ever asking the closing question or giving the customer a chance to leave
# one. Per explicit product requirement: never end an isolated call on the
# LLM's own initiative until at least this many silent seconds have passed
# since the AI itself last stopped talking — so it's structurally forced to
# sit through the customer's answer (or their silence) to whatever it just
# asked, rather than hanging up the instant it decides it's done.
# Kept equal to the custcall SilenceTracker threshold (session.py's
# `silence_seconds` for mode=="custcall"): past this same 10s of post-answer
# silence the tracker ends the call deterministically anyway (with a goodbye),
# so there's no window where the LLM is blocked here but nothing else acts.
# `customer_confirmed_done=True` bypasses this wait entirely.
_MIN_ISOLATED_QUIET_SECONDS = 10.0

# Same problem, agent-mode calls (dialed into the driver's own room, driver
# listens live) — confirmed in production: the call was reported "done"
# (end_customer_call called) within ~1-2s of dialing, before the driver's
# own message to the customer was even spoken, let alone before the
# customer said a word. Unlike isolated calls this branch had NO backstop
# at all. Per explicit product requirement: never end an agent-mode call on
# the LLM's own initiative until either the customer has said something, or
# this many silent seconds have passed since the call actually connected.
_MIN_AGENT_CALL_SECONDS = 10.0


async def _finish_isolated_call(context: RunContext, summary: str) -> str:
    driver_phone = context.userdata.get("driver_phone", "")
    call_meta = context.userdata.get("customer_call") or {}
    call_id = call_meta.get("call_id", "")

    # Shared with sip_call_watch.py's complete_isolated_call — this function
    # disconnects the SIP participant itself a few lines below, which fires
    # the room's own `participant_disconnected` watcher right afterward.
    # Without marking the call done HERE too, that watcher doesn't know this
    # path already wrapped the call up and runs complete_isolated_call all
    # over again, pushing a second ("khách cúp máy") notification to the
    # driver right after this one.
    context.userdata["_isolated_call_done"] = True

    # Never trust the LLM's own `summary` argument for what the driver hears
    # — confirmed in production: it handed this function "Khách không nghe
    # máy" (customer didn't answer) moments after a real, successful 58s
    # conversation, because it got confused by the trailing silence-check
    # nudge. Generate + persist the real, transcript-based summary now
    # (before anything is said), then read it straight back through the
    # exact same call_id-via-cache path "tóm tắt cuộc gọi" itself uses — the
    # driver should only ever be told something that's verifiably already in
    # local-driver-assistant-call-records under this call, never a value
    # that might not match (or might not exist at all) if the save silently
    # failed.
    conv_service = context.userdata.get("_conv_service")
    if conv_service is not None:
        try:
            generated = await conv_service.finish_and_get_summary()
            if generated:
                summary = generated
        except Exception:
            logger.error("finish_and_get_summary failed — falling back to LLM-provided summary", exc_info=True)

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

        try:
            confirmed = await backend_api.get_latest_call_record(driver_phone)
            if confirmed.get("call_id") == call_id and confirmed.get("summary"):
                summary = confirmed["summary"]
        except Exception:
            logger.warning(
                "failed to confirm persisted summary via cache/call_id lookup — "
                "using the locally-generated one instead",
                exc_info=True,
            )
    else:
        logger.warning(
            "complete_background_call skipped | driver_phone=%r call_id=%r",
            driver_phone,
            call_id,
        )

    # Proactively tell the driver's own room the result — the driver doesn't
    # have to ask "tóm tắt cuộc gọi" first.
    await notify_driver_of_background_call_result(context.userdata, summary)

    # Explicitly hang up the SIP leg — relying on delete_room alone has shown
    # the SIP call session still ACTIVE on LiveKit's own telephony dashboard
    # after this ran (room gone, backend marked completed, driver already
    # told the call ended, but the actual phone call kept going).
    await disconnect_sip_participant(context.userdata)
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
        "Call when the conversation is finished or the customer hung up. "
        "Set customer_confirmed_done=true when you have ALREADY asked the customer once whether "
        "they have any question or anything to pass to the driver AND they answered that they "
        "have nothing — in that case the call ends right away (a brief thank-you + goodbye, then "
        "hang up), with NO waiting period and NO asking the closing question again. Leave it "
        "false otherwise. "
        "For an agent-mode call (customer dialed into the driver's room): do NOT call this "
        "until you have delivered whatever the driver asked you to convey AND the customer has "
        "confirmed they have no more questions, OR the customer hasn't said anything for a "
        "while — this tool will refuse and tell you how long to keep waiting if you try too "
        "early."
    ),
)
async def end_customer_call(
    context: RunContext, summary: str, customer_confirmed_done: bool = False
):
    if context.userdata.get("isolated_call"):
        if not context.userdata.get("_customer_spoke"):
            elapsed = time.time() - context.userdata.get("_call_started_at", 0.0)
            if elapsed < _MIN_ISOLATED_CALL_SECONDS:
                logger.info(
                    "end_customer_call refused | isolated=True customer_spoke=False elapsed=%.1fs "
                    "attempted_summary=%s",
                    elapsed,
                    summary[:120],
                )
                return (
                    "Refused: the customer has not said a single word yet and the call has only "
                    f"been connecting for {elapsed:.0f}s — dialing/ringing is not finished. Do NOT "
                    "conclude the customer did not answer on your own. Wait silently; only call "
                    "end_customer_call again after the customer actually speaks, or after you "
                    "receive the <speech_not_detected> signal 2-3 times."
                )
        elif not customer_confirmed_done:
            # customer_confirmed_done=True short-circuits the quiet-time wait:
            # the customer has already told us (in answer to the closing
            # question) that they have nothing more — making them sit through
            # another silence gap, or re-asking the same question, is exactly
            # the "lặp nhiều câu hỏi trong khi khách không cần gì nữa" the
            # driver asked us to stop doing.
            quiet_since = context.userdata.get("_isolated_call_quiet_since")
            elapsed = (time.time() - quiet_since) if quiet_since else 0.0
            if elapsed < _MIN_ISOLATED_QUIET_SECONDS:
                logger.info(
                    "end_customer_call refused | isolated=True customer_spoke=True "
                    "confirmed_done=False quiet_elapsed=%.1fs attempted_summary=%s",
                    elapsed,
                    summary[:120],
                )
                return (
                    "Refused: ask the customer ONCE whether they have any question or anything "
                    "they'd like to pass along to the driver, and give them a chance to answer. "
                    "If you have NOT asked that yet, ask it now. If you ALREADY asked and the "
                    "customer said they have nothing more, call end_customer_call again "
                    "immediately with customer_confirmed_done=true — do NOT ask the same "
                    f"question a second time. (Only {elapsed:.0f}s of silence so far.)"
                )
        try:
            await _say_goodbye_and_wait(context, context.userdata.get("lang", "vn"))
            await _finish_isolated_call(context, summary)
        except Exception:
            logger.error("end_customer_call (isolated) failed", exc_info=True)
            raise
        return f"Background call completed. Summary: {summary}"

    call_meta = context.userdata.get("customer_call") or {}
    if call_meta.get("mode") == "agent" and not context.userdata.get("_customer_spoke"):
        # _agent_call_quiet_since (session.py's agent_state_changed handler)
        # is the moment the AI last stopped talking, gated to only start
        # counting after real pickup (never during ring/dial) — so this
        # elapsed value already excludes both ring time and the AI's own
        # speaking time, counting ONLY genuine silence from the customer's
        # side, per explicit product requirement.
        quiet_since = context.userdata.get("_agent_call_quiet_since")
        elapsed = (time.time() - quiet_since) if quiet_since else 0.0
        if elapsed < _MIN_AGENT_CALL_SECONDS:
            logger.info(
                "end_customer_call refused | mode=agent customer_spoke=False quiet_elapsed=%.1fs "
                "attempted_summary=%s",
                elapsed,
                summary[:120],
            )
            return (
                "Refused: the customer has not said a word yet and it's only been "
                f"{elapsed:.0f}s of actual silence since you last finished speaking (ringing "
                "time and your own speaking time don't count toward this). Do NOT conclude the "
                "call is done or the customer isn't responding this early. If you haven't "
                "delivered the driver's message yet, do that now. Otherwise wait silently; only "
                "call end_customer_call again once the customer actually speaks, or once at "
                f"least {_MIN_AGENT_CALL_SECONDS:.0f}s of real silence have passed since you "
                "stopped talking."
            )

    lang = context.userdata.get("lang", "vn")
    try:
        await store_call_summary(context.userdata, summary, mode="agent")
        context.userdata["customer_call_active"] = False
        context.userdata["bridge_call_active"] = False
        await _say_goodbye_and_wait(context, lang)
        restore_session_audio(context.session)
        restore_room_participant(context.session, context.userdata)
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
