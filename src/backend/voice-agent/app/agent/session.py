"""
LiveKit session layer — transport and session lifecycle ONLY.
No business logic here; everything delegates to the appropriate Agent subclass.

Room name conventions (set by trip-service):
  driver-{phone}-{unix_ts}    → DriverAgent  (inbound: driver opens app)
  customer-{phone}-{unix_ts}  → CustomerAgent (customer support)
  trip-{trip_id_prefix}       → DriverAgent  (outbound SIP: system calls driver)
  custcall-{trip_prefix}-{ts} → CustomerCallAgent (background AI→customer call)
"""
import asyncio
import json
import logging
import re
import time
import traceback
from typing import Literal

from livekit.agents import AgentSession, JobContext, JobProcess, RoomInputOptions, RoomOutputOptions
from livekit.plugins import silero
from livekit.agents.llm import ChatMessage
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from app.config.settings import get_settings
from app.providers import get_stt, get_llm, get_tts
from app.voicebot import get_voicebot
from app.voicebot.processors import prefetch as prefetch_processor
from app.voicebot.processors import context_store
from app.voicebot.processors.call_state import CallAwareUserData
from app.voicebot.processors.agent_state import publish_agent_state
from app.voicebot.processors.handback import BACKGROUND_CALL_SUMMARY_TOPIC
from app.voicebot.processors.sip_call_watch import (
    complete_isolated_call,
    register_customer_room_sip_watchers,
    register_sip_call_watchers,
)
from app.voicebot.customer_call_agent import CustomerCallAgent
from app.services.conversation_service import ConversationService
from app.services.silence_tracker import SilenceTracker

logger = logging.getLogger("voice-agent.session")

# ── Room name patterns ─────────────────────────────────────────────────────────
_DRIVER_RE   = re.compile(r"^driver-(\d+)-\d+$")    # driver-84867347452-1748700000
_CUSTOMER_RE = re.compile(r"^customer-(\d+)-\d+$")  # customer-84901234567-1748700000
_TRIP_RE     = re.compile(r"^trip-[a-z0-9]+$")      # trip-abc12345  (SIP outbound)
_CUSTCALL_RE = re.compile(r"^custcall-[a-z0-9]+-\d+$")  # background customer call

RoomMode = Literal["driver", "customer", "outbound", "custcall"]


def _parse_room(room_name: str) -> tuple[RoomMode, str]:
    """
    Returns (mode, phone_or_empty).

    mode:
      "driver"   — inbound driver session; phone = driver phone digits
      "customer" — customer support session; phone = customer phone digits
      "outbound" — SIP outbound call, trip data comes from room.metadata
    """
    m = _DRIVER_RE.match(room_name)
    if m:
        return "driver", m.group(1)

    m = _CUSTOMER_RE.match(room_name)
    if m:
        return "customer", m.group(1)

    if _TRIP_RE.match(room_name):
        return "outbound", ""

    if _CUSTCALL_RE.match(room_name):
        return "custcall", ""

    # Fallback: try splitting on "-" for ad-hoc room names
    parts = room_name.split("-")
    phone = parts[1] if len(parts) > 1 and parts[1].isdigit() else ""
    return "driver", phone


# ── Noise cancellation (optional plugin) ──────────────────────────────────────
try:
    from livekit.plugins import noise_cancellation as _nc
    _NOISE_CANCEL = _nc.BVCTelephony()
    logger.info("BVCTelephony noise cancellation loaded")
except Exception as _nc_err:
    _NOISE_CANCEL = None
    logger.warning("noise_cancellation unavailable (%s) — continuing without it", _nc_err)


# ── Prewarm ────────────────────────────────────────────────────────────────────

def prewarm(proc: JobProcess) -> None:
    from app.config.logging import setup_logging
    setup_logging()
    proc.userdata["vad"] = silero.VAD.load()


# ── Entrypoint ─────────────────────────────────────────────────────────────────

