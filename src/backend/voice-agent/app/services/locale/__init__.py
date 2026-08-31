"""
Locale service — single entry for language routing, bundles, and YAML strings.

Callers import this package only. Processors must not branch on `lang == "en"`;
load copy from locale sections instead (see `load_locale_section`).

Example:
    locale = resolve_session_locale(room_meta_lang=meta.get("lang"))
    copy = load_locale_section(locale.routing, "greeting")
"""
from __future__ import annotations

from app.services.locale.loader import (
    get_locale_bundle,
    load_locale_section,
    load_manifest,
    load_spoken_intent_patterns,
    supported_routing_langs,
)
from app.services.locale.resolver import (
    normalize_routing_lang,
    normalize_tool_name,
    resolve_routing_lang,
    routing_from_spoken,
    to_spoken_lang,
)
from app.services.locale.session import resolve_session_locale
from app.services.locale.types import SessionLocale, SpokenLang, VoiceRoutingLang

__all__ = [
    "SessionLocale",
    "SpokenLang",
    "VoiceRoutingLang",
    "get_locale_bundle",
    "load_locale_section",
    "load_manifest",
    "load_spoken_intent_patterns",
    "resolve_routing_lang",
    "resolve_session_locale",
    "routing_from_spoken",
    "normalize_routing_lang",
    "normalize_tool_name",
    "supported_routing_langs",
    "to_spoken_lang",
]
