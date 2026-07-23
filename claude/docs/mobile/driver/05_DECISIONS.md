# 05 — Quyết định kỹ thuật driver-app

> File này trả lời câu hỏi: **"Tại sao driver-app lại làm như vậy?"**
> `customer-app` dùng chung gần như toàn bộ hệ thống UI (`src/components/`) và các quyết định dưới đây — xem [`../customer/05_DECISIONS.md`](../customer/05_DECISIONS.md) cho phần riêng của customer-app.

## Bảng quyết định

| Ngày | Quyết định | Lý do |
|---|---|---|
| 2026-07-19 | Bỏ shader Skia (SDF/metaball) tự viết cho hiệu ứng "liquid glass", chuyển sang `BlurView` + `LinearGradient` + `MaskedView` (kỹ thuật port từ [linear-tab-bar](https://github.com/SchroederNathan/linear-tab-bar)) | Bản Skia vỡ nặng trên thiết bị thật (xem [BUG-M002](tickets/BUG-M002.md)) — công thức tự viết dễ sai với kích thước container đa dạng; kỹ thuật blur+gradient+mask đơn giản hơn, không cần tính toán hình học, đã được kiểm chứng qua repo tham khảo thật |
| 2026-07-19 | Không dùng `@callstack/liquid-glass` (API Liquid Glass thật của iOS 26) | Chỉ chạy iOS, cần Xcode ≥26 và build native trên máy Mac — máy dev hiện tại là Windows, không build được; sẽ là hướng nâng cấp cho riêng bản iOS sau này nếu cần |
| 2026-07-19 | Không dùng `alexandrius/liquid-glass-rn-skia` (khúc xạ ánh sáng thật qua shader) cho chrome dùng chung (tab bar/nút) | Kỹ thuật này chỉ hoạt động khi nền cũng được vẽ trong cùng 1 Skia Canvas (ảnh/gradient) — tab bar/nút của app nổi trên nội dung native tuỳ ý (ScrollView, text...), không thể áp dụng mà không chụp lại toàn màn hình mỗi frame (quá tốn); có thể cân nhắc cho 1 hiệu ứng trang trí độc lập sau này nơi đã tự vẽ nền bằng Skia |
| 2026-07-19 | Dùng `react-native-gesture-handler` (`Gesture.Pan`/`Gesture.Tap` qua `useGlassPress`) thay vì touch-responder thuần (`onPressIn`/`onPressOut`) cho hiệu ứng co-giãn khi chạm | Khớp đúng kỹ thuật đã kiểm chứng của repo tham khảo; cho phép theo dõi vị trí chạm liên tục (`onUpdate`) để tính độ "kéo giãn" mượt hơn touch-responder |
| 2026-07-19 | `Card` không có viền gradient (`GlassSheen withBorder={false}`), chỉ `Button`/`Badge`/`BackButton`/tab bar mới có | Viền gradient tuyến tính tạo điểm sáng nhọn ở góc bo nhỏ trên hình chữ nhật dẹt — xem [BUG-M005](tickets/BUG-M005.md); đồng thời khớp đúng spec gốc "Card không viền, chỉ shadow" |
| 2026-07-19 | Tách `LiquidGlass.tsx` (265 dòng) thành thư mục `LiquidGlass/` (4 file theo trách nhiệm) + tách `GlassTabButton` khỏi route file `(app)/_layout.tsx` | Theo yêu cầu tổ chức lại code cho dễ maintain; dùng barrel `index.ts` để không phải sửa import ở nơi khác |

## Cách mở rộng file này

Giống quy ước tại [`../../web/05_DECISIONS.md`](../../web/05_DECISIONS.md). Quyết định ảnh hưởng cả 2 app mobile → ghi ở 1 trong 2 file rồi trỏ chéo sang file kia, tránh lặp lại toàn văn.
