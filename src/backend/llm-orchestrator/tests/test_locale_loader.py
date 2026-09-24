"""Locale pack loader."""
import pytest

from app.voicebot.locales import (
    get_locale_bundle,
    load_spoken_intent_patterns,
    supported_routing_langs,
)


def test_supported_routing_langs():
    langs = supported_routing_langs()
    assert langs == frozenset({"vn", "en"})


def test_vn_locale_bundle():
    bundle = get_locale_bundle("vn")
    assert bundle["spoken"] == "vi"
    assert bundle["stt"] == "vi-VN"


def test_spoken_intent_yaml_has_end_conversation():
    patterns = load_spoken_intent_patterns("vn")
    assert "end_conversation" in patterns.get("intents", {})
