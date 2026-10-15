#!/usr/bin/env python3
"""Khởi chạy một bản sao tác nhân cho thí nghiệm SC-02, RS-03.

Giống hệt app/main.py (cùng entrypoint, prewarm, cấu hình WorkerOptions), chỉ khác cổng
kiểm tra sức khỏe lấy từ biến BENCH_HEALTH_PORT, để nhiều bản sao chạy được trên cùng một
máy. Trên ECS, mỗi tác vụ có mạng riêng nên không cần điều này.

Chạy từ src/backend/llm-orchestrator:  BENCH_HEALTH_PORT=8082 .venv/bin/python <đường dẫn>/bench_worker.py start
"""
import os
import sys

sys.path.insert(0, os.getcwd())

from app.config.logging import setup_logging  # noqa: E402

setup_logging()

from livekit.agents import WorkerOptions, cli  # noqa: E402

from app.agent.session import entrypoint, prewarm  # noqa: E402
from app.config.settings import get_settings  # noqa: E402

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
            num_idle_processes=1,
            port=int(os.environ.get("BENCH_HEALTH_PORT", "8081")),
        )
    )
