# BUG-M008 — Quả cầu 3D không đổi kích thước sau khi sửa SIZE

| | |
|---|---|
| **Loại** | Bug (môi trường dev, không phải code) |
| **Service** | driver-app, customer-app (`src/features/home/components/AssistantAvatar.tsx`) |
| **Mức độ** | 🟡 Trung bình (gây hiểu lầm là code sai trong lúc test) |
| **Trạng thái** | ✅ Đã giải thích |
| **Liên quan** | [04_BUG_TRACKER.md](../04_BUG_TRACKER.md) |

## Mô tả

Tăng hằng số `SIZE` (kích thước quả cầu 3D, dùng cho cả `style={{width,height}}` của `GLView` lẫn `renderer.setSize(SIZE, SIZE)`) từ 180 → 270 → 360, nhưng khi xem trên app: container (canvas) to lên đúng như kỳ vọng (đẩy layout bên dưới xuống), còn **quả cầu vẽ bên trong không hề to thêm**.

## Nguyên nhân

`onContextCreate` (hàm dựng scene Three.js: `camera`, `geometry`, `renderer.setSize(...)`) là **callback imperative chỉ chạy đúng 1 lần khi `GLView` mount**. Khi sửa code và Metro tự Fast Refresh, React thường giữ nguyên component instance cũ (không unmount/remount thật) để bảo toàn state — style/props JS cập nhật ngay, nhưng context WebGL/Three.js bên trong không được dựng lại, nên `renderer.setSize()` với `SIZE` mới không được gọi lại.

Về mặt toán học code không sai: camera dùng góc nhìn cố định (FOV 50°, `z=3.4`), sphere luôn chiếm 1 tỉ lệ % cố định của canvas bất kể độ phân giải — canvas to hơn thì quả cầu cũng to hơn đúng tỉ lệ, miễn là context được dựng lại.

## Việc đã làm

Không sửa code (không có gì để sửa) — xác nhận qua reload thật (không phải fast-refresh tự động) rằng quả cầu **có** to lên đúng như tính toán.

## Ghi chú

Bài học chung: mọi thay đổi ảnh hưởng tới setup imperative bên trong `onContextCreate`/`onGLContextCreate` (hoặc bất kỳ callback "chỉ chạy 1 lần khi mount" tương tự) **cần reload thật (không dựa vào Fast Refresh)** để thấy đúng kết quả khi test.
