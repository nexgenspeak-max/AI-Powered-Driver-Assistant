#!/usr/bin/env python3
"""RS-05: đo cơ chế dự phòng nhà cung cấp LLM ở mức thành phần.

Dùng đúng FallbackAdapter của LiveKit Agents với cấu hình của ứng dụng
(app/providers/__init__.py: attempt_timeout=5.0, max_retry_per_llm=0).
Nhà cung cấp chính và dự phòng là bộ giả lập có độ trễ cố định, để kết quả
phản ánh cơ chế chuyển đổi chứ không phụ thuộc mạng.

Chạy (từ src/backend/llm-orchestrator):
  .venv/bin/python ../../../docs/thesis/experiments/rs05_provider_fallback.py --trials 30
"""
from __future__ import annotations

import argparse
import asyncio
import statistics as st
import time

from livekit.agents import APIConnectionError, APITimeoutError, llm
from livekit.agents.llm import ChatChunk, ChatContext, ChoiceDelta
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS

PRIMARY_LATENCY = 1.0   # giây, thời gian sinh token đầu giả lập của nhà cung cấp chính
BACKUP_LATENCY = 1.0    # giây, của nhà cung cấp dự phòng
ATTEMPT_TIMEOUT = 5.0   # như app/providers/__init__.py
HANG_SECONDS = 12.0     # nhà cung cấp treo lâu hơn attempt_timeout


class FakeStream(llm.LLMStream):
    def __init__(self, owner: "FakeLLM", **kw):
        super().__init__(owner, **kw)
        self._owner = owner

    async def _run(self) -> None:
        mode = self._owner.mode
        if mode == "error":
            await asyncio.sleep(0.05)
            raise APIConnectionError("injected provider failure")
        if mode == "hang":
            # Như HTTP client của nhà cung cấp thật: chờ tối đa conn_options.timeout
            # (FallbackAdapter đặt bằng attempt_timeout) rồi báo hết thời gian chờ.
            await asyncio.sleep(min(HANG_SECONDS, self._conn_options.timeout))
            raise APITimeoutError("injected provider timeout")
        await asyncio.sleep(self._owner.latency)
        self._event_ch.send_nowait(ChatChunk(id="x", delta=ChoiceDelta(role="assistant", content="ok")))


class FakeLLM(llm.LLM):
    def __init__(self, name: str, mode: str, latency: float):
        super().__init__()
        self._label = name
        self.mode = mode
        self.latency = latency

    def chat(self, *, chat_ctx: ChatContext, tools=None, conn_options=DEFAULT_API_CONNECT_OPTIONS, **_):
        return FakeStream(self, chat_ctx=chat_ctx, tools=tools or [], conn_options=conn_options)


async def one_trial(primary_mode: str) -> tuple[bool, float]:
    adapter = llm.FallbackAdapter(
        [FakeLLM("primary", primary_mode, PRIMARY_LATENCY), FakeLLM("backup", "ok", BACKUP_LATENCY)],
        attempt_timeout=ATTEMPT_TIMEOUT,
        max_retry_per_llm=0,
    )
    ctx = ChatContext.empty()
    ctx.add_message(role="user", content="hôm nay còn mấy chuyến")
    t0 = time.perf_counter()
    try:
        async with adapter.chat(chat_ctx=ctx) as stream:
            async for chunk in stream:
                if chunk.delta and chunk.delta.content:
                    return True, time.perf_counter() - t0
        return False, time.perf_counter() - t0
    except Exception:
        return False, time.perf_counter() - t0
    finally:
        try:
            await asyncio.wait_for(adapter.aclose(), 2)
        except Exception:
            pass


async def main(trials: int) -> None:
    print(f"attempt_timeout={ATTEMPT_TIMEOUT}s primary_latency={PRIMARY_LATENCY}s backup_latency={BACKUP_LATENCY}s trials={trials}")
    for mode, label in (("ok", "Không lỗi (đường cơ sở)"), ("error", "Nhà cung cấp chính trả lỗi ngay"), ("hang", "Nhà cung cấp chính treo, không phản hồi")):
        res = [await one_trial(mode) for _ in range(trials)]
        ok = [t for s, t in res if s]
        print(
            f"{mode:5s} | {label} | thành công {len(ok)}/{trials} | "
            f"thời gian đến token đầu: trung vị {st.median(ok):.2f}s, nhỏ nhất {min(ok):.2f}s, lớn nhất {max(ok):.2f}s"
        )


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=30)
    asyncio.run(main(ap.parse_args().trials))
