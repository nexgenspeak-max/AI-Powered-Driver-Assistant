"""Path helpers for per-language FAQ knowledge and vector indexes."""

from __future__ import annotations

from pathlib import Path

from app.config.settings import Settings

_VOICE_AGENT_ROOT = Path(__file__).resolve().parents[2]
FAQ_LANGUAGES = ("vi", "en")


def resolve_path(path: str) -> Path:
    candidate = Path(path)
    if candidate.is_absolute():
        return candidate
    return (_VOICE_AGENT_ROOT / candidate).resolve()


def knowledge_dir(settings: Settings, language: str) -> Path:
    return resolve_path(settings.faq_knowledge_dir) / language


def index_dir(settings: Settings, language: str) -> Path:
    return resolve_path(settings.faq_index_dir) / language


def normalize_language(language: str) -> str:
    lang = (language or "vi").split("-")[0].lower()
    return lang if lang in FAQ_LANGUAGES else "vi"
