"""Canonical driver tool lists — parity checks and locale-bound loading."""
from __future__ import annotations

from typing import Any, Callable

from app.services.locale import normalize_tool_name
from app.voicebot.registry import (
    get_inbound_tools,
    get_outbound_tools,
    inbound_tool_names,
    outbound_tool_names,
)


def driver_inbound_tool_names(lang: str) -> list[str]:
    return inbound_tool_names(lang)


def driver_outbound_tool_names(lang: str) -> list[str]:
    return outbound_tool_names(lang)


def parity_diff(
    *,
    vn_tools: list[str],
    en_tools: list[str],
) -> tuple[set[str], set[str]]:
    """Return (missing_in_en, missing_in_vn) after normalizing end_session aliases."""
    vn = {normalize_tool_name(n) for n in vn_tools}
    en = {normalize_tool_name(n) for n in en_tools}
    return vn - en, en - vn


def load_driver_inbound_tools(lang: str) -> list[Callable[..., Any]]:
    return get_inbound_tools(lang)
