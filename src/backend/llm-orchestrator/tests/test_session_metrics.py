"""Per-session metrics that feed the ops daily report."""
from types import SimpleNamespace

from app.devlog import event
from app.services import session_metrics
from app.services.session_metrics import SessionMetrics


def _tools(*pairs):
    calls = [SimpleNamespace(name=n) for n, _ in pairs]
    outs = [None if err is None else SimpleNamespace(is_error=err) for _, err in pairs]
    return SimpleNamespace(function_calls=calls, function_call_outputs=outs)


def test_snapshot_counts_latency_tools_http_and_fallbacks():
    m = SessionMetrics("driver")
    for ms in (800, 1500, 2500, 1200):
        m.observe("turn", True, {"duration_ms": ms})
    m.observe("turn_filler", True, {})
    m.observe("http", True, {"method": "GET", "path": "/api/v1/drivers/me/context", "status": 200})
    m.observe("http", False, {"method": "PATCH", "path": "/api/v1/trips/T1", "status": 500})
    m.observe("provider_fallback", False, {"kind": "llm", "provider": "openai"})
    m.observe("provider_fallback", True, {"kind": "llm", "provider": "openai"})
    m.on_tools_executed(_tools(("check_upcoming_trips", False), ("update_trip_status", True), ("end_conversation", None)))

    s = m.snapshot()
    assert s["mode"] == "driver" and s["turns"] == 4
    assert s["latency_ms"]["samples"] == [800, 1500, 2500, 1200]
    assert s["latency_ms"]["mean"] == 1500
    assert s["latency_ms"]["p50"] in (1200, 1500)
    assert s["latency_ms"]["slow"] == 1
    assert s["fillers"] == 1
    assert s["tools"] == {
        "total": 3,
        "errors": 1,
        "by_name": {
            "check_upcoming_trips": {"ok": 1, "error": 0},
            "end_conversation": {"ok": 1, "error": 0},
            "update_trip_status": {"ok": 0, "error": 1},
        },
    }
    assert s["http"]["total"] == 2 and s["http"]["errors"] == 1
    assert s["http"]["by_error"] == {"PATCH /api/v1/trips/T1 500": 1}
    assert s["fallbacks"] == {"llm:openai": 1}
    assert s["errors"] == {"http": 1}          # a fallback is recovery, not an error


def test_empty_session_snapshot_is_json_safe():
    s = SessionMetrics("customer").snapshot()
    assert s["turns"] == 0 and s["latency_ms"]["mean"] is None and s["latency_ms"]["p95"] is None


def test_devlog_event_feeds_current_collector():
    m = session_metrics.start("outbound")
    event("turn", ok=False, duration_ms=2300.0, slow=True)
    event("tool_whatever", ok=False, error="Boom")
    assert m.snapshot()["latency_ms"]["samples"] == [2300]
    assert m.snapshot()["errors"] == {"tool_whatever": 1}
    session_metrics._current.set(None)


def test_no_collector_is_a_noop():
    session_metrics._current.set(None)
    event("http", ok=False, method="GET", path="/x", status=503)  # must not raise
