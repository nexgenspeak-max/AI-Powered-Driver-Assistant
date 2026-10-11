#!/usr/bin/env python3
"""Clean hand-laid SVG → PNG for thesis Figures 4.1–4.2 (print-friendly)."""
from __future__ import annotations

import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent / "thesis_screenshots"


def svg_to_png(svg_path: Path, png_path: Path, width: int) -> None:
    subprocess.run(
        ["rsvg-convert", "-w", str(width), str(svg_path), "-o", str(png_path)],
        check=True,
    )


def box(x, y, w, h, title, sub="", fill="#F8FAFC", stroke="#111827", sw=2):
    rx = 10
    lines = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>']
    if sub:
        lines.append(
            f'<text x="{x + w/2}" y="{y + h/2 - 6}" text-anchor="middle" '
            f'font-family="Arial Unicode MS, Arial, sans-serif" font-size="15" font-weight="600" fill="#111827">{title}</text>'
        )
        lines.append(
            f'<text x="{x + w/2}" y="{y + h/2 + 14}" text-anchor="middle" '
            f'font-family="Arial Unicode MS, Arial, sans-serif" font-size="12" fill="#4B5563">{sub}</text>'
        )
    else:
        lines.append(
            f'<text x="{x + w/2}" y="{y + h/2 + 5}" text-anchor="middle" '
            f'font-family="Arial Unicode MS, Arial, sans-serif" font-size="15" font-weight="600" fill="#111827">{title}</text>'
        )
    return "\n".join(lines)


def arrow(x1, y1, x2, y2, label="", dashed=False):
    dash = ' stroke-dasharray="6 4"' if dashed else ""
    mid_x, mid_y = (x1 + x2) / 2, (y1 + y2) / 2
    # offset label slightly
    lx, ly = mid_x, mid_y - 8
    if abs(x2 - x1) < 8:  # vertical
        lx = mid_x + 10
        ly = mid_y
    parts = [
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#111827" stroke-width="1.6"{dash} marker-end="url(#arrow)"/>'
    ]
    if label:
        parts.append(
            f'<text x="{lx}" y="{ly}" font-family="Arial Unicode MS, Arial, sans-serif" '
            f'font-size="11" fill="#4B5563">{label}</text>'
        )
    return "\n".join(parts)


def write_h41():
    # Layered L→R: App | LiveKit | voice-agent | backends
    W, H = 1280, 620
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#111827"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="white"/>

  <!-- column headers -->
  <text x="110" y="36" text-anchor="middle" font-family="Arial Unicode MS, Arial, sans-serif" font-size="12" fill="#6B7280">Ứng dụng</text>
  <text x="370" y="36" text-anchor="middle" font-family="Arial Unicode MS, Arial, sans-serif" font-size="12" fill="#6B7280">Realtime</text>
  <text x="650" y="36" text-anchor="middle" font-family="Arial Unicode MS, Arial, sans-serif" font-size="12" fill="#6B7280">Hội thoại AI</text>
  <text x="1000" y="36" text-anchor="middle" font-family="Arial Unicode MS, Arial, sans-serif" font-size="12" fill="#6B7280">Nghiệp vụ (HTTP)</text>

  {box(30, 200, 160, 70, "Ứng dụng tài xế", "React Native / Expo")}
  {box(270, 200, 200, 70, "LiveKit Cloud", "WebRTC + SIP", fill="#EFF6FF", stroke="#1D4ED8")}
  {box(540, 140, 220, 70, "voice-agent", "Python / LiveKit Agents", fill="#EFF6FF", stroke="#1D4ED8")}
  {box(540, 260, 220, 70, "STT → đường tắt/LLM → TTS", "", fill="#F0FDF4", stroke="#15803D")}

  {box(860, 70, 200, 64, "auth-service", "Đăng nhập · JWT")}
  {box(860, 170, 200, 64, "trip-service", "Chuyến · token · context")}
  {box(860, 270, 200, 64, "call-center", "Quay số PSTN")}
  {box(860, 370, 200, 64, "call-logger", "Lưu vết cuộc gọi")}

  <!-- main horizontal spine -->
  {arrow(190, 235, 270, 235, "âm thanh")}
  {arrow(470, 235, 540, 175, "")}
  <!-- app to auth -->
  <path d="M110 200 C110 100, 860 100, 860 102" fill="none" stroke="#111827" stroke-width="1.6" marker-end="url(#arrow)"/>
  <text x="480" y="88" font-family="Arial Unicode MS, Arial, sans-serif" font-size="11" fill="#4B5563">đăng nhập</text>
  <!-- app to trip -->
  <path d="M190 250 C320 320, 780 220, 860 202" fill="none" stroke="#111827" stroke-width="1.6" marker-end="url(#arrow)"/>
  <text x="520" y="268" font-family="Arial Unicode MS, Arial, sans-serif" font-size="11" fill="#4B5563">token / chuyến</text>

  {arrow(650, 210, 650, 260, "pipeline", dashed=True)}
  {arrow(760, 175, 860, 202, "HTTP (không DB)")}
  {arrow(760, 295, 860, 402, "log", dashed=True)}
  {arrow(960, 234, 960, 270, "điều phối gọi")}
  <!-- SIP back -->
  <path d="M860 302 C700 360, 470 340, 370 270" fill="none" stroke="#111827" stroke-width="1.4" stroke-dasharray="6 4" marker-end="url(#arrow)"/>
  <text x="560" y="350" font-family="Arial Unicode MS, Arial, sans-serif" font-size="11" fill="#4B5563">SIP</text>

  <text x="40" y="580" font-family="Arial Unicode MS, Arial, sans-serif" font-size="12" fill="#6B7280">Đọc trái → phải: app · LiveKit · voice-agent · trip-service (và dịch vụ liên quan)</text>
