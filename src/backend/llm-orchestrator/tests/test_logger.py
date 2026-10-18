"""Canonical log line: service / fn / room / conv stay greppable under concurrency."""
from __future__ import annotations

import asyncio
import copy
import logging
import time

from app.services.logger import ContextStampFormatter, LineFormatter, bind, clear, current_conv, current_room, get_logger
from app.services.logger.format import format_line, split_logger_name


GOLDEN = (
    "2026-08-29 11:00:00 INFO llm-orchestrator silence_tracker "
    "room=driver-088-abc conv=AJ_1 — 60s silence detected count=1 of=3"
)


def setup_function() -> None:
    clear()


def test_format_line_golden_contract():
    line = format_line(
        ts="2026-08-29 11:00:00",
        level="INFO",
        service="llm-orchestrator",
        fn="silence_tracker",
        room="driver-088-abc",
        conv="AJ_1",
        msg="60s silence detected",
        fields={"count": 1, "of": 3},
    )
    assert line == GOLDEN


def test_missing_room_conv_are_dash():
    line = format_line(
        ts="2026-08-29 11:00:00",
        level="INFO",
        service="external-api-service",
        fn="voice",
        room="",
        conv="",
        msg="token issued",
    )
    assert " room=- conv=- — token issued" in line


def test_quotes_values_with_spaces():
    line = format_line(
        ts="t",
        level="ERROR",
        service="llm-orchestrator",
        fn="dev",
        room="r",
        conv="c",
        msg="DEV ok=false event=tool",
        fields={"detail": "502 Bad Gateway"},
    )
    assert 'detail="502 Bad Gateway"' in line


def test_split_logger_name_uses_service_prefix():
    assert split_logger_name("llm-orchestrator.vn.tools.book_trip", "llm-orchestrator") == (
        "llm-orchestrator",
        "vn.tools.book_trip",
    )
    assert split_logger_name("httpx", "llm-orchestrator") == ("llm-orchestrator", "httpx")


def test_formatter_reads_bound_context():
    bind(room="driver-x", conv="job-9")
    record = logging.LogRecord(
        name="llm-orchestrator.session",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg="connected",
        args=(),
        exc_info=None,
    )
    line = LineFormatter().format(record)
    assert "INFO llm-orchestrator session room=driver-x conv=job-9 — connected" in line


def test_get_logger_fields_append_after_message():
    bind(room="driver-x", conv="job-9")
    records: list[logging.LogRecord] = []

    class _Capture(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            records.append(record)

    handler = _Capture()
    logger = logging.getLogger("llm-orchestrator.silence_tracker")
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    try:
        get_logger("silence_tracker").info("silence detected", count=1, of=3)
    finally:
        logger.removeHandler(handler)

    assert len(records) == 1
    line = LineFormatter().format(records[0])
    assert "silence detected count=1 of=3" in line
    assert "room=driver-x conv=job-9" in line


async def test_concurrent_rooms_do_not_mix():
    async def worker(room: str) -> tuple[str, str]:
        bind(room=room, conv=f"conv-{room}")
        await asyncio.sleep(0.02)
        return current_room(), current_conv()

    a, b = await asyncio.gather(worker("room-a"), worker("room-b"))
    assert a == ("room-a", "conv-room-a")
    assert b == ("room-b", "conv-room-b")


def test_format_line_benchmark_under_1ms_per_line():
    n = 50_000
    t0 = time.perf_counter()
    for i in range(n):
        format_line(
            ts="2026-08-29 11:00:00",
            level="INFO",
            service="llm-orchestrator",
            fn="bench",
            room="driver-x",
            conv="job-1",
            msg="hello",
            fields={"i": i},
        )
    elapsed = time.perf_counter() - t0
    per_line_us = (elapsed / n) * 1_000_000
    # Stdlib string format — well under 1ms/line. Printed so the report has a number.
    print(f"\nlogger bench: {n} lines in {elapsed:.3f}s ({per_line_us:.1f} µs/line)")
    assert elapsed < 1.0, f"format_line too slow: {elapsed:.3f}s for {n} lines"
    assert per_line_us < 1000


def test_job_process_line_is_prefixed_once():
    """LiveKit's LogQueueHandler formats in the job process, then the main
    process formats the shipped record again; agent lines used to carry two
    prefixes. The job side now stamps context and returns the bare message."""
    bind(room="driver-0901-abc", conv="job-1")
    try:
        record = logging.LogRecord("llm-orchestrator.turn_metrics", logging.INFO, __file__, 1, "turn latency %s", ("1.2s",), None)
        msg = ContextStampFormatter().format(record)  # same order as LogQueueHandler.emit
        shipped = copy.copy(record)
        shipped.msg, shipped.args = msg, None
    finally:
        clear()
    line = LineFormatter().format(shipped)  # main process: no contextvars bound
    assert line.count("INFO") == 1
    assert "room=driver-0901-abc" in line and "conv=job-1" in line
    assert line.endswith("turn latency 1.2s")
