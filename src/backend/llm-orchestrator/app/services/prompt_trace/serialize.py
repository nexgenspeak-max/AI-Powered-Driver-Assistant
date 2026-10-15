"""Pure LiveKit → JSON conversions for the prompt trace."""
from __future__ import annotations

import json
from typing import Any

from livekit.agents.llm import (
    ChatMessage,
    FunctionCall,
    FunctionCallOutput,
    Toolset,
    is_function_tool,
    is_raw_function_tool,
)
from livekit.agents.llm.utils import function_arguments_to_pydantic_model
from livekit.agents.utils import is_given

# Schemas are rebuilt via pydantic on every call otherwise; keyed by id(info),
# the info object is kept in the value so the id cannot be reused.
_SCHEMA_CACHE: dict[int, tuple[Any, dict[str, Any] | None]] = {}


def _message_text(item: ChatMessage) -> str:
    parts = [c for c in item.content if isinstance(c, str)]
    return "\n".join(parts)


def serialize_chat_item(item: Any) -> dict[str, Any]:
    if isinstance(item, ChatMessage):
        return {
            "type": "message",
            "role": item.role,
            "content": _message_text(item),
            "name": None,
            "call_id": None,
        }
    if isinstance(item, FunctionCall):
        return {
            "type": "function_call",
            "role": None,
            "content": item.arguments,
            "name": item.name,
            "call_id": item.call_id,
        }
    if isinstance(item, FunctionCallOutput):
        return {
            "type": "function_call_output",
            "role": None,
            "content": item.output,
            "name": item.name or None,
            "call_id": item.call_id,
        }
    return {
        "type": str(getattr(item, "type", type(item).__name__)),
        "role": None,
        "content": "",
        "name": None,
        "call_id": None,
    }


def serialize_chat_items(items: list[Any]) -> list[dict[str, Any]]:
    return [serialize_chat_item(item) for item in items]


def _function_parameters(tool: Any) -> dict[str, Any] | None:
    info = tool.info
    cached = _SCHEMA_CACHE.get(id(info))
    if cached is not None and cached[0] is info:
        return cached[1]
    try:
        schema = function_arguments_to_pydantic_model(tool).model_json_schema()
    except Exception:
        schema = None
    _SCHEMA_CACHE[id(info)] = (info, schema)
    return schema


def serialize_tool(tool: Any) -> dict[str, Any]:
    if is_raw_function_tool(tool):
        raw = tool.info.raw_schema or {}
        return {
            "name": tool.info.name,
            "description": raw.get("description"),
            "parameters": raw.get("parameters"),
        }
    if is_function_tool(tool):
        return {
            "name": tool.info.name,
            "description": tool.info.description,
            "parameters": _function_parameters(tool),
        }
    return {
        "name": str(getattr(tool, "id", type(tool).__name__)),
        "description": None,
        "parameters": None,
    }


def serialize_tools(tools: list[Any] | None) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for tool in tools or []:
        if isinstance(tool, Toolset):
            out.extend(serialize_tools(list(tool.tools)))
        else:
            out.append(serialize_tool(tool))
    return out


def serialize_tool_choice(model_settings: Any) -> str | None:
    choice = getattr(model_settings, "tool_choice", None)
    if choice is None or not is_given(choice):
        return None
    if isinstance(choice, str):
        return choice
    try:
        return json.dumps(choice, ensure_ascii=False)
    except (TypeError, ValueError):
        return str(choice)
