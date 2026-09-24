"""Canonical log line. Callers pass facts; this module owns the shape."""

from __future__ import annotations

from typing import Any

_MAX_VALUE = 240


def fmt_value(value: Any) -> str:
    if value is None:
        return "-"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float):
        if value != value:
            return "-"
        if abs(value) >= 10:
            return f"{value:.0f}"
        return f"{value:.2f}"
    text = str(value).replace("\n", " ").replace("\r", " ").strip()
    if len(text) > _MAX_VALUE:
        text = text[:_MAX_VALUE] + "…"
    if any(ch in text for ch in (" ", "=", '"')):
        return '"' + text.replace('"', "'") + '"'
    return text or "-"


def split_logger_name(name: str, default_service: str) -> tuple[str, str]:
    if not name:
        return default_service, "-"
    prefix = default_service + "."
    if name.startswith(prefix):
        return default_service, name[len(prefix) :] or "-"
    if name == default_service:
        return default_service, "-"
    return default_service, name


def format_line(
    *,
    ts: str,
    level: str,
    service: str,
    fn: str,
    room: str,
    conv: str,
    msg: str,
    fields: dict[str, Any] | None = None,
) -> str:
    """service fn room=… conv=… — message key=value

    Room and conv are always present (`-` when unknown) so concurrent
    sessions can be grepped without reading the prose.
    """
    prefix = (
        f"{ts} {level} {service} {fn} "
        f"room={fmt_value(room or '-')} conv={fmt_value(conv or '-')}"
    )
    body = msg.strip() if msg else ""
    extras: list[str] = []
    if fields:
        for key, value in fields.items():
            if value is None or value == "":
                continue
            extras.append(f"{key}={fmt_value(value)}")
    if body and extras:
        return f"{prefix} — {body} {' '.join(extras)}"
    if body:
        return f"{prefix} — {body}"
    if extras:
        return f"{prefix} — {' '.join(extras)}"
    return prefix
