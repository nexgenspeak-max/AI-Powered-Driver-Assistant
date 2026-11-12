# Driver App Map (Expo SDK 54 / RN 0.81.5 / expo-router 6): spec for SwiftUI + Compose rewrite

Root: /Users/david/Documents/David/Code/Thesis/AI-Powered-Driver-Assistant/src/frontend/driver-app
- **Project instructions:** CLAUDE.md just contains `@AGENTS.md`, which says "Expo HAS CHANGED, read https://docs.expo.dev/versions/v54.0.0/". There are no other project rules.
- **App identity:** the app is named "Czen". Bundle/package id is `com.chinhtruongba.driverapp`, URL scheme is `driver-app`, version 1.0.0, portrait only, New Architecture on.
- **Splash and launcher icon:** splash background is #ffffff. The Android adaptive-icon background is #6D28D9.
- **Libraries:**
  - UI and state: Tamagui 2.4.6, zustand 5, TanStack Query 5, axios, react-hook-form + zod.
  - Maps: @maplibre/maplibre-react-native 11 (maplibre-gl 4.7.1 on web).
  - Voice: livekit-client 2.20.1 with @livekit/react-native, and react-native-vosk (wake word).
  - Platform: expo-location + expo-task-manager, expo-audio, expo-contacts, expo-secure-store, react-native-mmkv, @supersami/rn-foreground-service (Android), expo-haptics, react-native-svg, Reanimated 4, Skia (glass shaders).
- **Patched dependencies:** patches/ holds fixes for livekit-client, react-native-vosk, rn-foreground-service, zustand and expo-gl. The livekit-client patch swallows the unhandled signal-loop rejection. The react-native-vosk patch makes Android report per-word confidence.

## 1. Routes and screens

### Root `app/_layout.tsx`
- Providers, in order: GestureHandler, SafeArea, Tamagui (theme from themeStore), Query.
- It shows a blank `$surface` view until two things are ready: the auth store has loaded from SecureStore (`hasHydrated`) and the four Inter fonts (400/500/600/700) are loaded.
- `AppShell` effect: if `accessToken` exists and `wakeword-settings.enabled` is true it calls `enableWakeWord()`, otherwise `disableWakeWord()`.
- Stack (no headers):
  - `(auth)` only when there is no accessToken.
  - `(app)` only when there is an accessToken.
  - Ungated, dev-only screens: `map-preview`, `dev-login`, `tabbar-preview`. Each one redirects to `/(auth)` in production builds.

### (auth) group: Stack with index, login, register

**`(auth)/index` → LandingScreen**
- Layout: violet gradient background (AuthScreenBackground). Light: #EDE9FE → #F5F4F8 → #F5F4F8. Dark: #2A1B4D → #1A1420 → #121212.
- ThemeToggle in the top right.
- BrandHero: 132pt tile with gradient #5B21B6 → #7C3AED → #A855F7, the Czen mark inside, and a #7C3AED halo behind it.
- Text: "Czen" (display), "Trợ lý giọng nói cho tài xế", "Nhận chuyến, gọi khách, xem thu nhập — chỉ cần nói, mắt vẫn trên đường."
- Buttons: GlassButton "Đăng nhập" → /login; outline Button "Đăng ký" → /register.

**`(auth)/login` → LoginForm**
- AuthHeader: 44pt back button (a11y "Quay lại"), 56pt brand tile, title "Đăng nhập", subtitle "Chào mừng trở lại. Đăng nhập để bắt đầu nhận chuyến."
- Fields:
  - "Số điện thoại", placeholder "0901 234 567", phone keypad, min 8 chars, error "Số điện thoại chưa hợp lệ".
  - "Mật khẩu", secure with show/hide toggle (a11y "Hiện mật khẩu"/"Ẩn mật khẩu"), min 6 chars, error "Mật khẩu tối thiểu 6 ký tự".
- Error text: "Đăng nhập thất bại. Kiểm tra lại thông tin."
- Submit "Đăng nhập" shows a loading spinner. Link "Chưa có tài khoản? Đăng ký".
- On success: `setTokens`, then replace to `/(app)/`.

**`(auth)/register` → RegisterForm**
- Title "Trở thành tài xế Czen", subtitle "Vài thông tin về bạn và xe là xong."
- Fields with zod errors:
  - "Họ và tên" (placeholder "Nguyễn Văn A", min 2, "Tên tối thiểu 2 ký tự")
  - "Số điện thoại" (min 8)
  - "Email" ("you@example.com", "Email chưa hợp lệ")
  - "Mật khẩu" (min 6)
  - "Loại xe": VehicleTypeSelect dropdown, placeholder "Chọn loại xe", error "Chọn loại xe". Options: motorbike="Xe máy", car_4="Ô tô 4 chỗ", car_7="Ô tô 7 chỗ", truck="Xe tải".
  - "Biển số xe" ("36C1-36363", min 3, "Biển số chưa hợp lệ")
  - "Tên xe" ("Honda Wave", min 2, "Nhập tên xe")
- Error text: "Đăng ký thất bại. Kiểm tra lại thông tin." (hidden if the request was cancelled).
- While the request is pending, a "Huỷ" button aborts it (AbortController).
- On success: `setTokens`, prime the `['me']` cache with the returned `user`, replace to `/(app)/`.
- Link "Đã có tài khoản? Đăng nhập".

### (app) group: `app/(app)/_layout.tsx`
- Tabs with a custom NavigationBar, `freezeOnBlur: true`, `detachInactiveScreens: false`.
- The tab bar is hidden while the chat panel is open.
- **Hooks mounted at this level:**
  - `useDispatchSocket(driver.status==='online', driver.phone)`
  - `useAutoConnectOnNudge`
  - `usePushLocationOnNewTrip`
  - `useCaptureVoiceMessages`
  - `useReturnHomeOnVoiceEnd`
  - `preloadCzenFillers()`
- **Overlays:**
  - AssistantChatOverlay: full screen, zIndex 100, shown when `panelOpen`.
  - TripOfferSheet: zIndex 120, always the top layer.
- **Visible tabs**, in order, with the assistant orb in the middle slot:
  - index "Trang chủ": icons home / home-fill
  - dashboard "Chuyến": wheel / wheel-fill
  - **[AI orb, label "Trợ lý"]**
  - earnings "Thu nhập": purse / purse-fill
  - profile "Cá nhân": person / person-fill
- **Hidden routes** (href:null) and the tab they highlight:
  - Highlight Chuyến: add-trip.
  - Highlight Cá nhân: edit-profile, assistant-settings, vehicle, bank-info, documents, safety, support, terms, about, faq.
  - dev-say is also hidden (no parent tab).
- Back from hidden screens is always `router.replace(backTo ?? '/profile')`.

**`index.tsx` Home (full-bleed map)**
- Shows DriverMap. Forces a dark status bar while focused because the Goong tiles are light in both themes.
- **Overlays (DriverMapOverlays):**
  - If navigation is active: NavigationHud only.
  - Otherwise MapStatusPill at top-left: dot + "Đang nhận chuyến"/"Đang nghỉ" + "· N chuyến".
  - Recenter button at top-right, a11y "Về vị trí của tôi".
  - At the bottom, one of:
    - NextStopCard (if there is a next stop)
    - GoOnlineCard (if context is loaded and the driver is offline)
    - nothing
- **NextStopCard:**
  - Label: "Đón khách" / "Đã đến · chờ khách" / "Trả khách", plus "· 1/N điểm" when there are several stops.
  - Customer name (fallback "Khách"), min/km, address.
  - Primary "Chỉ đường" with navigate icon starts navigation.
  - 52pt phone circle opens `tel:`, a11y "Gọi {name}".
