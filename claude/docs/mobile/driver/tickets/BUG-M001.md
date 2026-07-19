# BUG-M001 — Wake-word không nghe được từ khoá sau vài lần thử

| | |
|---|---|
| **Loại** | Bug |
| **Service** | driver-app, customer-app (`src/features/assistant-wakeword/wakeWordService.ts`) |
| **Mức độ** | 🔴 Nghiêm trọng (tính năng lõi không dùng được khi test) |
| **Trạng thái** | ⚠️ Đã giải thích nguyên nhân, **chưa xác nhận trên điện thoại thật** |
| **Liên quan** | [04_BUG_TRACKER.md](../04_BUG_TRACKER.md), [00_OVERVIEW.md](../00_OVERVIEW.md) |

## Mô tả

Bật toggle "Trợ lý rảnh tay" trong Profile, nói "xin chào" — chỉ nhận diện được **1-2 lần đầu tiên ngay sau khi mở/reload app**. Sau đó dù nói bao nhiêu lần cũng không phản hồi, phải reload lại app mới có thêm vài lần.

## Điều tra đã làm

1. Lấy log qua `adb logcat` khi test: model Vosk (`model-vi-vn`) load thành công (đủ các bước ivector, HCL/G graph, word boundary), recognizer khởi động đúng với `grammar: ["xin chào", "[unk]"]` — nhưng **không có bất kỳ callback `onPartialResult`/`onResult` nào** dù nói nhiều lần.
2. Kiểm tra quyền `RECORD_AUDIO` qua `adb shell dumpsys package` — đã cấp (`granted=true`), loại trừ khả năng thiếu quyền.
3. Đọc lại code `wakeWordService.ts` — đã có sẵn comment ghi chú nghi ngờ đúng hướng: *"the very first session after a fresh start() captures real audio fine, but every session after a stop()+start() cycle came back silently deaf"*.
4. Tra cứu upstream: [alphacep/vosk-api#1629](https://github.com/alphacep/vosk-api/issues/1629) — tiêu đề *"Voice recognition stops recognizing after several seconds of silence on Android Emulator"*, chính maintainer Vosk (`nshmyrev`) xác nhận: **"It works on the real device, but not the emulator. Solved."**

## Kết luận

Đây là **giới hạn đã biết của Android Emulator** khi `AudioRecord` phải được tạo lại nhiều lần (sau mỗi lần recognizer dừng/khởi động lại) — không phải bug trong code JS/Kotlin của dự án. Code hiện tại (giảm tần suất restart, không dùng timeout cố định) đã là cách giảm thiểu hợp lý cho môi trường emulator.

## Việc cần làm

- [ ] Test trên **điện thoại Android thật** (không phải emulator) — nối `adb`/USB debugging, build + cài trực tiếp.
- [ ] Nếu vẫn lỗi trên máy thật → đây mới là bug thật, cần điều tra tiếp (khác hẳn hướng emulator).
- [ ] Nếu ổn trên máy thật → đóng ticket, ghi chú rõ trong `AGENTS.md`/README rằng tính năng này **không test được đầy đủ trên emulator**.

## Ghi chú

Không thay đổi code nào cho ticket này — thuần điều tra + xác nhận nguyên nhân qua nguồn upstream đáng tin cậy.
