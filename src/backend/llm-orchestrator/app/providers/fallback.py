"""Chain a primary speech provider with backups.

Empty fallback env means one provider, same as before. A backup uses that
provider's own default model and voice so a GPT model name is not sent to Gemini.
"""
from __future__ import annotations

import logging
from typing import Any, Callable

from app.devlog import event

logger = logging.getLogger("llm-orchestrator.providers.fallback")

_LLM_ALIAS = {"google": "gemini", "moonshot": "kimi"}


def provider_chain(primary: str, fallback: str, *, aliases: dict[str, str] | None = None) -> list[str]:
    """Primary first, then comma-separated backups, without duplicates."""
    table = aliases or {}

    def canon(name: str) -> str:
        key = name.strip().lower()
        return table.get(key, key)

    names: list[str] = []
    for raw in (primary, *(part for part in fallback.split(","))):
        name = canon(raw)
        if name and name not in names:
            names.append(name)
    return names


def with_fallback(instances: list[Any], adapter_cls: Callable[..., Any], **kwargs: Any) -> Any:
    """Return the single instance, or a LiveKit FallbackAdapter when there are backups."""
    if len(instances) < 2:
        return instances[0]
    return adapter_cls(instances, **kwargs)


def log_provider_availability(adapter: Any, *, kind: str, event_name: str, attr: str) -> None:
    """DEV line when a provider in the chain is marked down or recovers."""

    def _on(ev: Any) -> None:
        inst = getattr(ev, attr, None)
        label = getattr(inst, "label", None) or getattr(inst, "provider", None) or "-"
        available = bool(getattr(ev, "available", False))
        event(
            "provider_fallback",
            ok=available,
            kind=kind,
            provider=str(label),
        )
        logger.log(
            logging.INFO if available else logging.WARNING,
            "provider_fallback kind=%s provider=%s available=%s",
            kind,
            label,
            available,
        )

    adapter.on(event_name, _on)