- **GoOnlineCard:** "Hôm nay", today's earnings (display), "N chuyến", button "Bật nhận chuyến".
- **NavigationHud:**
  - States: "Đang tính đường...", "Không lấy được chỉ đường" (with refresh, a11y "Tính lại đường đi"), "Đã đến nơi".
  - Instruction formats: "Rẽ trái trong 200 m", "Đi thẳng 200 m". Action words: Quay đầu / Vào vòng xuyến / Nhập làn / Rẽ trái / Rẽ phải / Đi thẳng / Tiếp tục.
  - Remaining: "Còn {km · phút}"; while re-routing: "Đang tính lại đường...".
  - Close button, a11y "Thoát chỉ đường".

**`dashboard.tsx` Chuyến**
- **Sticky header:**
  - "Xin chào" + driver name (h1).
  - "Hôm nay {currency} · N chuyến xong".
  - Online label "Đang bật"/"Đang tắt" + Toggle (a11y "Trạng thái sẵn sàng nhận chuyến").
  - SearchInput "Tìm theo tên hoặc số điện thoại..." (accent-insensitive search over name/phone).
  - 48pt "+" button → /add-trip (a11y "Thêm chuyến tự tạo").
  - SegmentedControl: "Chờ (n)" / "Đang chạy (n)" / "Xong (n)". Default is "Đang chạy".
- Pull to refresh.
- **States:**
  - No driver yet: skeletons.
  - Loading: two skeleton cards.
  - Error: EmptyState alert-circle, "Không thể tải chuyến đi" / "Đã có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại." / "Thử lại".
  - Empty tab: EmptyTripsState. Online: check-circle "Chưa có chuyến nào" / "Đang chờ chuyến mới được giao...". Offline: power "Bạn đang offline" / 'Bật "Đang bật" để bắt đầu nhận chuyến'.
  - No search match: "Không tìm thấy chuyến đi phù hợp".
  - Completed tab empty: "Chưa có chuyến nào hoàn thành".
- **Tab contents:**
  - Chờ: `upcoming_trips` whose status is pending, notified or calling, shown as TripCard.
  - Đang chạy: OptimizedRouteCard (if `optimized_route` exists) + ActiveTripCard per `active_trips`.
  - Xong: ActiveTripCard per `completed_trips`.
- **TripCard:**
  - Letter avatar, name, phone, status Badge, fare.
  - RouteLine ("Điểm đón"/"Điểm đến").
  - TripMetaRow: distance, eta, pickup time, traffic note in warning color unless it says "thông thoáng".
  - For status notified/calling: "Từ chối" (confirm dialog "Từ chối chuyến này?" / "Bạn sẽ không thể nhận lại chuyến này sau khi từ chối." / "Giữ lại" / "Từ chối") and "Nhận chuyến".
- **ActiveTripCard:**
  - Avatar, name, phone, fare.
  - TripProgressStepper: Đã nhận → Đã đến → Đã đón.
  - RouteLine, TripMetaRow, and "Hàng cồng kềnh · Có trẻ em" when those flags are set.
  - Next action by status: confirmed→"Đã đến điểm đón", arrived_pickup→"Đã đón khách", picked_up→"Hoàn thành chuyến" (success style), completed→"Đã hoàn thành" (disabled).
  - "Gọi khách" (tel:).
  - "Huỷ chuyến" unless picked_up or completed. Confirm dialog: "Huỷ chuyến này?" / "Khách sẽ được thông báo. Thao tác này không thể hoàn tác." / "Giữ chuyến" / "Huỷ chuyến".
  - Arrival actions read a fresh GPS fix first. A 409 shows Alert "Chưa thể xác nhận" with the server's `detail`, falling back to "Không thể xác nhận, vui lòng thử lại.".
- **OptimizedRouteCard:**
  - Title "Lộ trình tối ưu", summary "{n} điểm · {dist} · ~{min} · {ngắn nhất | nhanh nhất theo giao thông}".
  - If source is haversine_fallback: "Ước tính đường chim bay — chưa có dữ liệu giao thông thực tế".
  - Numbered stop list: "Đón/Trả {name}", address, leg distance and time, or "Điểm xuất phát (chưa có GPS)".
  - Collapsed by default; toggle "Xem cả N điểm" / "Thu gọn". Hidden when there are fewer than 2 stops.

**`add-trip.tsx` "Thêm chuyến (tự tạo)"**
- backTo /dashboard. Intro: "Chuyến sẽ vào ngay Đang chạy — không hiện banner nhận chuyến."
- Sections:
  - "Khách hàng": "Số điện thoại khách" ("09xxxxxxxx", error "Vui lòng nhập số điện thoại khách") and "Tên khách (nếu có)" ("Anh/chị…").
  - "Lộ trình": "Điểm đón" / "Điểm trả" (placeholder "Số nhà, đường, phường/xã…", errors "Vui lòng nhập điểm đón/trả") and "Ghi chú (nếu có)".
  - "Yêu cầu đặc biệt": toggles "Hàng hoá cồng kềnh" and "Đi cùng trẻ em".
- Submit "Thêm chuyến". On success: invalidate driverContext, replace to /dashboard. On error: Alert "Không tạo được chuyến" with `detail` or "Vui lòng thử lại.".

**`earnings.tsx` Thu nhập**
- **Sticky header:** "Thu nhập" + EarningsHero.
  - Segmented control: "Hôm nay"/"7 ngày"/"30 ngày".
  - "Tổng thu nhập" figure.
  - Stats: "Chuyến", "TB/chuyến", and either "Giờ online" ("x,y giờ", today only) or "Thưởng".
  - Error: "Không thể tải dữ liệu. Nhấn để thử lại."
- **Scroll area:** WeeklyEarningsChart.
  - Title "7 ngày qua", caption "Cao nhất {T2..CN}: X" or "Chưa có chuyến nào trong 7 ngày".
  - Seven bars: today `$primary`, days with earnings `$primaryContainer`, empty days `$chip`. Day labels CN, T2..T7.
- **Search:** "Tìm theo tên khách hoặc địa chỉ...".
- **CompletedTripEarningsList ("Lịch sử"):** groups by day ("Hôm nay", "Hôm qua", or a vi-VN weekday date), each group with a day total.
- **Captions:** "x/y chuyến khớp “q”", "x/y chuyến gần đây". Empty search: "Không tìm thấy chuyến khớp “q”." Empty period: "Chưa có chuyến hoàn thành trong khoảng thời gian này."
- **Empty state:** wallet icon, "Chưa có thu nhập".
  - Online: "Hoàn thành chuyến đầu tiên để thấy thu nhập ở đây."
  - Offline: "Bật nhận chuyến để bắt đầu kiếm tiền hôm nay." with action "Bật nhận chuyến".
- **Context error:** "Không thể tải thu nhập" / "Kiểm tra kết nối rồi thử lại."
- **Data source:**
  - Today's figures come from `driverContext.today_earnings`.
  - Week and month figures come from GET earnings summary.
  - The trip list filters `completed_trips` on the client by `updated_at`.

**`profile.tsx` Cá nhân**
- **ProfileCard:**
  - 64pt glossy avatar with first letter, name, phone.
  - Badge "Đang nhận chuyến"/"Đang nghỉ".
  - Vehicle row: name + plate chip.
  - "Thống kê": "Đánh giá" (rating with 2 decimals), "Tổng chuyến", "Tỉ lệ nhận" %, "Tỉ lệ hoàn thành" %.
