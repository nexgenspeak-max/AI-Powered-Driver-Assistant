# FEAT-M003 — Xác thực giọng nói "chủ nhân" cho wake-word (voiceprint)

> **OBSOLETE (2026-08-05):** Toàn bộ tính năng (enrollment + verification) đã bị gỡ bỏ khỏi codebase theo yêu cầu — gây delay kết nối, tạo record rỗng trong call-logger khi bị từ chối, và không còn cần thiết. Xem code review/commit liên quan để biết chi tiết các file đã xoá. Giữ lại ticket này chỉ để tham khảo lịch sử.

| | |
|---|---|
| **Loại** | Feature |
| **Service** | driver-app, customer-app, `auth-service`, `trip-service`, `voice-agent` |
| **Ưu tiên** | 🟡 Trung bình |
| **Trạng thái** | 🔨 Đã code xong, chưa test thiết bị thật |
| **Liên quan** | [01_BACKLOG.md](../01_BACKLOG.md), [BUG-M001](BUG-M001.md) (wake-word gốc) |

## Mô tả

Wake-word gốc (Vosk, "xin chào") chỉ nhận diện **văn bản**, không quan tâm ai nói — ai cầm điện thoại đã đăng nhập cũng đánh thức được trợ lý. Yêu cầu: chỉ đúng giọng chủ tài khoản mới dùng được trợ lý AI (mô hình đe doạ: người khác đang cầm điện thoại đã mở khoá, không phải chiếm đoạt tài khoản).

Luồng mới (không có page/route riêng — enrollment là 1 component dùng chung, nhúng thẳng vào nơi cần):
1. **Lần đầu** người dùng bấm nói chuyện với AI (mic trong `AssistantChatPanel`) mà tài khoản **chưa có voiceprint** → toàn bộ UI chat bị thay bằng UI đăng ký giọng nói ngay tại chỗ (không chuyển màn hình), bắt buộc hoàn tất mới thấy lại giao diện chat.
2. **Đăng ký giọng nói** (component `VoiceEnrollPanel`, dùng chung ở 2 nơi: (a) nhúng bắt buộc trong `AssistantChatPanel` lần đầu, (b) nhúng trong 1 `Modal` mở từ Cài đặt → "Đổi giọng nói của bạn" để đăng ký lại bất cứ lúc nào): mở 1 phiên LiveKit (room `enroll-{role}-{phone}-{ts}`), agent lần lượt đọc 3-4 câu (giống Voice ID của iPhone — nhiều lượt cho chính xác hơn 1 lần ghi), ghi mỗi câu ~3.5s, tính embedding rồi lấy trung bình, lưu vào `auth-service`. Khi phiên kết thúc, `VoiceEnrollPanel` tự gọi lại `checkVoiceprint()` để biết đã thành công hay chưa rồi báo qua callback `onDone`.
3. **Mọi lần sau** (wake-word hoặc bấm mic thủ công), `voice-agent` tự so giọng ngay sau khi phiên bắt đầu: khớp → cho chat bình thường; không khớp → agent nói câu từ chối rồi ngắt phiên. Tài khoản chưa enroll → luôn cho qua (backward-compatible).

## Quyết định kiến trúc quan trọng

`react-native-vosk` **không có API lấy audio thô** (chỉ trả text) — xác nhận qua đọc `node_modules/react-native-vosk/src/NativeVosk.ts`. Muốn xác thực đúng câu nói kích hoạt wake-word sẽ cần 1 bộ ghi âm thứ 2 chạy song song với Vosk — rủi ro cao vì 2 tiến trình cùng chiếm `AudioRecord` trên Android từng gây câm mic hoàn toàn (xem [BUG-M001](BUG-M001.md)).

→ Chọn xác thực **ở backend**, ngay sau khi phiên LiveKit bắt đầu, tái dùng audio mà `voice-agent` đã nhận (qua `AudioStream.from_participant`, LiveKit Python SDK) — **không sửa `wakeWordService.ts`**.

Model: **onnxruntime** (đã có sẵn qua Silero VAD) + model **WeSpeaker ResNet34-LM** (VoxCeleb2, CC-BY-4.0, 26.5MB, export ONNX chính thức từ chính project WeSpeaker) — chọn thay vì `torch+speechbrain` vì nhẹ hơn, khởi động nhanh hơn, không phình Docker image (đã hỏi và được xác nhận qua AskUserQuestion). Trích đặc trưng fbank dùng `kaldi-native-fbank` (không cần torch), khớp chính xác theo script tham chiếu chính thức của WeSpeaker (`wespeaker/bin/infer_onnx.py`).

## Các file đã thêm/sửa

