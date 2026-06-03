"""
Language router — selects the correct voicebot module based on lang code.

Usage:
    from app.voicebot import get_voicebot
    module = get_voicebot("vn")   # or "en"
    agent  = module.DriverAgent(trip=trip, driver_phone=phone)
"""
from importlib import import_module
from types import ModuleType

_SUPPORTED = {"vn", "en"}
_DEFAULT   = "vn"


def get_voicebot(lang: str) -> ModuleType:
    """Return the voicebot module for the given language code."""
    code = lang.lower() if lang and lang.lower() in _SUPPORTED else _DEFAULT
    return import_module(f"app.voicebot.{code}")
