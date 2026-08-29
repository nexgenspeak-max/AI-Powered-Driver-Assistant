"""Structured DEV log helper — format, success/fail, HTTP wrapper."""
import asyncio
import logging

import httpx
import pytest

from app.devlog import event, timed
from app.services.backend_api import _LoggingClient
from app.services.session_devlog import _metric_fields


def test_event_success_is_info(caplog):
    caplog.set_level(logging.INFO, logger="voice-agent.dev")
    event("http", method="GET", path="/api/v1/drivers/me/context", status=200, duration_ms=42.2)
    assert len(caplog.records) == 1
    line = caplog.records[0].getMessage()
    assert line.startswith("DEV ok=true event=http")
    assert "method=GET" in line
    assert "path=/api/v1/drivers/me/context" in line
    assert "status=200" in line
    assert caplog.records[0].levelno == logging.INFO


def test_event_failure_is_error_and_quotes_detail(caplog):
    caplog.set_level(logging.ERROR, logger="voice-agent.dev")
    event(
        "tool",
        ok=False,
        name="check_upcoming_trips",
        error="HTTPStatusError",
        detail="502 Bad Gateway from trip-service",
    )
    line = caplog.records[0].getMessage()
    assert line.startswith("DEV ok=false event=tool")
    assert "name=check_upcoming_trips" in line
    assert 'detail="502 Bad Gateway from trip-service"' in line
    assert caplog.records[0].levelno == logging.ERROR


def test_timed_success_and_failure(caplog):
    caplog.set_level(logging.INFO, logger="voice-agent.dev")
    with timed("prefetch", source="driver"):
        pass
    assert "DEV ok=true event=prefetch" in caplog.records[-1].getMessage()
    assert "duration_ms=" in caplog.records[-1].getMessage()
    assert "source=driver" in caplog.records[-1].getMessage()

    caplog.clear()
    caplog.set_level(logging.ERROR, logger="voice-agent.dev")
    with pytest.raises(RuntimeError, match="boom"):
        with timed("prefetch", source="driver"):
            raise RuntimeError("boom")
    line = caplog.records[-1].getMessage()
    assert "DEV ok=false event=prefetch" in line
    assert "error=RuntimeError" in line


def test_metric_fields_convert_seconds_to_ms():
    class _Metrics:
        type = "llm_metrics"
        duration = 2.1
        ttft = 0.4
        cancelled = False
        prompt_tokens = 12
        label = "kimi"

    fields = _metric_fields(_Metrics())
    assert fields["duration_ms"] == pytest.approx(2100)
    assert fields["ttft_ms"] == pytest.approx(400)
    assert fields["prompt_tokens"] == 12
    assert "cancelled" not in fields


def test_logging_client_records_http_ok_and_fail(caplog):
    caplog.set_level(logging.INFO, logger="voice-agent.dev")

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/ok"):
            return httpx.Response(200, json={"ok": True})
        return httpx.Response(503, text="down")

    async def run() -> None:
        client = _LoggingClient(transport=httpx.MockTransport(handler))
        ok = await client.get("http://trip.local/api/v1/ok")
        assert ok.status_code == 200
        bad = await client.get("http://trip.local/api/v1/fail")
        assert bad.status_code == 503
        await client.aclose()

    asyncio.run(run())
    lines = [r.getMessage() for r in caplog.records if r.getMessage().startswith("DEV ")]
    assert any("ok=true" in line and "status=200" in line and "path=/api/v1/ok" in line for line in lines)
    assert any("ok=false" in line and "status=503" in line and "path=/api/v1/fail" in line for line in lines)
