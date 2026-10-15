#!/usr/bin/env python3
"""Kiểm tra lại mục 4 của Bảng 6.13 (NFR-05) sau khi che số điện thoại trong bộ định dạng nhật ký.

Chạy lại các kịch bản RS-01, RS-02, RS-04 (rs_component_faults.py) với nhật ký bật ở mức DEBUG,
ghi qua đúng cấu hình nhật ký của tác nhân (app/config/logging.py), rồi quét tệp nhật ký bằng
cùng biểu thức chính quy số điện thoại Việt Nam đã dùng ở lần quét ngày 11/10/2026.

Chạy (từ src/backend/llm-orchestrator):
  .venv/bin/python ../../../docs/thesis/experiments/log_masking_check.py --trials 20
"""
from __future__ import annotations

import argparse
import asyncio
import glob
import logging
import os
import re
import sys
import tempfile

FULL = re.compile(r"(?<!\d)(\+?84|0)\d{9}(?!\d)")
MASKED = re.compile(r"(?<!\d)(\+?84|0)\d{3}xxx\d{3}(?!\d)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=20)
    trials = ap.parse_args().trials

    log_dir = tempfile.mkdtemp(prefix="nfr05_")
    os.environ["LOG_FILE"] = os.path.join(log_dir, "agent.log")
    os.environ["LOG_LEVEL"] = "DEBUG"
    sys.path.insert(0, os.getcwd())
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

    import rs_component_faults as rs
    from app.config.logging import setup_logging

    logging.getLogger().handlers.clear()
    setup_logging()
    logging.disable = lambda *_a, **_k: None  # giữ nhật ký bật trong harness
    asyncio.run(rs.main(trials))
    logging.getLogger("llm-orchestrator.nfr05").info(
        "dial customer phone=%s driver=%s", "+84901111111", "0900000001")
    for h in logging.getLogger().handlers:
        h.flush()

    lines = full = masked = 0
    for path in glob.glob(os.path.join(log_dir, "*.log*")):
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                lines += 1
                full += len(FULL.findall(line))
                masked += len(MASKED.findall(line))
    print(f"NFR-05 | dòng nhật ký: {lines} | số điện thoại đầy đủ: {full} | số đã che: {masked} | thư mục: {log_dir}")


if __name__ == "__main__":
    main()


def replay(paths: list[str]) -> None:
    """Đưa từng dòng của các tệp nhật ký cũ qua hàm che số mới (tương đương bộ định dạng hiện tại)."""
    from app.services.logger.format import mask_phones
    before = after = files_with = 0
    for path in paths:
        with open(path, encoding="utf-8", errors="replace") as fh:
            text = fh.read()
        n = len(FULL.findall(text))
        before += n
        files_with += n > 0
        after += len(FULL.findall(mask_phones(text)))
    print(f"Phát lại {len(paths)} tệp nhật ký cũ | số đầy đủ trước khi che: {before} ({files_with} tệp) | sau khi che: {after}")
