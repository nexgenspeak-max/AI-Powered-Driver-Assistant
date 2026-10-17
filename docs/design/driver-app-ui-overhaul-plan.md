# Czen Driver — Kế hoạch làm lại giao diện toàn diện

Ngày lập: 2026-10-17. Phạm vi: `src/frontend/driver-app` (Expo SDK 54, expo-router, Tamagui, Reanimated, react-query, zustand).
Mục tiêu: một app tài xế có thể bán được — nhìn lướt là hiểu, thao tác một tay khi đang cầm lái, nhất quán từ icon đến từng nút.

---

## 1. Căn cứ tham khảo

| Nguồn | Bài học áp dụng |
|---|---|
| Uber — *Rewrite, Update, or Migrate: Building the Next Generation of Uber's Driver App* (Carbon) | Thiết kế theo **luồng làm việc của tài xế**, không theo đội sở hữu tab. App cũ có 4 tab cứng và bản đồ ngập overlay → bản mới: bản đồ là sân khấu, mọi thứ khác là thẻ theo ngữ cảnh. Tách logic nghiệp vụ khỏi view (RIBs/VIPER) để mở rộng không vỡ. |
| Uber driver research (470 tài xế, 7 thành phố) | Tài xế cần: thấy **thu nhập theo thời gian thực**, hiểu rõ chuyến trước khi nhận (giá, km, phút), ít bước, ít chữ. |
| Grab — *Job Experience* redesign (MY/SG blog) | **Nhiều không gian bản đồ hơn** khi đang chạy; **một màn hình cho một booking**; tính năng quan trọng gom về **một chỗ**; home gọn: Home · Wallet · History. |
| Apple HIG (iOS 26) & Material 3 | Icon: một hình khối đậm, không chữ, hệ tự bo góc/kính. Navigation bar 4 đích + FAB giữa; bottom sheet cho hành động theo ngữ cảnh; nút ≥ 44pt. |
| *Refactoring UI* (Wathan & Schoger) | Phân cấp bằng **cỡ/đậm/màu**, bắt đầu từ thang xám; khoảng trắng là công cụ; bóng đổ tinh tế theo thang; thang cố định (4/8/12/16/24/32). |
| *Laws of UX* (Yablonski) — Fitts, Hick, Jakob, Miller | Nút chính to và ở vùng ngón cái; ≤ 3 lựa chọn mỗi lần; làm giống app tài xế quen thuộc (Grab/Be/Uber) để không phải học lại; ≤ 5 mục thông tin mỗi thẻ. |
| NHTSA Visual-Manual Guidelines | Mỗi lần rời mắt khỏi đường ≤ 2 s, tổng ≤ 12 s → mọi thẻ phải đọc được trong một cái liếc: số to, một hành động chính, không chữ nhỏ hơn 13pt. |

---

## 2. Mười nguyên tắc thiết kế (áp cho mọi màn)

1. **Bản đồ là sân khấu.** Trang chủ không có header; chrome chỉ gồm pill trạng thái, nút vị trí, thẻ điểm đến, orb.
2. **Một hành động chính mỗi màn.** Nút chính full-width, 56pt, gradient brand; hành động phụ là outline 52pt.
3. **Số trước, chữ sau.** Giá, phút, km dùng `display`/`h1`; nhãn `label` 13pt màu phụ.
4. **Tối đa 5 thông tin trên một thẻ** (tên khách, đón, trả, km·phút·giờ, giá).
5. **Mọi trạng thái đều có mặt:** loading (skeleton), rỗng (EmptyState có hành động), lỗi (thử lại), thành công (haptic + toast).
6. **Hai container duy nhất:** `Surface` (nội dung) và `GlassPanel` (nổi trên bản đồ). Không hex trong màn hình, chỉ token.
7. **Tám biến thể chữ (`AppText`)** — không `fontSize` tay.
8. **Chuyển động 150–250 ms**, tôn trọng Reduce Motion, haptic chỉ cho kết quả (nhận/hoàn thành/lỗi).
9. **Tiếng Việt từ góc nhìn tài xế** ("Đang gọi bạn", "Bạn đã huỷ"), không enum.
10. **Nhất quán thương hiệu:** mark Czen (C + sóng) xuất hiện ở icon, splash, orb, landing; tím `#7C3AED` là màu hành động duy nhất, xanh lá cho hoàn thành, đỏ cho huỷ.

---

## 3. Kiến trúc FE và SOLID

### 3.1 Tầng
```
tokens (tamagui.config.ts, theme/elevation.ts, theme/motion.ts)
  └─ primitives  src/components/*        AppText, Button, Surface, GlassPanel, Badge, Skeleton, SegmentedControl, Sheet
       └─ patterns  src/components/patterns/*  StatTile, MetaRow, RouteLine, ActionBar, EmptyState, ListRow
            └─ features  src/features/<domain>/{components,hooks,stores,lib,services}
                 └─ routes  app/(auth)/*, app/(app)/*   (chỉ ghép, không chứa logic)
```

