# BUG-M007 — Nút Accept tràn ra ngoài card

| | |
|---|---|
| **Loại** | Bug |
| **Service** | driver-app (`src/components/Button.tsx`, dùng bởi `TripCard.tsx`) |
| **Mức độ** | 🔴 Nghiêm trọng (vỡ layout, có thể không bấm được nút) |
| **Trạng thái** | ✅ Đã sửa |
| **Liên quan** | [04_BUG_TRACKER.md](../04_BUG_TRACKER.md) |

## Mô tả

Trong `TripCard`, hàng nút "Reject"/"Accept" (`<XStack gap="$2"><Button full/><Button full/></XStack>`) — nút "Accept" bị tràn hẳn ra ngoài mép phải của card, bị cắt bởi viền màn hình.

## Nguyên nhân

Khi viết lại `Button` để dùng `useGlassPress` (gesture thật), component được bọc thêm 1 lớp `<GestureDetector><Animated.View>` quanh `ButtonFrame` gốc. Prop `full` (set `flex: 1, width: '100%'`) vẫn được forward đúng vào `ButtonFrame`, nhưng **`Animated.View` bọc ngoài không có `flex: 1`** — nên `ButtonFrame` co giãn đúng bên trong `Animated.View`, nhưng bản thân `Animated.View` đó không chiếm phần không gian tương ứng trong hàng `XStack` cha, khiến layout tổng thể sai (2 nút không chia đều 50/50 như mong đợi).

## Việc đã làm

Trích riêng prop `full` ra khỏi `Button`, áp cùng logic `flex: 1` vào `Animated.View` bọc ngoài:

```tsx
<Animated.View style={[full ? { flex: 1 } : undefined, stretchStyle]}>
```

## Ghi chú

Bài học chung: khi bọc thêm 1 layer quanh 1 component styled sẵn có (Tamagui/style system), phải kiểm tra lại **mọi prop ảnh hưởng layout** (không chỉ style hiển thị) có cần forward tiếp ra layer mới hay không.
