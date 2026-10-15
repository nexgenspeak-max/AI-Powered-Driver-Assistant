"""NFR-05: every log line masks Vietnamese phone numbers in the shared formatter."""
from __future__ import annotations

import logging
import re

from app.services.logger import LineFormatter
from app.services.logger.format import format_line, mask_phones


def test_mask_phones_formats():
    assert mask_phones("call 0888123798 now") == "call 0888xxx798 now"
    assert mask_phones("to=+84901234567") == "to=+84901xxx567"
    assert mask_phones("phone=84901234567") == "phone=84901xxx567"
    assert mask_phones("room=driver-0888123798-509f") == "room=driver-0888xxx798-509f"


def test_mask_phones_leaves_other_numbers():
    text = "ts=1760300000000 id=12345678901234 ms=3480 date=2026-10-13"
    assert mask_phones(text) == text


def test_format_line_masks_room_message_and_fields():
    line = format_line(
        ts="2026-10-13 10:00:00", level="INFO", service="llm-orchestrator", fn="calls",
        room="driver-0888123798-abc", conv="-", msg="dial 0901234567",
        fields={"to": "+84901234567"},
    )
    assert "0888xxx798" in line and "0901xxx567" in line and "+84901xxx567" in line
    assert not re.search(r"(?<!\d)(\+?84|0)\d{9}(?!\d)", line)


def test_line_formatter_masks_exception_text():
    record = logging.LogRecord("llm-orchestrator.x", logging.ERROR, __file__, 1,
                               "start_call failed for %s", ("0901234567",), None)
    try:
        raise RuntimeError("HTTP 400 for phone 0901234567")
    except RuntimeError:
        import sys
        record.exc_info = sys.exc_info()
    out = LineFormatter().format(record)
    assert "0901234567" not in out and "0901xxx567" in out
