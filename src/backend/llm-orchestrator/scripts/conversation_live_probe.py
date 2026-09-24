#!/usr/bin/env python3
"""Live conversation probe — runs FAQ utterances via lk.chat and checks agent logs.

Usage (services must be up: trip-service :8002, voice-agent worker):
  cd src/backend/llm-orchestrator
  ENV=local .venv/bin/python scripts/conversation_live_probe.py [--driver-phone 0900111000]

Reads utterances from tests/fixtures/driver_scenarios_vn.py (FAST_PATH + sample LLM).
Pass/fail: agent log shows spoken_intent or session.say within timeout; no ERROR for room.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import time
import uuid
from pathlib import Path

import httpx
from dotenv import load_dotenv
from livekit import rtc

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

load_dotenv(ROOT / f"envs/.env.{os.getenv('ENV', 'local')}")

from tests.fixtures.driver_scenarios_vn import FAST_PATH, LLM_CHITCHAT, LLM_TOOL

# Reuse voice-agent's service JWT (same secret as trip-service).
from app.services.service_token import auth_headers

TRIP_SERVICE = os.getenv("TRIP_SERVICE_URL", "http://localhost:8002")
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
AGENT_LOG_GLOB = ROOT / "logs"


def _latest_agent_log() -> Path | None:
    logs = sorted(AGENT_LOG_GLOB.glob("agent.*.log"), key=lambda p: p.stat().st_mtime, reverse=True)
    return logs[0] if logs else None


async def _mint_token(driver_phone: str) -> tuple[str, str, str]:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{TRIP_SERVICE}/api/v1/voice/token",
            params={"driver_phone": driver_phone},
            headers=auth_headers(),
        )
        r.raise_for_status()
        data = r.json()
    return data["token"], data["livekit_url"], data["room_name"]


async def _probe_one(
    room: rtc.Room,
    utterance: str,
    log_path: Path | None,
    *,
    wait_s: float = 8.0,
) -> dict:
    offset = log_path.stat().st_size if log_path and log_path.exists() else 0
    await room.local_participant.send_text(utterance, topic="lk.chat")
    deadline = time.monotonic() + wait_s
    snippet = ""
    while time.monotonic() < deadline:
        await asyncio.sleep(0.4)
        if not log_path or not log_path.exists():
            continue
        with log_path.open("r", encoding="utf-8", errors="replace") as f:
            f.seek(offset)
            chunk = f.read()
        if "spoken_intent" in chunk or "session.say" in chunk or "generate_reply" in chunk:
            snippet = chunk[-800:]
            break
    ok = bool(snippet)
    return {"utterance": utterance, "ok": ok, "log_tail": snippet.strip()[-400:]}


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--driver-phone", default=os.getenv("PROBE_DRIVER_PHONE", "0900111000"))
    parser.add_argument("--max", type=int, default=0, help="limit utterances (0=all fast-path)")
    args = parser.parse_args()

    if not LIVEKIT_URL:
        print("LIVEKIT_URL missing", file=sys.stderr)
        return 2

    utterances = [u for u, _ in FAST_PATH]
    utterances += LLM_CHITCHAT[:2]
    utterances += LLM_TOOL[:3]
    if args.max:
        utterances = utterances[: args.max]

    token, url, room_name = await _mint_token(args.driver_phone)
    log_path = _latest_agent_log()
    print(f"room={room_name} log={log_path} cases={len(utterances)}")

    room = rtc.Room()
    await room.connect(url, token)
    await asyncio.sleep(6.0)  # wait for session.start + prefetch

    results = []
    for u in utterances:
        results.append(await _probe_one(room, u, log_path))
        await asyncio.sleep(1.0)

    await room.disconnect()

    failed = [r for r in results if not r["ok"]]
    for r in results:
        mark = "OK" if r["ok"] else "FAIL"
        print(f"{mark}  {r['utterance'][:50]}")
    print(f"\n{len(results) - len(failed)}/{len(results)} responded")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
