import logging
import logging.handlers
import os

from app.services.logger import LineFormatter

_LOG_FILE = os.getenv("LOG_FILE", "logs/agent.log")
_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()


def setup_logging() -> None:
    os.makedirs(os.path.dirname(_LOG_FILE), exist_ok=True)

    root = logging.getLogger()
    root.setLevel(_LOG_LEVEL)
    fmt = LineFormatter()

    # LiveKit prewarms several job processes, each calling this at startup —
    # guard against re-adding handlers if it's ever invoked twice in the same
    # process (would otherwise print every line multiple times). If handlers
    # already exist (LiveKit installed its own), still apply our formatter so
    # every line carries service/fn/room/conv.
    if root.handlers:
        for handler in root.handlers:
            handler.setFormatter(fmt)
        _quiet_third_party()
        return

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
    _quiet_third_party()


def _quiet_third_party() -> None:
    for name in ("httpx", "httpcore", "livekit", "urllib3"):
        logging.getLogger(name).setLevel(logging.WARNING)

    # Canonical line: `{ts} {LEVEL} {service} {fn} room=… conv=… — {msg}`
    # (see app/services/logger). Pipeline traces still contain `DEV `.
    # Grep one session:  grep 'room=driver-088' logs/agent.*.log
