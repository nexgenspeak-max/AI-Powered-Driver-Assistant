# 02 — Nhật ký công việc customer-app

> File này trả lời câu hỏi: **"Ai đã làm gì trên customer-app, khi nào?"**
> Hầu hết công việc ngày 2026-07-19 làm **song song, đồng bộ 1-1** với `driver-app` (cùng 1 hệ thống UI dùng chung) — xem [`../driver/02_WORK_LOG.md`](../driver/02_WORK_LOG.md) cho log chi tiết đầy đủ (kỹ thuật liquid-glass, layout audit, các bug đã sửa). File này chỉ ghi phần **khác biệt riêng** của customer-app.

---

### 2026-07-19 — Đồng bộ toàn bộ hệ thống liquid-glass UI + layout fix từ driver-app
- Nhận đầy đủ: `src/components/LiquidGlass/`, `GlassTabButton`, `Card`/`Badge`/`Button`/`BackButton` viết lại, tab bar, `SafeAreaProvider`, các fix layout (safe-area, padding, màu semantic) — xem [`../driver/02_WORK_LOG.md`](../driver/02_WORK_LOG.md) cho chi tiết kỹ thuật đầy đủ.
- Riêng cho customer-app: `ProfileCard` không có 2 khối stat (rating/trips/acceptance/completion) như driver-app vì `Customer` không có các trường này — chỉ có số điện thoại.
- `BookingForm`: đổi màu trạng thái "có chuyến đang chạy" từ token Tamagui mặc định (`$green4`/`$green8`/`$green11`) sang token semantic riêng của app (`$successContainer`/`$onSuccessContainer`), bỏ `borderColor` chết (Card không có `borderWidth` nên prop này không có tác dụng gì).
- `TripHistoryList`: chuẩn hoá padding trang, sửa `gap` không nhất quán giữa các section.
- `trip/[id].tsx` (Trip Status): thêm `<BackButton />` còn thiếu — đây là màn hình pushed (giống `about`/`faq`) nhưng trước đó không có nút quay lại; đồng thời chỉnh `TripStatusCard`'s `paddingTop` dùng `getBackButtonClearance()` cho khớp.
- Verify: `tsc --noEmit` sạch, `expo export --platform web` build thành công.

### 2026-07-19 — Sửa xung đột dependency `expo-file-system` (build Android)
- Đây là bug **riêng của customer-app** (không xảy ra ở driver-app) — chi tiết đầy đủ tại [`../driver/tickets/BUG-M004.md`](../driver/tickets/BUG-M004.md).

## Cách mở rộng file này

Giống quy ước tại [`../../web/02_WORK_LOG.md`](../../web/02_WORK_LOG.md). Việc dùng chung với `driver-app` → ghi đầy đủ ở [`../driver/02_WORK_LOG.md`](../driver/02_WORK_LOG.md), chỉ ghi tóm tắt + link ở đây.
