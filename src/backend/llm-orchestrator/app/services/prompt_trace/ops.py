"""DEV events → ``op`` rows in the bound room's prompt trace.

Room comes from the logger contextvar set by ``bind(room=...)`` in session.py,
so concurrent sessions never cross-write.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from app.services.logger.context import current_room
from app.services.prompt_trace.store import writer_for_room

logger = logging.getLogger("llm-orchestrator.prompt_trace")

# Per-metric DEV lines duplicate llm_metrics / turn_metrics rows and bloat the file.
EXCLUDED_KINDS = frozenset({"stt_metrics", "tts_metrics", "llm_metrics", "eou_metrics"})


def _jsonable(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    try:
        json.dumps(value, ensure_ascii=False)
        return value
    except (TypeError, ValueError):
        return str(value)


def record_op(kind: str, ok: bool, fields: dict[str, Any]) -> None:
    if kind in EXCLUDED_KINDS:
        return
    try:
        writer = writer_for_room(current_room())
        if writer is None:
            return
        payload = {k: _jsonable(v) for k, v in fields.items() if v is not None}
        writer.emit("op", name=kind, ok=bool(ok), fields=payload)
    except Exception as exc:
        logger.warning("prompt trace op failed kind=%s error=%s", kind, exc)