- Context error: "Không thể tải thông tin hồ sơ." + "Thử lại".
- **Menu sections:**
  - "Tài khoản": "Chỉnh sửa hồ sơ", "Quản lý xe".
  - "Thanh toán & Giấy tờ": "Tài khoản ngân hàng", "Giấy tờ xác minh".
  - "Hỗ trợ & Pháp lý": "Trung tâm an toàn", "Hỗ trợ", "Điều khoản & Chính sách bảo mật".
  - "Cài đặt": "Cài đặt trợ lý", "Chế độ tối" (ThemeToggle), "Giới thiệu", "Câu hỏi thường gặp", "Đăng xuất" (danger color).
- **Logout:** confirm "Đăng xuất?" / "Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng ứng dụng." / "Ở lại" / "Đăng xuất". It first tries PATCH `/drivers/{phone}` `{status:'offline'}` (errors ignored), then `logoutAndReset()`: clear tokens, clear the query cache, replace to `/(auth)`.
- Footer: "Phiên bản {version}".

**`edit-profile.tsx` "Chỉnh sửa hồ sơ"**
- 88pt avatar with caption "Ảnh đại diện lấy theo chữ cái đầu của tên".
- Fields: "Tên hiển thị" (placeholder "Nhập tên của bạn"); "Số điện thoại" and "Email" are read-only.
- "Lưu thay đổi" is enabled only when the name changed and is not empty.
- Alerts: "Đã lưu" / "Hồ sơ của bạn đã được cập nhật." and "Lỗi" / "Không thể lưu hồ sơ, vui lòng thử lại.".

**`vehicle.tsx` "Quản lý xe"**
- VehicleTypeSelect, "Tên xe" ("VD: Toyota Vios"), "Biển số" ("VD: 36B6-36363", auto-capitalize characters).
- "Lưu thay đổi" enabled when anything changed. Alerts: "Thông tin xe đã được cập nhật." / "Không thể lưu thông tin xe, vui lòng thử lại.".
- On success it invalidates `me` and `driverContext`.

**`assistant-settings.tsx` "Cài đặt trợ lý"**
- Intro: "Bật/tắt các tính năng trợ lý sẽ tự động thực hiện thay bạn. Cài đặt được lưu trên tài khoản — đăng nhập ở máy khác hoặc cài lại app vẫn giữ nguyên."
- Second intro: "Chọn ngôn ngữ Trợ lý nói và hiểu. Áp dụng từ lần kết nối tiếp theo."
- **Rows in one flat Surface:**
  1. VoiceLocalePicker "Ngôn ngữ trợ lý": "🇻🇳 Tiếng Việt · Việt Nam" or "🇺🇸 English · English-speaking regions". Stored locally (MMKV), not on the server.
  2. CustomerCallModePicker "Gọi khách mặc định":
     - agent: "AI gọi hộ" / "AI nói với khách, bạn nghe live và có thể chen vào khi cần"
     - bridge: "Bạn nói trực tiếp" / "AI chỉ quay số, bạn nói trực tiếp với khách"
  3. Toggle "Chế độ rảnh tay" / "Nghe từ khoá đánh thức ở chế độ nền để điều khiển bằng giọng nói" → `hands_free_mode`. Also mirrors the local wakeword store.
  4. Toggle "Thông báo khách khi gần điểm đón" / "Tự động gọi/nhắn khách khi tài xế còn cách điểm đón dưới {radius}".
     - When on, radius chips 500 m / 1 km / 2 km / 3 km appear, labeled "Gọi nhắc khi còn cách".
  5. Toggle "Tự gợi ý điểm dừng tiếp theo" / "Trợ lý tự đề xuất điểm đón/trả kế tiếp khi còn cách dưới {auto_suggest_next_stop_radius_m}". The radius is display-only.
- All updates are optimistic with rollback.
- Turning notify on, or changing its radius, triggers `pushImmediateLocation('notify')`. Turning suggest on triggers `pushImmediateLocation('suggest')`.
- Loading state: skeletons.

**Static or placeholder screens**
- **bank-info:** EmptyState "Chưa liên kết tài khoản ngân hàng" / "Thêm tài khoản ngân hàng để nhận thanh toán tiền cước trực tiếp. Tính năng này đang được phát triển." Button "Thêm tài khoản ngân hàng" → Alert "Sắp ra mắt".
- **documents "Giấy tờ xác minh":**
  - Intro: "Tải lên giấy tờ để được xác minh và tiếp tục nhận chuyến. Tính năng tải ảnh giấy tờ đang được phát triển."
  - Rows: Bằng lái xe / Đăng ký xe / Bảo hiểm xe, each with badge "Chưa tải lên". Tap → Alert "Sắp ra mắt" / "Tính năng tải lên giấy tờ sẽ sớm khả dụng."
- **safety "Trung tâm an toàn":**
  - "Gọi khẩn cấp": Công an 113, Cấp cứu y tế 115, Phòng cháy chữa cháy 114 (tel:).
  - "Mẹo an toàn khi lái xe": 4 tips. Exact text is in app/(app)/safety.tsx.
- **support "Hỗ trợ":**
  - Intro: "Cần giúp đỡ? Liên hệ với đội ngũ hỗ trợ tài xế qua các kênh bên dưới, hoặc xem câu hỏi thường gặp."
  - "Hotline hỗ trợ tài xế" 1900 1234 (tel:), "Email hỗ trợ" driver-support@czen.vn (mailto:), "Câu hỏi thường gặp" → /faq.
- **terms "Điều khoản & Bảo mật":** 6 numbered sections. Exact text is in terms.tsx.
- **about "Giới thiệu":** title "Czen — trợ lý giọng nói đồng hành cùng tài xế" + 4 paragraphs (src/features/info/data/faqData.ts).
- **faq "Câu hỏi thường gặp":** accordion of 9 questions and answers from faqData.ts, one open at a time.

**Dev-only routes** (all redirect to `/(auth)` in production)
- **dev-say** (hidden tab): `driver-app:///(app)/dev-say?text=...&clear=1&logbox=off`.
  - If voice is connected: adds a "me" bubble and sends `sendText`. Otherwise `addUserMessage`.
  - Then navigates back.
- **dev-login:** `driver-app://dev-login?phone=&password=&to=` logs in and replaces to `to` (default `/(app)/`).
  - Status text: "Đang đăng nhập..." / "Thiếu phone/password" / "Lỗi đăng nhập: …".
- **map-preview:** `?orb=idle|connecting|connected|error&muted=1&speak=1`. Shows the map and orb without login.
- **tabbar-preview:** `?tab=0..3`.

## 2. Backend

**Base URLs**
- **Where env values come from:**
  - app.config.js loads `envs/.env`, or `envs/.env.web` when started with `--web`, via dotenv, then exports app.json. Neither of those files exists; only envs/.env.example does.
  - A root `.env` exists that Expo loads automatically. Its keys: EXPO_PUBLIC_TRIP_SERVICE_URL, EXPO_PUBLIC_AUTH_SERVICE_URL, EXPO_PUBLIC_GOONG_MAPS_KEY. I did not read the values.
- **Auth client (identity service):** `EXPO_PUBLIC_IDENTITY_SERVICE_URL ?? EXPO_PUBLIC_AUTH_SERVICE_URL ?? 'http://localhost:8003/api/v1'`.
- **API client (external-api / trip service):** `EXPO_PUBLIC_EXTERNAL_API_SERVICE_URL ?? EXPO_PUBLIC_TRIP_SERVICE_URL ?? 'http://localhost:8002/api/v1'`.
- **WebSocket:** `EXPO_PUBLIC_TRIP_SERVICE_WS_URL`, otherwise derived from the API base: change `http` to `ws`, strip `/api/v1`, append `/ws`.
- **Map tiles:** `https://tiles.goong.io/assets/goong_map_web.json?api_key=${EXPO_PUBLIC_GOONG_MAPS_KEY}`.
- Android allows cleartext HTTP (usesCleartextTraffic).

