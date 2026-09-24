"""
Locale-bound voicebot factory — single dispatch point for agents and tools.

SOLID: callers depend on this module + `app.services.locale`, not on
`if lang == "vn"` scattered across the codebase. Each routing lang maps to
one voicebot package (`app.voicebot.locales.vn` | `app.voicebot.locales.en`) that owns
prompts, tool schemas, and tool callables for that market.
"""
from __future__ import annotations

from importlib import import_module
from types import ModuleType
from typing import Any, Callable

from app.services.locale import normalize_routing_lang, resolve_routing_lang

_SUPPORTED = frozenset({"vn", "en"})
_DEFAULT = "vn"


def _routing_code(raw: str | None, *, room_meta_lang: str | None = None) -> str:
    from_arg = normalize_routing_lang(raw)
    if from_arg:
        return from_arg
    return resolve_routing_lang(room_meta_lang=room_meta_lang)


def get_voicebot_module(
    routing_lang: str | None = None,
    *,
    room_meta_lang: str | None = None,
) -> ModuleType:
    """Return `app.voicebot.locales.vn` or `app.voicebot.locales.en` (exports DriverAgent, …)."""
    code = _routing_code(routing_lang, room_meta_lang=room_meta_lang)
    if code not in _SUPPORTED:
        code = _DEFAULT
    return import_module(f"app.voicebot.locales.{code}")


def _agent_module(routing_lang: str) -> ModuleType:
    """Agent module holds tool lists and agent classes."""
    code = normalize_routing_lang(routing_lang) or _DEFAULT
    if code not in _SUPPORTED:
        code = _DEFAULT
    return import_module(f"app.voicebot.locales.{code}.agent")


def get_inbound_tools(routing_lang: str) -> list[Callable[..., Any]]:
    return list(_agent_module(routing_lang)._DRIVER_INBOUND_TOOLS)


def get_outbound_tools(routing_lang: str) -> list[Callable[..., Any]]:
    return list(_agent_module(routing_lang)._DRIVER_OUTBOUND_TOOLS)


def inbound_tool_names(routing_lang: str) -> list[str]:
    return [_tool_name(t) for t in get_inbound_tools(routing_lang)]


def outbound_tool_names(routing_lang: str) -> list[str]:
    return [_tool_name(t) for t in get_outbound_tools(routing_lang)]


def _tool_name(tool: Any) -> str:
    name = getattr(tool, "name", None) or getattr(tool, "__name__", None)
    if not name and hasattr(tool, "__func__"):
        name = getattr(tool.__func__, "__name__", None)
    if not name:
        raise TypeError(f"Cannot resolve tool name from {tool!r}")
    return str(name)
