import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

import os
from pathlib import Path
from dotenv import load_dotenv

# Anchored to this file's location, not the process's CWD — see settings.py
# for why a CWD-relative path here is unreliable across launch contexts.
_base_dir = Path(__file__).resolve().parents[1]
_env = os.getenv("ENV", "local")
_env_file = _base_dir / "envs" / f".env.{_env}"
if _env_file.exists():
    load_dotenv(_env_file)

from app.config.local_config import load_config_env

load_config_env()

from app.config.logging import setup_logging
setup_logging()

from livekit.agents import cli, WorkerOptions
from app.agent.session import entrypoint, prewarm
from app.config.settings import get_settings

if __name__ == "__main__":
    s = get_settings()
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            ws_url=s.livekit_url,
            api_key=s.livekit_api_key,
            api_secret=s.livekit_api_secret,
            agent_name=s.agent_name,
            initialize_process_timeout=60.0,
            # `dev` defaults num_idle_processes to 0, so the first job waits
            # ~1.5s to spawn a process ("no warmed process available").
            num_idle_processes=1,
        )
    )
