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
        # Per-session state exposed to tools via context.userdata
        session_userdata = {
            "driver_phone":           phone if mode not in ("customer",) else "",
            "customer_phone":         phone if mode == "customer" else "",
            "trip":                   trip,
            "pending_cancel_trip_id": None,
            "room_name":              room_name,
            "lang":                   lang,
            "customer_call_active":   False,
            "bridge_call_active":     False,
            "background_call_active": False,
            "isolated_call":          mode == "custcall",
            "_silence_tracker":       None,
            "_call_started_at":       time.time(),
            "_customer_spoke":        False,
        }

        if mode == "custcall" and trip:
            meta = json.loads(ctx.room.metadata or "{}")
            session_userdata["customer_call"] = {
                "call_id":        meta.get("call_id", ""),
                "trip_id":        trip.get("trip_id", ""),
                "customer_phone": trip.get("customer_phone", ""),
                "sip_identity":   meta.get("sip_identity", ""),
                "room_name":      room_name,
                "mode":           "background",
            }

        session = AgentSession(
            stt=get_stt(),
            llm=get_llm(),
            tts=get_tts(),
            vad=ctx.proc.userdata["vad"],
            turn_detection=MultilingualModel(),
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
                isolated=True,
            )
            # The isolated job starts dialing+dispatching in parallel (see
            # trip-service callService.ts startCustomerCall), so this clock is
            # already running while the phone is still ringing. LiveKit has no
            # reliable "answered" signal exposed to the agent job here (the SIP
            # participant joins — and can subscribe a track — while still
            # ringing, per livekit.SIPCallStatus.SCS_PARTICIPANT_JOINED), so we
            # give ring time generous headroom instead of guessing an answer
            # signal. Real answers are almost always well under this.
            silence_seconds = 35.0
        elif mode == "customer":
            agent = voicebot.CustomerAgent(customer_phone=phone)
            silence_seconds = 20.0   # customers may pause longer
        else:
            context_hint = context_store.build_context_hint(
                session_userdata, lang="en" if lang == "en" else "vi"
            )
            agent = voicebot.DriverAgent(
                trip=trip, driver_phone=phone, context_hint=context_hint
            )
            silence_seconds = 15.0   # drivers on the road, faster cut-off

        # BVCTelephony is for SIP/phone audio — it can strip speech from mobile WebRTC mics.
        noise_cancel = _NOISE_CANCEL if mode == "outbound" else None

        await session.start(
            agent=agent,
            room=ctx.room,
            room_input_options=RoomInputOptions(
                noise_cancellation=noise_cancel,
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

        conv_service.attach(session)

        # ── Silence tracker ───────────────────────────────────────────────────
        threshold = (
            settings.silence_threshold_seconds
            if settings.silence_threshold_seconds > 0
            else silence_seconds
        )
        max_silences = settings.silence_max_consecutive
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
                    if not ud.get("customer_call_active") and not ud.get("bridge_call_active"):
                        silence_tracker.resume()

            await silence_tracker.start()

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
            await silence_tracker.stop()
        await conv_service.finish()
