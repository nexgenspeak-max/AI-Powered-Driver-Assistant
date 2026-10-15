#!/usr/bin/env python3
"""Tổng hợp kết quả SC-03 từ results/sc03_<vus>_<rep>.json (k6 --summary-export)."""
import json, glob, statistics as st
from pathlib import Path

R = Path(__file__).resolve().parent / "results"
rows = {}
for f in sorted(glob.glob(str(R / "sc03_*_*.json"))):
    _, vus, rep = Path(f).stem.split("_")
    m = json.load(open(f))["metrics"]
    def g(name, key):
        return m[name][key]
    rows.setdefault(int(vus), []).append({
        "ctx_med": g("http_req_duration{ep:context}", "med"),
        "ctx_p95": g("http_req_duration{ep:context}", "p(95)"),
        "up_med": g("http_req_duration{ep:update}", "med"),
        "up_p95": g("http_req_duration{ep:update}", "p(95)"),
        "fail": m["http_req_failed"]["value"],
        "rps": m["http_reqs"]["rate"],
        "n": m["http_reqs"]["count"],
    })

def ms(v): return f"{st.mean(v):.0f} ± {st.stdev(v):.0f}" if len(v) > 1 else f"{v[0]:.0f}"
base = st.mean(r["ctx_p95"] for r in rows[min(rows)])
print("VUs | reps | n yêu cầu | thông lượng (req/s) | ngữ cảnh P50 | ngữ cảnh P95 | cập nhật P50 | cập nhật P95 | tăng P95 ngữ cảnh so với 10 VU | tỷ lệ lỗi")
for v in sorted(rows):
    rs = rows[v]
    p95 = st.mean(r["ctx_p95"] for r in rs)
    print(f"{v} | {len(rs)} | {sum(r['n'] for r in rs)} | {ms([r['rps'] for r in rs])} | {ms([r['ctx_med'] for r in rs])} | {ms([r['ctx_p95'] for r in rs])} | "
          f"{ms([r['up_med'] for r in rs])} | {ms([r['up_p95'] for r in rs])} | {100*(p95/base-1):+.0f}% | {100*max(r['fail'] for r in rs):.2f}%")
