"""Structured development traces for the voice-agent pipeline.

Every line is grep-friendly:

    DEV ok=true event=http duration_ms=42 method=GET path=/api/v1/drivers/me/context status=200
    DEV ok=false event=tool name=check_upcoming_trips error=HTTPStatusError

Filter a running agent with:  grep 'DEV ' logs/agent.*.log
"""
from __future__ import annotations

import logging
import time
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from app.services.logger.format import fmt_value

logger = logging.getLogger("llm-orchestrator.dev")


def event(kind: str, *, ok: bool = True, **fields: Any) -> None:
    """Emit one structured DEV line. Failures go to ERROR so they stand out."""
    parts = [f"DEV ok={'true' if ok else 'false'}", f"event={kind}"]
    for key, value in fields.items():
        if value is None or value == "":
            continue
        parts.append(f"{key}={fmt_value(value)}")
    line = " ".join(parts)
    if ok:
        logger.info(line)
    else:
        logger.error(line)


def ms_since(started_at: float) -> float:
    return (time.perf_counter() - started_at) * 1000


@contextmanager
def timed(kind: str, **fields: Any) -> Iterator[None]:
    started_at = time.perf_counter()
    try:
        yield
    except Exception as exc:
        event(
            kind,
            ok=False,
            duration_ms=ms_since(started_at),
            error=type(exc).__name__,
            detail=str(exc),
            **fields,
        )
        raise
    event(kind, ok=True, duration_ms=ms_since(started_at), **fields)
