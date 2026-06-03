import logging
import logging.handlers
import os

_LOG_FILE = os.getenv("LOG_FILE", "logs/agent.log")
_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()


def setup_logging() -> None:
    os.makedirs(os.path.dirname(_LOG_FILE), exist_ok=True)

    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    root = logging.getLogger()
    root.setLevel(_LOG_LEVEL)

    # Console handler
    ch = logging.StreamHandler()
    ch.setFormatter(fmt)
    root.addHandler(ch)

    # Rotating file handler
    fh = logging.handlers.RotatingFileHandler(
        _LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
    )
    fh.setFormatter(fmt)
    root.addHandler(fh)

    # Quiet noisy third-party loggers
    for name in ("httpx", "httpcore", "livekit", "urllib3"):
        logging.getLogger(name).setLevel(logging.WARNING)
