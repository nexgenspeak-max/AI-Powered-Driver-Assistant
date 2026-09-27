"""Hangup must not report unanswered after wait_for_sip_pickup already succeeded."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

from app.voicebot.processors.sip_call_watch import (
    call_leg_was_answered,
    _disconnect_summary,
)


def test_call_leg_was_answered_uses_sticky_flag_when_attr_cleared():
    participant = SimpleNamespace(attributes={})  # hangup cleared sip.callStatus
    userdata = {"_sip_leg_answered": True}
    assert call_leg_was_answered(userdata, participant) is True


def test_call_leg_was_answered_false_without_flag_or_active_attr():
    participant = SimpleNamespace(attributes={})
    assert call_leg_was_answered({}, participant) is False


def test_call_leg_was_answered_true_from_live_attr():
    participant = SimpleNamespace(attributes={"sip.callStatus": "active"})
    assert call_leg_was_answered({}, participant) is True


def test_disconnect_summary_after_transfer_uses_answered_true():
    # Live 2026-09-05: transfer_to_driver flipped mode=bridge, then hangup
    # with cleared attrs reported "khách không bắt máy".
    summary = _disconnect_summary("vn", "bridge", answered=True)
    assert "không bắt máy" not in summary.lower()
    assert "cúp máy" in summary or "kết thúc" in summary


def test_self_call_blocked_message_in_dial_path():
    from app.voicebot.processors import customer_call
    from app.voicebot.processors.custom_call import normalize_vn_phone

    assert normalize_vn_phone("84900000001") == normalize_vn_phone("0900000001")
    assert "trùng số tài xế" in customer_call._self_call_blocked("NexGen", "vn")
