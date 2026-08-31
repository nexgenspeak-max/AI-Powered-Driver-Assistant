# Outbound call modes (driver → customer)

**Status:** Implemented 2026-08-30  
**Scope:** voice-agent `call_customer`, `CustomerCallAgent`, `transfer_to_driver`

## User-facing modes (2)

| Mode | Internal | Behavior |
|------|----------|----------|
| **AI gọi hộ** | `agent` (default) | AI nói với khách; tài xế **nghe live** trong cùng phòng LiveKit. Khách được trả lời trong phạm vi mục tiêu cuộc gọi (xác nhận, nhắn ngắn). |
| **Nối trực tiếp** | `bridge` | AI quay số → im lặng; tài xế nói trực tiếp với khách. Kết thúc: *"trợ lý kết thúc"*. |

## Implementation detail

| Internal | When |
|----------|------|
| `background` | AI gọi phòng riêng (`custcall-*`); tài xế không nghe live, nhận tóm tắt push. Chỉ khi tài xế nói *"gọi nền"* hoặc nudge proximity tự động. |

## Mid-call escalation

Tool **`transfer_to_driver`** (trong `CustomerCallAgent`):

- Khách muốn nói với tài xế / câu hỏi quá phức tạp / tài xế xen vào
- AI nói 1 câu chuyển → `enter_bridge_listen_mode` → `BridgeCallAgent`
- Reuse bridge timeout + `end_bridge_call`

## Voice intent defaults

- *"Gọi khách báo …"* → `mode=agent` + `message`
- *"Gọi để tôi nói"* / *"nối máy"* → `mode=bridge`
- *"Gọi nền"* → `mode=background`

Helper: `app/voicebot/processors/call_mode.py::resolve_call_mode`

## Not in scope (phase 2)

- **Cài đặt Trợ lý** (driver-app): option mặc định khi gọi khách — (1) **AI gọi hộ**: AI nói, tài xế nghe live và **chen vào khi cần**; (2) **Tài xế nói trực tiếp**: AI chỉ quay số, tài xế nói hoàn toàn. Bot **không hỏi lại** chế độ mỗi lần gọi; đọc từ config + override bằng lời ("nói trực tiếp" / `transfer_to_driver` mid-call).
- Auto-pick `background` khi Trợ lý không connected
