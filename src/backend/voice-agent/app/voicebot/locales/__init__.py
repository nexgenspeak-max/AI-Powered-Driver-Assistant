"""Locale packages (vn, en, …) + loader re-exports."""
from app.services.locale import (
    get_locale_bundle,
    load_locale_section,
    load_manifest,
    load_spoken_intent_patterns,
    supported_routing_langs,
)

__all__ = [
    "get_locale_bundle",
    "load_locale_section",
    "load_manifest",
    "load_spoken_intent_patterns",
    "supported_routing_langs",
]
