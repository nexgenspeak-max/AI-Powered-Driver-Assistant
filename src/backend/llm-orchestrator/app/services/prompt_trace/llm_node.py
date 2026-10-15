"""Wrap an agent's llm_node output: record request + streamed response.

Chunks are re-yielded unchanged and immediately (no buffering), so streaming
latency is untouched. The inner stream is always closed on interruption.
"""
from __future__ import annotations

import asyncio
import inspect
import logging
import time
from typing import Any, AsyncIterator

from app.services.prompt_trace.serialize import (
    serialize_chat_items,
    serialize_tool_choice,
    serialize_tools,
)
from app.services.prompt_trace.store import current_writer
from app.services.prompt_trace.writer import PromptTraceWriter

logger = logging.getLogger("llm-orchestrator.prompt_trace")


def _model_name(agent: Any) -> str | None:
    getters = (
        lambda: agent._get_activity_or_raise().llm,
        lambda: agent.session.llm,
    )
    for get_llm in getters:
        try:
            model = getattr(get_llm(), "model", None)
        except Exception:
            continue
        if model:
            return str(model)
    return None


def writer_for(agent: Any) -> PromptTraceWriter | None:
    try:
        return current_writer(agent.session)
    except Exception:
        return None


def _emit_request(
    writer: PromptTraceWriter, call: int, agent: Any, chat_ctx: Any, tools: Any, model_settings: Any
) -> None:
    try:
        writer.emit(
            "llm_request",
            call=call,
            model=_model_name(agent),
            tool_choice=serialize_tool_choice(model_settings),
            messages=serialize_chat_items(list(getattr(chat_ctx, "items", []) or [])),
            tools=serialize_tools(list(tools or [])),
        )
    except Exception as exc:
        logger.warning("prompt trace llm_request failed call=%s error=%s", call, exc)


def _collect(chunk: Any, text_parts: list[str], tool_calls: list[dict[str, Any]]) -> None:
    try:
        if isinstance(chunk, str):
            text_parts.append(chunk)
            return
        delta = getattr(chunk, "delta", None)
        if delta is None:
            return
        if delta.content:
            text_parts.append(delta.content)
        for tc in delta.tool_calls or []:
            tool_calls.append({"name": tc.name, "arguments": tc.arguments, "call_id": tc.call_id})
    except Exception as exc:
        logger.warning("prompt trace chunk collect failed error=%s", exc)


async def _close(stream: Any) -> None:
    aclose = getattr(stream, "aclose", None)
    if aclose is None:
        return
    try:
        await aclose()
    except Exception as exc:
        logger.warning("prompt trace inner aclose failed error=%s", exc)


async def trace_llm_node(
    agent: Any, chat_ctx: Any, tools: Any, model_settings: Any, inner: Any
) -> AsyncIterator[Any]:
    """``inner`` is what the next llm_node returned: async iterable, str, or awaitable of those."""
    writer = writer_for(agent)
    call = writer.next_llm_call() if writer else 0
    started = time.perf_counter()
    if writer:
        _emit_request(writer, call, agent, chat_ctx, tools, model_settings)

    text_parts: list[str] = []
    tool_calls: list[dict[str, Any]] = []
    ttft_ms: float | None = None
    error: str | None = None
    stream: Any = None
    try:
        stream = await inner if inspect.isawaitable(inner) else inner
        if isinstance(stream, str):
            ttft_ms = (time.perf_counter() - started) * 1000
            _collect(stream, text_parts, tool_calls)
            yield stream
        elif stream is not None:
            async for chunk in stream:
                if ttft_ms is None:
                    ttft_ms = (time.perf_counter() - started) * 1000
                _collect(chunk, text_parts, tool_calls)
                yield chunk
    except (GeneratorExit, asyncio.CancelledError):
        error = "cancelled"
        raise
    except BaseException as exc:
        error = f"{type(exc).__name__}: {exc}"
        raise
    finally:
        if stream is not None and not isinstance(stream, str):
            await _close(stream)
        if writer:
            writer.emit(
                "llm_response",
                call=call,
                text="".join(text_parts),
                tool_calls=tool_calls,
                duration_ms=(time.perf_counter() - started) * 1000,
                ttft_ms=ttft_ms,
                error=error,
            )
