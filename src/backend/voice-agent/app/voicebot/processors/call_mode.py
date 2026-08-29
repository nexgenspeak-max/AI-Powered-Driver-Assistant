"""Resolve outbound call mode from driver utterance — two user-facing modes."""
from __future__ import annotations

_BRIDGE_HINTS_VN = (
    "tôi nói",
    "de toi noi",
    "nối máy",
    "noi truc tiep",
    "nói trực tiếp",
    "cho tôi nói",
    "để tôi nói",
)
_BRIDGE_HINTS_EN = (
    "talk directly",
    "let me speak",
    "connect me",
    "i'll speak",
    "i will speak",
)
_BACKGROUND_HINTS_VN = ("gọi nền", "goi nen", "nền thôi", "nen thoi")
_BACKGROUND_HINTS_EN = ("background call", "in the background", "while i drive")


def resolve_call_mode(text: str, *, lang: str = "vn", explicit: str | None = None) -> str:
    """Map driver intent to internal mode: agent (AI-led), bridge (direct), background."""
    if explicit in ("agent", "bridge", "background"):
        return explicit

    t = (text or "").lower()
    bridge_hints = _BRIDGE_HINTS_EN if lang == "en" else _BRIDGE_HINTS_VN
    bg_hints = _BACKGROUND_HINTS_EN if lang == "en" else _BACKGROUND_HINTS_VN

    if any(h in t for h in bridge_hints):
        return "bridge"
    if any(h in t for h in bg_hints):
        return "background"
    return "agent"
