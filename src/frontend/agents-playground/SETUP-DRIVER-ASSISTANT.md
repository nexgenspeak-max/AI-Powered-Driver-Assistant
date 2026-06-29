# Test Driver Assistant qua Agents Playground

Dùng playground **trước** mobile app — cùng LiveKit + cùng worker `driver-assistant`.

## 1. Backend (3 terminal)

```bash
# trip-service :8002
cd src/backend/trip-service && ENV=local uvicorn app.main:app --reload --host 0.0.0.0 --port 8002

# voice-agent worker
cd src/backend/voice-agent && ENV=local python -m app.main dev
# đợi log: registered worker {"agent_name": "driver-assistant"}

# (tuỳ chọn) call-center :8000 + ngrok — khi test tool "gọi khách"
```

## 2. Cấu hình playground

```bash
cd agents-playground
cp .env.local.example .env.local
# Sửa .env.local — copy LIVEKIT_* từ src/backend/voice-agent/envs/.env.local
pnpm install
pnpm dev
```

Mở **http://localhost:3000**

## 3. Connect

1. Bấm **Connect** (playground tự dùng `/api/token` nếu có `NEXT_PUBLIC_LIVEKIT_URL`)
2. Trong **Settings** kiểm tra:
   - **Agent name**: `driver-assistant`
   - **Room name**: để trống → tự tạo `driver-84867347452-{timestamp}` (khớp trip tools)
   - **Mic + Audio + Chat**: bật
3. Bấm **Start Audio** nếu trình duyệt chặn autoplay

## 4. Test gì trên playground

| Tính năng | Cách test |
|-----------|-----------|
| Voice STT/TTS | Nói vào mic → xem Agent Audio + Chat |
| Chat text | Gõ trong Chat tile |
| Trip tools | *「Có chuyến xe nào không」* → cần trip-service + chuyến gán cho `84867347452` |
| Gọi khách | *「Gọi khách」* → cần call-center + ngrok |

## Biến môi trường playground

| Biến | Mục đích |
|------|----------|
| `LIVEKIT_API_KEY` / `SECRET` | Giống voice-agent |
| `NEXT_PUBLIC_LIVEKIT_URL` | `wss://...livekit.cloud` |
| `TEST_DRIVER_PHONE` | Số tài xế test (mặc định `84867347452`) |
| `DEFAULT_AGENT_NAME` | `driver-assistant` |

Room mặc định: `driver-{phone}-{unix}` — voice-agent nhận diện đúng mode driver và gắn `_driver_phone` cho tools.
