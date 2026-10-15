"""NFR-01: call-failure messages spoken to the driver carry no technical detail."""
from __future__ import annotations

import pytest

from app.voicebot.processors import contact_call, custom_call, customer_call, driver_call

TECHNICAL = ("8002", "8000", "SIP_TRUNK", "trip-service", "call-center")


@pytest.mark.parametrize("lang", ["vn", "en"])
def test_dial_failed_messages_are_user_language(lang):
    messages = [
        customer_call._dial_failed("An", lang),
        contact_call._dial_failed("An", lang),
        driver_call._dial_failed(lang),
        custom_call._dial_failed(lang),
    ]
    for msg in messages:
        assert not any(t in msg for t in TECHNICAL), msg
        assert ("thử lại" in msg) if lang == "vn" else ("try again" in msg)
