#!/usr/bin/env python3
"""RS-03: dừng đột ngột một bản sao tác nhân khi đang có phiên.

Mỗi lượt thử: hai bản sao tác nhân (app.main start) đăng ký với máy chủ LiveKit cục bộ;
mở phiên A và chờ tác nhân trả lời lượt đầu; dừng (SIGKILL cả nhóm tiến trình) bản sao đang
phục vụ phiên A; ngay sau đó mở phiên B. Ghi nhận:
  - phiên B có được bản sao còn lại phục vụ không, và thời gian từ lúc dừng tới lúc tác nhân
    vào phiên B, tới lượt trả lời đầu của phiên B;
  - phiên A có được phân công lại cho bản sao còn lại không (tác nhân vào lại phòng A).
Sau mỗi lượt, bản sao bị dừng được khởi động lại (mô phỏng ECS thay tác vụ).

Dùng (từ src/backend/llm-orchestrator, đã nạp biến môi trường thí nghiệm như sc_sessions.py,
máy chủ giả lập fake_ai_server.py và máy chủ LiveKit lkbench đang chạy, không có bản sao nào khác):
  python3 rs03_replica_kill.py --work <thư mục tạm> --trials 10
"""
from __future__ import annotations

import argparse
import glob
import os
import re
import signal
import statistics as st
import subprocess
import time

LK = ["docker", "run", "--rm", "--network", "container:lkbench", "livekit/livekit-cli:latest"]
AUTH = ["--url", "http://localhost:7880", "--api-key", "devkey", "--api-secret", "secret"]
WALL = re.compile(r"^(\S+ \S+) .*room=(\S+) .*turn wall user_stop_to_agent_speak")


BENCH_WORKER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bench_worker.py")


def start_worker(workdir: str, port: int) -> subprocess.Popen:
    os.makedirs(workdir, exist_ok=True)
    env = dict(os.environ, LOG_FILE=os.path.join(workdir, "agent.log"), BENCH_HEALTH_PORT=str(port))
    out = open(os.path.join(workdir, "stdout.log"), "a")
    before = registered_count()
    p = subprocess.Popen([".venv/bin/python", BENCH_WORKER, "start"], env=env, stdout=out, stderr=out,
                         start_new_session=True)
    # chờ máy chủ LiveKit ghi nhận một lần đăng ký mới (không dựa vào nhật ký cũ của bản sao)
    if wait_for(lambda: registered_count() > before, 60, 0.5):
        return p
    raise RuntimeError("worker did not register")


def registered_count() -> int:
    out = subprocess.run(["docker", "logs", "lkbench"], capture_output=True, text=True)
    return (out.stdout + out.stderr).count("worker registered")


def lk(args: list[str]) -> str:
    return subprocess.run(LK + args + AUTH, capture_output=True, text=True).stdout


def open_room(name: str) -> None:
    lk(["room", "create", name])
    lk(["dispatch", "create", "--room", name, "--agent-name", "bench-agent"])


def who_serves(room: str, workdirs: dict[str, str]) -> str | None:
    for wid, d in workdirs.items():
        for f in glob.glob(f"{d}/agent.*.log"):
            if f"room={room}" in open(f, errors="replace").read():
                return wid
    return None


def first_join_time(room: str, workdir: str, after: float) -> float | None:
    """Thời điểm (epoch) dòng nhật ký đầu tiên của phòng trong bản sao, sau mốc after."""
    best = None
    for f in glob.glob(f"{workdir}/agent.*.log"):
        for line in open(f, errors="replace"):
            if f"room={room}" not in line:
                continue
            ts = time.mktime(time.strptime(line[:19], "%Y-%m-%d %H:%M:%S"))
            if ts >= after - 1 and (best is None or ts < best):
                best = ts
    return best


def wait_for(cond, timeout: float, step: float = 0.2):
    t0 = time.time()
    while time.time() - t0 < timeout:
        r = cond()
        if r:
            return r
        time.sleep(step)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", required=True)
    ap.add_argument("--trials", type=int, default=10)
    a = ap.parse_args()
    dirs = {"w1": os.path.join(a.work, "rs03_w1"), "w2": os.path.join(a.work, "rs03_w2")}
    ports = {"w1": 8091, "w2": 8092}
    procs = {w: start_worker(d, ports[w]) for w, d in dirs.items()}
    b_served, b_join, a_reassigned = 0, [], 0
    print(f"RS-03 | trials={a.trials}")
    for i in range(a.trials):
        room_a, room_b = f"rs03-a-{i}-{int(time.time())}", f"rs03-b-{i}-{int(time.time())}"
        open_room(room_a)
        victim = wait_for(lambda: who_serves(room_a, dirs), 30)
        if not victim:
            print(f"trial {i}: phiên A không được phục vụ, bỏ qua")
            continue
        time.sleep(3)
        os.killpg(procs[victim].pid, signal.SIGKILL)
        t_kill = time.time()
        open_room(room_b)
        survivor = "w2" if victim == "w1" else "w1"
        joined = wait_for(lambda: first_join_time(room_b, dirs[survivor], t_kill), 30)
        if joined:
            b_served += 1
            b_join.append(max(0.0, joined - t_kill))
        reassigned = wait_for(lambda: first_join_time(room_a, dirs[survivor], t_kill), 15)
        a_reassigned += bool(reassigned)
        print(f"trial {i}: dừng {victim}; phiên B {'được phục vụ' if joined else 'KHÔNG được phục vụ'}"
              f"{f' sau {joined - t_kill:.1f} s' if joined else ''}; phiên A {'được phân công lại' if reassigned else 'không được phân công lại'}", flush=True)
        for r in (room_a, room_b):
            lk(["room", "delete", r])
        procs[victim] = start_worker(dirs[victim], ports[victim])
    # Lượt bổ sung: mọi bản sao đều dừng khi có phiên mới; một bản sao khởi động lại sau đó.
    for p in procs.values():
        os.killpg(p.pid, signal.SIGKILL)
    time.sleep(2)
    room_c = f"rs03-c-{int(time.time())}"
    open_room(room_c)
    t_c = time.time()
    procs = {"w1": start_worker(dirs["w1"], ports["w1"])}
    late = wait_for(lambda: first_join_time(room_c, dirs["w1"], t_c), 30)
    print(f"lượt bổ sung: không còn bản sao khi mở phiên mới; bản sao khởi động lại sau {time.time() - t_c:.0f} s; "
          f"phiên {'được phục vụ' if late else 'KHÔNG được phục vụ trong 30 s sau khi có bản sao mới'}", flush=True)
    lk(["room", "delete", room_c])
    for p in procs.values():
        os.killpg(p.pid, signal.SIGKILL)
    med = st.median(b_join) if b_join else float("nan")
    print(f"RS-03 | phiên mới được phục vụ: {b_served}/{a.trials} | thời gian từ lúc dừng tới khi tác nhân vào phiên mới: "
          f"trung vị {med:.1f} s, lớn nhất {max(b_join) if b_join else float('nan'):.1f} s (độ phân giải 1 s) | "
          f"phiên đang chạy được phân công lại: {a_reassigned}/{a.trials}")


if __name__ == "__main__":
    main()
