"""Writer lookup — per session on ``session.userdata`` (dict only), per room for devlog ops."""
from __future__ import annotations

from typing import Any

from app.services.prompt_trace.writer import PromptTraceWriter

USERDATA_KEY = "_prompt_trace"

# Keyed by the raw room name that app.services.logger binds as ``room=``.
_ROOM_WRITERS: dict[str, PromptTraceWriter] = {}


def _userdata(session: Any) -> dict | None:
    try:
        userdata = getattr(session, "userdata", None)
    except Exception:  # AgentSession.userdata raises when unset
        return None
    return userdata if isinstance(userdata, dict) else None


def store_writer(session: Any, writer: PromptTraceWriter) -> None:
    userdata = _userdata(session)
    if userdata is not None:
        userdata[USERDATA_KEY] = writer


def current_writer(session: Any) -> PromptTraceWriter | None:
    userdata = _userdata(session)
    if userdata is None:
        return None
    writer = userdata.get(USERDATA_KEY)
    return writer if isinstance(writer, PromptTraceWriter) else None


def register_room(writer: PromptTraceWriter) -> None:
    _ROOM_WRITERS[writer.room] = writer


def unregister_room(writer: PromptTraceWriter) -> None:
    if _ROOM_WRITERS.get(writer.room) is writer:
        _ROOM_WRITERS.pop(writer.room, None)


def writer_for_room(room: str | None) -> PromptTraceWriter | None:
    if not room:
        return None
    return _ROOM_WRITERS.get(room)
