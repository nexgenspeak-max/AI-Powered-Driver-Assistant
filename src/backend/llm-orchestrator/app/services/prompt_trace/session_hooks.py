"""AgentSession events → prompt trace rows (user, speech, tool, llm_metrics, session_end)."""
from __future__ import annotations

import logging
from typing import Any, Callable

from livekit.agents.llm import ChatMessage
from livekit.agents.metrics import LLMMetrics

from app.services.prompt_trace.store import unregister_room
from app.services.prompt_trace.writer import PromptTraceWriter

logger = logging.getLogger("llm-orchestrator.prompt_trace")

# SpeechCreatedEvent.source → contract value.
_SPEECH_SOURCES = {"generate_reply": "llm", "say": "say"}
_MAX_TRACKED_SPEECHES = 64


def _safe(name: str, fn: Callable[[Any], None]) -> Callable[[Any], None]:
    def handler(ev: Any) -> None:
        try:
            fn(ev)
        except Exception as exc:
            logger.warning("prompt trace hook failed event=%s error=%s", name, exc)

    return handler


def _ms(seconds: float | None) -> float | None:
    if seconds is None or seconds < 0:
        return None
    return seconds * 1000


def _tool_duration_ms(call: Any, output: Any) -> float | None:
    """ChatItems stamp created_at: call when the LLM emitted it, output when the tool returned."""
    started = getattr(call, "created_at", None)
    finished = getattr(output, "created_at", None) if output is not None else None
    if not isinstance(started, (int, float)) or not isinstance(finished, (int, float)):
        return None
    return _ms(finished - started)


def end_trace(writer: PromptTraceWriter, reason: str | None = None) -> None:
    """session_end once, then stop routing devlog ops to this file."""
    try:
        writer.end(reason)
    finally:
        unregister_room(writer)


def _close_reason(ev: Any) -> str | None:
    reason = getattr(ev, "reason", None)
    if reason is None:
        return None
    return str(getattr(reason, "value", reason))


class _SpeechSources:
    """speech handle id → 'llm' | 'say', resolved when the assistant message lands."""

    def __init__(self) -> None:
        self._by_handle: dict[str, str] = {}
        self._handles: list[Any] = []

    def add(self, handle: Any, source: Any) -> None:
        mapped = _SPEECH_SOURCES.get(str(source))
        handle_id = getattr(handle, "id", None)
        if mapped is None or handle_id is None:
            return
        self._by_handle[handle_id] = mapped
        self._handles.append(handle)
        if len(self._handles) > _MAX_TRACKED_SPEECHES:
            old = self._handles.pop(0)
            self._by_handle.pop(getattr(old, "id", None), None)

    def resolve(self, session: Any, item: Any) -> str | None:
        item_id = getattr(item, "id", None)
        for handle in reversed(self._handles):
            try:
                if any(getattr(ci, "id", None) == item_id for ci in handle.chat_items):
                    return self._by_handle.get(handle.id)
            except Exception:
                continue
        current = getattr(session, "current_speech", None)
        return self._by_handle.get(getattr(current, "id", None))


def attach(session: Any, writer: PromptTraceWriter) -> None:
    speeches = _SpeechSources()

    def on_user(ev: Any) -> None:
        text = (getattr(ev, "transcript", "") or "").strip()
        if not getattr(ev, "is_final", False) or not text:
            return
        language = getattr(ev, "language", None)
        writer.emit("user", text=text, language=str(language) if language else None)

    def on_speech_created(ev: Any) -> None:
        speeches.add(getattr(ev, "speech_handle", None), getattr(ev, "source", None))

    def on_item(ev: Any) -> None:
        item = getattr(ev, "item", None)
        if not isinstance(item, ChatMessage) or item.role != "assistant":
            return
        writer.emit(
            "speech",
            role="assistant",
            text=item.text_content or "",
            interrupted=bool(getattr(item, "interrupted", False)),
            source=speeches.resolve(session, item),
        )

    def on_tools(ev: Any) -> None:
        for call, output in zip(ev.function_calls, ev.function_call_outputs):
            writer.emit(
                "tool",
                name=call.name,
                arguments=call.arguments,
                output=getattr(output, "output", "") if output is not None else "",
                is_error=bool(getattr(output, "is_error", False)),
                call_id=call.call_id,
                duration_ms=_tool_duration_ms(call, output),
            )

    def on_metrics(ev: Any) -> None:
        m = getattr(ev, "metrics", None)
        if not isinstance(m, LLMMetrics):
            return
        writer.emit(
            "llm_metrics",
            prompt_tokens=m.prompt_tokens,
            completion_tokens=m.completion_tokens,
            ttft_ms=_ms(m.ttft),
            duration_ms=_ms(m.duration),
            request_id=m.request_id,
        )

    def on_close(ev: Any) -> None:
        end_trace(writer, _close_reason(ev))

    session.on("user_input_transcribed")(_safe("user_input_transcribed", on_user))
    session.on("speech_created")(_safe("speech_created", on_speech_created))
    session.on("conversation_item_added")(_safe("conversation_item_added", on_item))
    session.on("function_tools_executed")(_safe("function_tools_executed", on_tools))
    session.on("metrics_collected")(_safe("metrics_collected", on_metrics))
    session.on("close")(_safe("close", on_close))
