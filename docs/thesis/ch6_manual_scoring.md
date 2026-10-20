# Chấm tay độ đúng công cụ — Bảng 6.6 / 6.7 (Chương 6)

**Nguồn:** `src/backend/llm-orchestrator/logs/agent.*.log`, cửa sổ 2026-09-05 → 2026-09-06.
**Cách trích:** lọc dòng `[DRIVER]` / `[AI]` / `event=spoken_intent` / `event=http` / `event=turn` (đã lược ANSI, dedup), gộp theo `room=`.
**Người chấm:** 1 (tác giả). **Chưa mù.** Phiên là dev-probe, nhiều câu cạnh biên. → Chỉ dùng làm **quan sát sơ bộ**, không phải campaign chính thức.

## Tiêu chí (theo mục 6.4.3–6.4.4)

- **Đúng công cụ**: công cụ được gọi khớp việc tài xế yêu cầu; tham số then chốt đúng; không gọi thêm công cụ phá nghiệp vụ.
- **Hoàn thành**: nhu cầu tài xế được đáp ứng đúng ngay lần đầu (không tính lần bot tự sửa sau khi bị nhắc).
- **P** = đúng công cụ nhưng hoàn thành sau khi tự sửa.

## Thống kê 13 phiên (S12–S24), 43 lượt nghiệp vụ rõ ràng (dòng S13 không còn trong bảng)

| Phiên | Đ | P | S | Ghi chú lỗi |
|---|---|---|---|---|
| S12 | 4 | 0 | 0 | |
| S14 | 2 | 0 | 2 | E-PARAM (earnings tháng→hôm nay); E-CONFIRM (“Vâng.” không hành động) |
| S15 | 3 | 1 | 1 | E-PARAM (earnings all-time); E-INTENT (“chở khách”→công cụ sai, đã vá) |
| S16 | 0 | 0 | 1 | E-INTENT (“gọi khách như nào?”→gọi luôn) |
| S17 | 1 | 0 | 0 | |
| S18 | 3 | 1 | 0 | bot đọc nhầm “khách báo…” trước khi gọi (tự sửa) |
| S19 | 3 | 0 | 1 | E-INTENT (“hôm nay tôi có khách”→gọi Thành Long) |
| S20 | 3 | 0 | 0 | |
| S21 | 2 | 0 | 0 | “gọi danh sách như nào?”→“chưa hỗ trợ” (đúng) |
| S22 | 3 | 1 | 0 | E-UX (chuyển lời nhắn thành “chuyến đầu cho bạn nhé?”) |
| S23 | 1 | 1 | 0 | E-UX (địa chỉ cắt cụt “…ba đ….”) |
| S24 | 4 | 0 | 0 | phiên demo sạch |
| **Tổng** | **32** | **5** | **6** | |

## Con số đưa vào luận văn

- Tổng ghi lúc chấm: **43 lượt** trong 13 phiên (S12–S24): Đ 32, P 5, S 6.
- Dòng chi tiết của S13 bị mất khi chép bảng: 12 dòng trên cộng được Đ 29, P 4, S 5 (38 lượt); phần chênh 3/1/1 là của S13. Luận văn dùng tổng 43 lượt và nêu việc này ở mục 6.13.
- **Chọn đúng công cụ** = (Đ + P) / tổng = 37/43 = **86,0%** (Wilson 95%: 72,7%–93,4%).
- **Hoàn thành đúng ngay lần đầu** = Đ / tổng = 32/43 = **74,4%** (Wilson 95%: 59,8%–85,1%).
- Bản trước của luận văn ghi 88% / 77% trên "≈ 39 lượt" và chia theo use case; các số đó không truy được từ bảng chấm (các lượt không gắn nhãn UC), nên đã được thay ngày 20/10/2026.
- Phân loại lỗi (Bảng 6.9), theo ghi chú khi chấm: E-INTENT 4 · E-PARAM 2 · E-UX 3 · E-CONFIRM 2 · E-STT 2 · E-API 0.

## Hạn chế của cách chấm này (đã ghi trong §6.11 và §6.12)

Mẫu nhỏ, một người chấm, chưa mù, không gắn nhãn UC, phiên phát triển. Cần đợt chấm chính thức: kịch bản mù, ≥ 2 người chấm, gắn nhãn UC01–UC08, n ≥ 10 mỗi UC.
