# BUG-M004 — Build Android customer-app thất bại do xung đột expo-file-system

| | |
|---|---|
| **Loại** | Bug |
| **Service** | customer-app (native Android build) |
| **Mức độ** | 🔴 Nghiêm trọng (chặn build hoàn toàn) |
| **Trạng thái** | ✅ Đã sửa |
| **Liên quan** | [04_BUG_TRACKER.md](../04_BUG_TRACKER.md) |

## Mô tả

`npx expo run:android` trong `customer-app` báo lỗi:

```
Error: Autolinking is not set up in `settings.gradle`: expo modules won't be autolinked.
...
A problem occurred evaluating project ':expo-file-system'.
> Plugin with id 'maven' not found.
```

## Nguyên nhân

`npm ls expo-file-system` cho thấy **2 bản khác nhau** cùng tồn tại trong `node_modules`:
- `expo-file-system@19.0.23` (qua `expo@54.0.36`, đúng SDK 54).
- `expo-file-system@13.2.1` (qua `expo-three@8.0.0` → `@expo/browser-polyfill` → `expo-asset-utils`) — bản rất cũ, vẫn dùng `apply plugin: 'maven'` (đã bị Gradle 9 loại bỏ).

`driver-app` **không gặp lỗi này** vì đã khai báo `"expo-file-system": "~19.0.23"` trực tiếp trong `package.json` từ trước — npm gộp toàn bộ về 1 bản duy nhất. `customer-app` thiếu khai báo này nên npm không dedupe được, giữ lại bản cũ riêng cho nhánh `expo-three`.

## Việc đã làm

Chạy `npx expo install expo-file-system` trong `customer-app` → thêm `"expo-file-system": "~19.0.23"` vào `package.json`, npm tự gộp về 1 bản (loại bỏ 26 package thừa). Build lại `npx expo run:android` thành công.

## Ghi chú

Thao tác chỉ thực hiện trong thư mục `customer-app` (có `cd` trước khi chạy lệnh) — đã xác nhận `driver-app/package.json` không đổi, 2 app có `node_modules` độc lập hoàn toàn (không phải monorepo/workspace).
