"""
Local Twilio call event log for debugging and monitoring.

Webhook handlers append every status change here (JSONL).
Use GET /api/v1/calls/events to inspect without opening Twilio Console.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

logger = logging.getLogger("call-center.twilio-monitor")

_LOG_DIR = Path(__file__).resolve().parents[2] / "data"
_LOG_FILE = _LOG_DIR / "twilio_events.jsonl"
_lock = Lock()


def log_event(source: str, payload: dict[str, Any]) -> None:
    row = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "source": source,
        **payload,
    }
    _LOG_DIR.mkdir(parents=True, exist_ok=True)
    with _lock:
        with _LOG_FILE.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    logger.info(
        "[twilio] %s CallSid=%s status=%s",
        source,
        payload.get("CallSid", "?"),
        payload.get("CallStatus", payload.get("status", "")),
    )


def read_events(
    *,
    limit: int = 200,
    call_sid: str | None = None,
) -> list[dict[str, Any]]:
    if not _LOG_FILE.exists():
        return []

    rows: list[dict[str, Any]] = []
    with _LOG_FILE.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if call_sid and row.get("CallSid") != call_sid:
                continue
            rows.append(row)

    return rows[-limit:]
