"""Locale pack loader — manifest + per-lang YAML sections (data, not code)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

_LOCALES_DIR = Path(__file__).resolve().parents[2] / "voicebot" / "locales"
_MANIFEST_PATH = _LOCALES_DIR / "manifest.yaml"
_YAML_SUBDIR = "yaml"


@lru_cache
def load_manifest() -> dict[str, Any]:
    with _MANIFEST_PATH.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data


def supported_routing_langs() -> frozenset[str]:
    manifest = load_manifest()
    locales = manifest.get("locales") or {}
    return frozenset(str(k) for k in locales.keys())


def get_locale_bundle(routing_lang: str) -> dict[str, Any]:
    manifest = load_manifest()
    locales = manifest.get("locales") or {}
    bundle = locales.get(routing_lang)
    if not bundle:
        raise KeyError(f"Unsupported routing lang: {routing_lang!r}")
    return dict(bundle)


@lru_cache
def load_locale_section(routing_lang: str, section: str) -> dict[str, Any]:
    """Load `locales/{routing}/yaml/{section}.yaml` — greeting, spoken_intent, …"""
    path = _LOCALES_DIR / routing_lang / _YAML_SUBDIR / f"{section}.yaml"
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data if isinstance(data, dict) else {}


def load_spoken_intent_patterns(routing_lang: str) -> dict[str, Any]:
    return load_locale_section(routing_lang, "spoken_intent")
