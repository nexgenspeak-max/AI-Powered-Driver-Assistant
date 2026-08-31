"""Locale service — manifest, session bundle, YAML sections."""
from app.services.locale import (
    load_locale_section,
    resolve_session_locale,
    routing_from_spoken,
    supported_routing_langs,
)
from app.voicebot.processors.driver_greeting import build_inbound_context_greeting


def test_supported_routing_langs():
    assert supported_routing_langs() == frozenset({"vn", "en"})


def test_resolve_session_locale_vn():
    loc = resolve_session_locale(room_meta_lang="vn")
    assert loc.routing == "vn"
    assert loc.spoken == "vi"
    assert loc.stt == "vi-VN"


def test_greeting_yaml_vn_no_trips():
    text = build_inbound_context_greeting({}, lang="vi")
    assert "chưa thấy chuyến" in text.lower()


def test_greeting_yaml_en_no_trips():
    text = build_inbound_context_greeting({}, lang="en")
    assert "don't see any trips" in text.lower()


def test_load_greeting_section():
    vn = load_locale_section("vn", "greeting")
    en = load_locale_section("en", "greeting")
    assert vn["inbound_context"]["default_customer"] == "khách"
    assert en["inbound_context"]["default_customer"] == "customer"


def test_routing_from_spoken():
    assert routing_from_spoken("vi") == "vn"
    assert routing_from_spoken("en") == "en"