async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()
    room_name = ctx.room.name
    logger.info("connected | room=%s", room_name)

    mode, phone = _parse_room(room_name)
    logger.info("room_mode=%s phone=%r", mode, phone)

    # ── Resolve trip metadata ───────────────────────────────────────────────
    trip: dict | None = None
    lang = "vn"
    if mode == "custcall":
        try:
            meta = json.loads(ctx.room.metadata or "{}")
            lang = meta.get("lang", "vn")
            trip = {
                "trip_id":         meta.get("trip_id", ""),
                "customer_name":   meta.get("customer_name", ""),
                "pickup_address":  meta.get("pickup_address", ""),
                "customer_phone":  meta.get("customer_phone", ""),
                "custom_message":  meta.get("custom_message", ""),
            }
            phone = meta.get("driver_phone", "").replace("+", "").replace(" ", "")
            logger.info("custcall room | trip_id=%s driver=%s", trip.get("trip_id"), phone)
        except Exception:
            phone = ""
    elif mode in ("driver", "outbound"):
        try:
            meta = json.loads(ctx.room.metadata or "{}")
            if meta.get("trip_id"):
                trip = meta
                # For SIP outbound rooms, driver phone is in metadata
                if mode == "outbound" and not phone:
                    raw = meta.get("driver_phone", "")
                    phone = raw.replace("+", "")
                    mode = "driver"  # treat as driver outbound
                logger.info("trip found | trip_id=%s driver=%s", trip["trip_id"], phone)
            lang = meta.get("lang", "vn")
        except Exception:
            pass

    conv_service = ConversationService(ctx)
    silence_tracker: SilenceTracker | None = None
    settings = get_settings()

    try:
        # Per-session state exposed to tools via context.userdata — a
        # CallAwareUserData (not a plain dict) so that any code path setting
        # *_call_active below auto-publishes the change to the room's data
        # channel; see call_state.py for why.
        session_userdata = CallAwareUserData({
            "driver_phone":           phone if mode not in ("customer",) else "",
            "customer_phone":         phone if mode == "customer" else "",
            "trip":                   trip,
            "pending_cancel_trip_id": None,
            "room_name":              room_name,
            "lang":                   lang,
            # Lets in-room agent/bridge sub-calls (customer_call.py,
            # contact_call.py, custom_call.py) persist their own transcript
            # to call-logger via ConversationService.save_subcall() when
            # they end — see handback.py::store_call_summary, the one point
            # common to every "call ended" path for those modes.
            "_conv_service":          conv_service,
            "customer_call_active":   False,
            "bridge_call_active":     False,
            "background_call_active": False,
            "isolated_call":          mode == "custcall",
            "_silence_tracker":       None,
            "_job_ctx":               ctx,
            "_call_started_at":       time.time(),
            "_customer_spoke":        False,
            # Isolated (custcall) calls only — set True once genuine SIP
            # pickup is confirmed (see wait_for_sip_pickup in
            # CustomerCallAgent._run_isolated_answer_flow). Gates the generic
            # agent_state_changed "idle/listening -> resume" handler below so
            # it can't resume the silence tracker during ring time.
            "_isolated_call_answered": False,
        })

        if mode == "custcall" and trip:
            meta = json.loads(ctx.room.metadata or "{}")
            session_userdata["customer_call"] = {
                "call_id":          meta.get("call_id", ""),
                "trip_id":          trip.get("trip_id", ""),
                "customer_phone":   trip.get("customer_phone", ""),
                "sip_identity":     meta.get("sip_identity", ""),
                "room_name":        room_name,
                "mode":             "background",
                # The driver's own room — see callService.ts's
                # startCustomerCall (background branch) and
                # customer_call.py::start_background_call. Used to push a
                # "background_call_summary" data message back into it once
                # this call ends (sip_call_watch.py::complete_isolated_call,
                # customer_call_tools.py::_finish_isolated_call), so the
                # driver's own agent can announce the result proactively.
                "driver_room_name": meta.get("driver_room_name", ""),
            }

        # MultilingualModel's turn detector doesn't support Vietnamese — logs
        # "Turn detector does not support language vi" on every user turn and,
        # in practice, the pipeline stops picking up further speech after a
        # couple of exchanges. Fall back to VAD-only (Silero) endpointing for
        # "vn", which is language-agnostic and unaffected by this gap.
        session = AgentSession(
            stt=get_stt(),
            llm=get_llm(),
            tts=get_tts(),
            vad=ctx.proc.userdata["vad"],
            turn_detection=MultilingualModel() if lang != "vn" else None,
            userdata=session_userdata,
        )

        # Prefetch BEFORE session.start so tools + greeting have warm context
        if mode == "customer" and phone:
            await prefetch_processor.run_customer(session, phone)
        elif phone:
            await prefetch_processor.run_driver(session, phone)

        # ── Build the right agent for this room ───────────────────────────────
        voicebot = get_voicebot(lang)
        logger.info("voicebot lang=%s module=%s", lang, voicebot.__name__)

        if mode == "custcall":
            agent = CustomerCallAgent(
                lang=lang,
                trip=trip or {},
                customer_name=(trip or {}).get("customer_name", "khách"),
                custom_message=(trip or {}).get("custom_message", ""),
                isolated=True,
            )
            # This is now the ONE rule that ends an isolated call on silence —
            # 5 real seconds of neither the AI nor the customer saying
            # anything. It must NOT start counting from here, though: the
            # isolated job starts dialing+dispatching in parallel (see
            # trip-service callService.ts startCustomerCall), so this clock
            # would otherwise already be running while the phone is still
            # just ringing (LiveKit has no reliable "answered" signal exposed
            # to the agent job here — the SIP participant joins, and can even
            # subscribe a track, while still ringing, per
            # livekit.SIPCallStatus.SCS_PARTICIPANT_JOINED). The tracker is
            # explicitly paused right after being started below and only
            # resumed once CustomerCallAgent's isolated flow confirms actual
            # pickup (see wait_for_sip_pickup in _run_isolated_answer_flow) —
            # so these 5s only ever measure silence in a call that's actually
            # connected, never ring time.
            silence_seconds = 5.0
            max_silences_default = 1
        elif mode == "customer":
            agent = voicebot.CustomerAgent(customer_phone=phone)
            silence_seconds = 20.0   # customers may pause longer
            max_silences_default = 3
        else:
            context_hint = context_store.build_context_hint(
                session_userdata, lang="en" if lang == "en" else "vi"
            )
            agent = voicebot.DriverAgent(
                trip=trip, driver_phone=phone, context_hint=context_hint
            )
            silence_seconds = 15.0   # drivers on the road, faster cut-off
            # One check-in nudge at 15s, then hang up at 30s of total silence
            # — matches how a hands-free wake-word call should feel.
            max_silences_default = 2

        # BVCTelephony is for SIP/phone audio — it can strip speech from mobile WebRTC mics.
        noise_cancel = _NOISE_CANCEL if mode == "outbound" else None

        await session.start(
            agent=agent,
            room=ctx.room,
            room_input_options=RoomInputOptions(
                noise_cancellation=noise_cancel,
                # Agent-mode customer calls retarget RoomIO's linked
                # participant to the dialed-in SIP customer (see
                # customer_call.py::_save_call_context) so the AI can hear
                # them directly. RoomIO's own close_on_disconnect (default
                # True) then closes this ENTIRE AgentSession the instant
                # that linked participant leaves — i.e. whenever the
                # customer hangs up — before our own handback logic
                # (sip_call_watch.py / end_customer_call) gets a chance to
                # restore the link back to the driver, since session.start()
                # (which wires up RoomIO's internal listener) always runs
                # before register_sip_call_watchers() below, so RoomIO's
                # handler always sees the disconnect first. Net effect: the
                # driver's whole connection to the AI died every time a
                # customer hung up on an agent-mode call. Disabled — actual
                # room/job teardown never depended on this anyway, it's
                # driven by ctx.room's own "disconnected" event further
                # down, and background/bridge calls don't rely on this flag
                # either (see the comment there).
                close_on_disconnect=False,
            ),
            room_output_options=RoomOutputOptions(
                transcription_enabled=True,
                # False (not True): with sync_transcription on, the SDK's
                # TranscriptSynchronizer paces text release to match estimated
                # audio playback progress and never released it at all here
                # (chat bubble missing even though the reply was fully heard)
                # — send transcripts as soon as they're available instead.
                sync_transcription=False,
            ),
        )

        # ── Agent-state broadcast (assistant orb animation) ───────────────────
        # Unconditional (not gated by settings.silence_tracker_enabled, unlike
        # the separate agent_state_changed handler further below that drives
        # the silence tracker) — the driver-app orb needs this on every
        # session. See agent_state.py.
        @session.on("agent_state_changed")
        def _on_agent_state_broadcast(ev) -> None:
            publish_agent_state(ev.new_state)

        conv_service.attach(session)

        # ── Silence tracker ───────────────────────────────────────────────────
        if mode == "custcall":
            # Isolated calls are deliberately NOT subject to the global
            # SILENCE_THRESHOLD_SECONDS/SILENCE_MAX_CONSECUTIVE/SILENCE_END_SESSION
            # overrides (or the local/dev end_on_timeout=False dev-convenience
            # override) below, unlike every other mode. Those env vars exist
            # to tune how forgiving the DRIVER's own conversation is (and to
            # stop the simulator from kicking a driver mid-test) — applying
            # them here too silently broke this call's only hang-up backstop:
            # with SILENCE_MAX_CONSECUTIVE=3 the isolated 5s/1-strike default
            # got stretched to 3 rounds (~15s+, with the AI asking "are you
            # there?" into what could already be an empty line), and in
            # local/dev SILENCE_END_SESSION=false / env-based override meant
            # this tracker never actually ended the call on silence at all —
            # so if the customer hung up and the room-level
            # `participant_disconnected` event was ever missed/delayed (SIP
            # trunks don't always propagate BYE as a prompt room leave), the
            # AI had no way left to ever learn the call was over. This is the
            # one place silence detection doubles as hang-up detection (any
            # hang-up necessarily stops producing audio), so it must always
            # actually fire, everywhere.
            threshold = silence_seconds
            max_silences = max_silences_default
            end_on_timeout = True
        else:
            threshold = (
                settings.silence_threshold_seconds
                if settings.silence_threshold_seconds > 0
                else silence_seconds
            )
            max_silences = (
                settings.silence_max_consecutive
                if settings.silence_max_consecutive > 0
                else max_silences_default
            )
            # Local dev / simulator: do not kick participants when there is no mic input.
            end_on_timeout = settings.silence_end_session
            if settings.env in ("local", "dev"):
                end_on_timeout = False

        if settings.silence_tracker_enabled:
            async def _on_isolated_silence_timeout() -> None:
                # Isolated (background) call safety timeout — covers both "never
                # answered" and "answered then went silent". Must go through
                # complete_isolated_call so the driver's "tóm tắt cuộc gọi" query
                # never gets stuck on status=in_progress (previously this path
                # just force-removed participants and shut the job down with no
                # backend call at all).
                #
                # This fires on ANY 5s mutual silence, including right at the
                # natural end of a call that actually happened in full (both
                # sides just went quiet, or the LLM was simply slow to call
                # end_customer_call itself) — using the generic "couldn't
                # reach the customer" message unconditionally here was
                # actively wrong in that case: the driver got told the
                # customer never answered/said anything, even when they'd
                # already answered every question and the AI had confirmed
                # their details. Branch on whether the customer actually
                # spoke (_customer_spoke) and, if so, use the real
                # transcript-based summary (conv_service already buffered
                # every turn) instead of the canned no-contact message.
                if session_userdata.get("_customer_spoke"):
                    try:
                        summary = await conv_service.generate_summary()
                    except Exception:
                        summary = ""
                    if not summary:
                        summary = (
                            "Cuộc gọi với khách đã kết thúc (im lặng kéo dài cuối cuộc gọi)."
                            if lang != "en" else
                            "The call with the customer ended (prolonged silence at the end)."
                        )
                else:
                    summary = (
                        "Không thể trò chuyện với khách (không bắt máy hoặc im lặng kéo dài)."
                        if lang != "en" else
                        "Could not reach the customer (no answer or prolonged silence)."
                    )
                await complete_isolated_call(session, session_userdata, summary)

            silence_tracker = SilenceTracker(
                session=session,
                ctx=ctx,
                silence_threshold_seconds=threshold,
                silence_message="<speech_not_detected>",
                max_consecutive_silences=max_silences,
                end_session_on_timeout=end_on_timeout,
                on_timeout=_on_isolated_silence_timeout if mode == "custcall" else None,
            )

            @session.on("conversation_item_added")
            def _on_conversation_item(ev) -> None:
                item = ev.item
                if isinstance(item, ChatMessage) and item.role == "user" and item.text_content:
                    silence_tracker.reset_silence_timer()
                    session_userdata["_customer_spoke"] = True

            @session.on("user_input_transcribed")
            def _on_user_transcribed(ev) -> None:
                if ev.is_final and ev.transcript.strip():
                    silence_tracker.reset_silence_timer()
                    session_userdata["_customer_spoke"] = True

            @session.on("agent_state_changed")
            def _on_agent_state(ev) -> None:
                if ev.new_state in ("speaking", "thinking"):
                    silence_tracker.pause()
                elif ev.new_state in ("listening", "idle"):
                    ud = session.userdata
                    if ud.get("isolated_call") and not ud.get("_isolated_call_answered"):
                        # Still just ringing (or dialing) — the agent settling
                        # into "listening/idle" here is not the customer
                        # actually being reachable yet, so this generic
                        # auto-resume must not start the 5s silence clock
                        # this early (see the custcall silence_seconds
                        # comment above). wait_for_sip_pickup resumes it
                        # explicitly once pickup is confirmed.
                        return
                    if not ud.get("customer_call_active") and not ud.get("bridge_call_active"):
                        silence_tracker.resume()

            await silence_tracker.start()
            if mode == "custcall":
                # Freeze immediately — see the custcall silence_seconds
                # comment above and the agent_state_changed guard just above.
                silence_tracker.pause()

        session_userdata["_silence_tracker"] = silence_tracker

        if mode in ("driver", "custcall"):
            register_sip_call_watchers(
                ctx.room,
                session,
                silence_tracker=silence_tracker,
            )
        elif mode == "customer":
            register_customer_room_sip_watchers(
                ctx.room,
                session,
                silence_tracker=silence_tracker,
            )

        if mode in ("driver", "outbound"):
            # Proactive background-call summary announcement — pushed here by
            # a DIFFERENT job (the isolated custcall room, once that call
            # ends) via LiveKit's server-side send_data; see
            # handback.py::notify_driver_of_background_call_result. Lets the
            # driver find out the result the moment it's ready instead of
            # only on request ("tóm tắt cuộc gọi").
            @ctx.room.on("data_received")
            def _on_background_call_summary(packet) -> None:
                if packet.topic != BACKGROUND_CALL_SUMMARY_TOPIC:
                    return
                try:
                    payload = json.loads(packet.data.decode("utf-8"))
                except Exception:
                    logger.warning("background_call_summary: bad payload", exc_info=True)
                    return
                summary = payload.get("summary", "")
                prefix = (
                    "The background call with the customer has ended."
                    if lang == "en"
                    else "Cuộc gọi nền với khách đã kết thúc."
                )
                text = f"{prefix} {summary}".strip()
                # session.say() is a plain (non-async) method that schedules
                # the speech synchronously and returns a SpeechHandle, not a
                # coroutine — wrapping it in asyncio.create_task() raised
                # TypeError every time this fired (confirmed live: "a
                # coroutine was expected, got SpeechHandle"), logged as an
                # uncaught error in this data_received callback. The speech
                # itself still went out (say() already schedules it before
                # returning), so this was pure log noise/fragile behavior,
                # not a missed announcement — but fix it properly rather than
                # rely on that. No text/behavior change for either call type.
                session.say(text, allow_interruptions=True)

        logger.info(
            "session started | mode=%s phone=%s trip=%s",
            mode, phone, trip.get("trip_id") if trip else None,
        )

        # ── Wait until room disconnects ───────────────────────────────────────
        disconnected = asyncio.Event()
        ctx.room.on("disconnected", lambda: disconnected.set())
        if ctx.room.connection_state != 3:
            await disconnected.wait()

        logger.info("room disconnected | room=%s", room_name)

    except Exception:
        logger.error("session crashed:\n%s", traceback.format_exc())
    finally:
        if silence_tracker:
            # Must never block conv_service.finish() below — a crash here
            # (e.g. the self-referential await when a silence timeout's own
            # _end_session() already called stop() from inside the very task
            # being awaited) previously skipped the DynamoDB save entirely
            # for the whole call.
            try:
                await silence_tracker.stop()
            except Exception:
                logger.error("silence_tracker.stop() failed", exc_info=True)
        await conv_service.finish()
