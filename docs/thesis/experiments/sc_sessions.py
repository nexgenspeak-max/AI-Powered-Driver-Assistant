#!/usr/bin/env python3
"""SC-01, SC-02: phiên hội thoại đồng thời trên máy chủ LiveKit cục bộ.

Cấu hình: livekit-server --dev trong Docker; tác nhân thật (app.main start) chạy trên máy,
nhà cung cấp AI giả lập (fake_ai_server.py: STT 0,3 s, LLM token đầu 0,8 s, TTS 0,2 s);
`lk perf agent-load-test` mở N phòng, phân công tác nhân và phát lại giọng tác nhân như
người dùng nói, tạo vòng hội thoại liên tục.

Chỉ số lấy từ nhật ký turn_metrics của tác nhân, lọc theo tên phòng của lần chạy:
  - user_stop_to_agent_speak: từ lúc người dùng ngừng nói tới lúc tác nhân bắt đầu nói (độ trễ phản hồi)
  - tỷ lệ phiên được phục vụ: phòng có tác nhân vào và có ít nhất một lượt trả lời
CPU: tổng %CPU của các tiến trình tác nhân (lấy mẫu mỗi 2 giây bằng ps).

Dùng: python3 sc_sessions.py --label SC-01 --log-dir <thư mục nhật ký tác nhân> --levels 1 5 10 20 --duration 90
"""
from __future__ import annotations

import argparse
import glob
import re
import statistics as st
import subprocess
import threading
import time

WALL = re.compile(r"room=(\S+) .*turn wall user_stop_to_agent_speak=([\d.]+)s")
ROOM_ROW = re.compile(r"│\s*\d+\s*│\s*(room-\S+)\s*│[^│]*│\s*(\S)\s*│\s*([^│]*?)\s*│")


def pct(values, p):
    v = sorted(values)
    if not v:
        return float("nan")
    k = (len(v) - 1) * p
    lo, hi = int(k), min(int(k) + 1, len(v) - 1)
    return v[lo] + (v[hi] - v[lo]) * (k - lo)


def agent_cpu(pattern: str) -> tuple[float, float]:
    """%CPU và RSS (MB) cộng dồn của các bản sao tác nhân và mọi tiến trình con (tiến trình phiên)."""
    out = subprocess.run(["ps", "-axo", "pid=,ppid=,%cpu=,rss=,command="], capture_output=True, text=True).stdout
    procs = {}
    for line in out.splitlines():
        pid, ppid, cpu, rss, cmd = line.split(None, 4)
        procs[int(pid)] = (int(ppid), float(cpu), int(rss), cmd)
    roots = {pid for pid, v in procs.items()
             if any(x in v[3] for x in pattern.split("|")) and "ps -axo" not in v[3]}
    tree, changed = set(roots), True
    while changed:
        changed = False
        for pid, v in procs.items():
            if pid not in tree and v[0] in tree:
                tree.add(pid)
                changed = True
    return sum(procs[p][1] for p in tree), sum(procs[p][2] for p in tree) / 1024


def server_cpu() -> float:
    out = subprocess.run(["docker", "stats", "--no-stream", "--format", "{{.CPUPerc}}", "lkbench"],
                         capture_output=True, text=True).stdout.strip().rstrip("%")
    try:
        return float(out)
    except ValueError:
        return 0.0


def dur_s(text: str) -> float:
    m = re.match(r"([\d.]+)(ms|s|µs)", text.strip())
    if not m:
        return float("nan")
    return float(m.group(1)) / {"ms": 1000, "s": 1, "µs": 1e6}[m.group(2)]


def run_level(n: int, duration: int, log_dir: str, cpu_pattern: str) -> dict:
    samples, mems, srv, stop = [], [], [], threading.Event()

    def sampler():
        while not stop.is_set():
            cpu, mem = agent_cpu(cpu_pattern)
            samples.append(cpu)
            mems.append(mem)
            srv.append(server_cpu())
            stop.wait(2)

    th = threading.Thread(target=sampler, daemon=True)
    th.start()
    cmd = ["docker", "run", "--rm", "--network", "container:lkbench", "livekit/livekit-cli:latest",
           "perf", "agent-load-test", "--url", "http://localhost:7880", "--api-key", "devkey",
           "--api-secret", "secret", "--rooms", str(n), "--agent-name", "bench-agent",
           "--echo-speech-delay", "2s", "--duration", f"{duration}s"]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    stop.set()
    th.join()
    time.sleep(3)
    rows = ROOM_ROW.findall(out)
    rooms = {r[0] for r in rows}
    joined = [r for r in rows if r[1] == "✓"]
    join_delays = [dur_s(r[2]) for r in joined]
    seen, served = set(), set()
    for path in glob.glob(f"{log_dir}/**/*.log", recursive=True):
        with open(path, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                m = WALL.search(line)
                if m and m.group(1) in rooms:
                    # mỗi dòng xuất hiện ở cả nhật ký tiến trình chính và tiến trình phiên: bỏ trùng
                    seen.add((line[:19], m.group(1), m.group(2)))
                    served.add(m.group(1))
    walls = [float(v) for _, _, v in seen]
    return {"n": n, "rooms": len(rooms), "joined": len(joined), "served": len(served), "turns": len(walls),
            "p50": pct(walls, 0.5), "p95": pct(walls, 0.95),
            "join_p50": pct(join_delays, 0.5), "join_max": max(join_delays) if join_delays else float("nan"),
            "cpu_mean": st.mean(samples) if samples else 0.0, "cpu_max": max(samples) if samples else 0.0,
            "mem_max": max(mems) if mems else 0.0, "srv_max": max(srv) if srv else 0.0}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", default="SC-01")
    ap.add_argument("--log-dir", required=True)
    ap.add_argument("--levels", type=int, nargs="+", default=[1, 5, 10, 20])
    ap.add_argument("--duration", type=int, default=90)
    ap.add_argument("--cpu-pattern", default="app.main start|bench_worker.py start")
    a = ap.parse_args()
    print(f"{a.label} | duration={a.duration}s | levels={a.levels}", flush=True)
    print("label | phiên | tác nhân vào phòng | phiên được phục vụ | số lượt | P50 (s) | P95 (s) | thời gian vào phòng P50 / max (s) | CPU tác nhân TB / max (%) | RAM tác nhân max (MB) | CPU máy chủ LiveKit max (%)")
    for n in a.levels:
        r = run_level(n, a.duration, a.log_dir, a.cpu_pattern)
        print(f"{a.label} | {r['n']} | {r['joined']}/{r['rooms']} | {r['served']}/{r['rooms']} | {r['turns']} | "
              f"{r['p50']:.2f} | {r['p95']:.2f} | {r['join_p50']:.2f} / {r['join_max']:.2f} | "
              f"{r['cpu_mean']:.0f} / {r['cpu_max']:.0f} | {r['mem_max']:.0f} | {r['srv_max']:.0f}", flush=True)
        time.sleep(10)


if __name__ == "__main__":
    main()
