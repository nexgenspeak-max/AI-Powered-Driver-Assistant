"""Per-session quality metrics, sent with the call record when the session ends.

ops-service builds its daily report from these structured numbers instead of
parsing log text. One collector per job; it is stored in a ContextVar set at
the start of the entrypoint, so every task the session spawns afterwards
(LiveKit handlers, tools, the HTTP client) reports into the same collector.

Fed by:
  - devlog.event()            turn latency, http, turn_filler, provider_fallback, any ok=false
  - function_tools_executed   tool calls and their error flag
"""
from __future__ import annotations

from collections import Counter
from contextvars import ContextVar
from typing import Any

SCHEMA_VERSION = 1
SLOW_TURN_MS = 2000.0
MAX_SAMPLES = 500  # a session never has this many turns; guards the record size

_current: ContextVar["SessionMetrics | None"] = ContextVar("session_metrics", default=None)


def _percentile(sorted_values: list[float], q: float) -> float | None:
    if not sorted_values:
        return None
    idx = min(len(sorted_values) - 1, max(0, round(q * (len(sorted_values) - 1))))
    return sorted_values[idx]


class SessionMetrics:
    def __init__(self, mode: str) -> None:
        self.mode = mode
        self.turn_ms: list[float] = []
        self.fillers = 0
        self.tool_ok: Counter[str] = Counter()
        self.tool_error: Counter[str] = Counter()
        self.http_total = 0
        self.http_errors: Counter[str] = Counter()   # "METHOD path status|error"
        self.fallbacks: Counter[str] = Counter()     # kind:provider (marked unavailable)
        self.errors: Counter[str] = Counter()        # event kind of every ok=false event

    # ── feeders ──────────────────────────────────────────────────────────────
    def observe(self, kind: str, ok: bool, fields: dict[str, Any]) -> None:
        if kind == "turn":
            duration = fields.get("duration_ms")
            if isinstance(duration, (int, float)) and len(self.turn_ms) < MAX_SAMPLES:
                self.turn_ms.append(float(duration))
            return  # a slow turn is not an error; it is counted from the samples
        if kind == "turn_filler" and ok:
            self.fillers += 1
        elif kind == "http":
            self.http_total += 1
            if not ok:
                status = fields.get("status") or fields.get("error") or "error"
                self.http_errors[f"{fields.get('method', '?')} {fields.get('path', '?')} {status}"] += 1
        elif kind == "provider_fallback" and not ok:
            self.fallbacks[f"{fields.get('kind', '?')}:{fields.get('provider', '?')}"] += 1
            return  # a fallback is recovery, reported separately from errors
        if not ok:
            self.errors[kind] += 1

    def on_tools_executed(self, ev: Any) -> None:
        calls = getattr(ev, "function_calls", None) or []
        outputs = getattr(ev, "function_call_outputs", None) or []
        for i, call in enumerate(calls):
            name = getattr(call, "name", "?") or "?"
            out = outputs[i] if i < len(outputs) else None
            if out is not None and getattr(out, "is_error", False):
                self.tool_error[name] += 1
            else:
                self.tool_ok[name] += 1

    # ── output ───────────────────────────────────────────────────────────────
    def snapshot(self) -> dict[str, Any]:
        ordered = sorted(self.turn_ms)
        count = len(ordered)

        def rnd(v: float | None) -> int | None:
            return None if v is None else int(round(v))

        tools = {name: {"ok": self.tool_ok[name], "error": self.tool_error[name]}
                 for name in sorted(set(self.tool_ok) | set(self.tool_error))}
        return {
            "schema": SCHEMA_VERSION,
            "mode": self.mode,
            "turns": count,
            "latency_ms": {
                "samples": [rnd(v) for v in self.turn_ms],
                "mean": rnd(sum(ordered) / count) if count else None,
                "p50": rnd(_percentile(ordered, 0.50)),
                "p95": rnd(_percentile(ordered, 0.95)),
                "max": rnd(ordered[-1]) if count else None,
                "slow": sum(1 for v in ordered if v >= SLOW_TURN_MS),
            },
            "fillers": self.fillers,
            "tools": {
                "total": sum(self.tool_ok.values()) + sum(self.tool_error.values()),
                "errors": sum(self.tool_error.values()),
                "by_name": tools,
            },
            "http": {"total": self.http_total, "errors": sum(self.http_errors.values()),
                     "by_error": dict(self.http_errors)},
            "fallbacks": dict(self.fallbacks),
            "errors": dict(self.errors),
        }


def start(mode: str) -> SessionMetrics:
    """Create the collector for this job and make it current for all later tasks."""
    metrics = SessionMetrics(mode)
    _current.set(metrics)
    return metrics


def current() -> SessionMetrics | None:
    return _current.get()


def observe(kind: str, ok: bool, fields: dict[str, Any]) -> None:
    metrics = _current.get()
    if metrics is not None:
        metrics.observe(kind, ok, fields)
