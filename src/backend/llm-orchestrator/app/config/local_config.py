"""Non-secret settings from envs/config.{ENV}.toml.

API keys stay in envs/.env.{ENV}. This module only fills os.environ for
callers that read config with getenv (logging, SIP setup, probes). Settings
also reads the same file, and an already-set environment variable wins.
"""

from __future__ import annotations

import os
import tomllib
from pathlib import Path

_BASE_DIR = Path(__file__).resolve().parents[2]


def config_path() -> Path | None:
    override = os.getenv("CONFIG_FILE")
    if override:
        path = Path(override)
        return path if path.is_file() else None
    if os.getenv("PYTEST_CURRENT_TEST"):
        return None
    env_name = os.getenv("ENV", "local")
    path = _BASE_DIR / "envs" / f"config.{env_name}.toml"
    return path if path.is_file() else None


def load_config_env() -> None:
    """Copy toml values into os.environ when the variable is not already set."""
    path = config_path()
    if path is None:
        return
    with path.open("rb") as handle:
        data = tomllib.load(handle)
    for key, value in data.items():
        if not isinstance(key, str) or isinstance(value, (dict, list)) or value is None:
            continue
        env_key = key.upper()
        if env_key in os.environ:
            continue
        if isinstance(value, bool):
            os.environ[env_key] = "true" if value else "false"
        else:
            os.environ[env_key] = str(value)
