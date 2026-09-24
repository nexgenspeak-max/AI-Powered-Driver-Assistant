"""Hide raw LLM tool-name leaks from driver chat and call records."""
from __future__ import annotations

import re

_TOOL_NAME_RE = re.compile(r"^[a-z][a-z0-9_]{2,48}$")

# EN driver agent registers end_call; VN uses end_conversation.
_EXTRA_TOOL_NAMES = frozenset({"end_call"})


def _known_tool_names() -> frozenset[str]:
    from app.voicebot.locales.vn.tools_definition import raw_schema

    return frozenset(raw_schema.keys()) | _EXTRA_TOOL_NAMES


def is_raw_tool_token(text: str) -> bool:
    """True when assistant text is a bare snake_case tool id (LLM leak)."""
    token = (text or "").strip()
    if not token or " " in token:
        return False
    if not _TOOL_NAME_RE.fullmatch(token):
        return False
    return token in _known_tool_names()