**Auth**
- Custom JWT from the identity service. It is not Cognito.
- Tokens `{access_token, refresh_token}` are stored in zustand persist key `driver-auth-tokens` (JSON `{state:{accessToken,refreshToken},version}`) in expo-secure-store (Keychain/Keystore; localStorage on web).
- The profile is never persisted. It lives only in React Query `['me']`.
- Every request sends `Authorization: Bearer <access>` and `Content-Type: application/json`.
- The API client also sends `X-Driver-Phone: <phone from ['me'] cache>`.
- **Refresh:**
  - On a 401 from either client (once per request, `_retry`), the app makes one shared POST `{AUTH}/auth/refresh` `{refresh_token}` → `{access_token, refresh_token}`.
  - The server rotates refresh tokens, so concurrent refreshes must collapse into one in-flight call.
  - On success it replays the original request. On failure it logs out (`logoutAndReset`).
  - There is one refresh token per account, so logging in on another device revokes this one.

**Identity service endpoints (auth client)**

| Method | Path | Body / params | Response |
|---|---|---|---|
| POST | /auth/login | `{role:'driver', phone, password}` | `{access_token, refresh_token}` |
| POST | /auth/register | `{role:'driver', phone, name, email, password, vehicle_type, vehicle_plate, vehicle_name}` | `{access_token, refresh_token, user: AuthUser}` |
| POST | /auth/refresh | `{refresh_token}` | tokens |
| GET | /auth/me | — | AuthUser `{id, role:'admin'\|'driver'\|'customer', permissions[], name, phone?, email?, status:'online'\|'offline'\|'locked', vehicle_type?, vehicle_plate?, vehicle_name?, created_at, updated_at}`. The app maps `locked` to `offline`. |
| PATCH | /accounts/{id} | `{name}` or `{vehicle_type, vehicle_plate, vehicle_name}` | AuthUser |
| GET | /settings/{accountId} | — | AccountSettings `{id_account, hands_free_mode, notify_on_pickup_approach, notify_on_pickup_approach_radius_m, auto_suggest_next_stop, auto_suggest_next_stop_radius_m, default_customer_call_mode:'agent'\|'bridge', updated_at, updated_by}` |
| PATCH | /settings/{accountId} | partial of `hands_free_mode`, `notify_on_pickup_approach`, `notify_on_pickup_approach_radius_m`, `auto_suggest_next_stop`, `default_customer_call_mode` | AccountSettings |

**External-api service endpoints (API client)**

| Method | Path | Body / params | Response / notes |
|---|---|---|---|
| PATCH | /drivers/{phone} | `{status:'online'\|'offline'}` (or `name`) | Driver. Used by the online toggle and on logout. |
| GET | /drivers/me/context | optional `?fresh=true` | DriverContext (below) |
| GET | /drivers/me/profile | — | `{phone, rating, acceptance_rate, completion_rate, total_trips}`. Not called by any screen; profile stats come from context. |
| GET | /drivers/me/earnings/today | — | TodayEarnings. Unused in the UI. |
| GET | /drivers/me/earnings/summary | `?period=week\|month` | `{period, total_earnings, trip_count, currency}` |
| GET | /drivers/me/bonuses | — | Bonus[]. Unused. |
| POST | /drivers/me/location | `{lat, lng}` | Background, slow cadence |
| POST | /drivers/me/location/live | `{lat, lng, proximity_scope?: 'notify'\|'suggest'}` | Foreground live push; runs server proximity checks |
| GET | /drivers/me/navigation | `?from_lat&from_lng&to_lat&to_lng` | NavigationRoute `{distance_km\|null, eta_minutes\|null, traffic_note, polyline (encoded, precision 5), steps: RouteStep[]}`. RouteStep: `{instruction, maneuver, distance_m, duration_s, start_location{lat,lng}, end_location, polyline?}` |
| GET | /trips/{id} | — | Trip |
| GET | /trips | `?driver_phone&status` | Trip[]. Defined but unused. |
| POST | /trips | `{customer_phone, pickup_address, dropoff_address, customer_name?, note?, has_bulky_goods?, with_children?, booked_via:'driver'}` | Trip (lands as confirmed) |
| PATCH | /trips/{id} | `{status:'confirmed'}` (accept), `{status:'rejected'}`, `{status:'arrived_pickup'\|'picked_up'\|'completed', lat, lng}` (409 + `{detail}` if too far), `{status:'cancelled_by_driver'}` | Trip |
| POST | /trips/{id}/location | `{lat, lng}` | Defined, unused |
| POST | /voice/token | no body; `?driver_phone=<phone>&lang=vn\|en` | `{token, room_name, livekit_url}` |

- **Error format:** the client reads `err.response.data.detail` for user-facing messages.
- **Trip fields:** `trip_id, status, driver_phone, customer_name, customer_phone, pickup_address, dropoff_address, pickup_lat?/lng?, dropoff_lat?/lng?, pickup_time (ISO or bare "14:30"), booked_via, distance_km, eta_minutes, traffic_note, route_summary, note?, has_bulky_goods?, with_children?, room_name, created_at, updated_at`. Context lists add `estimated_fare`.
- **TripStatus labels:**
  - pending "Chờ gán tài xế", notified "Chuyến mới", calling "Đang gọi bạn", confirmed "Đã nhận"
  - rejected "Đã từ chối", no_answer "Không trả lời", arrived_pickup "Đã đến điểm đón", picked_up "Đang chở khách"
  - completed "Hoàn thành", cancelled "Khách đã huỷ", cancelled_by_driver "Bạn đã huỷ", no_show "Khách vắng mặt"
- **Status badge colors:** Tamagui v3 scale step 4 for background, step 11 for text.
  - pending yellow, notified blue, calling purple, confirmed green
  - rejected / cancelled / cancelled_by_driver / no_show red, no_answer orange
  - arrived_pickup / picked_up pink, completed gray
- **DriverContext fields:**
  - `driver`, `driver_profile`, `today_earnings{total_earnings, trip_count, bonus_earnings, hours_online, currency}`, `active_bonuses[]`
  - `upcoming_trips[]`, `active_trips[]` (confirmed / arrived_pickup / picked_up), `completed_trips[]`, `current_trip|null`
  - `current_location{lat, lng, updated_at}|null`
  - `has_pending_nudge`, `last_call{call_id, summary?}|null`
  - `optimized_route|null`: `{stops[{trip_id, kind, address, customer_name, lat, lng, distance_m, eta_minutes}], source:'goong_matrix'|'haversine_fallback', cost_basis?, total_distance_m?, total_duration_s?, computed_at, driver_location, path[{lat,lng}] (already decoded)}`
  - `fetched_at`

**Realtime (no polling)**
- The WebSocket is open only while the driver is online and the phone is known: `${WS_URL}?role=driver&id=<urlencoded phone>`.
- It reconnects 3 s after any close. It does not send messages, only receives `{event, data}`:
  - **On open:** invalidate `['driverContext']` and `['trip-offer']`.
  - **`trip_offer` `{trip_id}`:** invalidate, then `tripOfferStore.show(trip_id)` opens TripOfferSheet.
  - **`trip_confirmed`:** `pushImmediateLocation()`.
  - **`schedule_updated` or `pending_nudge` `{kind}`:** invalidate.
