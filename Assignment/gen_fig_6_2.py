#!/usr/bin/env python3
"""Hình 6.2 — WER điều kiện yên tĩnh (A) vs nhiễu khoang xe giả lập (B).

Số liệu: compute_wer.py trên nhật ký STT voice-agent, 2026-09-06, cùng đoạn đọc
22 câu (N = 192 từ). In-friendly SVG → PNG bằng rsvg-convert.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent / "thesis_screenshots"

BARS = [("A — Yên tĩnh", 3.1, "#93C5FD"), ("B — Nhiễu khoang xe", 7.3, "#1D4ED8")]
Y_MAX = 10.0

W, H = 720, 520
ML, MR, MT, MB = 80, 40, 40, 80
PW, PH = W - ML - MR, H - MT - MB


def y(v: float) -> float:
    return MT + PH * (1 - v / Y_MAX)


def main() -> None:
    s = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
        f'viewBox="0 0 {W} {H}" font-family="DejaVu Sans, Arial, sans-serif">',
        f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>',
    ]
    for gv in range(0, int(Y_MAX) + 1, 2):
        yy = y(gv)
        s.append(f'<line x1="{ML}" y1="{yy:.1f}" x2="{ML+PW}" y2="{yy:.1f}" stroke="#E5E7EB"/>')
        s.append(f'<text x="{ML-12}" y="{yy+4:.1f}" text-anchor="end" font-size="14" fill="#374151">{gv}%</text>')
    s.append(f'<line x1="{ML}" y1="{MT}" x2="{ML}" y2="{MT+PH}" stroke="#111827" stroke-width="1.5"/>')
    s.append(f'<line x1="{ML}" y1="{MT+PH}" x2="{ML+PW}" y2="{MT+PH}" stroke="#111827" stroke-width="1.5"/>')
    s.append(f'<text x="{ML-52}" y="{MT+PH/2}" font-size="14" fill="#374151" '
             f'transform="rotate(-90 {ML-52} {MT+PH/2})" text-anchor="middle">WER (%)</text>')

    gw = PW / len(BARS)
    bw = 110
    for i, (label, val, fill) in enumerate(BARS):
        cx = ML + gw * (i + 0.5)
        by = y(val)
        s.append(f'<rect x="{cx-bw/2:.1f}" y="{by:.1f}" width="{bw}" height="{MT+PH-by:.1f}" fill="{fill}"/>')
        s.append(f'<text x="{cx:.1f}" y="{by-10:.1f}" text-anchor="middle" font-size="16" '
                 f'fill="#111827" font-weight="bold">{val:.1f}%</text>'.replace(f'{val:.1f}', f'{val:.1f}'.replace('.', ',')))
        s.append(f'<text x="{cx:.1f}" y="{MT+PH+28:.1f}" text-anchor="middle" font-size="15" fill="#111827">{label}</text>')

    s.append(f'<text x="{ML+PW/2:.1f}" y="{MT+PH+52:.1f}" text-anchor="middle" font-size="12" '
             f'fill="#6B7280">cùng đoạn đọc 22 câu, N = 192 từ · chênh lệch +4,2 điểm phần trăm</text>')
    s.append('</svg>')

    svg = OUT / "H6_2_wer.svg"
    svg.write_text("\n".join(s), encoding="utf-8")
    subprocess.run(["rsvg-convert", "-w", "1200", str(svg), "-o", str(OUT / "H6_2_wer.png")], check=True)
    print("wrote", svg, "and H6_2_wer.png")


if __name__ == "__main__":
    main()
