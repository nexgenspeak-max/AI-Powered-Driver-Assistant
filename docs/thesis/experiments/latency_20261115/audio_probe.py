#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tai xe ao: noi cau tieng Viet (giong may macOS 'Linh') vao phong LiveKit that de do do tre phan hoi.
Chi dung cau chi doc / hoi dap; khong co cau tao cuoc goi, SMS hay doi trang thai chuyen.
Chi so chinh lay tu nhat ky tac nhan (turn wall user_stop_to_agent_speak); script cung ghi do tre phia may khach."""
from __future__ import annotations
import argparse, array, asyncio, hashlib, json, math, os, subprocess, sys, time, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4] / "src/backend/llm-orchestrator"
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)
import httpx
from dotenv import load_dotenv
from livekit import rtc
load_dotenv(ROOT / f"envs/.env.{os.getenv('ENV', 'local')}")
from app.config.local_config import load_config_env
load_config_env()
from app.services.service_token import auth_headers

HERE = Path(__file__).resolve().parent
WAV = HERE / "wav"
TRIP = os.getenv("TRIP_SERVICE_URL", "http://localhost:8002")
SR = 48000; FRAME = 480  # 10 ms

UTTERANCES = [
    # UC01 xem lich chuyen / chuyen hien tai
    "Hôm nay tôi còn mấy chuyến?", "Tôi có chuyến nào sắp tới không?", "Cho tôi xem lịch chuyến.",
    "Chuyến tiếp theo của tôi là gì?", "Chuyến hiện tại của tôi thế nào?", "Lịch trình của tôi hôm nay thế nào?",
    "Điểm đón ở đâu?", "Khách đứng ở đâu?",
    # thu nhap, danh gia
    "Hôm nay tôi kiếm được bao nhiêu?", "Thu nhập hôm nay thế nào?", "Điểm đánh giá của tôi bao nhiêu?",
    "Hôm nay có thưởng không?",
    # UC07 hoi cach su dung
    "Bạn có thể giúp gì?", "Làm sao để gọi khách?", "Làm sao để xem thu nhập trong ứng dụng?",
    "Tôi hủy chuyến thì làm thế nào?",
    # lien lac khach (chi doc)
    "Cuộc gọi vừa rồi khách nói gì?", "Tóm tắt cuộc gọi giúp tôi.",
    # tro chuyen, loi khuyen
    "Đi cao tốc cần lưu ý gì?", "Trời mưa lái sao cho an toàn?", "Cảm ơn nhiều.", "Hôm nay trời đẹp nhỉ.",
]

def synth(text: str) -> Path:
    out = WAV / (hashlib.md5(text.encode()).hexdigest()[:12] + ".wav")
    if not out.exists():
        aiff = out.with_suffix(".aiff")
        subprocess.run(["say", "-v", "Linh", "-o", str(aiff), text], check=True)
        subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{SR}", "-c", "1", str(aiff), str(out)], check=True)
        aiff.unlink()
    return out

def load_pcm(p: Path) -> array.array:
    with wave.open(str(p)) as w:
        assert w.getframerate() == SR and w.getnchannels() == 1 and w.getsampwidth() == 2
        a = array.array("h"); a.frombytes(w.readframes(w.getnframes()))
    end = len(a)
    while end > 0 and abs(a[end - 1]) < 200: end -= 1   # cat khoang lang cuoi tep
    return a[: min(len(a), end + SR // 20)]

class Speaker:
    """Phat lien tuc: im lang, hoac cau dang cho trong hang doi."""
    def __init__(self, source: rtc.AudioSource):
        self.source = source; self.queue: array.array | None = None; self.pos = 0
        self.done = asyncio.Event(); self.done.set(); self.stop = False
    def say(self, pcm: array.array):
        self.queue = pcm; self.pos = 0; self.done.clear()
    async def run(self):
        silence = array.array("h", [0] * FRAME)
        nxt = time.perf_counter()
        while not self.stop:
            if self.queue is not None:
                chunk = self.queue[self.pos:self.pos + FRAME]; self.pos += FRAME
                if len(chunk) < FRAME:
                    chunk.extend([0] * (FRAME - len(chunk)))
                if self.pos >= len(self.queue):
                    self.queue = None; self.done.set()
            else:
                chunk = silence
            await self.source.capture_frame(rtc.AudioFrame(chunk.tobytes(), SR, 1, FRAME))
            nxt += 0.01
            d = nxt - time.perf_counter()
            if d > 0: await asyncio.sleep(d)

class Listener:
    def __init__(self): self.last_voice = 0.0; self.first_voice_after: float | None = None; self.mark = None
    async def run(self, track: rtc.Track):
        async for ev in rtc.AudioStream(track):
            s = array.array("h"); s.frombytes(bytes(ev.frame.data))
            if not s: continue
            rms = math.sqrt(sum(x * x for x in s[::4]) / (len(s) / 4))
            if rms > 250:
                now = time.perf_counter(); self.last_voice = now
                if self.mark is not None and self.first_voice_after is None and now > self.mark:
                    self.first_voice_after = now
    def arm(self): self.mark = time.perf_counter(); self.first_voice_after = None
    async def wait_reply(self, timeout=30.0, quiet=1.5):
        t0 = time.perf_counter()
        while time.perf_counter() - t0 < timeout:
            await asyncio.sleep(0.05)
            if self.first_voice_after is not None and time.perf_counter() - self.last_voice > quiet:
                return True
        return self.first_voice_after is not None
    async def wait_quiet(self, quiet=1.5, timeout=25.0):
        t0 = time.perf_counter()
        while time.perf_counter() - t0 < timeout:
            await asyncio.sleep(0.05)
            if self.last_voice and time.perf_counter() - self.last_voice > quiet: return
    
async def session(phone: str, utts: list[str], out) -> None:
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{TRIP}/api/v1/voice/token", params={"driver_phone": phone}, headers=auth_headers())
        r.raise_for_status(); d = r.json()
    room = rtc.Room(); lis = Listener(); tasks = []
    @room.on("track_subscribed")
    def _sub(track, pub, participant):
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            tasks.append(asyncio.create_task(lis.run(track)))
    await room.connect(d["livekit_url"], d["token"])
    src = rtc.AudioSource(SR, 1); spk = Speaker(src)
    track = rtc.LocalAudioTrack.create_audio_track("mic", src)
    await room.local_participant.publish_track(track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE))
    tasks.append(asyncio.create_task(spk.run()))
    print(f"room={d['room_name']}", flush=True)
    for _ in range(150):                      # cho tac nhan vao phong (toi da 15 s)
        if room.remote_participants: break
        await asyncio.sleep(0.1)
    if not room.remote_participants:
        print("  no agent joined; ending session", flush=True)
        utts = []
    await asyncio.sleep(4.0); await lis.wait_quiet(quiet=2.0, timeout=30.0)   # cho loi chao ket thuc
    for u in utts:
        pcm = load_pcm(synth(u))
        spk.say(pcm); await spk.done.wait()
        end = time.perf_counter(); lis.arm()
        ok = await lis.wait_reply()
        lat = (lis.first_voice_after - end) if lis.first_voice_after else None
        rec = {"room": d["room_name"], "utt": u, "client_latency_s": round(lat, 2) if lat else None, "replied": ok,
               "ts": time.strftime("%Y-%m-%d %H:%M:%S")}
        out.write(json.dumps(rec, ensure_ascii=False) + "\n"); out.flush()
        print(f"  {rec['client_latency_s']}s  {u}", flush=True)
        await asyncio.sleep(1.0)
    spk.stop = True
    ids = [p.identity for p in room.remote_participants.values()] + [room.local_participant.identity]
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            await c.post(f"{TRIP}/api/v1/voice/end-session", json={"room_name": d["room_name"], "participant_identities": ids}, headers=auth_headers())
    except Exception as e:
        print("  end-session error:", repr(e), flush=True)
    await room.disconnect()
    for t in tasks: t.cancel()

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--phone", default="0900111000"); ap.add_argument("--sessions", type=int, default=1)
    ap.add_argument("--per-session", type=int, default=3); ap.add_argument("--out", default=str(HERE / "results.jsonl"))
    a = ap.parse_args()
    WAV.mkdir(exist_ok=True)
    k = 0
    with open(a.out, "a", encoding="utf-8") as out:
        for s in range(a.sessions):
            utts = [UTTERANCES[(k + i) % len(UTTERANCES)] for i in range(a.per_session)]; k += a.per_session
            try:
                await session(a.phone, utts, out)
            except Exception as e:
                print("session error:", repr(e), flush=True)
            await asyncio.sleep(6.0)
asyncio.run(main())
