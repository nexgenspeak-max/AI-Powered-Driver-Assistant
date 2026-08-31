"""
Language router — selects the correct voicebot module based on lang code.

Prefer `app.voicebot.registry.get_voicebot_module` for new code.
"""
from types import ModuleType

from app.voicebot.registry import get_voicebot_module


def get_voicebot(lang: str) -> ModuleType:
    """Return the voicebot module for the given routing lang (`vn` | `en`)."""
    return get_voicebot_module(lang)
