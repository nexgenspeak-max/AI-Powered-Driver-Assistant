"""Tests for locale-bound voicebot registry."""
from app.voicebot.registry import (
    get_inbound_tools,
    get_voicebot_module,
    inbound_tool_names,
)


def test_get_voicebot_module_vn():
    mod = get_voicebot_module("vn")
    assert mod.__name__ == "app.voicebot.locales.vn"


def test_get_voicebot_module_en():
    mod = get_voicebot_module("en")
    assert mod.__name__ == "app.voicebot.locales.en"


def test_inbound_tool_count_parity():
    vn = inbound_tool_names("vn")
    en = inbound_tool_names("en")
    assert len(vn) == len(en)
    assert len(vn) >= 37


def test_get_inbound_tools_are_callables():
    tools = get_inbound_tools("vn")
    assert tools
    assert all(callable(t) for t in tools)
