# 02 — Nhật ký công việc driver-app

> File này trả lời câu hỏi: **"Ai đã làm gì trên driver-app, khi nào?"**
> Ghi theo ngày, mới nhất lên đầu. Toàn bộ việc dưới đây làm trong 1 phiên làm việc dài ngày 2026-07-19, được chia nhỏ theo chủ đề để dễ tra cứu.

---

### 2026-07-19 — Tách `LiquidGlass.tsx` thành module + tách `GlassTabButton` khỏi route file
- `src/components/LiquidGlass.tsx` (265 dòng, gộp 4 việc: component hiển thị, gesture hook, glow overlay) → tách thành thư mục `src/components/LiquidGlass/`:
  - `GlassMaterial.tsx` — `GlassMaterial`, `GlassSheen`, gradient layers.
  - `useGlassPress.ts` — `useGlassPress`, `liquidGlassTransform`.
  - `GlowOverlay.tsx` — vệt sáng SVG.
  - `index.ts` — barrel export, giữ nguyên mọi đường dẫn import cũ (`from '.../components/LiquidGlass'`), không phải sửa file nào khác.
- `app/(app)/_layout.tsx` (169 dòng, vừa cấu hình `Tabs` vừa định nghĩa component `GlassTabButton`) → tách `GlassTabButton` ra `src/components/GlassTabButton.tsx`. File route còn 84 dòng, chỉ lo định tuyến.
- Verify: `tsc --noEmit` sạch, `expo export --platform web` build thành công.

### 2026-07-19 — Sửa xung đột dependency `expo-file-system` gây lỗi build Android (customer-app)
- Lỗi build: `Plugin with id 'maven' not found` khi build `customer-app` — do `expo-file-system` bị cài **2 bản khác nhau** trong `node_modules` (19.0.23 ở top-level qua `expo`, nhưng `expo-three` kéo theo bản cũ 13.2.1 không dedupe được vì `customer-app` không khai báo `expo-file-system` trực tiếp).
- Fix: chạy `npx expo install expo-file-system` trong `customer-app` để khai báo trực tiếp — npm gộp về 1 bản duy nhất (19.0.23), khớp với cách `driver-app` đã làm từ trước.
- Xác nhận: thao tác chỉ chạy trong thư mục `customer-app`, không ảnh hưởng `driver-app` (2 app có `node_modules`/`package.json` độc lập, không phải monorepo).