- The context query has no refetch interval (staleTime 60 s, keeps previous data while refetching).

**TripOfferSheet**
- **Sound and countdown:** plays assets/audio/new-trip-alert.mp3 plus a success haptic. The sound is skipped if voice is connecting or connected. A 30 s countdown auto-dismisses locally.
- **Offer data:** fetches GET /trips/{id} under key `['trip-offer', id]`. Dismisses automatically if the status is no longer notified/calling or `driver_phone` is not this driver.
- **Layout:**
  - Header "Chuyến mới" + "Còn {n}s" + close button (a11y "Để sau").
  - 132pt ring: track #EDE9FE (light) / #2E2250 (dark), progress `$primary`, stroke 8. Inside: "Cước ước tính" + fare.
  - TripMetaRow, customer row, RouteLine.
  - Buttons: "Từ chối" (flex 1) and "Nhận chuyến" (flex 2).
- Backdrop rgba(10,6,20,0.55). Sheet top radius 28.
- Accept calls `pushImmediateLocation()` and the PATCH in parallel.

## 3. LiveKit / Czen voice (src/features/home/stores/voiceSessionStore.ts)

**Token and connect**
- `POST /voice/token?driver_phone=&lang=` with lang from `voice-lang-settings` (vn default, en).
- **Server side** (backend/external-api-service/src/routes/voice.ts):
  - Reuses an existing session room if Redis `driverSessionKey` is set; otherwise creates `driver-{phone}-{uuid}`.
  - Room metadata is `{lang}`, plus pending nudges `{nudge_kind, ...payload, nudges[], lang}`.
  - The participant token has identity `driver-{phone}`, TTL 3600, and room join / publish / subscribe grants.
  - The agent is dispatched server-side (`dispatchAgent(room, LIVEKIT_AGENT_NAME)`). The client does no agent dispatch.
  - `PUT /drivers/me/session` exists on the backend but the app never calls it (presumably the voice agent does; unverified).
- **Client connect sequence:**
  1. Synchronous re-entrancy guard.
  2. If an old room exists and is not connected or connecting, await its disconnect.
  3. Set status `connecting`.
  4. Wait 350 ms for the wake-word mic to release.
  5. In parallel: fetch the token, and play the connecting filler (assets/audio/connecting-czen.mp3, fade in) and then request mic permission.
  6. Fade out and release the filler, wait 160 ms.
  7. `startAudioSession()`, retried up to 3 times with backoffs 0/400/900 ms.
  8. `new Room()`, register handlers, `connect(livekit_url, token)`.
  9. `setMicrophoneEnabled(true)`. If the publication is missing or muted, toggle off, wait 200 ms, toggle on.
  10. Start the Android foreground service.
  11. Set status `connected`.
  12. Watchdog every 4 s: if the room state is Disconnected, run teardown.
- **Audio session:**
  - iOS: category playAndRecord, mode voiceChat, options mixWithOthers + defaultToSpeaker + allowBluetooth, default output speaker.
  - Android: communication preset with `audioFocusMode: 'gainTransientMayDuck'`.
- **Teardown:**
  - Await `stopAudioSession`, stop the foreground service unless hands-free is on.
  - Reset state to idle: level 0, call inactive, mode empty, not speaking, unmuted.
  - If the user hung up, play disconnecting-czen.mp3, then close the chat panel and route home (useReturnHomeOnVoiceEnd).
  - Status values: idle / connecting / connected / error. A cancelled connect goes back to idle.

**Data between app and agent**

| Direction | Mechanism | Topic / name | Format |
|---|---|---|---|
| agent→app | publishData (bytes) | `call_state` | JSON `{type:'call_state', active:bool, mode:'agent'\|'bridge'}` → `isCallActive`, `callMode` |
| agent→app | publishData | `agent_state` | `{type:'agent_state', state}`; `agentSpeaking = state ∈ {speaking, thinking}` |
| agent→app | ActiveSpeakersChanged | — | `agentAudioLevel` = level of the first non-local speaker (0..1) |
| both | text stream | `lk.transcription` | Streaming chunks. Attributes `lk.segment_id`, `lk.transcription_final` ("false" = interim). Iterate chunks and emit cumulative text. |
| both | text stream | `lk.chat` | Complete message (readAll). The app sends typed text with `localParticipant.sendText(text,{topic:'lk.chat'})`. |
| app→agent | publishData reliable | `call_control` | `{"action":"cancel"}` hangs up the customer call |
| app→agent | publishData reliable | `call_transcript` | `{speaker:'customer', text}`, sent only when `callMode==='bridge'` for final customer transcripts |
| agent→app RPC | `registerRpcMethod('search_contacts')` | payload `{"query": "..."}` | Returns `{"matches":[{name, phone_number}]}` (max 5, first number per contact, expo-contacts name search, permission requested lazily) or `{"error": msg}` (`permission_denied`) |
| server→room | sendData | `driver_proactive_nudge` | `{kind, ...payload}` while a session is open. The client does not handle this; the agent consumes it. |

- **Who said it:** local identity → user ("me"). Identity matching `/^customer-/i` while `isCallActive` → customer. Anyone else → agent ("bot").
- **Filtering:**
  - Agent text that looks like a raw tool id (`^[a-z][a-z0-9_]+$` containing "_", no spaces) is hidden.
  - A final message whose normalized text (trimmed, collapsed spaces, trailing punctuation removed, lowercase) repeats within 3 s is dropped.

