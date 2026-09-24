"""Routing/spoken lang resolution — env, room metadata, tool aliases."""
from __future__ import annotations

from app.config.settings import get_settings
from app.services.locale.types import SpokenLang, VoiceRoutingLang

_SUPPORTED_ROUTING: frozenset[str] = frozenset({"vn", "en"})
_DEFAULT_ROUTING: VoiceRoutingLang = "vn"
_END_SESSION_ALIASES = frozenset({"end_conversation", "end_call"})


def normalize_routing_lang(raw: str | None) -> VoiceRoutingLang | None:
    if not raw:
        return None
    code = raw.strip().lower()
    if code in _SUPPORTED_ROUTING:
        return code  # type: ignore[return-value]
    if code == "vi":
        return "vn"
    if code == "en":
        return "en"
    return None


def resolve_routing_lang(*, room_meta_lang: str | None = None) -> VoiceRoutingLang:
    """room.metadata.lang overrides worker default from VOICE_AGENT_LANG."""
    from_meta = normalize_routing_lang(room_meta_lang)
    if from_meta:
        return from_meta
    from_env = normalize_routing_lang(get_settings().voice_agent_lang)
    if from_env:
        return from_env
    return _DEFAULT_ROUTING


def to_spoken_lang(routing_lang: str) -> SpokenLang:
    return "en" if routing_lang == "en" else "vi"


def routing_from_spoken(spoken: str) -> VoiceRoutingLang:
    return "en" if spoken == "en" else "vn"


def normalize_tool_name(name: str) -> str:
    if name in _END_SESSION_ALIASES:
        return "end_session"
    return name
