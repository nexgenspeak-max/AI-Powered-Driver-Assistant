"""Append-only JSONL writer — one file per room, one JSON object per event.

Line shape (v=1), read by ops-service:
    {v, ts, room, seq, turn, kind, ...payload}
"""
from __future__ import annotations

import json
import logging
import math
import os
import re
import threading
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger("llm-orchestrator.prompt_trace")

SCHEMA_VERSION = 1
MAX_FIELD_CHARS = 200_000
_TRUNCATED_SUFFIX = "…[truncated]"
_UNSAFE_ROOM_CHARS = re.compile(r"[^A-Za-z0-9._-]")
_TAIL_BLOCK = 64 * 1024


def sanitize_room(room: str) -> str:
    return _UNSAFE_ROOM_CHARS.sub("_", room or "") or "_"


def truncate(value: Any) -> Any:
    """Cap long strings and replace NaN/inf (invalid JSON for the Node reader)."""
    if isinstance(value, str):
        if len(value) > MAX_FIELD_CHARS:
            return value[:MAX_FIELD_CHARS] + _TRUNCATED_SUFFIX
        return value
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, dict):
        return {k: truncate(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [truncate(v) for v in value]
    return value


def _last_line(path: Path) -> str | None:
    """Last non-empty line, read backwards so huge llm_request rows stay cheap."""
    with path.open("rb") as fh:
        fh.seek(0, os.SEEK_END)
        pos = fh.tell()
        buf = b""
        while pos > 0:
            step = min(_TAIL_BLOCK, pos)
            pos -= step
            fh.seek(pos)
            buf = fh.read(step) + buf
            stripped = buf.rstrip(b"\n")
            if b"\n" in stripped or pos == 0:
                line = stripped.rsplit(b"\n", 1)[-1]
                return line.decode("utf-8", errors="replace") or None
    return None


def _resume_seq(path: Path) -> int:
    """Same room reopened (e.g. trip-{id} outbound retry) — keep seq monotonic per file."""
    try:
        if not path.exists():
            return 0
        line = _last_line(path)
        if not line:
            return 0
        return int(json.loads(line).get("seq") or 0)
    except Exception as exc:
        logger.warning("prompt trace seq resume failed path=%s error=%s", path, exc)
        return 0


def prune_old_traces(directory: Path, retention_days: float) -> int:
    """Best effort: delete ``*.jsonl`` older than ``retention_days`` (<= 0 disables)."""
    if retention_days <= 0:
        return 0
    cutoff = time.time() - retention_days * 86400
    removed = 0
    try:
        for entry in directory.glob("*.jsonl"):
            try:
                if entry.stat().st_mtime < cutoff:
                    entry.unlink()
                    removed += 1
            except OSError as exc:
                logger.warning("prompt trace prune failed path=%s error=%s", entry, exc)
    except OSError as exc:
        logger.warning("prompt trace prune scan failed dir=%s error=%s", directory, exc)
    return removed


class PromptTraceWriter:
    def __init__(self, room: str, path: Path, *, start_seq: int = 0) -> None:
        self.room = room
        self.path = path
        self.started_at = time.time()
        self._seq = start_seq
        self._turn = 0
        self._llm_calls = 0
        self._ended = False
        self._lock = threading.Lock()

    @classmethod
    def open(
        cls, room: str, directory: str | Path, *, retention_days: float = 0
    ) -> PromptTraceWriter | None:
        try:
            base = Path(directory)
            base.mkdir(parents=True, exist_ok=True)
            prune_old_traces(base, retention_days)
            path = base / f"{sanitize_room(room)}.jsonl"
            return cls(room, path, start_seq=_resume_seq(path))
        except Exception as exc:
            logger.warning("prompt trace disabled room=%s dir=%s error=%s", room, directory, exc)
            return None

    @property
    def ended(self) -> bool:
        return self._ended

    def next_llm_call(self) -> int:
        with self._lock:
            self._llm_calls += 1
            return self._llm_calls

    def end(self, reason: str | None = None) -> None:
        """Emit ``session_end`` once — close event and job teardown both call this."""
        with self._lock:
            if self._ended:
                return
            self._ended = True
        self.emit(
            "session_end",
            duration_ms=(time.time() - self.started_at) * 1000,
            reason=reason,
        )

    def emit(self, kind: str, **payload: Any) -> None:
        try:
            with self._lock:
                self._seq += 1
                if kind == "user":
                    self._turn += 1
                record = {
                    "v": SCHEMA_VERSION,
                    "ts": time.time(),
                    "room": self.room,
                    "seq": self._seq,
                    "turn": self._turn,
                    "kind": kind,
                    **truncate(payload),
                }
                line = json.dumps(record, ensure_ascii=False, default=str)
                with self.path.open("a", encoding="utf-8") as fh:
                    fh.write(line + "\n")
                    fh.flush()
        except Exception as exc:
            logger.warning("prompt trace write failed kind=%s error=%s", kind, exc)
