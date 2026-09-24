"""Backward-compat shim — import from app.voicebot.locales.en instead."""
from app.voicebot.locales.en import *  # noqa: F403
from app.voicebot.locales.en import DriverAgent, CustomerAgent, PRONUNCIATIONS

__all__ = ["DriverAgent", "CustomerAgent", "PRONUNCIATIONS"]