**Transcripts and assistant UI**
- **assistantChatStore:** in memory, not persisted. `chats: [{who:'me'|'bot'|'customer', msg, streaming?, segmentId?}]` plus `panelOpen`.
- **Merging:** the upsert merges by segmentId, otherwise by the last bubble from the same speaker if it is still streaming, or a growing or equivalent transcript within the last 4 bubbles.
- **AssistantChatPanel (full-screen overlay):**
  - Header: chevron-down (a11y "Thu nhỏ hội thoại") + "Czen" + StatusChip:
    - Mic off: "Mic tắt" (warning)
    - Connected: "Đang nghe" (success)
    - Connecting: "Đang kết nối" (primary)
    - Error: "Lỗi" (danger)
    - Idle: "Tắt" (chip)
  - Caption by voice lang. VN text:
    - idle "Chạm nút Czen cạnh ô nhập để kết nối"
    - connecting "Đang kết nối với Czen…"
    - connected "Đã kết nối — chạm sóng âm để kết thúc"
    - error "Kết nối lỗi — chạm nút Czen để thử lại"
    - inCall "Đang gọi khách — chạm nút Czen để huỷ cuộc gọi"
    - micOff "Mic đang tắt — phiên vẫn kết nối"
  - EN versions exist for each.
  - Empty state: 72pt Czen circle, "Nói với Czen", then "Czen đang nghe. Hỏi về chuyến, khách hay thu nhập." (connected) or "Chạm nút Czen cạnh ô nhập rồi nói, hoặc chọn một gợi ý.".
  - Suggestion chips VN: "Lịch hôm nay", "Gọi khách", "Thu nhập hôm nay", "Nên đi đâu tiếp?". EN: "Today's schedule", "Call the rider", "Today's earnings", "Where next?". They stay visible until the driver's first message.
  - Bubbles:
    - me: right-aligned, CTA gradient, white text.
    - customer: left, "Khách" caption, warningContainer (light) / surfaceElevated (dark).
    - bot: left, surfaceElevated (light) / `$accent` #232325 (dark).
    - Streaming bubbles at 0.78 opacity. Bubble radius 22.
  - Composer, 56pt pill:
    - Mic mute toggle, enabled only when connected (a11y "Tắt micro, giữ kết nối"/"Bật micro"). It calls `setMicrophoneEnabled`; the room stays open.
    - TextInput placeholders: "Đang kết nối..." / "Nói gì đó..." / "Kết nối Trợ lý AI để chat...".
    - Send button when text is present (a11y "Gửi tin nhắn").
    - Otherwise ComposerVoiceButton (44pt, gradient #5B21B6/#7C3AED/#9F67FA): Czen mark when idle (tap = connect), spinner while connecting, 4 white bars scaled by level when connected (tap = end, or the cancel-call confirm if a call is active).
  - Empty send: "Bạn chưa nhập nội dung."
  - **Offline fallback:** when not connected, typed text goes to a canned local stub (services/api/assistant.ts, 600 ms delay, 3 Vietnamese canned replies). There is no real backend for typed chat while disconnected. "Đang trả lời..." shows meanwhile.
- **Center orb in the tab bar** (AssistantTabButton + assistantTabButtonShared):
  - 64pt, rises 26pt above the bar.
  - Idle gradient #5B21B6 / #7C3AED / #9F67FA.
  - Connecting/connected: two counter-rotating gradient layers. Layer A: #7C3AED, #8B5CF6, #A855F7, #C4B5FD. Layer B: #6D28D9, #9333EA, #A855F7, #DDD6FE. Spin 8 s (connecting) / 12 s (connected); layer B runs ×1.35 slower in reverse.
  - Pulse ring and bloom; idle breathing; scale follows audio level.
  - Center content: Czen mark when idle/error, pulsing mark while connecting, 5 wave bars when connected.
  - Red dot when muted. Respects reduce-motion; pauses animation in the background.
  - When not on Home, the last bot message pops as a 220pt glass card above the orb for 4.5 s.
- **Orb tap logic:**
  - Connecting: ignore.
  - Connected and panel closed: open the panel.
  - Connected and panel open: if a call is active, show the cancel-call confirm; otherwise disconnect (user-initiated).
  - Idle or error: open the panel and connect. If the phone is missing: Alert "Lỗi" / "Không tìm thấy số điện thoại tài xế."
  - Orb a11y labels: "Trợ lý AI, đang tắt. Nhấn để bắt đầu hội thoại." etc. (assistantTabButtonShared.tsx).
- **Cancel-call confirm:** Alert "Đang gọi khách" / "Bạn muốn huỷ cuộc gọi này?" / "Tiếp tục gọi" / "Huỷ cuộc gọi". Confirming adds the "me" bubble "Huỷ cuộc gọi" and sends `call_control` cancel.

**Auto-connect on a new trip**
- The client never connects just because an offer arrived.
- **Server flow:** a trip offer calls `notifyDriver('trip_offer')` and `reachDriver('new_trip_offer')`.
  - If a session room exists, the nudge is pushed into it (`driver_proactive_nudge`).
  - Otherwise it is saved as a pending nudge (Redis `driver:pending_nudge:{phone}`, 30 min TTL), and the WS sends `pending_nudge`.
- **Client:** invalidates context. `has_pending_nudge` becomes true, and useAutoConnectOnNudge opens the panel and connects, but only while status is idle. A ref prevents re-firing until the flag goes false.
- The token endpoint embeds the pending nudges in room metadata, so the agent reads the offer aloud.
- Other nudge kinds: proximity_pickup, proximity_dropoff, suggest_next_stop, pickup_reminder, debug_ping, schedule_updated.

**Background audio**
- iOS UIBackgroundModes: audio, fetch, location (app.json declares only audio; the generated Info.plist has all three).
- Android uses the foreground service from `@supersami/rn-foreground-service`:
  - id 4471, title "Czen", message "Đang trong cuộc gọi với trợ lý AI", ServiceType microphone, icon ic_launcher.
  - Channel name "Czen Driver", description "Trạng thái trợ lý AI và cuộc gọi".
  - Plugin withForegroundService adds FOREGROUND_SERVICE, FOREGROUND_SERVICE_MICROPHONE and POST_NOTIFICATIONS.

**Wake word** (src/features/assistant-wakeword/wakeWordService.ts)
- Library and model: react-native-vosk with the bundled Vosk model `assets/model-en-us` (vosk-model-small-en-us-0.15). English only.
- Wake phrase: "hey ai".
- Grammar: the wake phrase plus decoy words (yes, no, okay, sure, yeah, um, uh, hi, hello, thanks, thank you, bye, goodbye, what, why, how, please, sorry, hey) plus "[unk]".
- Triggers only on `onResult` with confidence ≥ 0.85. iOS gives null confidence, which falls back to a text match.
- On trigger: stop listening, read the driver from the `['me']` cache, open the panel, `connect(phone)`, then bring the app to the foreground with `Linking.openURL(ExpoLinking.createURL('/'))`.
- Android listening runs under the same foreground service id 4471 with message "Đang lắng nghe từ khoá đánh thức trợ lý". iOS relies on the background audio mode.
- **Lifecycle:**
  - Enabled when an accessToken exists and the `wakeword-settings` store has `enabled: true`. That flag mirrors the server's `hands_free_mode` (synced on the settings screen).
  - Pauses when voice status becomes `connecting`; resumes 400 ms after it returns to idle.
  - Restarts 300 ms after a timeout or final result, 1 s after an error.
  - Start failures retry after 1/2/3 s, then every 30 s.
  - A 2.5 s timer force-resets the session if native never confirms a stop.
  - Disable unloads the model.

**Settings storage**
- Server, via /settings/{accountId}: `hands_free_mode`, the notify toggle and radius, `auto_suggest_next_stop` (radius read-only), `default_customer_call_mode`.
- Local MMKV: `voice-lang-settings` and `wakeword-settings`.
- The call mode is not sent with the token; the server or agent reads it from settings (presumably).

## 4. State, storage and i18n

**Zustand stores**
- authStore: persisted, SecureStore key `driver-auth-tokens`.
- themeStore: MMKV `theme-settings` `{mode:'light'|'dark'}`, default **dark**.
- wakeWordSettingsStore: MMKV `wakeword-settings` `{enabled}`, default false.
- voiceLangStore: MMKV `voice-lang-settings` `{lang:'vn'|'en'}`, version 1, default vn; "vi" is mapped to vn.
- tripOfferStore `{tripId}`: memory only.
- assistantChatStore: memory only.
- voiceSessionStore: memory; the room lives at module level.
- MMKV is the default instance; the persist JSON shape is `{state, version}`.

**React Query keys**
- `['me']` (staleTime 60 s; driven by the token).
- `['driverContext']` (enabled once `me` is loaded, staleTime 60 s, keeps previous data).
- `['account-settings', driverId]`.
- `['earnings','summary', 'week'|'month']`.
- `['trip-offer', tripId]`.
- Defaults: retry 1, no refetch on window focus.
- Optimistic online toggle on `['me']`, with an error or success haptic.

**Location push cadence**
- **Background task** `driver-proximity-location-task`, while online:
  - Settings: Balanced accuracy, 30 s / 100 m, deferred 30 s / 150 m, AutomotiveNavigation, background indicator on.
  - Android notification: "Czen đang theo dõi vị trí" / "Giúp báo cho khách hàng khi bạn sắp đến điểm đón."
  - Client throttle: at most one push per 20 s unless the driver moved 150 m. Sends POST /drivers/me/location.
  - Also sends one immediate fix whenever tracking starts.
- **Foreground watch:**
  - Balanced accuracy, 3 s / 5 m, plus a 15 s wall-clock tick that refreshes any fix older than 10 s.
  - Sends POST /me/location/live when the driver is online.
  - Distance-based policy: no active stops → every 10 min; within 3 km of a stop → 15 s or 150 m; otherwise → 60 s or 500 m. The first fix always pushes.
- **Immediate pushes** (`pushImmediateLocation`): on trip accept, on WS `trip_confirmed`, when a new id appears in `active_trips`, on navigation start, and when proximity settings are toggled.

**i18n**
- No i18n library. All UI is hard-coded Vietnamese.
- The only bilingual strings are the chat panel caption, chip labels and suggestions, switched by the voice language.
- Number and date formatting use the vi-VN locale:
  - Currency: `Intl` VND (e.g. "120.000 ₫").
  - Distance: "4,5 km" under 10 km; above that rounded with dot thousands, e.g. "12 km".
  - Duration: "12 phút", "1 giờ 05 phút".
  - Dates: vi-VN short date and time.
- Search ignores diacritics (folds đ→d).

## 5. Design system (tamagui.config.ts, src/theme.ts, src/theme/elevation.ts)

**Brand colors (same in both themes)**
- primary #8B5CF6, primaryPress #7C3AED, primaryMuted rgba(139,92,246,0.16)
- gradientStart #7C3AED, gradientEnd #A855F7. CTA_GRADIENT = [#7C3AED, #A855F7].
- dark #121212, accent #232325, accentLight #c4b5fd, textInverse #ffffff.

**Light theme**
- **Surfaces:** background / surface #f4f6fb, surfaceElevated / surfaceHigh / card / inputBackground / bottomSheet / dialog #ffffff, surfaceVariant / chip #EEE9F3, onSurfaceVariant #5B5566.
- **Text:** textPrimary #111827, textSecondary #4b5563, textMuted #6b7280.
- **Borders and lines:** border #e5e7eb, borderStrong #d1d5db, outline / inputBorder #D9D2E3, outlineVariant #EDE8F2, divider rgba(17,24,39,0.08).
- **Primary and secondary containers:** primaryContainer / chipSelected #EDE9FE, onPrimaryContainer #4C1D95. Secondary #A855F7, secondaryContainer #F3E8FF, onSecondaryContainer #5B21B6.
- **Status colors** (base / container / on-container):
  - success #16a34a / #DCFCE7 / #14532D
  - warning #f59e0b / #FEF3C7 / #78350F
  - danger #ef4444 / #FEE2E2 / #7F1D1D
  - info #3b82f6 / #DBEAFE / #1E3A8A
- **Disabled:** background rgba(17,24,39,0.08), text rgba(17,24,39,0.38).
- **Overlays:** pressed rgba(139,92,246,0.12), hover 0.08, ripple 0.16.
- **Chrome:** navigationBar rgba(255,255,255,0.7), snackbar #2D2438, onSnackbar #fff.

**Dark theme (default)**
- **Surfaces:** background / surface #1A1420, surfaceElevated / card / inputBackground / bottomSheet / dialog #241D2C, surfaceHigh / surfaceVariant / chip #2E2438, onSurfaceVariant #B7B2C0.
- **Text:** textPrimary #F5F5F7, textSecondary #A1A1A6, textMuted #6E6E73.
- **Borders and lines:** border rgba(255,255,255,0.06), borderStrong 0.14, outline 0.16, outlineVariant 0.06, divider 0.06, inputBorder 0.14.
- **Primary and secondary containers:** primaryContainer #2E2250, onPrimaryContainer #DDD6FE. Secondary #C084FC, secondaryContainer #3B2A52, onSecondaryContainer #EAD9FB.
- **Status colors** (base / container / on-container); containers are the base color at 0.16 alpha:
  - success #34d399 / rgba(52,211,153,0.16) / #6EE7B7
  - warning #fbbf24 / rgba(251,191,36,0.16) / #FCD34D
  - danger #f87171 / rgba(248,113,113,0.16) / #FCA5A5
  - info #60a5fa / rgba(96,165,250,0.16) / #93C5FD
- **Chip selected:** rgba(139,92,246,0.24).
- **Disabled:** background rgba(255,255,255,0.08), text 0.38.
- **Overlays:** pressed 0.20, hover 0.12, ripple 0.28.
- **Chrome:** navigationBar rgba(90,60,120,0.42).
- Tamagui v3 color scales (yellow, blue, purple, green, red, orange, pink, gray) are used for the status badges.

**Radii, spacing, type and elevation**
- **Radii:** card 24, control 14, button / pill / chip 999, bubble 22.
  - Inputs 12. Auth fields 16. SearchInput 14 (height 44). SegmentedControl height 48, inner pill 14.
  - Sheet top 28. Nav bar top corners 8. SolidCard 20 default (24 on map cards).
- **Spacing ($1..$10):** 4, 8, 12, 16, 20, 24, 28, 32, 40, 48. Screen gutter 20, gap 20.
- **Fonts:** Inter 400/500/600/700. AppText variants (size / line height / weight):
  - display 28/34 Bold (-0.3)
  - h1 22/28 Bold (-0.2)
  - h2 18/24 SemiBold
  - title 16/22 SemiBold
  - body 15/22 Regular
  - bodyStrong 15/22 SemiBold
  - label 13/18 Medium
  - caption 12/16 Regular
  - Tab labels are 11/14 (semibold when active, medium when idle).
- **Elevation (boxShadow), light theme:**
  - sm `0 1 3 rgba(17,12,32,.10), 0 1 2 rgba(17,12,32,.06)`
  - md `0 6 16 .12, 0 2 6 .08`
  - lg `0 16 40 .18, 0 6 14 .10`
- **Elevation, dark theme:**
  - sm `0 1 3 rgba(0,0,0,.40), 0 1 2 .28`
  - md `0 8 20 .46, 0 3 8 .34`
  - lg `0 20 48 .55, 0 8 18 .40`
- **Auth theme (src/theme.ts):**
  - Screen background: #121212 dark / #F5F4F8 light. Card background: #2A2438 / rgba(255,255,255,0.94), max width 384.
  - Field background: rgba(255,255,255,0.05) / 0.55. Field ring: rgba(255,255,255,0.05) / #D1D5DB.
  - Link color #8B5CF6. Title color #fff / #000.

**Key components**
- **NavigationBar:** Material 3 style, edge-attached, 80dp + bottom inset, `$surfaceElevated`, hairline `$outlineVariant` top border, upward shadow.
  - Active indicator: 56×30 pill in primaryMuted that animates in over 180 ms (scaleX 0.6→1).
  - Active label and icon `$primary`, idle `$textSecondary`.
  - The orb sits in the center slot: slots = routes + 1, AI slot index = floor(n/2).
  - Android gesture-exclusion rectangles cover 40dp at each edge over the bar (plugin withGestureExclusion).
- **Button:**
  - Variants: primary (CTA gradient pill, white text, purple shadow #8B5CF6), outline (transparent, 1px borderStrong), dark (surfaceElevated), success, danger. The dark theme uses #111827 text on success and danger.
  - Min height 52. Supports loading spinner and leading icon. Disabled = disabledBackground.
- **GlassButton:** Skia shader pill, 52 high, used for auth CTAs. Disabled color #4A4552.
- **Surfaces:** Surface (surfaceElevated, radius 24, md shadow, `flat` = no shadow). SolidCard (lg shadow, used for map overlays).
- **Small components:**
  - EmptyState: 64pt icon circle in primaryMuted + title + message + outline action.
  - Toggle: 52×32, on color `$success` by default (primary on the settings screen), off color borderStrong, white thumb.
  - ThemeToggle: 64×34, gradient #8B5CF6 → #C084FC, sun/moon PNGs.
  - SegmentedControl: track surfaceVariant, active pill uses the CTA gradient with white label.
  - Badge: pill, caption text. Skeleton: surfaceVariant with pulsing opacity 0.55↔1.
  - RouteLine: 10pt primary dot, 2pt line, 10pt success square.
  - StatCard. AppBar: 56 high, 40pt round chip back button, h2 title. Screen shell.
- **Icons:** custom 24-grid SVG set (src/components/icons/glyphs.ts), stroke 1.75 (2 when active), round caps.
  - Names: home(-fill), wheel(-fill), purse(-fill), person(-fill), map, car, wallet, profile, chevron-left/right/down/up, arrow-left, close, close-circle, plus, check, check-circle, search, send, eye, eye-off, refresh, locate, navigate, pin, flag, distance, route, clock, calendar, phone, customer, turn-left, turn-right, straight, uturn, roundabout, merge, warning, alert-circle, info, help, star, chart, thumbs-up, edit, card, document, document-text, document-upload, shield-check, support, mic, mic-off, logout, language, mail, moon, power, dot.
  - Export the paths from glyphs.ts to SF Symbols / vector drawables, or map to the nearest system symbols.
- **CzenMark:** SVG on a 1024 viewBox.
  - Arc path `M741.8 704.8 A300 300 0 1 1 741.8 319.2`, stroke 96, round caps.
  - Three bars, rx 31: (539,437,62×150), (624,382,62×260), (709,417,62×190).

**Assets**
- **Images:** icon.png, adaptive-icon.png, splash-icon.png, favicon.png, assets/icons/driver-van.png (map driver marker).
  - assets/icons/{light,dark}/*.png: 31 PNGs each. Only light/sun.png and light/moon.png are referenced in code; the rest look unused.
- **Audio:** connecting-czen.mp3, disconnecting-czen.mp3, new-trip-alert.mp3, plus unused connecting-cue*.mp3.
- **Other:** Vosk model folder assets/model-en-us. No Lottie files. No custom font files (Inter comes from @expo-google-fonts).

## 6. Native modules, permissions and maps

**Permissions**
- **iOS Info.plist strings:**
  - Microphone: "Czen Driver needs microphone access so you can talk to the AI assistant."
  - Contacts: "…so the AI assistant can call people from your phone by name."
  - Location when in use: "…to track the trip while you're driving."
  - Location always + when in use: "…in the background so it can notify the customer when you're close to the pickup point…"
- **Android:** RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, INTERNET, ACCESS_NETWORK_STATE, SYSTEM_ALERT_WINDOW, WAKE_LOCK, BLUETOOTH, READ_CONTACTS, FOREGROUND_SERVICE(+_MICROPHONE), POST_NOTIFICATIONS. expo-location adds fine/coarse/background location and a location foreground service.
- **When each is requested:**
  - Location: foreground first, then background, when the driver goes online.
  - Microphone: on each connect.
  - Contacts: lazily, on the first `search_contacts` RPC.
- **No push notifications.** There is no expo-notifications and no FCM in use; `fcm_token` exists on the server only.

**Haptics:** success, warning and error only. Tap feedback is disabled.

**Maps**
- MapLibre with the Goong style URL. Default center [105.8342, 21.0278] (Hà Nội), zoom 12. Logo and compass hidden.
- **Camera** (controlled props only):
  - First GPS fix: zoom 15, 600 ms.
  - Recenter tap: zoom 15, or 17.5 while navigating.
  - Navigating: zoom 17.5, pitch 45, bearing = GPS heading, 500 ms.
  - Leaving navigation: back to zoom 15, pitch 0, bearing 0.
  - No GPS fix: fit all points with padding {100, 60, 60, 60}; a single point uses zoom 14.
  - Otherwise follows the driver on each new fix (800 ms).
- **Layers:**
  - Optimized route line (not while navigating): color #8B5CF6, width 3, opacity 0.85, from `optimized_route.path`, falling back to straight lines through the stops.
  - Navigation route: decoded polyline, color #2563eb, width 6, opacity 0.9.
- **Markers:**
  - Driver: 44pt white circle with a #8B5CF6 border and the van PNG.
  - Stops: pill in the trip's color with a pin icon (pickup) or flag icon (dropoff), customer name, and an order badge.
  - Trip colors cycle: #2563eb, #16a34a, #f97316, #db2777, #0891b2, #a16207, #dc2626, #4f46e5.
- **Next stop:** the first stop of the optimized route, otherwise `current_trip`'s pickup (or dropoff once picked up).
  - Live distance and ETA are rescaled from the GPS fix: detour = server road distance / straight-line distance, clamped to [1, 2], default 1.3.
- **Turn-by-turn:**
  - Fetch GET /drivers/me/navigation once per destination.
  - A step is passed within 35 m of its end, or when the position projects past the segment end.
  - Off-route: more than 50 m from the polyline for 3 consecutive ticks triggers a re-route, at most once every 20 s.
  - Arriving shows "Đã đến nơi" for 4 s, then exits.

**Dev login:** `xcrun simctl openurl booted "driver-app://dev-login?phone=..&password=.."` (dev builds only).

## 7. Feature folders (src/features)
- **auth:** Landing, Login and Register forms, AuthHeader, BrandHero, VehicleTypeSelect (modal dropdown), `useCurrentUser` (`['me']`), `logoutAndReset`.
- **dashboard:**
  - Hooks: useDriverContext, useDispatchSocket (WS), useOnlineToggle, useProximityTracking (background task), usePushLocationOnNewTrip.
  - Components: TripCard, ActiveTripCard, TripOfferSheet, OptimizedRouteCard, TripProgressStepper, TripMetaRow, EmptyTripsState, InfoRow (unused).
  - services/locationTracking.ts.
- **home:**
  - Map: DriverMap (native and web), useDriverMapModel, overlays (MapStatusPill, NextStopCard, GoOnlineCard, NavigationHud), useLiveDriverLocation, useTurnByTurnNavigation, lib/navigationMath.ts, lib/liveLeg.ts, lib/pushCadence.ts, lib/mapConstants.ts.
  - Voice: voiceSessionStore (LiveKit), assistantChatStore, AssistantChatPanel, ComposerVoiceButton, useCaptureVoiceMessages, useAutoConnectOnNudge, useReturnHomeOnVoiceEnd, czenFillerAudio, livekitRuntime, cancelCall, contactsSearch.
  - AssistantAvatar exists but I found no import of it.
- **earnings:** useEarningsSummary, EarningsHero, WeeklyEarningsChart, CompletedTripEarningsList (grouping and filter helpers).
- **profile:** ProfileCard, GlossyAvatar (Skia/GL gloss; simpler on web), SectionTitle.
- **assistant-settings:** VoiceLocalePicker, CustomerCallModePicker.
- **assistant-wakeword:** wakeWordService (Vosk; no-op on web), wakeWordSettingsStore.
- **info:** AboutContent, FaqContent, faqData.ts (all the about and FAQ copy).

**Unknowns**
- Production URLs and the LiveKit agent name are server config and not visible here.
- Whether PUT /drivers/me/session is called by the voice agent.
- The exact voice-agent behavior: tool names and how `default_customer_call_mode` is consumed.
- The contents of envs/.env, which does not exist.
- Whether the web build matters for parity (it is not needed for native).
