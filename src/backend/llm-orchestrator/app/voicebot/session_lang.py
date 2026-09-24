"""Session language resolution — re-export from locale service (backward compat)."""
from app.services.locale import (
    normalize_routing_lang,
    normalize_tool_name,
    resolve_routing_lang,
    to_spoken_lang,
)

__all__ = [
    "normalize_routing_lang",
    "normalize_tool_name",
    "resolve_routing_lang",
    "to_spoken_lang",
]
