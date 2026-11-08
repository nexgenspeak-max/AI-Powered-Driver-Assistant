#!/usr/bin/env python3
"""Print how Czen will say a sentence after the pronunciation lexicon runs.

Usage (from llm-orchestrator root):
  .venv/bin/python scripts/preview_pronunciation.py "Xe 30A-123.45 đến lúc 14:30"
  .venv/bin/python scripts/preview_pronunciation.py --lang en "ETA 5 min"

Edit app/voicebot/locales/vn/pronunciation.toml to change a reading.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.voicebot.speech_text_fix import fix_speech_text, pronunciations_for_lang


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("text", nargs="+")
    parser.add_argument("--lang", default="vn", choices=["vn", "en"])
    args = parser.parse_args()
    text = " ".join(args.text)
    print(fix_speech_text(text, pronunciations_for_lang(args.lang), args.lang))


if __name__ == "__main__":
    main()
