#!/usr/bin/env python3
"""Trích số liệu Chương 6 từ nhật ký voice-agent.

Nguồn: src/backend/llm-orchestrator/logs/agent.*.log
Chạy:  python3 docs/thesis/extract_ch6_metrics.py
In ra các con số dùng cho Bảng 6.1, 6.3, 6.4, 6.8 và thảo luận RQ2.

Lưu ý liêm chính: đây là nhật ký môi trường phát triển/thử nghiệm (LiveKit Cloud,
tài khoản demo, thiết bị/Simulator), kịch bản do tác giả tự đọc — KHÔNG phải khảo
sát mù trên đường. Số liệu phản ánh hành vi hệ thống ở cấu hình tại thời điểm đo.
"""
from __future__ import annotations

import glob
import math
import re
import statistics as st
from collections import defaultdict
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parents[2] / "src/backend/llm-orchestrator/logs"
WINDOW = {"2026-09-05", "2026-09-06"}  # cửa sổ đo gần nhất, cùng cấu hình gpt-5.6-luna

usas_re = re.compile(
    r"(20\d\d-\d\d-\d\d) (\d\d:\d\d:\d\d)[^\n]*?room=(\S+)[^\n]*?"
    r"user_stop_to_agent_speak=([\d.]+)s( SLOW)?"
)
eou_re = re.compile(r"(20\d\d-\d\d-\d\d)[^\n]*?event=eou_metrics end_of_utterance_delay_ms=([\d.]+)")
llm_re = re.compile(
    r"(20\d\d-\d\d-\d\d)[^\n]*?event=llm_metrics duration_ms=[\d.]+ ttft_ms=([\d.]+).*?model=(\S+)"
)
tts_re = re.compile(
    r"(20\d\d-\d\d-\d\d)[^\n]*?event=tts_metrics duration_ms=[\d.]+ ttfb_ms=([\d.]+)"
    r"[^\n]*?characters_count=(\d+)"
)
si_re = re.compile(r"(20\d\d-\d\d-\d\d) (\d\d:\d\d:\d\d)[^\n]*?room=(\S+)[^\n]*?spoken_intent")
silence_end_re = re.compile(r"end_conversation|SilenceTracker[^\n]*give up|silence[^\n]*end")
confirm_pair_re = re.compile(r"confirm_cancel_trip|confirm_trip")


def pct(xs, p):
    xs = sorted(xs)
    if not xs:
        return float("nan")
    k = (len(xs) - 1) * p / 100
    f, c = math.floor(k), math.ceil(k)
    return xs[f] if f == c else xs[f] + (xs[c] - xs[f]) * (k - f)


def summ(v):
    if not v:
        return "n=0"
    return (
        f"n={len(v)}  P50={st.median(v):.2f}  P90={pct(v,90):.2f}  P95={pct(v,95):.2f}  "
        f"mean={st.mean(v):.2f}  max={max(v):.2f}  %>=2s={100*sum(1 for x in v if x>=2)/len(v):.1f}"
    )


def main() -> None:
    usas = set()
    eou, ttft = [], []
    tts_ttfb, tts_chars = [], []
    si = defaultdict(lambda: defaultdict(set))
    models = defaultdict(int)

    for fn in glob.glob(str(LOG_DIR / "agent.*.log")):
        txt = Path(fn).read_text(encoding="utf-8", errors="replace")
        for m in usas_re.finditer(txt):
            usas.add((m.group(1), m.group(2), m.group(3), float(m.group(4)), bool(m.group(5))))
        for m in eou_re.finditer(txt):
            eou.append((m.group(1), float(m.group(2))))
        for m in llm_re.finditer(txt):
            ttft.append((m.group(1), float(m.group(2))))
            models[m.group(3)] += 1
        for m in tts_re.finditer(txt):
            tts_ttfb.append((m.group(1), float(m.group(2))))
            tts_chars.append((m.group(1), int(m.group(3))))
        for m in si_re.finditer(txt):
            si[m.group(1)][m.group(3)].add(m.group(2))

    print("=" * 72)
    print("ĐỘ TRỄ CẢM NHẬN  user_stop_to_agent_speak (giây) — theo ngày")
    print("=" * 72)
    by = defaultdict(list)
    for d, t, room, v, sl in usas:
        by[d].append(v)
    for d in sorted(by):
        print(f"  {d}: {summ(by[d])}")

    print()
    win = [x[3] for x in usas if x[0] in WINDOW]
    allv = [x[3] for x in usas]
    print(f"  [TOÀN BỘ log]      {summ(allv)}")
    print(f"  [{'/'.join(sorted(WINDOW))}] {summ(win)}   <-- cửa sổ đo Ch6")

    print()
    print("-" * 72)
    print(f"TÁCH ĐƯỜNG XỬ LÝ trong cửa sổ {sorted(WINDOW)}")
    print("-" * 72)
    fast, other = [], []
    for d, t, room, v, sl in usas:
        if d not in WINDOW:
            continue
        hits = si.get(d, {}).get(room, set())
        hh, mm, ss = (int(x) for x in t.split(":"))
        tsec = hh * 3600 + mm * 60 + ss
        near = any(
            abs(int(a) * 3600 + int(b) * 60 + int(c) - tsec) <= 2
            for a, b, c in (x.split(":") for x in hits)
        )
        (fast if near else other).append(v)
    print(f"  Đường tắt (spoken_intent ±2s) : {summ(fast)}")
    print(f"  Đường đủ / còn lại            : {summ(other)}")

    print()
    print("-" * 72)
    print("TÁCH NÚT NGHẼN (mọi lượt có event, model gpt-5.6-luna)")
    print("-" * 72)
    ev = [x[1] for x in eou]
    lv = [x[1] for x in ttft]
    tv = [x[1] for x in tts_ttfb]
    print(f"  EOU end_of_utterance_delay_ms : n={len(ev)}  P50={st.median(ev):.0f}  P95={pct(ev,95):.0f}")
    print(f"  LLM ttft_ms                   : n={len(lv)}  P50={st.median(lv):.0f}  P95={pct(lv,95):.0f}")
    print(f"  TTS ttfb_ms                   : n={len(tv)}  P50={st.median(tv):.0f}  P95={pct(tv,95):.0f}")
    print(f"  LLM models thấy trong log     : {dict(models)}")

    print()
    print("-" * 72)
    print("BẢNG 6.8 — bằng chứng từ log")
    print("-" * 72)
    cv = [x[1] for x in tts_chars]
    if cv:
        short = 100 * sum(1 for c in cv if c <= 120) / len(cv)
        print(f"  Độ dài câu TTS: n={len(cv)}  P50={st.median(cv):.0f} ký tự  "
              f"P90={pct(cv,90):.0f}  %câu <=120 ký tự={short:.0f}")
    sil_total = sum(len(v) for d in si.values() for v in d.values()) if si else 0
    print(f"  Sự kiện spoken_intent (đường tắt kích hoạt): {sum(1 for _ in usas)} lượt xét, "
          f"{sum(len(rooms) for rooms in si.values() for rooms in [rooms])}")


if __name__ == "__main__":
    main()
