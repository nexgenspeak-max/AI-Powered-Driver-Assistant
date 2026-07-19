# FEAT-002 — Nối LLM thật cho "AI assistant" trên customer-web

| | |
|---|---|
| **Loại** | Feature |
| **Service** | customer-web |
| **Ưu tiên** | 🟡 Trung bình |
| **Trạng thái** | ⬜ Chưa làm |
| **Liên quan** | [01_BACKLOG.md](../01_BACKLOG.md), [03_PROGRESS.md](../03_PROGRESS.md), bản driver-web: [`../../driver/tickets/FEAT-002.md`](../../driver/tickets/FEAT-002.md) |

## Mô tả

Nút "AI assistant" trong `customer-web` hiện là **placeholder chưa nối LLM thật**.

**Vị trí code**: `src/frontend/customer-web/src/services/api/assistant.ts:8` — `// TODO: wire a real LLM here (Gemini/OpenAI/Anthropic...)`

## Ngữ cảnh

- Đây là trợ lý AI dạng chat trong web app, **khác** với voice-agent (voicebot qua LiveKit) đã hoạt động — không nhầm lẫn 2 luồng này.
- Ticket này chỉ theo dõi phần `customer-web`. `driver-web` có cùng vấn đề — theo dõi tại `docs/web/driver/tickets/FEAT-002.md`. Nếu quyết định chung cho cả 2 (cùng 1 endpoint backend), cập nhật cả 2 ticket.

## Yêu cầu / Acceptance Criteria

- [ ] Chọn provider LLM (Anthropic/OpenAI/Gemini).
- [ ] Tạo endpoint backend trung gian (không gọi thẳng từ frontend) để giữ API key an toàn.
- [ ] `assistant.ts` gọi qua endpoint trung gian này.
- [ ] Xử lý lỗi khi LLM timeout/fail — không để UI treo.

## Việc cần làm

1. Xác nhận provider LLM sẽ dùng (thống nhất với `driver-web` nếu dùng chung endpoint).
2. Thiết kế endpoint backend (service nào sẽ host).
3. Implement + thay thế TODO trong `assistant.ts`.
4. Cập nhật [03_PROGRESS.md](../03_PROGRESS.md), ghi log vào [02_WORK_LOG.md](../02_WORK_LOG.md).

## Ghi chú

Chưa bắt đầu điều tra chi tiết.
