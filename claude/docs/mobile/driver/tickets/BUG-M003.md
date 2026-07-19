# BUG-M003 — Góc vuông lộ ra sau nút tròn BackButton

| | |
|---|---|
| **Loại** | Bug |
| **Service** | driver-app, customer-app (`src/components/BackButton.tsx`) |
| **Mức độ** | 🟡 Trung bình (cosmetic) |
| **Trạng thái** | ✅ Đã sửa |
| **Liên quan** | [04_BUG_TRACKER.md](../04_BUG_TRACKER.md) |

## Mô tả

`BackButton` là nút tròn (`GlassMaterial` bo tròn `borderRadius = size/2`), nhưng bóng đổ (shadow) lại nằm trên 1 `Animated.View` bọc ngoài **không có `borderRadius`** — RN vẽ bóng theo hình dạng của chính view đó, nên bóng ra hình vuông trong khi nút bên trong là hình tròn, tạo cảm giác góc vuông lộ ra ở 4 góc.

## Việc đã làm

Thêm `borderRadius: BACK_BUTTON_SIZE / 2` vào style của `Animated.View` bọc ngoài (view chứa `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius`), khớp với `GlassMaterial` bên trong.

## Ghi chú

Đã rà soát `Card`, `Button`, `TabBar` — các chỗ này vốn đã đặt `borderRadius` và `shadow*` trên **cùng 1 view** nên không bị lỗi tương tự.
