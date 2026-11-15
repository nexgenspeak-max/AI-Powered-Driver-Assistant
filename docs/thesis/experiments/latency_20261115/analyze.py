#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phân tích đợt đo độ trễ 15/11/2026.

Dùng:  python3 analyze.py turns_after_fix.jsonl agent_metrics_after_fix.txt
Đầu vào: tệp lượt nói phía máy khách (audio_probe.py ghi) và các dòng chỉ số trích từ nhật ký tác nhân.
Phân vị tính bằng nội suy tuyến tính, giá trị ngoại lai được giữ (mục 6.3 của luận văn).
"""
import json, re, sys

recs = [json.loads(l) for l in open(sys.argv[1], encoding="utf-8")]
wall = re.compile(r"turn wall user_stop_to_agent_speak=([\d.]+)s")
tot = re.compile(r"turn latency speech_id=(\S+) eou=([\d.]+)s llm_ttft=([\d.]+)s tts_ttfb=([\d.]+)s total=([\d.]+)s")
W, T, fillers, tools = [], {}, 0, 0
for ln in open(sys.argv[2], encoding="utf-8"):
    body = ln.split(" ", 3)[3]
    m = wall.search(body)
    if m: W.append(float(m.group(1)))
    m = tot.search(body)
    if m: T[m.group(1)] = tuple(float(m.group(i)) for i in (2, 3, 4, 5))
    if body.startswith("turn_filler lang="): fillers += 1
    if "event=tool " in body: tools += 1

def q(xs, p):
    xs = sorted(xs)
    if not xs: return float("nan")
    k = (len(xs) - 1) * p; f = int(k); c = min(f + 1, len(xs) - 1)
    return xs[f] + (xs[c] - xs[f]) * (k - f)

def line(name, xs):
    n = len(xs)
    le = sum(v <= 2.0 for v in xs)
    print(f"{name:52s} n={n:3d} P50={q(xs,.5):.2f} P90={q(xs,.9):.2f} P95={q(xs,.95):.2f} max={max(xs):.2f} | <=2s {le}/{n} ({100*le/n:.1f}%)")

C = [r["client_latency_s"] for r in recs if r["client_latency_s"] is not None]
print(f"Luot noi: {len(recs)} | duoc tra loi: {sum(r['replied'] for r in recs)} | phien: {len({r['room'] for r in recs})} | "
      f"cau khac nhau: {len({r['utt'] for r in recs})} | cau dem phat: {fillers} | lan goi cong cu: {tools}")
line("A. Tac nhan: tai xe dut loi -> am thanh dau (AC-15)", W)
line("B. Tac nhan: EOU + token dau + TTS (cau tra loi)", [v[3] for v in T.values()])
line("C. May khach: het cau noi -> am thanh dau tien", C)
line("   chang: phat hien ket thuc phat ngon", [v[0] for v in T.values()])
line("   chang: LLM token dau", [v[1] for v in T.values()])
line("   chang: TTS am thanh dau", [v[2] for v in T.values()])
print("   phan bo A:", {k: sum(1 for v in W if lo < v <= hi) for k, lo, hi in
      [("<=1.0", -1, 1.0), ("1.0-1.5", 1.0, 1.5), ("1.5-2.0", 1.5, 2.0), ("2.0-2.5", 2.0, 2.5), (">2.5", 2.5, 99)]})
