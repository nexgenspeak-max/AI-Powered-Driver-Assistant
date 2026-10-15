"""Per-session prompt trace — every LLM request/response as JSONL (local/dev only).

    writer = start_prompt_trace(session, room=room_name, mode=mode, lang=lang)
    ...
    stop_prompt_trace(writer)

File: ``<prompt_trace_dir>/<sanitized room>.jsonl``; read by ops-service.
Tracing never raises into the voice pipeline.
"""
from __future__ import annotations

import logging
from typing import Any

from app.config.settings import get_settings
from app.services.prompt_trace import session_hooks
from app.services.prompt_trace.llm_node import trace_llm_node, writer_for
from app.services.prompt_trace.store import current_writer, register_room, store_writer
from app.services.prompt_trace.writer import PromptTraceWriter

logger = logging.getLogger("llm-orchestrator.prompt_trace")

_TRACE_ENVS = ("local", "dev")


def trace_enabled(settings: Any) -> bool:
    env = str(getattr(settings, "env", "") or "").lower()
    return bool(getattr(settings, "prompt_trace_enabled", False)) and env in _TRACE_ENVS


def _attr(obj: Any, name: str) -> str | None:
    try:
        value = getattr(obj, name, None) if obj is not None else None
    except Exception:
        return None
    return str(value) if value else None


def _session_component(session: Any, name: str) -> Any:
    try:
        return getattr(session, name, None)
    except Exception:
        return None


def start_prompt_trace(
    session: Any,
    *,
    room: str,
    mode: str,
    lang: str,
    agent: str | None = None,
    participant: str | None = None,
) -> PromptTraceWriter | None:
    try:
        settings = get_settings()
        if not trace_enabled(settings):
            return None
        writer = PromptTraceWriter.open(
            room,
            settings.prompt_trace_dir,
            retention_days=float(getattr(settings, "prompt_trace_retention_days", 0) or 0),
        )
        if writer is None:
            return None
        store_writer(session, writer)
        register_room(writer)
        session_hooks.attach(session, writer)
        writer.emit(
            "session_start",
            mode=mode,
            lang=lang,
            agent=agent,
            participant=participant,
            model=_attr(_session_component(session, "llm"), "model"),
            stt=_attr(_session_component(session, "stt"), "provider"),
            tts=_attr(_session_component(session, "tts"), "provider"),
        )
        logger.info("prompt trace room=%s path=%s", room, writer.path)
        return writer
    except Exception as exc:
        logger.warning("prompt trace start failed room=%s error=%s", room, exc)
        return None


def stop_prompt_trace(writer: PromptTraceWriter | None, reason: str | None = None) -> None:
    """Job teardown: session_end if the close event never fired; unregister the room."""
    if writer is None:
        return
    try:
        session_hooks.end_trace(writer, reason)
    except Exception as exc:
        logger.warning("prompt trace stop failed room=%s error=%s", writer.room, exc)


def emit_for_session(session: Any, kind: str, **payload: Any) -> None:
    """Append a row to the session's trace if one is active. Never raises."""
    try:
        writer = current_writer(session)
        if writer is not None:
            writer.emit(kind, **payload)
    except Exception as exc:
        logger.warning("prompt trace emit failed kind=%s error=%s", kind, exc)


__all__ = [
    "PromptTraceWriter",
    "current_writer",
    "emit_for_session",
    "start_prompt_trace",
    "stop_prompt_trace",
    "trace_enabled",
    "trace_llm_node",
    "writer_for",
]
