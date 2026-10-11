# Kết quả đo WER — Bảng 6.5 / Hình 6.2 (Chương 6)

**Ngày đo:** 2026-09-06. **Thiết bị:** app tài xế trên điện thoại (kênh WebRTC in-app).
**STT:** Google `chirp_3`, vi-VN. **Đoạn đọc:** 22 câu cố định (`wer_kich_ban.md`), N = 192 từ.
**Người đọc:** 1 (tác giả). **Số lượt:** 1 lượt/điều kiện.
**Script tính:** `compute_wer.py` (chuẩn hoá số ↔ chữ số, bỏ dấu câu, gộp cụm lặp do đọc lại,
canh toàn transcript bằng khoảng cách sửa mức từ).

## Điều kiện

| | Mô tả |
|---|---|
| A — Yên tĩnh | Phòng yên, không nhạc/quạt/điều hoà. Phiên `driver-0888887798-c95d3d7e…`, 18:49–18:54. |
| B — Nhiễu khoang xe giả lập | Tiếng ồn nền mô phỏng khoang xe chạy, phát từ **thiết bị phụ** (không phát qua điện thoại đang đọc — nếu phát qua chính máy thì bộ khử tiếng vọng bóp mất input, STT rỗng). Phiên `driver-0888887798-509f5d25…`, 19:08–19:13. |

> Ghi nguồn tiếng ồn cụ thể (tên video / clip) vào bản in nếu cần tái lập chính xác.

## Kết quả

| Điều kiện | S | D | I | N | WER |
|---|---|---|---|---|---|
| A — Yên tĩnh | 1 | 5 | 0 | 192 | **3,1%** |
| B — Nhiễu | 3 | 5 | 6 | 192 | **7,3%** |
| Chênh lệch B − A | | | | | **+4,2 điểm phần trăm** |

## Lỗi quan sát ở điều kiện B (không có ở A)

- Thay từ mang nghĩa: "thu nhập" → "phim Nhật".
- Sai chữ số trong địa chỉ: "năm mươi tư" → "50" / "24" (rồi "54").
- Rụng hư từ ngắn: "đón" (câu 4), "này" (câu 5), "trước" (câu 21).
- Chèn thừa: "đến" (câu 9), "nhất" (câu 18).

Ở điều kiện A chỉ có: rụng "Tôi"/"cho"/"của"/"nhận" (hư từ) và 1 lần "điểm đón" → "điểm đó".

## Hạn chế (đã nêu trong §6.6, §6.11, §6.12)

Mẫu nhỏ, một người đọc, một lượt mỗi điều kiện, một mức nhiễu, đọc kịch bản (biết trước).
Cần nhiều người đọc, nhiều mức nhiễu và đọc mù để khái quát.
