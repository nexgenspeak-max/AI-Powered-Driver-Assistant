"""Session language resolution."""
import pytest

from app.voicebot.session_lang import (
    normalize_routing_lang,
    resolve_routing_lang,
    to_spoken_lang,
)


def test_normalize_routing_lang():
    assert normalize_routing_lang("vn") == "vn"
    assert normalize_routing_lang("EN") == "en"
    assert normalize_routing_lang("vi") == "vn"
    assert normalize_routing_lang("th") is None
    assert normalize_routing_lang("") is None


def test_to_spoken_lang():
    assert to_spoken_lang("vn") == "vi"
    assert to_spoken_lang("en") == "en"


def test_resolve_routing_lang_room_meta_wins(monkeypatch):
    monkeypatch.setenv("VOICE_AGENT_LANG", "en")
    from app.config.settings import get_settings

    get_settings.cache_clear()
    assert resolve_routing_lang(room_meta_lang="vn") == "vn"
    get_settings.cache_clear()


def test_resolve_routing_lang_env_fallback(monkeypatch):
    monkeypatch.setenv("VOICE_AGENT_LANG", "en")
    from app.config.settings import get_settings

    get_settings.cache_clear()
    assert resolve_routing_lang(room_meta_lang=None) == "en"
    get_settings.cache_clear()


def test_resolve_routing_lang_default_vn(monkeypatch):
    monkeypatch.delenv("VOICE_AGENT_LANG", raising=False)
    from app.config.settings import get_settings

    get_settings.cache_clear()
    assert resolve_routing_lang(room_meta_lang=None) == "vn"
    get_settings.cache_clear()
