#!/usr/bin/env python3
"""afterFileEdit — mark the turn as needing a Second Brain distill, unless the edit was memory itself."""
from __future__ import annotations

import json
import sys
from pathlib import Path

SENTINEL = Path(".cursor/hooks/.need-distill")


def _paths(payload: dict) -> list[str]:
    found: list[str] = []
    for key in ("file_path", "path", "uri", "filePath"):
        value = payload.get(key)
        if isinstance(value, str) and value:
            found.append(value)
    for edit in payload.get("edits") or []:
        if isinstance(edit, dict):
            found.extend(_paths(edit))
    file_ = payload.get("file")
    if isinstance(file_, dict):
        found.extend(_paths(file_))
    return found


def _is_memory(path: str) -> bool:
    normalized = path.replace("\\", "/")
    return "/.claude/projects/" in normalized and "/memory/" in normalized


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print("{}")
        return

    paths = _paths(payload if isinstance(payload, dict) else {})
    if not paths:
        print("{}")
        return

    if all(_is_memory(p) for p in paths):
        print("{}")
        return

    SENTINEL.parent.mkdir(parents=True, exist_ok=True)
    SENTINEL.write_text("\n".join(paths), encoding="utf-8")
    print("{}")


if __name__ == "__main__":
    main()
