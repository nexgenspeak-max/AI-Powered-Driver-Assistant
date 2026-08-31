"""Backward-compat shim — import from app.voicebot.locales.vn instead."""
from app.voicebot.locales.vn import *  # noqa: F403
from app.voicebot.locales.vn import DriverAgent, CustomerAgent, PRONUNCIATIONS

__all__ = ["DriverAgent", "CustomerAgent", "PRONUNCIATIONS"]
