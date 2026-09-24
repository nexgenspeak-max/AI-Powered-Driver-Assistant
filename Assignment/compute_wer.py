#!/usr/bin/env python3
"""Tính WER từ nhật ký STT của voice-agent so với kịch bản cố định.

  python3 Assignment/compute_wer.py --room <room_id> [--after "2026-09-06 18:45"] [--label A]

Chuẩn hoá trước khi so: chữ thường, bỏ dấu câu, quy số ↔ chữ số tiếng Việt.
Ghép các dòng stt_final bị VAD cắt đôi lại theo thứ tự rồi canh với 22 câu gốc.
"""
from __future__ import annotations

import argparse
import glob
import re
import unicodedata
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parents[1] / "src/backend/voice-agent/logs"

REFERENCE = [
    "Tôi muốn kiểm tra lịch trình hôm nay.",
    "Hôm nay tôi có bao nhiêu chuyến.",
    "Chuyến đầu tiên đón khách ở đâu.",
    "Chuyến sớm nhất đón lúc mấy giờ.",
    "Khách của chuyến này tên là gì.",
    "Giá cước chuyến đầu tiên là bao nhiêu.",
    "Chuyến này đi bao nhiêu ki lô mét.",
    "Điểm trả khách của chuyến thứ hai ở đâu.",
    "Bạn kiểm tra lại xem chuyến thứ hai đã có thông tin điểm đến chưa.",
    "Gọi cho khách của chuyến hiện tại giúp tôi.",
    "Nhắn cho khách là mười lăm phút nữa tôi đến đón.",
    "Tôi cần gọi cho khách đón ở Liễu Giai, không phải khách kia.",
    "Xác nhận nhận chuyến này.",
    "Tôi từ chối chuyến vừa được thông báo.",
    "Cập nhật là tôi đã đón khách.",
    "Báo khách không có mặt tại điểm đón.",
    "Cho tôi xem thu nhập hôm nay.",
    "Thu nhập bảy ngày gần đây của tôi là bao nhiêu.",
    "Đón khách tại Tòa nhà Lotte, năm mươi tư Liễu Giai, Ba Đình, Hà Nội.",
    "Trả khách ở bốn mươi lăm Nguyễn Huệ, Quận Một, Thành phố Hồ Chí Minh.",
    "Nhắc tôi trước giờ đón mười lăm phút.",
    "Kết thúc trợ lý, cảm ơn bạn.",
]

# quy đổi 2 chiều cho phần chuẩn hoá (không tính là lỗi)
NUM_WORDS = {
    "không": "0", "một": "1", "hai": "2", "ba": "3", "bốn": "4", "năm": "5",
    "sáu": "6", "bảy": "7", "tám": "8", "chín": "9", "mười": "10",
}
PHRASE_MAP = [
    (r"\bki lô mét\b", "km"), (r"\bkilômét\b", "km"), (r"\bkilomet\b", "km"),
    (r"\bnăm mươi tư\b", "54"), (r"\bnăm mươi bốn\b", "54"),
    (r"\bbốn mươi lăm\b", "45"), (r"\bbốn mươi năm\b", "45"),
    (r"\bmười lăm\b", "15"), (r"\bmười năm\b", "15"),
    (r"\bquận một\b", "quận 1"), (r"\bbảy ngày\b", "7 ngày"),
]


def norm(s: str) -> list[str]:
    s = s.lower().strip()
    for pat, rep in PHRASE_MAP:
        s = re.sub(pat, rep, s)
    s = re.sub(r"[.,!?;:\"'\u2019\u201c\u201d…]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    toks = []
    for w in s.split():
        toks.append(NUM_WORDS.get(w, w))
    return toks


def edit_counts(ref: list[str], hyp: list[str]) -> tuple[int, int, int]:
    n, m = len(ref), len(hyp)
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if ref[i - 1] == hyp[j - 1] else 1
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
    # backtrace S/D/I
    i, j, S = n, m, 0
    D = I = 0
    while i > 0 or j > 0:
        if i > 0 and j > 0 and d[i][j] == d[i - 1][j - 1] + (0 if ref[i - 1] == hyp[j - 1] else 1):
            if ref[i - 1] != hyp[j - 1]:
                S += 1
            i, j = i - 1, j - 1
        elif i > 0 and d[i][j] == d[i - 1][j] + 1:
            D += 1
            i -= 1
        else:
            I += 1
            j -= 1
    return S, D, I


def extract_stt(room: str, after: str | None) -> list[str]:
    seen, out = set(), []
    pat = re.compile(
        r'(20\d\d-\d\d-\d\d \d\d:\d\d:\d\d)[^\n]*?room=' + re.escape(room)
        + r'[^\n]*?event=stt_final text="([^"]*)"'
    )
    for fn in glob.glob(str(LOG_DIR / "agent.*.log")):
        txt = Path(fn).read_text(encoding="utf-8", errors="replace")
        for m in pat.finditer(txt):
            ts, t = m.group(1), m.group(2).strip()
            if after and ts < after:
                continue
            key = (ts, t)
            if key in seen or not t:
                continue
            seen.add(key)
            out.append((ts, t))
    out.sort()
    return [t for _, t in out]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--room", required=True)
    ap.add_argument("--after")
    ap.add_argument("--label", default="?")
    args = ap.parse_args()

    hyp_lines_raw = extract_stt(args.room, args.after)

    # 1) gộp cụm lặp NGAY trong 1 câu: "X X" -> "X" (đọc lại vì bot cắt lượt)
    def dedup_inphrase(s: str) -> str:
        w = s.split()
        h = len(w) // 2
        if h >= 3 and w[:h] == w[h : 2 * h]:
            return " ".join(w[h:])
        return s

    # 2) bỏ dòng KHÔNG thuộc kịch bản (trả lời bot: "sẵn sàng", "có tôi sẵn sàng",
    #    "không", "ừ", "ok") và dòng trùng hệt dòng liền trước.
    OFF_SCRIPT = ("sẵn sàng", "tôi sẵn sàng", "có tôi", "không.", "ừ.", "ok.", "vâng")
    hyp_lines: list[str] = []
    for h in hyp_lines_raw:
        h = dedup_inphrase(h.strip())
        nl = " ".join(norm(h))
        if not nl:
            continue
        if any(k in h.lower() for k in OFF_SCRIPT) and len(nl.split()) <= 6:
            continue
        if hyp_lines and " ".join(norm(hyp_lines[-1])) == nl:
            continue  # trùng hệt dòng trước
        hyp_lines.append(h)

    ref_all = " ".join(REFERENCE)
    hyp_all = " ".join(hyp_lines)
    R, H = norm(ref_all), norm(hyp_all)
    S, D, I = edit_counts(R, H)
    N = len(R)
    wer = (S + D + I) / N * 100

    print(f"── WER điều kiện {args.label} ──")
    print(f"  Câu STT bắt được : {len(hyp_lines)}  (kịch bản 22 câu)")
    print(f"  N (từ tham chiếu): {N}")
    print(f"  S={S}  D={D}  I={I}")
    print(f"  WER = ({S}+{D}+{I}) / {N} = {wer:.1f}%")
    print()
    print("  --- transcript STT ---")
    for i, h in enumerate(hyp_lines, 1):
        print(f"   {i:2d}. {h}")


if __name__ == "__main__":
    main()