### 2026-07-19 — Điều tra "trợ lý rảnh tay" không nghe được từ khoá
- Triệu chứng báo cáo: bật toggle lên, nói "xin chào" nhiều lần không phản hồi; chỉ nghe được 1-2 lần ngay sau khi mở/reload app.
- Lấy log qua `adb logcat`: model Vosk load thành công, recognizer khởi động đúng với grammar `["xin chào", "[unk]"]`, nhưng **không có bất kỳ callback `onPartialResult`/`onResult` nào** — recognizer chạy nhưng không nhận audio.
- Xác nhận quyền `RECORD_AUDIO` đã cấp (`granted=true`) — loại trừ khả năng thiếu quyền.
- Tìm ra nguyên nhân gốc: GitHub issue [alphacep/vosk-api#1629](https://github.com/alphacep/vosk-api/issues/1629) — chính maintainer Vosk xác nhận đây là **giới hạn đã biết của Android Emulator** (AudioRecord không tin cậy khi phải tạo lại sau mỗi lần recognizer dừng/khởi động lại), **không xảy ra trên điện thoại thật**.
- Kết luận: code trong `wakeWordService.ts` nhiều khả năng không có bug — comment sẵn trong code (`"matching reports of it only working once right after opening the app"`) đã đúng hướng nghi ngờ. Cần test lại trên điện thoại thật để xác nhận dứt điểm — xem [BUG-M001](tickets/BUG-M001.md).

### 2026-07-19 — Rà soát và sửa layout toàn bộ màn hình
- Dùng 2 Explore agent song song rà soát toàn bộ screen/feature component của cả 2 app, tìm ra một loạt vấn đề thật (không phải nitpick):
  - `LoginForm`/`RegisterForm`: "card" đăng nhập tự dựng bằng `YStack` thiếu cả shadow lẫn border → sửa dùng `<Card>` dùng chung.
  - Không màn nào dùng `useSafeAreaInsets` — mỗi màn tự đoán `paddingTop` (56/64/112...) → thêm `SafeAreaProvider` ở root, sửa toàn bộ màn dùng `insets.top` thật.
  - `BackButton` vị trí `top` cứng → tính theo `insets.top`, export `getBackButtonClearance()` cho các màn có nút back dùng chung.
  - `BonusList` (driver), `BookingForm` (customer) dùng token màu mặc định Tamagui (`$yellow2`...) thay vì token semantic riêng của app (`$warningContainer`...).
  - `ProfileCard`: pill trạng thái tự dựng lại y hệt `Badge` → đổi dùng `<Badge>` dùng chung, mở rộng `Badge` thêm prop `icon`.
  - `FaqContent`: hàng bo viền tự dựng bằng border → đổi dùng `<Card>`.
  - `AssistantChatPanel`/`AssistantAvatar`: bỏ hack `marginTop={-16}` bằng cách sửa padding gốc của avatar.
  - Chuẩn hoá padding trang (`$4`/raw 16 vs `$5`/raw 20 lẫn lộn giữa các màn) về 1 giá trị nhất quán.
- Verify: `tsc --noEmit` sạch, `expo export --platform web` build thành công cho cả 2 app sau mỗi đợt sửa.

### 2026-07-19 — Xây hệ thống liquid-glass UI (2 lần làm lại)
- **Lần 1 (bỏ)**: thử hiện thực "hiệu ứng giọt nước" bằng shader Skia tự viết (SDF + smooth-min metaball) trong `@shopify/react-native-skia`, áp dụng cho `Card`/`Button`/`Badge`/`BackButton`/tab bar. Deploy lên thiết bị thật (build lại native Android) thì phát hiện **vỡ nặng**: quả cầu trắng khổng lồ đè lên card, tràn ra ngoài khung — do công thức tính bán kính blob (`useStaticLiquidBlobs`) dựa trên `min(width, height)` bị sai với card nhiều dòng (cao).
- **Lần 2 (giữ)**: đọc kỹ 3 repo tham khảo được yêu cầu clone về máy (`E:\UI`, `E:\Ui2`, `E:\UI3` — lần lượt là `alexandrius/liquid-glass-rn-skia`, `callstack/liquid-glass`, `SchroederNathan/linear-tab-bar`), phát hiện `E:\UI3` (`linear-tab-bar/GlassMaterial.tsx`) dùng kỹ thuật đơn giản và đáng tin cậy hơn nhiều: `BlurView` thật + `LinearGradient` phủ nhẹ (sáng trên/tối dưới) + viền sáng gradient thật qua `MaskedView` (không cần tính toán shader). Bỏ hoàn toàn Skia, viết lại theo đúng kỹ thuật này.
- Cài mới: `react-native-gesture-handler`, `@react-native-masked-view/masked-view`, `react-native-svg`, khai báo tường minh `react-native-worklets` (cả 2 app). Bọc `GestureHandlerRootView` ở root layout.
- Kết quả: `GlassMaterial` (blur+wash+viền, cho phần tử nổi trên nội dung tuỳ ý), `GlassSheen` (chỉ wash, không blur, cho phần tử nền đặc), `useGlassPress` (gesture Pan+Tap thật thay touch-responder tự chế), `GlowOverlay` (SVG RadialGradient theo ngón tay).
- Sửa thêm nhiều bug phát sinh trong quá trình chỉnh theo phản hồi thực tế trên thiết bị — xem chi tiết từng bug tại [04_BUG_TRACKER.md](04_BUG_TRACKER.md): góc bo không khớp giữa view chứa shadow và view hiển thị (`BackButton`), điểm sáng nhọn ở góc `Card` (viền gradient tuyến tính không hợp với góc bo nhỏ), `borderRadius={999}` không đáng tin cậy qua `MaskedView`, nút `Reject`/`Accept` tràn ra ngoài card (prop `full` không lan tới view bọc `GestureDetector`).
- Về `@callstack/liquid-glass` (API Liquid Glass thật của iOS 26) và `alexandrius/liquid-glass-rn-skia` (khúc xạ ánh sáng thật qua shader): đọc kỹ, quyết định **không dùng** — xem lý do tại [05_DECISIONS.md](05_DECISIONS.md).
- Quả cầu 3D (`AssistantAvatar`): tăng kích thước theo yêu cầu (180→270→360), sửa lỗi căn giữa (view cha thiếu `width="100%"`), phát hiện và giải thích hiện tượng Fast Refresh giữ context WebGL cũ khiến thay đổi `SIZE` không phản ánh cho tới khi reload thật.

## Cách mở rộng file này

Giống quy ước tại [`../../web/02_WORK_LOG.md`](../../web/02_WORK_LOG.md). `customer-app` nhận gần như toàn bộ thay đổi UI ở trên song song (mirror) — xem [`../customer/02_WORK_LOG.md`](../customer/02_WORK_LOG.md) cho phần khác biệt riêng của customer-app.
