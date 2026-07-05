import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

import os
from pathlib import Path
from dotenv import load_dotenv

_env = os.getenv("ENV", "local")
_env_file = Path(f"envs/.env.{_env}")
if _env_file.exists():
    load_dotenv(_env_file)

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
        )
    )
