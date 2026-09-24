"""Attach LiveKit session listeners that emit DEV traces for every turn.

Covers STT finals, VAD/EOU delays, LLM/TTS timings, tool ok/fail, pipeline
errors, and session close — the path from "driver stopped talking" to
"bot started speaking".
"""
from __future__ import annotations

import time
from typing import Any

from livekit.agents import AgentSession

from app.devlog import event, ms_since

# VAD idle samples fire continuously; they drown the useful turn timings.
_SKIP_METRIC_TYPES = frozenset({"vad_metrics"})


def _seconds_to_ms(value: Any) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number < 0:
        return None
    return number * 1000


def _metric_fields(metrics: Any) -> dict[str, Any]:
    fields: dict[str, Any] = {}
    duration_ms = _seconds_to_ms(getattr(metrics, "duration", None))
    if duration_ms is not None:
        fields["duration_ms"] = duration_ms
    ttft_ms = _seconds_to_ms(getattr(metrics, "ttft", None))
    if ttft_ms is not None:
        fields["ttft_ms"] = ttft_ms
    ttfb_ms = _seconds_to_ms(getattr(metrics, "ttfb", None))
    if ttfb_ms is not None:
        fields["ttfb_ms"] = ttfb_ms
    for name in (
        "end_of_utterance_delay",
        "transcription_delay",
        "on_user_turn_completed_delay",
        "audio_duration",
        "idle_time",
    ):
        converted = _seconds_to_ms(getattr(metrics, name, None))
        if converted is not None:
            fields[f"{name}_ms"] = converted
    for name in (
        "cancelled",
        "streamed",
        "prompt_tokens",
        "completion_tokens",
        "total_tokens",
        "characters_count",
        "label",
        "request_id",
        "speech_id",
    ):
        value = getattr(metrics, name, None)
        if value not in (None, "", 0, False):
            fields[name] = value
    metadata = getattr(metrics, "metadata", None)
    if metadata is not None:
        model_name = getattr(metadata, "model_name", None)
        provider = getattr(metadata, "model_provider", None)
        if model_name:
            fields["model"] = model_name
        if provider:
            fields["provider"] = provider
    return fields


def attach_session_devlog(
    session: AgentSession,
    *,
    room: str,
    mode: str,
    lang: str,
) -> None:
    started_at = time.perf_counter()
    event("session_start", room=room, mode=mode, lang=lang)

    @session.on("metrics_collected")
    def _on_metrics(ev) -> None:
        metrics = ev.metrics
        kind = getattr(metrics, "type", "metrics")
        if kind in _SKIP_METRIC_TYPES:
            return
        fields = _metric_fields(metrics)
        cancelled = bool(getattr(metrics, "cancelled", False))
        event(kind, ok=not cancelled, **fields)

    @session.on("function_tools_executed")
    def _on_tools(ev) -> None:
        for call, output in ev.zipped():
            is_error = bool(output is not None and getattr(output, "is_error", False))
            raw_output = ""
            if output is not None:
                raw_output = str(getattr(output, "output", "") or "")
            event(
                "tool",
                ok=not is_error,
                name=getattr(call, "name", "?"),
                args=getattr(call, "arguments", None),
                output=raw_output or "(none)",
            )

    @session.on("user_input_transcribed")
    def _on_stt(ev) -> None:
        if not ev.is_final:
            return
        event(
            "stt_final",
            text=ev.transcript,
            language=getattr(ev, "language", None),
        )

    @session.on("speech_created")
    def _on_speech(ev) -> None:
        event(
            "speech",
            source=ev.source,
            user_initiated=ev.user_initiated,
        )

    @session.on("agent_state_changed")
    def _on_agent_state(ev) -> None:
        event("agent_state", old=ev.old_state, new=ev.new_state)

    @session.on("user_state_changed")
    def _on_user_state(ev) -> None:
        event("user_state", old=ev.old_state, new=ev.new_state)

    @session.on("error")
    def _on_error(ev) -> None:
        err = ev.error
        source = ev.source
        event(
            "pipeline_error",
            ok=False,
            source=type(source).__name__ if source is not None else None,
            error=type(err).__name__ if err is not None else "unknown",
            detail=str(err) if err is not None else None,
        )

    @session.on("close")
    def _on_close(ev) -> None:
        reason = getattr(ev.reason, "value", ev.reason)
        event(
            "session_close",
            ok=ev.error is None,
            reason=reason,
            duration_ms=ms_since(started_at),
            error=type(ev.error).__name__ if ev.error is not None else None,
        )
