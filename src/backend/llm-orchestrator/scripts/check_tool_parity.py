#!/usr/bin/env python3
"""Compare VN vs EN driver tool registration. Exit 1 when drift exceeds allowed gaps."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.voicebot.tool_registry import (  # noqa: E402
    driver_inbound_tool_names,
    driver_outbound_tool_names,
    parity_diff,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Check VN/EN driver tool parity")
    parser.add_argument(
        "--allow-missing-en",
        nargs="*",
        default=[],
        help="Normalized tool names allowed missing in EN inbound (empty = full parity required)",
    )
    args = parser.parse_args()
    allowed = set(args.allow_missing_en)

    vn_in = driver_inbound_tool_names("vn")
    en_in = driver_inbound_tool_names("en")
    missing_en, missing_vn = parity_diff(vn_tools=vn_in, en_tools=en_in)

    vn_out = driver_outbound_tool_names("vn")
    en_out = driver_outbound_tool_names("en")
    out_missing_en, out_missing_vn = parity_diff(vn_tools=vn_out, en_tools=en_out)

    print(f"VN inbound tools ({len(vn_in)}): {', '.join(vn_in)}")
    print(f"EN inbound tools ({len(en_in)}): {', '.join(en_in)}")

    unexpected_en = missing_en - allowed
    ok = True
    if unexpected_en:
        ok = False
        print(f"\nERROR: EN missing inbound tools (not in allow-list): {sorted(unexpected_en)}")
    elif missing_en:
        print(f"\nWARN: EN missing inbound tools (allowed Phase 0 gap): {sorted(missing_en)}")

    if missing_vn:
        ok = False
        print(f"\nERROR: VN missing inbound tools present in EN: {sorted(missing_vn)}")

    if out_missing_en or out_missing_vn:
        ok = False
        print(f"\nERROR: Outbound tool mismatch vn={vn_out} en={en_out}")

    if ok:
        print("\nOK: tool parity check passed (within Phase 0 allow-list)")
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
