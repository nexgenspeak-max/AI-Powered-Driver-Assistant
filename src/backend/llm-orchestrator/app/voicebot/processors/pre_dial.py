"""Pre-dial announcement — works with RunContext and fast-path SimpleNamespace."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

logger = logging.getLogger("llm-orchestrator.processors.pre_dial")


@asynccontextmanager
async def _maybe_foreground(context: Any):
    """Use RunContext.foreground() when present; otherwise no-op."""
    fg = getattr(context, "foreground", None)
    if callable(fg):
        async with fg():
            yield
    else:
        yield


async def announce_pre_dial(context: Any, text: str) -> None:
    """Speak and wait before SIP dial. Never blocks the actual call on failure."""
    if not text.strip():
        return
    try:
        async with _maybe_foreground(context):
            await context.session.say(text, allow_interruptions=False)
    except Exception:
        logger.warning("pre-dial announcement failed — dialing anyway", exc_info=True)
