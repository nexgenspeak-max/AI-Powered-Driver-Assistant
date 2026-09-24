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

from app.agent import turn_metrics
from app.agent.llm_warmup import warmup_llm
from app.config.settings import get_settings
from app.providers import get_stt, get_llm, get_tts
from app.services import backend_api
from app.voicebot import get_voicebot
from app.voicebot.session_lang import resolve_routing_lang, to_spoken_lang
from app.voicebot.processors import prefetch as prefetch_processor
from app.voicebot.processors import context_store
from app.voicebot.processors.call_state import CallAwareUserData
from app.voicebot.processors.agent_state import publish_agent_state
from app.voicebot.processors.handback import BACKGROUND_CALL_SUMMARY_TOPIC
from app.voicebot.processors.nudge import DRIVER_NUDGE_TOPIC, SILENT_NUDGE_KINDS, build_nudge_message
from app.voicebot.processors.sip_call_watch import (
    complete_isolated_call,
    register_customer_room_sip_watchers,
    register_sip_call_watchers,
)
from app.voicebot.processors.spoken_intent import (
    attach_spoken_intent_preemptive_cancel,
    driver_text_input_cb,
)
from app.voicebot.customer_call_agent import CustomerCallAgent
from app.services.conversation_service import ConversationService, CALL_TRANSCRIPT_TOPIC
from app.services.logger import bind, clear
from app.services.session_devlog import attach_session_devlog
from app.services.silence_tracker import SilenceTracker

logger = logging.getLogger("llm-orchestrator.session")


def _job_id(ctx: JobContext) -> str:
    job = getattr(ctx, "job", None)
    raw = getattr(job, "id", None) if job is not None else None
    return str(raw) if raw else "-"


# ── Room name patterns ─────────────────────────────────────────────────────────
_DRIVER_RE      = re.compile(r"^driver-(\d+)-[0-9a-fA-F-]+$")  # unix ts or UUID suffix
# Real inbound phone call: driver dials the Twilio number, LiveKit's SIP
# dispatch rule (scripts/setup_sip.py, room_prefix="driver-call-") creates
# something like "driver-call-_+84867347452_abc" (see README.md's own log
# example). This never matched _DRIVER_RE, so every real inbound call fell
# through to the generic fallback below with parts[1]=="call" (not digits)
# -> phone=="" -> prefetch_processor.run_driver() got skipped entirely ->
# the agent had zero trip/driver context for the whole call. Matched
# separately here, ahead of the fallback, so real calls get the same phone
# resolution (and therefore the same context) as in-app sessions.
_DRIVER_CALL_RE = re.compile(r"^driver-call-_\+?(\d+)_")  # driver-call-_+84867347452_abc
_CUSTOMER_RE = re.compile(r"^customer-(\d+)-\d+$")  # customer-84901234567-1748700000
_TRIP_RE     = re.compile(r"^trip-[a-z0-9]+$")      # trip-abc12345  (SIP outbound)
_CUSTCALL_RE = re.compile(r"^custcall-[a-z0-9]+-\d+$")  # background customer call

RoomMode = Literal["driver", "customer", "outbound", "custcall"]


def turn_handling_for_lang(lang: str) -> dict:
    """Turn-taking options LiveKit actually honors.

    Passing ``turn_detection=`` next to a ``turn_handling`` dict is ignored:
    the SDK only reads ``turn_handling['turn_detection']`` and otherwise
    installs ``inference.TurnDetector()``. That detector does not support
    Vietnamese and was the live default despite our VAD-only comment.
    """
    return {
        "turn_detection": None if lang == "vn" else MultilingualModel(),
        # Tighter than 0.35/0.8 — live eou≈0.96s + Luna TTFT blew the 2s bar
        # on voice even with preemptive generation. Shorter endpointing starts
        # LLM earlier while the driver is still finishing the last word.
        "endpointing": {"min_delay": 0.25, "max_delay": 0.55},
        "preemptive_generation": {"enabled": True, "preemptive_tts": True},
        # LiveKit default false_interruption_timeout is 2.0s — that pause
        # alone is already the voice bar when the driver talks over TTS.
        # min_duration back to LiveKit's default (0.5s) — 0.3s was too
        # sensitive to mic-echo/road noise on long TTS turns, causing the
        # agent to falsely self-interrupt mid-sentence repeatedly (confirmed
        # via "resumed false interrupted speech" logs, 4x in one 41s reply).
        "interruption": {
            "min_duration": 0.5,
            "false_interruption_timeout": 0.5,
        },
    }


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

    m = _DRIVER_CALL_RE.match(room_name)
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


