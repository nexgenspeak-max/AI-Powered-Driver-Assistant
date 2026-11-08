"""
Vietnamese TTS pronunciation — display text stays as-is; `SpeechTextFixMixin.tts_node`
transforms a copy right before synthesis.

The data lives in `pronunciation.toml` next to this file (edit that, not this):
  PRONUNCIATIONS        — whole-word replacements, case-sensitive, longest first
  ANY_CASE_WORDS        — whole-word replacements, any case, longest first
  ABBREVIATION_PATTERNS — regex rules (Q1, TP.HCM, 14:30, 5km, …), in file order
  PLATE_LETTERS         — spoken names of licence-plate series letters
"""
from __future__ import annotations

import tomllib
from pathlib import Path

LEXICON_PATH = Path(__file__).with_name("pronunciation.toml")


def _by_length(table: dict[str, str]) -> list[tuple[str, str]]:
    # Longest first so "km/h" wins over "km".
    return sorted(table.items(), key=lambda item: len(item[0]), reverse=True)


def load_lexicon(path: Path = LEXICON_PATH) -> dict:
    with path.open("rb") as f:
        data = tomllib.load(f)
    return {
        "words": _by_length(data.get("words", {})),
        "any_case": _by_length(data.get("words_any_case", {})),
        "patterns": [(rule["match"], rule["say"]) for rule in data.get("pattern", [])],
        "letters": dict(data.get("letters", {})),
    }


_LEXICON = load_lexicon()

PRONUNCIATIONS: list[tuple[str, str]] = _LEXICON["words"]
ANY_CASE_WORDS: list[tuple[str, str]] = _LEXICON["any_case"]
ABBREVIATION_PATTERNS: list[tuple[str, str]] = _LEXICON["patterns"]
PLATE_LETTERS: dict[str, str] = _LEXICON["letters"]
