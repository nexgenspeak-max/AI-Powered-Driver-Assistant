"""Request/session log context — contextvars so concurrent rooms do not mix."""

from __future__ import annotations

from contextvars import ContextVar

_room: ContextVar[str] = ContextVar("log_room", default="-")
_conv: ContextVar[str] = ContextVar("log_conv", default="-")


def bind(*, room: str | None = None, conv: str | None = None) -> None:
    """Attach correlation ids for the current asyncio task / thread."""
    if room:
        _room.set(room or "-")
    if conv:
        _conv.set(conv or "-")


def clear() -> None:
    _room.set("-")
    _conv.set("-")


def current_room() -> str:
    return _room.get() or "-"


def current_conv() -> str:
    return _conv.get() or "-"