def _is_telephony_room(room_name: str) -> bool:
    """True for any room carrying real SIP/PSTN audio (phone network), as
    opposed to in-app LiveKit WebRTC. Deliberately independent of `mode` —
    `mode` gets reassigned "outbound" -> "driver" once trip metadata
    resolves (see the `mode = "driver"` line below), which used to make
    `mode == "outbound"` checks silently never fire for real calls. Checked
    directly against the room name instead, computed once up front so nothing
    downstream can mutate it away.
    """
    return (
        room_name.startswith("driver-call-")     # inbound: driver phones the assistant
        or _TRIP_RE.match(room_name) is not None      # outbound: assistant phones the driver
        or _CUSTCALL_RE.match(room_name) is not None  # assistant phones a customer
    )


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
    # Import locale packs once per job worker process — avoids ~8–10s cold
    # import of 37+ tools on every first connect in a fresh subprocess.
    try:
        from app.voicebot.registry import get_voicebot_module

        for code in ("vn", "en"):
            get_voicebot_module(code)
    except Exception:
        logger.warning("voicebot prewarm import failed", exc_info=True)


async def _register_driver_session_safe(phone: str, room_name: str) -> None:
    try:
        await backend_api.register_driver_session(phone, room_name)
    except Exception:
        logger.warning("register_driver_session failed | phone=%s", phone, exc_info=True)


async def _clear_driver_session_safe(phone: str) -> None:
    try:
        await backend_api.clear_driver_session(phone)
    except Exception:
        logger.warning("clear_driver_session failed | phone=%s", phone, exc_info=True)


# ── Entrypoint ─────────────────────────────────────────────────────────────────

