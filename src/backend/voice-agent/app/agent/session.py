"""
LiveKit session layer — transport and session lifecycle ONLY.
No business logic here; everything delegates to the appropriate Agent subclass.

Room name conventions (set by trip-service):
  driver-{phone}-{unix_ts}    → DriverAgent  (inbound: driver opens app)
  customer-{phone}-{unix_ts}  → CustomerAgent (customer support)
  trip-{trip_id_prefix}       → DriverAgent  (outbound SIP: system calls driver)
"""
import asyncio
import json
import logging
import re
import traceback
from typing import Literal

from livekit.agents import AgentSession, JobContext, JobProcess, RoomInputOptions, RoomOutputOptions
from livekit.agents.llm import ChatMessage
from livekit.plugins import silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from app.config.settings import get_settings
from app.providers import get_stt, get_llm, get_tts
from app.agent.voice_agent import DriverAgent
from app.agent.customer_agent import CustomerAgent
from app.services.conversation_service import ConversationService
from app.services.silence_tracker import SilenceTracker

logger = logging.getLogger("voice-agent.session")

# ── Room name patterns ─────────────────────────────────────────────────────────
_DRIVER_RE   = re.compile(r"^driver-(\d+)-\d+$")    # driver-84867347452-1748700000
_CUSTOMER_RE = re.compile(r"^customer-(\d+)-\d+$")  # customer-84901234567-1748700000
_TRIP_RE     = re.compile(r"^trip-[a-z0-9]+$")      # trip-abc12345  (SIP outbound)

RoomMode = Literal["driver", "customer", "outbound"]


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

    # ── Resolve trip metadata (outbound SIP rooms carry it in room.metadata) ──
    trip: dict | None = None
    if mode in ("driver", "outbound"):
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
        except Exception:
            pass

    conv_service = ConversationService(ctx)
    silence_tracker: SilenceTracker | None = None
    settings = get_settings()

    try:
        session = AgentSession(
            stt=get_stt(),
            llm=get_llm(),
            tts=get_tts(),
            vad=ctx.proc.userdata["vad"],
            turn_detection=MultilingualModel(),
        )

        # ── Build the right agent for this room ───────────────────────────────
        if mode == "customer":
            agent = CustomerAgent(customer_phone=phone)
            silence_seconds = 20.0   # customers may pause longer
        else:
            agent = DriverAgent(trip=trip, driver_phone=phone)
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
                sync_transcription=True,
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
            silence_tracker = SilenceTracker(
                session=session,
                ctx=ctx,
                silence_threshold_seconds=threshold,
                silence_message="<speech_not_detected>",
                max_consecutive_silences=max_silences,
                end_session_on_timeout=end_on_timeout,
            )

            @session.on("conversation_item_added")
            def _on_conversation_item(ev) -> None:
                item = ev.item
                if isinstance(item, ChatMessage) and item.role == "user" and item.text_content:
                    silence_tracker.reset_silence_timer()

            @session.on("user_input_transcribed")
            def _on_user_transcribed(ev) -> None:
                if ev.is_final and ev.transcript.strip():
                    silence_tracker.reset_silence_timer()

            @session.on("agent_state_changed")
            def _on_agent_state(ev) -> None:
                if ev.new_state in ("speaking", "thinking"):
                    silence_tracker.pause()
                elif ev.new_state in ("listening", "idle"):
                    silence_tracker.resume()

            await silence_tracker.start()

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
