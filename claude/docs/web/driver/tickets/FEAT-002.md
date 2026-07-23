# FEAT-002 — Nối LLM thật cho "AI assistant" trên driver-web

| | |
|---|---|
| **Loại** | Feature |
| **Service** | driver-web |
| **Ưu tiên** | 🟡 Trung bình |
| **Trạng thái** | ⬜ Chưa làm |
| **Liên quan** | [01_BACKLOG.md](../01_BACKLOG.md), [03_PROGRESS.md](../03_PROGRESS.md), bản customer-web: [`../../customer/tickets/FEAT-002.md`](../../customer/tickets/FEAT-002.md) |

## Mô tả

Nút "AI assistant" trong `driver-web` hiện là **placeholder chưa nối LLM thật**.

**Vị trí code**: `src/frontend/driver-web/src/services/api/assistant.ts:8` — `// TODO: wire a real LLM here (Gemini/OpenAI/Anthropic...)`

## Ngữ cảnh

- Khác với voice-agent (voicebot qua LiveKit) đã hoạt động — không nhầm lẫn 2 luồng này.
- `customer-web` có cùng vấn đề — theo dõi tại `docs/web/customer/tickets/FEAT-002.md`. Nếu dùng chung 1 endpoint backend, cập nhật cả 2 ticket.

## Yêu cầu / Acceptance Criteria

- [ ] Chọn provider LLM (thống nhất với `customer-web` nếu dùng chung endpoint).
- [ ] Tạo endpoint backend trung gian (không gọi thẳng từ frontend).
- [ ] `assistant.ts` gọi qua endpoint trung gian này.
- [ ] Xử lý lỗi khi LLM timeout/fail.

## Việc cần làm

1. Xác nhận provider LLM sẽ dùng.
2. Thiết kế endpoint backend.
3. Implement + thay thế TODO trong `assistant.ts`.
4. Cập nhật [03_PROGRESS.md](../03_PROGRESS.md), ghi log vào [02_WORK_LOG.md](../02_WORK_LOG.md).

## Ghi chú

Chưa bắt đầu điều tra chi tiết.
