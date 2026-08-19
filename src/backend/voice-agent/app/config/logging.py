import logging
import logging.handlers
import os

_LOG_FILE = os.getenv("LOG_FILE", "logs/agent.log")
_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()


def setup_logging() -> None:
    os.makedirs(os.path.dirname(_LOG_FILE), exist_ok=True)

    root = logging.getLogger()
    root.setLevel(_LOG_LEVEL)

    # LiveKit prewarms several job processes, each calling this at startup —
    # guard against re-adding handlers if it's ever invoked twice in the same
    # process (would otherwise print every line multiple times).
    if root.handlers:
        return

    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    ch = logging.StreamHandler()
    ch.setFormatter(fmt)
    root.addHandler(ch)

    # Rotating file handler — one file per OS process. LiveKit's job-process
    # pool means several processes call this concurrently; if they all
    # shared one filename, RotatingFileHandler's rollover (os.rename) would
    # fail on Windows the moment the file hit maxBytes, because another
    # process still has it open (PermissionError: WinError 32) — rotation
    # would then fail forever and spam "--- Logging error ---" on every log
    # line. Namespacing by pid gives each process its own file to rotate.
    base, ext = os.path.splitext(_LOG_FILE)
    log_file = f"{base}.{os.getpid()}{ext}"
    fh = logging.handlers.RotatingFileHandler(
        log_file, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
    )
    fh.setFormatter(fmt)
    root.addHandler(fh)

    # Quiet noisy third-party loggers
    for name in ("httpx", "httpcore", "livekit", "urllib3"):
        logging.getLogger(name).setLevel(logging.WARNING)
