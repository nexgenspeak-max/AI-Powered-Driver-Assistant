"""Per-turn STT/LLM/TTS timings.

LiveKit emits these on ``metrics_collected``, but our logging config sets the
``livekit`` logger to WARNING, so the SDK's own INFO metrics never appear.
Anything at or above 2s is SLOW — the voice bar for this product.

The SDK sum (eou + llm_ttft + tts_ttfb) can overstate wall time because
preemptive LLM overlaps EOU. Wall clock from user-stopped-speaking to
agent-started-speaking is the number that matches what the driver hears.
"""
from __future__ import annotations

import logging
import time
from typing import Any

from livekit.agents.metrics import EOUMetrics, LLMMetrics, TTSMetrics

from app.devlog import event

logger = logging.getLogger("voice-agent.turn_metrics")

SLOW_SECONDS = 2.0
_WALL_STATE_KEY = "_turn_wall_state"


def mark_user_stopped(session: Any) -> None:
    """Start wall clock for lk.chat — voice uses user_state speaking→listening."""
    userdata = getattr(session, "userdata", None)
    if not isinstance(userdata, dict):
        return
    state = userdata.get(_WALL_STATE_KEY)
    if isinstance(state, dict):
        state["user_stopped_at"] = time.perf_counter()


def summarize(
    eou: float | None,
    llm_ttft: float | None,
    tts_ttfb: float | None,
) -> tuple[float, bool]:
    """Upper-bound speech-to-first-audio. Preemptive LLM overlaps EOU, so
    the sum can overstate wall time — still the number we treat as slow."""
    total = (eou or 0.0) + (llm_ttft or 0.0) + (tts_ttfb or 0.0)
    return total, total >= SLOW_SECONDS


def attach(session: Any) -> None:
    pending: dict[str, dict[str, float]] = {}
    wall_state: dict[str, float | None] = {"user_stopped_at": None}
    userdata = getattr(session, "userdata", None)
    if isinstance(userdata, dict):
        userdata[_WALL_STATE_KEY] = wall_state

    def _mark_user_stopped() -> None:
        wall_state["user_stopped_at"] = time.perf_counter()

    def _flush(speech_id: str) -> None:
        t = pending.get(speech_id)
        if not t or "llm_ttft" not in t:
            return
        eou = t.get("eou")
        llm = t["llm_ttft"]
        tts = t.get("tts_ttfb")
        total, slow = summarize(eou, llm, tts)
        extra = " SLOW" if slow else ""
        logger.log(
            logging.WARNING if slow else logging.INFO,
            "turn latency speech_id=%s eou=%.2fs llm_ttft=%.2fs tts_ttfb=%s total=%.2fs%s",
            speech_id,
            eou or 0.0,
            llm,
            f"{tts:.2f}s" if tts is not None else "n/a",
            total,
            extra,
        )
        if tts is not None:
            pending.pop(speech_id, None)

    @session.on("user_state_changed")
    def _on_user_state(ev: Any) -> None:
        if ev.old_state == "speaking" and ev.new_state == "listening":
            _mark_user_stopped()

    @session.on("agent_state_changed")
    def _on_agent_state(ev: Any) -> None:
        user_stopped_at = wall_state.get("user_stopped_at")
        if ev.new_state != "speaking" or user_stopped_at is None:
            return
        wall = time.perf_counter() - float(user_stopped_at)
        wall_state["user_stopped_at"] = None
        slow = wall >= SLOW_SECONDS
        extra = " SLOW" if slow else ""
        logger.log(
            logging.WARNING if slow else logging.INFO,
            "turn wall user_stop_to_agent_speak=%.2fs%s",
            wall,
            extra,
        )
        event(
            "turn",
            ok=not slow,
            duration_ms=wall * 1000,
            slow=slow,
        )

    @session.on("metrics_collected")
    def _on_metrics(ev: Any) -> None:
        m = ev.metrics
        if isinstance(m, EOUMetrics):
            sid = m.speech_id or "_"
            pending.setdefault(sid, {})["eou"] = m.end_of_utterance_delay
            logger.info(
                "eou delay=%.2fs transcription=%.2fs speech_id=%s",
                m.end_of_utterance_delay,
                m.transcription_delay,
                sid,
            )
            _flush(sid)
        elif isinstance(m, LLMMetrics):
            # Warmup is a 7-token ping at job start — not a driver turn.
            prompt_tokens = getattr(m, "prompt_tokens", 0) or 0
            if prompt_tokens and prompt_tokens < 32:
                logger.info(
                    "llm warmup ttft=%.2fs tokens=%d",
                    m.ttft,
                    getattr(m, "total_tokens", 0) or 0,
                )
                return
            sid = m.speech_id or "_"
            pending.setdefault(sid, {})["llm_ttft"] = m.ttft
            logger.info(
                "llm ttft=%.2fs duration=%.2fs tokens=%d speech_id=%s",
                m.ttft,
                m.duration,
                m.total_tokens,
                sid,
            )
            _flush(sid)
        elif isinstance(m, TTSMetrics):
            sid = m.speech_id or "_"
            pending.setdefault(sid, {})["tts_ttfb"] = m.ttfb
            logger.info("tts ttfb=%.2fs speech_id=%s", m.ttfb, sid)
            _flush(sid)
