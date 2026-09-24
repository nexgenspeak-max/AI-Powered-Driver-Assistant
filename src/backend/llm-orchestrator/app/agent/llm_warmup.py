"""Warm the LLM HTTP client before the driver speaks.

Kimi k2.6 with thinking disabled is ~1.0–1.8s TTFT on a reused connection
from this network, but a cold TLS handshake was measured at ~2.3s — already
over the 2s voice bar. LiveKit keeps the OpenAI-compatible client pooled;
this fires one tiny completion at job start so the first real turn is warm.
"""
from __future__ import annotations

import logging
import time
from typing import Any

from livekit.agents.llm import ChatContext

logger = logging.getLogger("llm-orchestrator.llm_warmup")


async def warmup_llm(llm: Any) -> None:
    started = time.monotonic()
    try:
        chat_ctx = ChatContext.empty()
        chat_ctx.add_message(role="user", content="ok")
        stream = llm.chat(chat_ctx=chat_ctx)
        async for _ in stream:
            break
        logger.info("llm warmup ttft=%.2fs", time.monotonic() - started)
    except Exception:
        logger.warning(
            "llm warmup failed after %.2fs",
            time.monotonic() - started,
            exc_info=True,
        )
