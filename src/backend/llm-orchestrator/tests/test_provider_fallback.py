"""Provider fallback chain — backups only when configured."""
from types import SimpleNamespace

from app.providers.fallback import provider_chain, with_fallback


def test_empty_fallback_is_primary_only():
    assert provider_chain("openai", "") == ["openai"]
    assert provider_chain("google", "  ") == ["google"]


def test_fallback_appends_unique_names_and_canonicalizes_llm_aliases():
    assert provider_chain("openai", "gemini, gemini, openai") == ["openai", "gemini"]
    assert provider_chain(
        "openai", " google, moonshot ", aliases={"google": "gemini", "moonshot": "kimi"}
    ) == ["openai", "gemini", "kimi"]


def test_with_fallback_skips_adapter_for_a_single_provider():
    primary = object()
    assert with_fallback([primary], lambda items, **_: items) is primary


def test_with_fallback_wraps_when_a_backup_exists():
    primary, backup = object(), object()

    def adapter(items, **kwargs):
        return SimpleNamespace(items=items, timeout=kwargs["attempt_timeout"])

    wrapped = with_fallback([primary, backup], adapter, attempt_timeout=5.0)
    assert wrapped.items == [primary, backup]
    assert wrapped.timeout == 5.0