### 3.2 SOLID trong RN
| Nguyên tắc | Cách thể hiện |
|---|---|
| **S** — mỗi module một lý do thay đổi | Route file chỉ ghép; hook chứa dữ liệu (`useDriverContext`), component chỉ vẽ; toán điều hướng tách ở `features/home/lib/navigationMath.ts`. |
| **O** — mở rộng bằng variant, không sửa lõi | `Button variant`, `Badge tone`, `StatTile size`; thêm biến thể = thêm case trong `variants`, không fork component. |
| **L** — thay thế được | Mọi container nhận `children` + `style`; `GlassPanel` và `Surface` dùng cùng props cơ bản để đổi chỗ không vỡ layout. |
| **I** — interface nhỏ | Hook trả đúng cái màn cần (`useDriverMapModel` → `nextStop`, `recenter`), không trả cả context. |
| **D** — phụ thuộc vào trừu tượng | Màn hình gọi `services/api/*`, không gọi axios; store không biết endpoint; `voiceSessionStore` không biết UI. |

### 3.3 State
- **Server state:** react-query (`driverContext`, `me`, `earningsSummary`) — invalidate qua WebSocket, không poll.
- **Client state:** zustand (`authStore`, `themeStore`, `tripOfferStore`, `voiceSessionStore`, `assistantChatStore`).
- **Form:** react-hook-form + zod.
- **Quy tắc:** không `useState` cho dữ liệu đến từ API; không đọc store trong component vẽ thuần (truyền props).

### 3.4 Kiểm định
- `npx tsc --noEmit`, `npm run verify:navigation`, web `/map-preview` chụp ảnh, CI `.github/workflows/ci.yml`.
- Mỗi màn có dữ liệu mẫu để chụp ảnh không cần đăng nhập (mở rộng cơ chế `map-preview`).

---

## 4. Hệ thống thiết kế (tokens)

| Nhóm | Giá trị |
|---|---|
| Màu brand | `primary #7C3AED`, press `#6D28D9`, gradient `#5B21B6 → #7C3AED → #9F67FA` |
| Ngữ nghĩa | success `#16A34A/#34D399`, warning `#F59E0B/#FBBF24`, danger `#EF4444/#F87171`, info `#3B82F6` |
| Nền | light `#F4F6FB` / card `#FFFFFF`; dark `#1A1420` / card `#241D2C` |
| Chữ | display 28/34 700 · h1 22/28 700 · h2 18/24 600 · title 16/22 600 · body 15/22 400 · bodyStrong 15/22 600 · label 13/18 500 · caption 12/16 400 (Inter) |
| Khoảng cách | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 |
| Bo góc | card 24 · control 14 · chip 999 · sheet 28 |
| Bóng | sm/md/lg theo `theme/elevation.ts` |
| Chuyển động | fast 150 · base 220 · slow 320 ms; easing out-quad |
| Vùng chạm | tối thiểu 48pt; hành động khi lái 56pt |

---

## 5. Kiến trúc thông tin

Tab bar: **Trang chủ (bản đồ)** · **Chuyến** · ⬤ **Czen** · **Thu nhập** · **Cá nhân**.
Các màn phụ (hồ sơ, xe, giấy tờ, ngân hàng, an toàn, hỗ trợ, cài đặt trợ lý) mở từ Cá nhân dạng stack với AppBar + nút back.

---

## 6. Đặc tả từng màn

### 6.1 Trang chủ — Job Experience (Grab/Uber)
- Toàn màn bản đồ. Trên: pill trạng thái (chấm xanh + "Đang nhận chuyến · 2 chuyến") trái, nút vị trí phải.
- Dưới: **NextStopCard** (kính): loại điểm, tên khách, địa chỉ 2 dòng, phút·km, nút *Chỉ đường* 56pt + nút gọi tròn.
- Khi đang chỉ đường: HUD trên cùng (mũi tên, "Rẽ trái trong 200 m", còn km·phút, "Đang tính lại đường…"), bản đồ nghiêng 45°, không thẻ dưới.
- Khi offline: thẻ dưới đổi thành **GoOnlineCard** ("Bật nhận chuyến" 56pt + thu nhập hôm nay).

### 6.2 Chuyến mới — TripOfferSheet (thay banner)
- Sheet toàn màn từ dưới lên, nền tối mờ, **đếm ngược 20 s** vòng tròn quanh giá.
- Thứ tự đọc: **Giá** (display) → km·phút·giờ đón → tên khách → đón/trả (RouteLine) → ghi chú (hàng cồng kềnh, trẻ em).
- Nút: *Nhận chuyến* 56pt gradient; *Bỏ qua* text. Âm báo + haptic như hiện tại.

### 6.3 Chuyến (danh sách)
- Header: chào + thu nhập hôm nay; SegmentedControl Chờ/Đang chạy/Xong.
- Thẻ chuyến: avatar chữ cái, tên, badge trạng thái VN, RouteLine, MetaRow, giá; thẻ đang chạy có stepper + 1 nút chính + hàng *Gọi khách* / *Huỷ*.
- Lộ trình tối ưu: thẻ thu gọn (3 điểm · 12 km · 35 phút) bấm mở rộng danh sách.

