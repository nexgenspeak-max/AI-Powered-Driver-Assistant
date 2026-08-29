#!/usr/bin/env python3
"""stop — if this turn edited the repo and did not update Claude memory, ask the agent to distill once."""
from __future__ import annotations

import json
import sys
from pathlib import Path

SENTINEL = Path(".cursor/hooks/.need-distill")
FOLLOWUP = (
    "This turn edited the repo but did not update Second Brain memory. "
    "Distill the durable facts into `~/.claude/projects/<escaped-cwd>/memory/` "
    "(snake_case `.md`, wikilink by filename, update MEMORY.md if you add a file). "
    "Follow `.claude/skills/second-brain/SKILL.md`. "
    "If nothing new belongs in memory, reply SKIP_DISTILL in one line and stop. "
    "Do not repeat this checklist after you have written or skipped."
)


def memory_dir() -> Path:
    escaped = str(Path.cwd().resolve()).replace("/", "-")
    return Path.home() / ".claude" / "projects" / escaped / "memory"


def latest_mtime(directory: Path) -> float:
    times = [p.stat().st_mtime for p in directory.glob("*.md") if p.is_file()]
    return max(times) if times else 0.0


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print("{}")
        return

    if payload.get("status") != "completed":
        print("{}")
        return
    if int(payload.get("loop_count") or 0) >= 1:
        print("{}")
        return
    if not SENTINEL.exists():
        print("{}")
        return

    sent_mtime = SENTINEL.stat().st_mtime
    mem = memory_dir()
    if mem.is_dir() and latest_mtime(mem) >= sent_mtime:
        SENTINEL.unlink(missing_ok=True)
        print("{}")
        return

    print(json.dumps({"followup_message": FOLLOWUP}))


if __name__ == "__main__":
    main()
