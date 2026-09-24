"""Driver tool registration parity between VN and EN."""
from app.voicebot.tool_registry import (
    driver_inbound_tool_names,
    driver_outbound_tool_names,
    parity_diff,
)


def test_inbound_tool_names_match():
    vn = driver_inbound_tool_names("vn")
    en = driver_inbound_tool_names("en")
    missing_en, missing_vn = parity_diff(vn_tools=vn, en_tools=en)
    assert not missing_en, f"EN missing: {missing_en}"
    assert not missing_vn, f"VN missing: {missing_vn}"
    assert len(vn) == len(en)


def test_outbound_tools_match():
    vn = driver_outbound_tool_names("vn")
    en = driver_outbound_tool_names("en")
    assert vn == en == ["confirm_trip", "reject_trip"]
