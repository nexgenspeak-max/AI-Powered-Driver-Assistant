#!/usr/bin/env python3
"""RS-01, RS-02, RS-04: tiêm lỗi ở mức thành phần cho tác nhân hội thoại.

Gọi trực tiếp các công cụ thật của gói tiếng Việt (update_trip_status, send_sms_to_customer,
call_customer) và hàm ghi bản ghi cuộc gọi, trong khi dịch vụ đích được thay bằng máy chủ
tiêm lỗi: trả 503, treo lâu hơn thời gian chờ, hoặc không lắng nghe (từ chối kết nối).

Một lượt thử "đạt" khi: không có ngoại lệ thoát ra ngoài công cụ (StopResponse là bình thường)
và câu cuối cùng tác nhân nói là câu báo không thực hiện được (chứa "Không thể").

Chạy (từ src/backend/llm-orchestrator):
  .venv/bin/python ../../../docs/thesis/experiments/rs_component_faults.py --trials 20
"""
from __future__ import annotations

import argparse
import asyncio
import os
import statistics as st
import time
from unittest.mock import AsyncMock, MagicMock

from aiohttp import web

PORT_503, PORT_HANG, PORT_DOWN = 18501, 18502, 18503   # 18503: không có máy chủ nào lắng nghe


async def start_fault_servers():
    async def err503(_req):
        return web.json_response({"detail": "injected 503"}, status=503)

    async def hang(_req):
        await asyncio.sleep(120)
        return web.json_response({})

    runners = []
    for port, handler in ((PORT_503, err503), (PORT_HANG, hang)):
        app = web.Application()
        app.router.add_route("*", "/{tail:.*}", handler)
        runner = web.AppRunner(app)
        await runner.setup()
        await web.TCPSite(runner, "127.0.0.1", port).start()
        runners.append(runner)
    return runners


def point_services_to(port: int) -> None:
    url = f"http://127.0.0.1:{port}"
    os.environ["EXTERNAL_API_SERVICE_URL"] = url
    os.environ["CALL_RECORDS_SERVICE_URL"] = url
    from app.config.settings import get_settings
    get_settings.cache_clear()


def make_context():
    from app.voicebot.processors import context_store
    userdata = {"driver_phone": "0900000001", "room_name": "driver-0900000001-rs", "context": {}}
    context_store.load_driver_context(userdata, {
        "upcoming_trips": [{"trip_id": "t1", "status": "confirmed", "customer_name": "An",
                            "customer_phone": "+84901111111", "pickup_address": "Lotte"}],
        "current_trip": {"trip_id": "t1", "status": "confirmed", "customer_name": "An",
                         "customer_phone": "+84901111111", "pickup_address": "Lotte"},
    })
    ctx = MagicMock()
    ctx.userdata = userdata
    ctx.session.say = AsyncMock()
    ctx.session.generate_reply = AsyncMock()
    return ctx


SUCCESS_WORDS = ("Đã cập nhật", "Đã gửi", "đã kết nối")


async def run_tool(tool, args) -> tuple[bool, float, str]:
    from livekit.agents import StopResponse
    ctx = make_context()
    t0 = time.perf_counter()
    try:
        await tool.__wrapped__(args, ctx)
    except StopResponse:
        pass
    except Exception as exc:  # ngoại lệ thoát ra ngoài công cụ: phiên có thể bị ảnh hưởng
        return False, time.perf_counter() - t0, f"EXC {type(exc).__name__}"
    dt = time.perf_counter() - t0
    msgs = [str(c.args[0]) for c in ctx.session.say.await_args_list if c.args]
    last = msgs[-1] if msgs else ""
    ok = "Không thể" in last and not any(w in last for w in SUCCESS_WORDS)
    return ok, dt, last


async def run_record(_unused=None) -> tuple[bool, float, str]:
    from app.services.conversation_service import ConversationService
    t0 = time.perf_counter()
    try:
        await ConversationService._post_record(None, {"call_id": "rs01", "turns": []}, log_label="rs01")
    except Exception as exc:
        return False, time.perf_counter() - t0, f"EXC {type(exc).__name__}"
    return True, time.perf_counter() - t0, "không ném ngoại lệ"


async def main(trials: int) -> None:
    import logging
    logging.disable(logging.CRITICAL)
    from app.voicebot.locales.vn.tools.call_customer import call_customer
    from app.voicebot.locales.vn.tools.send_sms_to_customer import send_sms_to_customer
    from app.voicebot.locales.vn.tools.update_trip_status import update_trip_status

    runners = await start_fault_servers()
    cases = [
        ("RS-01", "Dịch vụ Nhật ký cuộc gọi không phản hồi (từ chối kết nối)", PORT_DOWN, run_record, None),
        ("RS-01", "Dịch vụ Nhật ký cuộc gọi trả 503", PORT_503, run_record, None),
        ("RS-02", "Cập nhật trạng thái: API trả 503", PORT_503, run_tool, (update_trip_status, {"status": "ARRIVED_PICKUP"})),
        ("RS-02", "Cập nhật trạng thái: API treo quá thời gian chờ", PORT_HANG, run_tool, (update_trip_status, {"status": "ARRIVED_PICKUP"})),
        ("RS-02", "Cập nhật trạng thái: API không phản hồi (từ chối kết nối)", PORT_DOWN, run_tool, (update_trip_status, {"status": "ARRIVED_PICKUP"})),
        ("RS-04", "Gửi SMS: kênh tin nhắn trả lỗi (503)", PORT_503, run_tool, (send_sms_to_customer, {"message": "Tôi đến trong 5 phút"})),
        ("RS-04", "Gọi khách: khởi tạo cuộc gọi trả lỗi (503)", PORT_503, run_tool, (call_customer, {})),
    ]
    print(f"trials={trials}")
    for code, label, port, fn, arg in cases:
        point_services_to(port)
        res = []
        for _ in range(trials):
            if fn is run_tool:
                res.append(await run_tool(*arg))
            else:
                res.append(await fn())
        ok = [r for r in res if r[0]]
        times = [r[1] for r in res]
        print(f"{code} | {label} | đạt {len(ok)}/{trials} | thời gian đến khi báo lỗi: trung vị {st.median(times):.2f}s, lớn nhất {max(times):.2f}s | ví dụ: {res[0][2]}", flush=True)
    for r in runners:
        await r.cleanup()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=20)
    asyncio.run(main(ap.parse_args().trials))