### 6.4 Thu nhập — Wallet (Grab)
- Hero: số tiền `display`, kỳ (Hôm nay/7 ngày/30 ngày), số chuyến, giờ online.
- **Biểu đồ cột 7 ngày** (thuần View, không thư viện), cột hôm nay tô brand.
- Danh sách chuyến nhóm theo ngày, mỗi dòng: giờ, khách, đón → trả, tiền.
- Trạng thái rỗng có minh hoạ + nút "Bật nhận chuyến".

### 6.5 Cá nhân
- Header card: avatar, tên, biển số, badge online; 4 KPI (đánh giá, chuyến, tỉ lệ nhận, hoàn thành) dạng lưới 2×2.
- Nhóm menu: Tài khoản · Thanh toán & Giấy tờ · Hỗ trợ & Pháp lý · Cài đặt; hàng 56pt, icon 24, chevron.
- Phiên bản + nút Đăng xuất màu danger tách riêng cuối trang.

### 6.6 Đăng nhập / Đăng ký
- Landing: mark Czen + "Czen" wordmark, một câu giá trị, 2 nút. Bỏ hero động nhiều vệ tinh.
- Form: 1 card, input 56pt, lỗi inline, nút chính gradient.

### 6.7 Trợ lý (panel)
- Sheet 85% chiều cao, tiêu đề "Czen" + chip trạng thái (Đang nghe / Đang nói / Mic tắt), bong bóng hội thoại, ô nhập + orb dock.
- Lệnh gợi ý dạng chip: "Lịch hôm nay", "Gọi khách", "Thu nhập".

### 6.8 Cài đặt trợ lý
- Nhóm: Giọng/ngôn ngữ, Chế độ gọi khách mặc định, Gợi ý điểm dừng, Wake word. Mỗi hàng có mô tả 1 dòng.

---

## 7. Chuyển động & phản hồi
- Sheet: spring damping 18; thẻ: fade-in-down 220 ms; nút: scale 0.97 khi nhấn.
- Haptic: success (nhận chuyến, hoàn thành), warning (lệch tuyến), error (thất bại). Không haptic khi chuyển tab.
- Reduce Motion: tắt mọi loop (orb thở, sóng), giữ chuyển cảnh tức thì.

## 8. Khả năng tiếp cận
- Mọi Pressable có `accessibilityLabel` tiếng Việt; vùng chạm ≥ 48pt; tương phản AA (kiểm bằng token).
- Font scale: `AppText` dùng `allowFontScaling` tới 1.3; thẻ không cắt chữ.

---

## 9. Lộ trình thực hiện

Trạng thái 2026-10-17 (tối): P1, P2, P3 (lộ trình thu gọn), P4, P5 (AppBar cho 11 màn phụ), P6, P7 (chip trạng thái + gợi ý lệnh) đã xong; P0 dùng primitives sẵn có; P8 còn lại.

| Giai đoạn | Nội dung | Tiêu chí nghiệm thu |
|---|---|---|
| **P0 — Nền** | Token motion, `Sheet` primitive, `StatTile`, `ListRow`, `ActionBar`; AppBar chuẩn cho màn phụ | tsc sạch; 2 ảnh chụp light/dark |
| **P1 — Job Experience** | GoOnlineCard khi offline; NextStopCard/HUD tinh chỉnh; pill | Ảnh web preview 3 trạng thái |
| **P2 — TripOfferSheet** | Sheet toàn màn + đếm ngược + giá to; gỡ banner cũ | Nhận/bỏ qua hoạt động; auto-dismiss khi hết hạn |
| **P3 — Chuyến** | Thẻ chuyến chuẩn hoá; lộ trình thu gọn; header thu nhập | Danh sách 3 tab có skeleton/rỗng/lỗi |
| **P4 — Thu nhập** | Hero + biểu đồ 7 ngày + nhóm theo ngày | Số khớp API; rỗng có CTA |
| **P5 — Cá nhân & màn phụ** | Header KPI 2×2, menu nhóm, AppBar | Điều hướng back nhất quán |
| **P6 — Auth** | Landing mark Czen, form mới | Đăng nhập/đăng ký chạy |
| **P7 — Trợ lý** | Sheet chat, chip trạng thái, chip lệnh | Kết nối/ngắt, transcript hiển thị |
| **P8 — Polish** | Haptic/motion audit, a11y audit, dark mode toàn bộ | Checklist §2 và §8 đạt |

Mỗi giai đoạn: commit riêng, chạy `tsc` + `verify:navigation`, chụp web preview; thiết bị thật kiểm tra ở P1, P2, P7.

## 10. Rủi ro
- `ios/` được gitignore: icon/tên trong asset catalog phải sinh lại bằng `npx expo prebuild --platform ios` khi build máy khác (CI/EAS tự làm).
- Blur (`GlassPanel`) tốn GPU trên Android cũ → giới hạn 2 panel kính trên một màn.
- Dữ liệu thu nhập theo ngày cần `earnings/summary` trả về mảng ngày; nếu thiếu, biểu đồ tính từ `completed_trips`.
