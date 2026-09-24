import logging
from typing import Any

from app.services.logger.context import current_conv, current_room
from app.services.logger.format import format_line, split_logger_name

_SERVICE = "llm-orchestrator"


class LineFormatter(logging.Formatter):
    """Injects service/fn/room/conv on every record from contextvars."""

    def format(self, record: logging.LogRecord) -> str:
        service, fn = split_logger_name(record.name, _SERVICE)
        service = getattr(record, "service", None) or service
        fn = getattr(record, "fn", None) or fn
        room = getattr(record, "room", None) or current_room()
        conv = getattr(record, "conv", None) or current_conv()
        fields = getattr(record, "log_fields", None)
        if not isinstance(fields, dict):
            fields = None
        ts = self.formatTime(record, datefmt="%Y-%m-%d %H:%M:%S")
        msg = record.getMessage()
        if record.exc_info and not record.exc_text:
            record.exc_text = self.formatException(record.exc_info)
        if record.exc_text:
            msg = f"{msg}\n{record.exc_text}"
        return format_line(
            ts=ts,
            level=record.levelname,
            service=service,
            fn=fn,
            room=str(room),
            conv=str(conv),
            msg=msg,
            fields=fields,
        )


class Logger:
    """Callers pass a message + facts. Line shape is not their job."""

    def __init__(self, fn: str, *, service: str = _SERVICE) -> None:
        self.fn = fn
        self.service = service
        self._logger = logging.getLogger(f"{service}.{fn}")

    def _emit(self, level: int, msg: str, **fields: Any) -> None:
        self._logger.log(
            level,
            msg,
            extra={
                "fn": self.fn,
                "service": self.service,
                "log_fields": fields,
            },
        )

    def debug(self, msg: str, **fields: Any) -> None:
        self._emit(logging.DEBUG, msg, **fields)

    def info(self, msg: str, **fields: Any) -> None:
        self._emit(logging.INFO, msg, **fields)

    def warning(self, msg: str, **fields: Any) -> None:
        self._emit(logging.WARNING, msg, **fields)

    def error(self, msg: str, **fields: Any) -> None:
        self._emit(logging.ERROR, msg, **fields)
