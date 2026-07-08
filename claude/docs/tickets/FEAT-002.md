# FEAT-002 — Nối LLM thật cho "AI assistant" trên customer-web/driver-web

| | |
|---|---|
| **Loại** | Feature |
| **Service** | customer-web, driver-web |
| **Ưu tiên** | 🟡 Trung bình |
| **Trạng thái** | ⬜ Chưa làm |
| **Liên quan** | [01_BACKLOG.md](../01_BACKLOG.md), [03_PROGRESS.md](../03_PROGRESS.md) |

## Mô tả

Nút "AI assistant" trong `customer-web` và `driver-web` hiện là **placeholder chưa nối LLM thật**.

**Vị trí code**:
- `src/frontend/customer-web/src/services/api/assistant.ts:8` — `// TODO: wire a real LLM here (Gemini/OpenAI/Anthropic...)`
- `src/frontend/driver-web/src/services/api/assistant.ts:8` — tương tự

## Ngữ cảnh

- Đây là trợ lý AI dạng chat trong web app, **khác** với voice-agent (voicebot qua LiveKit) đã hoạt động — không nhầm lẫn 2 luồng này.
- Cần quyết định: gọi thẳng LLM provider từ frontend (không khuyến khích, lộ API key) hay qua 1 backend endpoint trung gian.

## Yêu cầu / Acceptance Criteria

- [ ] Chọn provider LLM (Anthropic/OpenAI/Gemini) — nên nhất quán với các phần AI khác trong hệ thống nếu có ràng buộc.
- [ ] Tạo endpoint backend trung gian (không gọi thẳng từ frontend) để giữ API key an toàn.
- [ ] `assistant.ts` ở cả 2 web app gọi qua endpoint trung gian này.
- [ ] Xử lý lỗi khi LLM timeout/fail — không để UI treo.

## Việc cần làm

1. Xác nhận provider LLM sẽ dùng.
2. Thiết kế endpoint backend (service nào sẽ host — trip-service hay service riêng?).
3. Implement + thay thế TODO trong 2 file `assistant.ts`.
4. Cập nhật [03_PROGRESS.md](../03_PROGRESS.md), ghi log vào [02_WORK_LOG.md](../02_WORK_LOG.md).

## Ghi chú

Chưa bắt đầu điều tra chi tiết — cập nhật ticket khi bắt tay vào làm.
