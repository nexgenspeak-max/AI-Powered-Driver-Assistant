#!/usr/bin/env python3
"""Máy chủ giả lập API tương thích OpenAI cho thí nghiệm SC-01, SC-02, RS-03.

Thay STT, LLM, TTS bằng phản hồi cố định với độ trễ cố định, để kết quả phản ánh
kiến trúc (LiveKit, tác nhân, VAD, bộ phát hiện kết thúc lượt) chứ không phản ánh
nhà cung cấp AI, và không tốn chi phí API.

  POST /v1/audio/transcriptions -> {"text": ...}           sau STT_DELAY giây
  POST /v1/chat/completions     -> luồng SSE, token đầu sau LLM_TTFT giây
  POST /v1/audio/speech         -> tệp WAV giọng nói tiếng Việt sau TTS_DELAY giây
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import time

from aiohttp import web

HERE = os.path.dirname(os.path.abspath(__file__))
REPLY = "Dạ, tôi đã nhận yêu cầu. Chuyến tiếp theo của bạn đón khách lúc chín giờ."


def build_app(stt_delay: float, llm_ttft: float, tts_delay: float) -> web.Application:
    with open(os.path.join(HERE, "sc_assets", "reply.wav"), "rb") as fh:
        wav = fh.read()
    counters = {"stt": 0, "llm": 0, "tts": 0}

    async def stt(request: web.Request) -> web.Response:
        await request.read()
        counters["stt"] += 1
        await asyncio.sleep(stt_delay)
        return web.json_response({"text": "Chuyến tiếp theo của tôi lúc mấy giờ?"})

    async def chat(request: web.Request) -> web.StreamResponse:
        body = await request.json()
        counters["llm"] += 1
        resp = web.StreamResponse(headers={"Content-Type": "text/event-stream"})
        await resp.prepare(request)
        await asyncio.sleep(llm_ttft)
        cid, created, model = f"chatcmpl-{counters['llm']}", int(time.time()), body.get("model", "fake")
        for i, word in enumerate(REPLY.split(" ")):
            delta = {"role": "assistant", "content": word + " "} if i == 0 else {"content": word + " "}
            chunk = {"id": cid, "object": "chat.completion.chunk", "created": created, "model": model,
                     "choices": [{"index": 0, "delta": delta, "finish_reason": None}]}
            await resp.write(f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n".encode())
            await asyncio.sleep(0.01)
        done = {"id": cid, "object": "chat.completion.chunk", "created": created, "model": model,
                "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]}
        usage = {"id": cid, "object": "chat.completion.chunk", "created": created, "model": model, "choices": [],
                 "usage": {"prompt_tokens": 1200, "completion_tokens": 20, "total_tokens": 1220}}
        for c in (done, usage):
            await resp.write(f"data: {json.dumps(c)}\n\n".encode())
        await resp.write(b"data: [DONE]\n\n")
        await resp.write_eof()
        return resp

    async def speech(request: web.Request) -> web.StreamResponse:
        await request.read()
        counters["tts"] += 1
        await asyncio.sleep(tts_delay)
        resp = web.StreamResponse(headers={"Content-Type": "audio/wav"})
        await resp.prepare(request)
        for i in range(0, len(wav), 8192):
            await resp.write(wav[i:i + 8192])
        await resp.write_eof()
        return resp

    async def stats(_request: web.Request) -> web.Response:
        return web.json_response(counters)

    app = web.Application(client_max_size=50 * 1024 * 1024)
    app.router.add_post("/v1/audio/transcriptions", stt)
    app.router.add_post("/v1/chat/completions", chat)
    app.router.add_post("/v1/audio/speech", speech)
    app.router.add_get("/stats", stats)
    return app


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=18600)
    ap.add_argument("--stt-delay", type=float, default=0.3)
    ap.add_argument("--llm-ttft", type=float, default=0.8)
    ap.add_argument("--tts-delay", type=float, default=0.2)
    a = ap.parse_args()
    web.run_app(build_app(a.stt_delay, a.llm_ttft, a.tts_delay), host="127.0.0.1", port=a.port, print=None)
