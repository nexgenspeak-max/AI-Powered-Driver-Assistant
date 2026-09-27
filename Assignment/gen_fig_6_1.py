#!/usr/bin/env python3
"""Hình 6.1 — biểu đồ cột P50/P95 độ trễ cảm nhận theo đường xử lý.

Số liệu: extract_ch6_metrics.py trên nhật ký voice-agent, cửa sổ 2026-09-05..06
(gpt-5.6-luna). In-friendly SVG → PNG bằng rsvg-convert.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent / "thesis_screenshots"

# (nhãn, P50, P95, n) — extract_ch6_metrics.py, cửa sổ 2026-09-05..06
GROUPS = [
    ("Nhánh rút gọn (đã loại bỏ)", 0.21, 2.00, 167),
    ("Luồng đầy đủ qua LLM", 1.54, 3.75, 174),
    ("Toàn bộ lượt", 0.50, 2.87, 341),
]
THRESHOLD = 2.0
Y_MAX = 4.0

W, H = 900, 540
ML, MR, MT, MB = 80, 30, 40, 90
PW, PH = W - ML - MR, H - MT - MB


def vn(v: float) -> str:
    """Số thập phân kiểu Việt Nam (dấu phẩy), khớp bảng trong luận văn."""
    return f"{v:.2f}".replace(".", ",")


def y(v: float) -> float:
    return MT + PH * (1 - v / Y_MAX)


def main() -> None:
    s = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
        f'viewBox="0 0 {W} {H}" font-family="DejaVu Sans, Arial, sans-serif">',
        f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>',
    ]
    # trục + lưới ngang
    for gv in [0, 1, 2, 3, 4]:
        yy = y(gv)
        s.append(f'<line x1="{ML}" y1="{yy:.1f}" x2="{ML+PW}" y2="{yy:.1f}" '
                 f'stroke="#E5E7EB" stroke-width="1"/>')
        s.append(f'<text x="{ML-12}" y="{yy+4:.1f}" text-anchor="end" font-size="14" '
                 f'fill="#374151">{gv}</text>')
    s.append(f'<line x1="{ML}" y1="{MT}" x2="{ML}" y2="{MT+PH}" stroke="#111827" stroke-width="1.5"/>')
    s.append(f'<line x1="{ML}" y1="{MT+PH}" x2="{ML+PW}" y2="{MT+PH}" stroke="#111827" stroke-width="1.5"/>')
    s.append(f'<text x="{ML-52}" y="{MT+PH/2}" font-size="14" fill="#374151" '
             f'transform="rotate(-90 {ML-52} {MT+PH/2})" text-anchor="middle">Giây</text>')

    # ngưỡng P95 ≤ 2s
    yt = y(THRESHOLD)
    s.append(f'<line x1="{ML}" y1="{yt:.1f}" x2="{ML+PW}" y2="{yt:.1f}" '
             f'stroke="#DC2626" stroke-width="1.5" stroke-dasharray="6 4"/>')
    s.append(f'<text x="{ML+PW-6}" y="{yt-8:.1f}" text-anchor="end" font-size="13" '
             f'fill="#DC2626">Ngưỡng P95 ≤ 2 giây</text>')

    gw = PW / len(GROUPS)
    bw = 58
    for i, (label, p50, p95, n) in enumerate(GROUPS):
        cx = ML + gw * (i + 0.5)
        for j, (val, fill, name) in enumerate(
            [(p50, "#93C5FD", "P50"), (p95, "#1D4ED8", "P95")]
        ):
            bx = cx - bw + j * bw
            by = y(val)
            s.append(f'<rect x="{bx:.1f}" y="{by:.1f}" width="{bw-6}" '
                     f'height="{MT+PH-by:.1f}" fill="{fill}"/>')
            s.append(f'<text x="{bx+(bw-6)/2:.1f}" y="{by-6:.1f}" text-anchor="middle" '
                     f'font-size="13" fill="#111827">{vn(val)}</text>')
        s.append(f'<text x="{cx:.1f}" y="{MT+PH+24:.1f}" text-anchor="middle" '
                 f'font-size="15" fill="#111827">{label}</text>')
        s.append(f'<text x="{cx:.1f}" y="{MT+PH+43:.1f}" text-anchor="middle" '
                 f'font-size="12" fill="#6B7280">n = {n}</text>')

    # chú giải
    lx, ly = ML + 10, MT + 10
    s.append(f'<rect x="{lx}" y="{ly}" width="16" height="16" fill="#93C5FD"/>')
    s.append(f'<text x="{lx+22}" y="{ly+13}" font-size="13" fill="#111827">P50</text>')
    s.append(f'<rect x="{lx+70}" y="{ly}" width="16" height="16" fill="#1D4ED8"/>')
    s.append(f'<text x="{lx+92}" y="{ly+13}" font-size="13" fill="#111827">P95</text>')

    s.append('</svg>')
    svg = OUT / "H6_1_latency.svg"
    svg.write_text("\n".join(s), encoding="utf-8")
    subprocess.run(["rsvg-convert", "-w", "1400", str(svg), "-o", str(OUT / "H6_1_latency.png")], check=True)
    print("wrote", svg, "and H6_1_latency.png")


if __name__ == "__main__":
    main()