async def entrypoint(ctx: JobContext) -> None:
    ctx.add_shutdown_callback(backend_api.aclose)
    await ctx.connect()
    room_name = ctx.room.name
    bind(room=room_name, conv=_job_id(ctx))
    logger.info("connected")

    mode, phone = _parse_room(room_name)
    is_telephony = _is_telephony_room(room_name)
    sip_identity = ""
    logger.info("room_mode=%s phone=%r is_telephony=%s", mode, phone, is_telephony)

    # ── Resolve trip metadata ───────────────────────────────────────────────
    trip: dict | None = None
    # Proactive nudge (ask-before-calling-customer, suggest-next-stop, ...)
    # opened by trip-service's driverReachService.ts when the driver had no
    # session open. `related_trip_id` is used instead of `trip_id` at the
    # metadata top level on purpose — see the elif branch below.
    proactive_nudge: dict | None = None
    # Multi-nudge form: trip-service can now hand over more than one pending
    # nudge in one session (1km "gần điểm đón" + 200m "gợi ý điểm kế" used to
    # share one overwritable Redis slot). `proactive_nudge` above stays as the
    # first/primary one for anything still reading the singular.
    proactive_nudges: list[dict] = []
    lang = resolve_routing_lang()
    if mode == "custcall":
        try:
            meta = json.loads(ctx.room.metadata or "{}")
            lang = resolve_routing_lang(room_meta_lang=meta.get("lang"))
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
            sip_identity = str(meta.get("sip_identity") or "").strip()
            if sip_identity:
                # driver-{phone}-{ts} is also the in-app room shape. SIP
                # outbound sets sip_identity so we wait for pickup and use
                # telephony noise cancel — without it, greeting plays into
                # ringback and the driver hears silence after answer.
                is_telephony = True
            if meta.get("trip_id"):
                trip = meta
                # For SIP outbound rooms, driver phone is in metadata
                if mode == "outbound" and not phone:
                    raw = meta.get("driver_phone", "")
                    phone = raw.replace("+", "")
                    mode = "driver"  # treat as driver outbound
                logger.info("trip found | trip_id=%s driver=%s", trip["trip_id"], phone)
            elif meta.get("nudge_kind") or meta.get("nudges"):
                # Deliberately keyed on `nudge_kind`/`nudges`, NOT `trip_id` — a
                # room with `trip_id` set always becomes a "new trip offer"
                # above (DriverAgent.__init__ switches to the 2-tool outbound
                # set the instant `trip` is truthy). A nudge session must keep
                # the full inbound toolset (call_customer, suggest_next_stop,
                # ...), so it's routed through this separate branch instead.
                proactive_nudge = {
                    k: v for k, v in meta.items() if k not in ("driver_phone", "nudges")
                }
                _raw_nudges = meta.get("nudges")
                if isinstance(_raw_nudges, list) and _raw_nudges:
                    # New shape from voice.ts: [{kind, payload}, ...]
                    proactive_nudges = [
                        {"nudge_kind": n.get("kind", ""), **(n.get("payload") or {})}
                        for n in _raw_nudges
                        if isinstance(n, dict) and n.get("kind")
                    ]
                elif proactive_nudge.get("nudge_kind"):
                    # Legacy single-nudge metadata — one-element list.
                    proactive_nudges = [proactive_nudge]
                if not phone:
                    raw = meta.get("driver_phone", "")
                    phone = raw.replace("+", "")
                logger.info(
                    "nudge session | kinds=%s driver=%s",
                    ",".join(n.get("nudge_kind", "") for n in proactive_nudges) or "-",
                    phone,
                )
            lang = resolve_routing_lang(room_meta_lang=meta.get("lang"))
        except Exception:
            pass

    asyncio.create_task(backend_api.prewarm_trip_service())

    # Fire-and-forget presence registration — lets trip-service's
    # driverReachService.ts push a nudge into THIS room instead of dialing a
    # new one, for as long as this session stays open. Never blocks session
    # startup; a failure here just means nudges fall back to opening a new
    # session for this driver, same as if they had no session at all.
    if mode in ("driver", "outbound") and phone:
        asyncio.create_task(_register_driver_session_safe(phone, room_name))

    conv_service = ConversationService(ctx)
    bind(conv=conv_service.call_id)
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
            "sip_identity":           sip_identity,
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
            # Mirrors _agent_call_quiet_since below, but for isolated
            # (background/proximity-notify) calls — set to "now" every time
            # the AI stops talking during an answered isolated call, cleared
            # while it's talking. end_customer_call's isolated branch uses
            # this to require real silence since the closing question before
            # it accepts ending the call, instead of trusting the LLM's own
            # (unreliable) sense that the customer had nothing more to say.
            "_isolated_call_quiet_since": None,
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

        # Warm the LLM while agent module loads. For inbound driver we defer
        # prefetch so connect filler TTS can start first — do NOT await warmup
        # before session.start there (greeting is fixed TTS; warmup runs during
        # the two-phase hello + prefetch).
        llm = get_llm()
        warmup = asyncio.create_task(warmup_llm(llm))
        voicebot_task = asyncio.create_task(asyncio.to_thread(get_voicebot, lang))
        session = AgentSession(
            stt=get_stt(),
            llm=llm,
            tts=get_tts(),
            vad=ctx.proc.userdata["vad"],
            userdata=session_userdata,
            turn_handling=turn_handling_for_lang(lang),
        )
        attach_session_devlog(session, room=room_name, mode=mode, lang=lang)
        attach_spoken_intent_preemptive_cancel(session, lang=lang, mode=mode)
        turn_metrics.attach(session)

        # Prefetch BEFORE session.start so tools + greeting have warm context.
        # Inbound driver: defer prefetch so connect filler TTS can start first.
        role = prefetch_processor.prefetch_role(mode)
        defer_driver_prefetch = mode in ("driver", "outbound") and not trip
        if role == "customer" and phone:
            await prefetch_processor.run_customer(session, phone)
        elif role == "driver" and phone and not defer_driver_prefetch:
            await prefetch_processor.run_driver(session, phone)

        # ── Build the right agent for this room ───────────────────────────────
        voicebot = await voicebot_task
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
            # 10 real seconds of neither the AI nor the customer saying
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
            # so these seconds only ever measure silence in a call that's
            # actually connected, never ring time.
            #
            # 10s single strike, measured from when the AI last stopped talking
            # (the tracker is paused while the AI speaks and resumed on finish,
            # so this only ever counts genuine post-answer silence). Per
            # explicit product decision: once the AI has finished a turn and the
            # customer stays silent past 10s, end the call right away with a
            # brief goodbye — no "anh/chị còn đó không?" round, no dragging it
            # out. (Was briefly 8s/2 strikes ≈ 16s to absorb slow STT on a
            # customer still formulating an answer; 10s/1 keeps most of that
            # patience while making the wrap-up crisper.
            # `_on_isolated_silence_timeout` below speaks the goodbye when a
            # real conversation happened.)
            silence_seconds = 10.0
            max_silences_default = 1
        elif mode == "customer":
            agent = voicebot.CustomerAgent(customer_phone=phone)
            silence_seconds = 60.0   # 60s x 3 = 3min total before hangup
            max_silences_default = 3
        else:
            context_hint = context_store.build_context_hint(
                session_userdata, lang=to_spoken_lang(lang)
            )
            agent = voicebot.DriverAgent(
                trip=trip, driver_phone=phone, context_hint=context_hint,
                proactive_nudge=proactive_nudge,
                proactive_nudges=proactive_nudges,
            )
            silence_seconds = 15.0
            # 15s im lặng → hỏi "Bạn còn đó không?" đúng 1 lần (TTS cố định,
            # không qua LLM — tránh bot hỏi lặp). Thêm 10s im lặng nữa → chào
            # tạm biệt và ngắt (~20s tổng).
            max_silences_default = 2

        # BVCTelephony is for SIP/phone audio — it can strip speech from mobile
        # WebRTC mics, so it must only apply to real telephony rooms. Was
        # keyed on `mode == "outbound"`, but `mode` gets reassigned
        # "outbound" -> "driver" a few lines above the instant trip metadata
        # resolves. Room name `driver-{phone}-{ts}` is shared with in-app
        # sessions, so `_is_telephony_room` is false there; SIP outbound
        # flips `is_telephony` when metadata includes `sip_identity`.
        noise_cancel = _NOISE_CANCEL if is_telephony else None
        room_input = RoomInputOptions(
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
        )
        if mode == "driver":
            room_input.text_input_cb = driver_text_input_cb

        if not defer_driver_prefetch:
            await warmup

        await session.start(
            agent=agent,
            room=ctx.room,
            room_input_options=room_input,
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
        bind(conv=conv_service.call_id)

        # ── Silence tracker ───────────────────────────────────────────────────
        if mode == "custcall":
            # Isolated calls are deliberately NOT subject to the global
            # SILENCE_THRESHOLD_SECONDS/SILENCE_MAX_CONSECUTIVE/SILENCE_END_SESSION
            # overrides below, unlike every other mode. Those env vars exist
            # to tune how forgiving the DRIVER's own conversation is —
            # applying them here too silently broke this call's only hang-up
            # backstop: with SILENCE_MAX_CONSECUTIVE=3 the isolated 10s/1-strike
            # default got stretched to 3 rounds (~15s+, with the AI asking
            # "are you there?" into what could already be an empty line), and
            # if SILENCE_END_SESSION were ever set false for driver sessions,
            # this tracker would never end the call on silence at all —
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
            # Driven entirely by SILENCE_END_SESSION now (see .env.local) —
            # no more hardcoded local/dev override forcing this off. It used
            # to always be disabled in local/dev regardless of config
            # ("don't kick participants with no mic input mid-test"), but
            # that made this exact feature (auto-hang-up after 2-3min of
            # driver silence) impossible to test or use locally at all. If a
            # future local session needs the old no-timeout behavior back,
            # set SILENCE_END_SESSION=false in that env file instead of
            # hardcoding it here.
            end_on_timeout = settings.silence_end_session

        if settings.silence_tracker_enabled:
            async def _on_isolated_silence_timeout() -> None:
                # Isolated (background) call safety timeout — covers both "never
                # answered" and "answered then went silent". Must go through
                # complete_isolated_call so the driver's "tóm tắt cuộc gọi" query
                # never gets stuck on status=in_progress (previously this path
                # just force-removed participants and shut the job down with no
                # backend call at all).
                #
                # This fires on ANY 10s mutual silence, including right at the
                # natural end of a call that actually happened in full (both
                # sides just went quiet, or the LLM was simply slow to call
                # end_customer_call itself) — using the generic "couldn't
                # reach the customer" message unconditionally here was
                # actively wrong in that case: the driver got told the
                # customer never answered/said anything, even when they'd
                # already answered every question and the AI had confirmed
                # their details. Just pass the generic no-contact message as
                # a fallback here — complete_isolated_call itself already
                # branches on _customer_spoke and swaps in the real,
                # transcript-based summary (generating + persisting it via
                # conv_service.finish_and_get_summary()) whenever the
                # customer actually spoke, so doing that same generation
                # here too would just be a redundant second LLM call.
                # A real conversation happened, then 10s of mutual silence after
                # the AI's last turn — treat that as the call being over and
                # say a brief goodbye before hanging up (per product ask:
                # ">10s im lặng sau khi AI nói xong -> chào tạm biệt + ngắt
                # luôn"). No goodbye when the customer never spoke — that's a
                # "couldn't reach them" teardown, nobody's on the line to hear
                # it. The 3s grace lets the line finish playing before
                # complete_isolated_call tears the room down.
                if session_userdata.get("_customer_spoke"):
                    try:
                        await session.say(
                            "Vâng, cảm ơn bạn nhé, tạm biệt."
                            if lang != "en" else
                            "Alright, thank you, goodbye!",
                            allow_interruptions=False,
                        )
                        await asyncio.sleep(3.0)
                    except Exception:
                        logger.warning("isolated silence-timeout goodbye failed", exc_info=True)

                summary = (
                    "Không thể trò chuyện với khách (không bắt máy hoặc im lặng kéo dài)."
                    if lang != "en" else
                    "Could not reach the customer (no answer or prolonged silence)."
                )
                await complete_isolated_call(session, session_userdata, summary)

            # custcall has its own wrap-up path (_on_isolated_silence_timeout
            # above generates a call summary) and isn't a live back-and-forth
            # with a listening driver/customer, so it gets no spoken goodbye
            # here — only driver/customer sessions do.
            goodbye_message = None
            driver_check_in = None
            if mode != "custcall":
                goodbye_message = (
                    "If there's nothing else, I'll go ahead and end the call here. Goodbye!"
                    if lang == "en" else
                    "Nếu bạn không còn câu hỏi nào nữa, em xin phép kết thúc cuộc gọi ở đây. Tạm biệt bạn!"
                )
                if mode == "driver":
                    driver_check_in = (
                        "Still there?"
                        if lang == "en" else
                        "Bạn còn đó không?"
                    )

            silence_tracker = SilenceTracker(
                session=session,
                ctx=ctx,
                silence_threshold_seconds=threshold,
                silence_message="<speech_not_detected>",
                max_consecutive_silences=max_silences,
                end_session_on_timeout=end_on_timeout,
                on_timeout=_on_isolated_silence_timeout if mode == "custcall" else None,
                goodbye_message=goodbye_message,
                check_in_spoken_message=driver_check_in,
            )

            # Farewell phrases in the AI's own speech that mean "the call is
            # over" — background calls hang up automatically when the AI says
            # one of these (see _on_conversation_item below). Kept to explicit
            # sign-offs only, never a bare "cảm ơn" (that's said mid-call all
            # the time when confirming details).
            _GOODBYE_MARKERS = ("tạm biệt", "goodbye", "kết thúc cuộc gọi", "xin phép kết thúc")

            @session.on("conversation_item_added")
            def _on_conversation_item(ev) -> None:
                item = ev.item
                if not isinstance(item, ChatMessage) or not item.text_content:
                    return

                if (
                    item.role == "user"
                    # The tracker's own hidden nudge (<speech_not_detected>) is
                    # injected as a role="user" ChatMessage too, so it fires this
                    # same event — without this check it would reset_silence_timer()
                    # right after every increment, permanently capping the
                    # consecutive-silence count at 1 and making the ~2.5min
                    # auto-hangup unreachable no matter how long the real silence.
                    and item.text_content != silence_tracker.silence_message
                ):
                    silence_tracker.reset_silence_timer(source="conversation_item_added")
                    session_userdata["_customer_spoke"] = True
                    return

                # Background (isolated) customer calls only: when the AI itself
                # says goodbye, hang up automatically a few seconds later —
                # don't leave the line open waiting for the LLM to also call
                # end_customer_call (it often just speaks the farewell and
                # stops) or for the 10s silence timer to catch it.
                if (
                    item.role == "assistant"
                    and session_userdata.get("isolated_call")
                    and session_userdata.get("_customer_spoke")
                    and not session_userdata.get("_isolated_call_done")
                ):
                    text_lc = item.text_content.lower()
                    if any(marker in text_lc for marker in _GOODBYE_MARKERS):
                        logger.info("isolated call | AI said goodbye — auto hang-up after grace")

                        async def _hangup_after_goodbye() -> None:
                            try:
                                # Let the farewell line finish playing before
                                # complete_isolated_call deletes the room.
                                await asyncio.sleep(4.0)
                                if session_userdata.get("_isolated_call_done"):
                                    return
                                fallback = (
                                    "Cuộc gọi đã kết thúc."
                                    if lang != "en" else
                                    "Call ended."
                                )
                                await complete_isolated_call(
                                    session, session_userdata, fallback
                                )
                            except Exception:
                                logger.error(
                                    "auto hang-up after AI goodbye failed", exc_info=True
                                )

                        asyncio.create_task(_hangup_after_goodbye())

            _user_speaking = False

            @session.on("user_input_transcribed")
            def _on_user_transcribed(ev) -> None:
                if ev.transcript.strip():
                    silence_tracker.reset_silence_timer(
                        source=(
                            f"user_input_transcribed:final={ev.is_final}:"
                            f"{ev.transcript!r}"
                        ),
                    )
                if ev.is_final and ev.transcript.strip():
                    session_userdata["_customer_spoke"] = True

            @session.on("user_state_changed")
            def _on_user_state_silence(ev) -> None:
                nonlocal _user_speaking
                if ev.new_state == "speaking":
                    _user_speaking = True
                    silence_tracker.pause()
                elif ev.new_state == "listening":
                    _user_speaking = False

            @session.on("agent_state_changed")
            def _on_agent_state(ev) -> None:
                ud = session.userdata
                if ev.new_state in ("speaking", "thinking"):
                    silence_tracker.pause()
                    # Only a genuine new utterance ("speaking") clears the
                    # quiet-since clocks below — NOT "thinking". A customer
                    # confirming "no more requests" makes the LLM correctly
                    # try to call end_customer_call to wrap up, but
                    # "thinking" (the LLM merely DECIDING whether to end the
                    # call) was itself clearing the clock to None right
                    # before the tool's own gate checked it — so the gate
                    # always saw 0.0s elapsed and refused, no matter how long
                    # the real silence had been, trapping the call in a
                    # "ask again" loop that could never satisfy its own
                    # condition. Only clear on actual speech, when the AI has
                    # something new to say.
                    if ev.new_state == "speaking":
                        if ud.get("customer_call_active"):
                            # AI is talking — not silence. Cleared here so
                            # end_customer_call's agent-mode backstop (below)
                            # never counts the AI's own speech as part of the
                            # "customer isn't responding" window.
                            ud["_agent_call_quiet_since"] = None
                        if ud.get("isolated_call"):
                            # Same reasoning, isolated (background) calls.
                            ud["_isolated_call_quiet_since"] = None
                elif ev.new_state in ("listening", "idle"):
                    if ud.get("isolated_call") and not ud.get("_isolated_call_answered"):
                        # Still just ringing (or dialing) — the agent settling
                        # into "listening/idle" here is not the customer
                        # actually being reachable yet, so this generic
                        # auto-resume must not start the 10s silence clock
                        # this early (see the custcall silence_seconds
                        # comment above). wait_for_sip_pickup resumes it
                        # explicitly once pickup is confirmed.
                        return
                    if (
                        not _user_speaking
                        and not ud.get("customer_call_active")
                        and not ud.get("bridge_call_active")
                    ):
                        silence_tracker.resume()
                    elif ud.get("customer_call_active") and ud.get("_agent_call_answered"):
                        # Real silence since the AI's last utterance during
                        # THIS agent-mode call — gated on _agent_call_answered
                        # (set once wait_for_sip_pickup confirms real pickup,
                        # see customer_call_agent.py) so ring/dial time is
                        # never counted either, mirroring the isolated-call
                        # gate just above.
                        ud["_agent_call_quiet_since"] = time.time()
                    if ud.get("isolated_call") and ud.get("_isolated_call_answered"):
                        ud["_isolated_call_quiet_since"] = time.time()

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
            if mode == "custcall":
                from app.voicebot.processors.sip_call_watch import schedule_no_answer_watch

                session_userdata["_dial_started_at"] = session_userdata.get(
                    "_call_started_at", time.time()
                )
                schedule_no_answer_watch(session, session_userdata)
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

            @ctx.room.on("data_received")
            def _on_call_transcript(packet) -> None:
                if packet.topic != CALL_TRANSCRIPT_TOPIC:
                    return
                if not session_userdata.get("bridge_call_active"):
                    return
                try:
                    payload = json.loads(packet.data.decode("utf-8"))
                except Exception:
                    logger.warning("call_transcript: bad payload", exc_info=True)
                    return
                speaker = (payload.get("speaker") or "customer").strip()
                text = (payload.get("text") or "").strip()
                if not text:
                    return
                conv_service.append_labeled_turn(text, speaker=speaker, role="user")

            # Proactive nudge (ask-before-calling-customer proximity alert,
            # suggest-next-stop, ...) — pushed by trip-service's
            # driverReachService.ts straight into this room's data channel
            # when this driver already has a session open at the moment the
            # nudge fires. Mirrors the background-call-summary listener
            # above; a session with NO nudge at all just never gets this event.
            async def _speak_driver_nudge(nudge_kind: str, payload: dict) -> None:
                text = await build_nudge_message(nudge_kind, payload, lang=lang, userdata=session.userdata)
                if not text:
                    if nudge_kind in SILENT_NUDGE_KINDS:
                        logger.info("driver_nudge: silent refresh kind=%s", nudge_kind)
                    else:
                        logger.warning("driver_nudge: empty message for kind=%s", nudge_kind)
                    return
                # suggest_next_stop already sets this itself (see next_stop.py's
                # build_next_stop_suggestion), targeting the ANNOUNCED next
                # stop's trip — NOT payload's related_trip_id, which for this
                # nudge_kind means something else (the trip to EXCLUDE from
                # ranking, see proximityService.ts's 200m arrival trigger).
                # Setting it again here from payload would silently overwrite
                # that with the wrong trip.
                if nudge_kind not in ("suggest_next_stop", "new_trip_offer", "schedule_updated"):
                    related_trip_id = payload.get("related_trip_id", "")
                    if related_trip_id:
                        context_store.set_last_nudge_trip(session.userdata, related_trip_id)
                # new_trip_offer already reloaded context_store inside
                # build_nudge_message — the next check_upcoming_trips /
                # confirm_trip read sees the 4th trip without a driver "làm mới".
                session.say(text, allow_interruptions=True)

            @ctx.room.on("data_received")
            def _on_driver_nudge(packet) -> None:
                if packet.topic != DRIVER_NUDGE_TOPIC:
                    return
                try:
                    payload = json.loads(packet.data.decode("utf-8"))
                except Exception:
                    logger.warning("driver_nudge: bad payload", exc_info=True)
                    return
                nudge_kind = payload.pop("kind", "")
                # data_received handlers are sync callbacks (mirrors
                # _on_background_call_summary above) — build_nudge_message is
                # async (suggest_next_stop needs a live re-fetch), so it must
                # run as a background task rather than being awaited here.
                asyncio.create_task(_speak_driver_nudge(nudge_kind, payload))

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
        if mode in ("driver", "outbound") and phone:
            await _clear_driver_session_safe(phone)
        clear()