</svg>
'''
    # Simpler cleaner version without curved spaghetti - rewrite below
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#111827"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="white"/>

  <!-- lane backgrounds -->
  <rect x="20" y="50" width="200" height="500" rx="16" fill="#F9FAFB" stroke="#E5E7EB"/>
  <rect x="240" y="50" width="220" height="500" rx="16" fill="#F9FAFB" stroke="#E5E7EB"/>
  <rect x="480" y="50" width="280" height="500" rx="16" fill="#F9FAFB" stroke="#E5E7EB"/>
  <rect x="780" y="50" width="460" height="500" rx="16" fill="#F9FAFB" stroke="#E5E7EB"/>

  <text x="120" y="78" text-anchor="middle" font-family="Arial Unicode MS, Arial, sans-serif" font-size="13" font-weight="600" fill="#6B7280">1. Ứng dụng</text>
  <text x="350" y="78" text-anchor="middle" font-family="Arial Unicode MS, Arial, sans-serif" font-size="13" font-weight="600" fill="#6B7280">2. Realtime</text>
  <text x="620" y="78" text-anchor="middle" font-family="Arial Unicode MS, Arial, sans-serif" font-size="13" font-weight="600" fill="#6B7280">3. Hội thoại AI</text>
  <text x="1010" y="78" text-anchor="middle" font-family="Arial Unicode MS, Arial, sans-serif" font-size="13" font-weight="600" fill="#6B7280">4. Nghiệp vụ (nền tảng)</text>

  {box(40, 220, 160, 80, "Ứng dụng tài xế", "Expo / React Native")}
  {box(260, 220, 180, 80, "LiveKit Cloud", "WebRTC + SIP", fill="#EFF6FF", stroke="#1D4ED8")}
  {box(510, 150, 220, 78, "voice-agent", "Python · LiveKit Agents", fill="#EFF6FF", stroke="#1D4ED8")}
  {box(510, 290, 220, 78, "STT → tắt/LLM → TTS", "Chuỗi xử lý trong agent", fill="#F0FDF4", stroke="#15803D")}

  {box(820, 110, 190, 70, "auth-service", "Đăng nhập · JWT")}
  {box(820, 210, 190, 70, "trip-service", "Chuyến · token · context")}
  {box(1040, 210, 170, 70, "call-center", "Quay số PSTN")}
  {box(820, 360, 190, 70, "call-logger", "Lưu vết cuộc gọi")}

  <!-- straight arrows between lanes -->
  {arrow(200, 260, 260, 260, "")}
  <text x="220" y="250" font-family="Arial Unicode MS, Arial, sans-serif" font-size="11" fill="#4B5563">âm thanh</text>

  {arrow(440, 260, 510, 189, "")}
  <text x="445" y="210" font-family="Arial Unicode MS, Arial, sans-serif" font-size="11" fill="#4B5563">phòng</text>

  {arrow(620, 228, 620, 290, "")}
  <text x="628" y="268" font-family="Arial Unicode MS, Arial, sans-serif" font-size="11" fill="#4B5563">pipeline</text>

  {arrow(730, 245, 820, 245, "")}
  <text x="735" y="235" font-family="Arial Unicode MS, Arial, sans-serif" font-size="11" fill="#4B5563">HTTP</text>

  {arrow(1010, 245, 1040, 245, "")}
  <text x="1012" y="235" font-family="Arial Unicode MS, Arial, sans-serif" font-size="11" fill="#4B5563">gọi</text>

  <!-- app → auth (top) -->
  <path d="M120 220 L120 145 L820 145" fill="none" stroke="#111827" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="400" y="138" font-family="Arial Unicode MS, Arial, sans-serif" font-size="11" fill="#4B5563">đăng nhập</text>

  <!-- app → trip (bottom of app) -->
  <path d="M120 300 L120 430 L730 430 L730 245" fill="none" stroke="#111827" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="300" y="448" font-family="Arial Unicode MS, Arial, sans-serif" font-size="11" fill="#4B5563">token thoại / chuyến</text>

  <!-- voice → logger -->
  <path d="M620 368 L620 395 L820 395" fill="none" stroke="#111827" stroke-width="1.4" stroke-dasharray="6 4" marker-end="url(#arrow)"/>
  <text x="700" y="388" font-family="Arial Unicode MS, Arial, sans-serif" font-size="11" fill="#4B5563">log</text>

  <!-- call-center SIP back to LiveKit -->
  <path d="M1125 280 L1125 500 L350 500 L350 300" fill="none" stroke="#111827" stroke-width="1.4" stroke-dasharray="6 4" marker-end="url(#arrow)"/>
  <text x="700" y="518" font-family="Arial Unicode MS, Arial, sans-serif" font-size="11" fill="#4B5563">SIP (khi gọi điện thoại)</text>

  <text x="40" y="590" font-family="Arial Unicode MS, Arial, sans-serif" font-size="12" fill="#6B7280">voice-agent chỉ gọi HTTP tới trip-service — không mở database trực tiếp</text>
</svg>
'''
    path = OUT / "H4_1_architecture.svg"
    path.write_text(svg, encoding="utf-8")
    svg_to_png(path, OUT / "H4_1_architecture.png", 1400)
    return path


