# BUG-M005 — Điểm sáng nhọn ở góc bo nhỏ của Card

| | |
|---|---|
| **Loại** | Bug |
| **Service** | driver-app, customer-app (`src/components/LiquidGlass/GlassMaterial.tsx`, `Card.tsx`) |
| **Mức độ** | 🟡 Trung bình (cosmetic) |
| **Trạng thái** | ✅ Đã sửa |
| **Liên quan** | [04_BUG_TRACKER.md](../04_BUG_TRACKER.md) |

## Mô tả

Viền sáng gradient (`GlassSheen`/`GlassMaterial`) dùng `LinearGradient` chạy từ trên xuống dưới, cắt theo viền bo tròn qua `MaskedView`. Ở góc bo **nhỏ** so với kích thước tổng thể (`Card`: bo 24px trên card rộng/dẹt), đường cong góc đi qua đoạn dốc nhất của gradient rất nhanh → tạo điểm sáng nhọn ngay góc thay vì highlight mượt. Ở hình tròn/pill (bo = nửa chiều cao: `Button`, `Badge`, tab bar) không bị, vì góc chính là cả 1 đường cong lớn, mượt tự nhiên.

## Việc đã làm

Thêm tuỳ chọn `withBorder` cho `GlassSheen`/`GlassGradientLayers`. `Card` set `withBorder={false}` — chỉ giữ lớp phủ sáng-mờ (wash), bỏ hẳn viền gradient. Điều này cũng khớp đúng với spec gốc của `Card` ("no visible borders — very soft shadow").

## Ghi chú

`Button`, `Badge`, `BackButton`, tab bar vẫn giữ viền (`withBorder` mặc định `true`) vì đây là hình dạng pill/tròn, không bị hiện tượng này.
