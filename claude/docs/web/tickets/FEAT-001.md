# FEAT-001 — Ghép tài xế gần nhất khi có booking chưa gán tài xế

| | |
|---|---|
| **Loại** | Feature |
| **Service** | trip-service |
| **Ưu tiên** | 🔴 Cao |
| **Trạng thái** | ⬜ Chưa làm |
| **Liên quan** | [01_BACKLOG.md](../01_BACKLOG.md), [03_PROGRESS.md](../03_PROGRESS.md) |

## Mô tả

Hiện tại khi có booking mới chưa được gán tài xế, hệ thống **hardcode gán vào 1 số điện thoại cố định** (`config.phoneDriver`) thay vì tìm tài xế gần nhất/phù hợp nhất. Đây là `// TODO(temporary)` trong code, không phải hành vi mong muốn lâu dài.

**Vị trí code**: `src/backend/trip-service/src/routes/trips.ts:21`

## Ngữ cảnh

- Dữ liệu tài xế đang được lưu trong DynamoDB qua `trip-service`.
- Cần có vị trí hiện tại của tài xế (real-time hoặc gần real-time) để tính "gần nhất" — cần kiểm tra xem tài xế app (mobile-app/driver-app hoặc driver-web) đã gửi vị trí lên chưa, ở đâu.

## Yêu cầu / Acceptance Criteria

- [ ] Khi có booking mới không chỉ định tài xế, hệ thống tìm tài xế đang online, gần điểm đón nhất, và còn khả dụng (không đang chở khách khác).
- [ ] Có cơ chế fallback hợp lý khi không tìm được tài xế phù hợp (không phải hardcode 1 số cố định).
- [ ] Xóa bỏ `config.phoneDriver` hardcode sau khi logic mới hoạt động ổn định.
- [ ] Có test cho trường hợp: nhiều tài xế, tài xế bận, không có tài xế nào khả dụng.

## Việc cần làm

1. Xác nhận nguồn dữ liệu vị trí tài xế hiện có (đã có sẵn hay cần thêm mới).
2. Thiết kế thuật toán chọn tài xế (khoảng cách đơn giản trước, có thể tối ưu sau).
3. Implement trong `trip-service`, thay thế logic hardcode.
4. Cập nhật [03_PROGRESS.md](../03_PROGRESS.md) và [01_BACKLOG.md](../01_BACKLOG.md) khi xong, ghi log vào [02_WORK_LOG.md](../02_WORK_LOG.md).

## Ghi chú

Chưa bắt đầu điều tra chi tiết — mục "Việc cần làm" là gợi ý ban đầu, cập nhật lại khi bắt tay vào làm.