def write_h42():
    W, H = 900, 1100
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#111827"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="white"/>

  <!-- start -->
  <ellipse cx="450" cy="55" rx="110" ry="36" fill="#EFF6FF" stroke="#1D4ED8" stroke-width="2"/>
  <text x="450" y="60" text-anchor="middle" font-family="Arial Unicode MS, Arial, sans-serif" font-size="15" font-weight="600" fill="#111827">Tài xế nói</text>

  {box(320, 120, 260, 56, "STT → chữ (chốt câu)")}

  <!-- diamond -->
  <polygon points="450,220 560,290 450,360 340,290" fill="#FFFBEB" stroke="#B45309" stroke-width="2"/>
  <text x="450" y="285" text-anchor="middle" font-family="Arial Unicode MS, Arial, sans-serif" font-size="13" font-weight="600" fill="#111827">Khớp ý định</text>
  <text x="450" y="303" text-anchor="middle" font-family="Arial Unicode MS, Arial, sans-serif" font-size="13" font-weight="600" fill="#111827">quen thuộc?</text>

  <!-- three paths -->
  {box(40, 430, 240, 90, "① Đường tắt", "khớp ý định → công cụ", fill="#F0FDF4", stroke="#15803D")}
  {box(330, 430, 240, 90, "② Đường đủ", "LLM + schema tool", fill="#EFF6FF", stroke="#1D4ED8")}
  {box(620, 430, 240, 90, "③ Trò chuyện nhẹ", "Không nạp bảng tool")}

  {box(185, 600, 280, 64, "HTTP → trip-service", "khi cần đọc/ghi chuyến")}
  {box(560, 600, 280, 64, "Prefetch ngữ cảnh", "đã có từ lúc vào phiên", fill="#EFF6FF", stroke="#1D4ED8")}

  {box(320, 740, 260, 56, "TTS → câu trả lời ngắn")}

  <ellipse cx="450" cy="870" rx="120" ry="36" fill="#EFF6FF" stroke="#1D4ED8" stroke-width="2"/>
  <text x="450" y="875" text-anchor="middle" font-family="Arial Unicode MS, Arial, sans-serif" font-size="15" font-weight="600" fill="#111827">Kết thúc lượt</text>

  <!-- arrows vertical -->
  {arrow(450, 91, 450, 120, "")}
  {arrow(450, 176, 450, 220, "")}

  <!-- decide to three -->
  <line x1="400" y1="330" x2="160" y2="430" stroke="#15803D" stroke-width="1.8" marker-end="url(#arrow)"/>
  <text x="220" y="390" font-family="Arial Unicode MS, Arial, sans-serif" font-size="12" fill="#15803D">có</text>

  {arrow(450, 360, 450, 430, "mơ hồ")}

  <line x1="500" y1="330" x2="740" y2="430" stroke="#111827" stroke-width="1.6" marker-end="url(#arrow)"/>
  <text x="640" y="390" font-family="Arial Unicode MS, Arial, sans-serif" font-size="12" fill="#4B5563">xã giao</text>

  <!-- paths down -->
  {arrow(160, 520, 280, 600, "")}
  {arrow(450, 520, 360, 600, "")}
  <line x1="740" y1="520" x2="740" y2="700" stroke="#111827" stroke-width="1.6"/>
  <line x1="740" y1="700" x2="580" y2="740" stroke="#111827" stroke-width="1.6" marker-end="url(#arrow)"/>

  {arrow(700, 632, 465, 632, "", dashed=True)}
  {arrow(325, 664, 450, 740, "")}
  {arrow(450, 796, 450, 834, "")}

  <text x="40" y="980" font-family="Arial Unicode MS, Arial, sans-serif" font-size="12" fill="#6B7280">Ưu tiên đường tắt cho việc quen thuộc — giảm độ trễ cảm nhận khi đang lái</text>
</svg>
'''
    path = OUT / "H4_2_pipeline.svg"
    path.write_text(svg, encoding="utf-8")
    svg_to_png(path, OUT / "H4_2_pipeline.png", 1000)
    return path


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    print("Wrote", write_h41())
    print("Wrote", write_h42())
