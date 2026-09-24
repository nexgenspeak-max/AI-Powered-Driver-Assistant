"""Canonical structured logger for voice-agent.

Callers:

    from app.services.logger import get_logger, bind

    bind(room=room_name, conv=job_id)
    log = get_logger("silence_tracker")
    log.info("60s silence detected", count=1, of=3)

`bind` is task-local (contextvars) so concurrent rooms do not mix.
"""

from app.services.logger.adapter import Logger, LineFormatter
from app.services.logger.context import bind, clear, current_conv, current_room


def get_logger(fn: str, *, service: str = "llm-orchestrator") -> Logger:
    return Logger(fn, service=service)


__all__ = [
    "Logger",
    "LineFormatter",
    "bind",
    "clear",
    "current_conv",
    "current_room",
    "get_logger",
]