**Backend:**
- `auth-service`: `voice_embedding?: number[]` trong `User` (`userService.ts`), loại khỏi `sanitize()`, thêm route `GET`/`PUT /api/v1/accounts/:id/voiceprint` (`routes/accounts.ts`) — self-or-admin, không nằm trong `EDITABLE_FIELDS` của PATCH thường.
- `trip-service`: route `POST /voice/enroll-token` (`routes/voice.ts`) — giống hệt `/token`/`/customer-token`, chỉ đổi room prefix thành `enroll-{role}-{phone}-{ts}`.
- `voice-agent`:
  - `app/models/speaker-embedding.onnx` (model WeSpeaker, tải trực tiếp từ HuggingFace)
  - `app/services/speaker_id.py` — load model, trích fbank + CMN, `embed()`, `average_embedding()`, `cosine_similarity()`
  - `app/services/auth_api.py` — client HTTP gọi thẳng `auth-service` (setting mới `auth_service_url`), dùng chung service-JWT có sẵn (`service_token.py`)
  - `app/voicebot/processors/speaker_verify.py` — `capture_clip()` (ghi audio thô qua `rtc.AudioStream.from_participant`), `run_enrollment()`, `verify_speaker()`
  - `app/agent/enroll_agent.py` — `EnrollAgent`, agent tối giản chỉ đọc lời mời + ghi âm qua `session.say()`
  - `app/agent/session.py` — nhận diện room `enroll-*` (mode riêng, bỏ qua toàn bộ pipeline trip/tools/silence-tracker), cổng xác thực chèn ngay sau `session.start()` cho mode `driver`/`customer` (bỏ qua nếu là cuộc gọi outbound/custcall — không áp dụng cho cuộc gọi hệ thống chủ động gọi ra)
  - `requirements.txt`, `envs/.env.example`, `envs/.env.local` — thêm `onnxruntime`, `kaldi-native-fbank`, setting `AUTH_SERVICE_URL`, `SPEAKER_VERIFY_ENABLED`, `SPEAKER_VERIFY_THRESHOLD`

**Frontend (driver-app + customer-app, giống hệt nhau):**
- `src/services/api/voice.ts` — `getEnrollToken()`, `checkVoiceprint()` (gọi thẳng `authClient` → auth-service)
- `src/features/home/stores/voiceSessionStore.ts` — thêm action `enroll()`, refactor phần lõi `connect` thành `connectWithToken()` dùng chung
- `src/features/home/components/VoiceEnrollPanel.tsx` — component dùng chung (không phải page/route), nhận `{phone, accountId, onDone}`, tự gọi lại `checkVoiceprint()` sau khi phiên enroll kết thúc để báo thành công/thất bại qua `onDone`
- `app/(app)/profile.tsx` — thêm `MenuRow` "Đổi giọng nói của bạn" mở 1 `Modal` chứa `VoiceEnrollPanel` (đăng ký lại tự nguyện, không bắt buộc)
- `src/features/home/components/AssistantChatPanel.tsx` — check `hasVoiceprint` khi mount; nếu `false`, thay toàn bộ UI chat bằng `VoiceEnrollPanel` nhúng inline (bắt buộc, không phải page riêng) cho tới khi enroll xong

## Việc chưa xong / rủi ro cần test thật

- [ ] **Chưa test được trên máy Windows dev cục bộ**: `kaldi-native-fbank` chưa có wheel dựng sẵn cho Python 3.14 trên Windows (máy dev hiện tại), build từ source thất bại vì thiếu trình biên dịch C++ (Visual Studio Build Tools). **Production Docker dùng Python 3.11-slim (Linux) có sẵn wheel `manylinux2014_x86_64`, không bị ảnh hưởng** — nhưng cần build/chạy thử qua Docker hoặc cài Build Tools để test cục bộ trước khi tin tưởng hoàn toàn.
- [ ] **Ngưỡng `SPEAKER_VERIFY_THRESHOLD` (đang để 0.6)** là giá trị mặc định hợp lý cho cosine similarity kiểu này nhưng **chưa tinh chỉnh bằng giọng thật** — cần test với ít nhất 2 người thật (đúng chủ + người lạ) trên thiết bị thật rồi điều chỉnh lại.
- [ ] Cần xác nhận API `rtc.AudioStream.from_participant(...)` (LiveKit Python SDK) hoạt động đúng như đọc source `livekit/rtc/audio_stream.py` — chưa chạy thử với server LiveKit thật.
- [ ] Test trên **điện thoại Android thật** (không phải emulator) — nhất quán với mọi vấn đề audio khác trong dự án này.

## Ghi chú

Xem kế hoạch đầy đủ (đã user duyệt) tại phiên làm việc ngày 2026-07-20 — kiến trúc, các lựa chọn thay thế đã cân nhắc (Picovoice Eagle, torch+speechbrain) và lý do loại bỏ đều đã thảo luận với người dùng trước khi code.
