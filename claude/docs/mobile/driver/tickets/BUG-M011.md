# BUG-M011 — Outbound gọi khách: bot im lâu sau khi khách nhấc máy

| | |
|---|---|
| **Loại** | Bug (latency) |
| **Service** | voice-agent (`sip_call_watch.py`, `customer_call_agent.py`, `prefetch.py`, `session.py`) |
| **Mức độ** | 🔴 Cao (trải nghiệm cuộc gọi thật — khách nghe máy rồi im) |
| **Trạng thái** | ✅ Đã sửa (unit test; chưa đo trên SIP live trong turn này) |
| **Liên quan** | [[voice_runtime]], [BUG-M010](BUG-M010.md) |

## Mô tả

Đồng nghiệp: chế độ AI gọi outbound cho khách (nền `custcall` / agent-mode) bot **mất rất lâu mới nói**. Đúng — không phải ảo giác mạng.

## Nguyên nhân (cộng dồn, đo được trên code path)

1. **`wait_for_sip_pickup` ngủ 3s** sau `sip.callStatus=active` (`post_answer_delay=3.0`).
2. **Isolated flow ngủ thêm 3s** (`_INITIAL_WAIT_SECONDS`) — chồng lên (1) → **~6s dead air** sau khi khách đã nhấc máy, trước khi TTS.
3. **`session.start` bị chặn prefetch** `GET /drivers/me/context` dù `CustomerCallAgent` không dùng `context_store`.
4. **Agent-mode** câu đầu dùng `generate_reply` (chờ Kimi) thay vì `session.say` kịch bản.

Kỹ thuật sai: đợi callee nói trước trên cuộc **outbound** (người gọi phải nói trước). Giữ AMD/`sip.callStatus` để không nói vào ringback.

Lượt sau khi khách đã nói: vẫn EOU + LLM + TTS (đã có `preemptive_generation` trên session) — không phải bug chồng sleep này.

## Sửa

| Kỹ thuật | Việc làm |
|---|---|
| Bỏ delay trùng | Xóa `_INITIAL_WAIT_SECONDS` |
| Scripted first audio | `build_customer_call_opening` + `session.say` (cả isolated và agent-mode) |
| Phone-to-ear tối thiểu | `post_answer_delay` **0.6s** |
| Không chặn join | `prefetch_role("custcall") is None` |

Kỳ vọng first audio sau pickup: **~0.6s + TTS TTFB (~0.2–0.5s)** thay vì **6s + LLM**.

## Test

```bash
cd src/backend/voice-agent
PYTHONPATH=. pytest tests/test_customer_outbound_opening.py -q
```

Live: gọi nền / agent-mode → nhấc máy → bot phải chào trong ~1s, không im 5–10s. Grep `DEV event=sip_pickup` và log `speaking opening after pickup`.

## Hiệu quả

- First utterance: cắt ~5–6s dead air cố định + tránh TTFT Kimi (2–20s) ở câu mở.
- Prefetch: tiết kiệm 0.2–2s trước `session.start` khi trip-service chậm.
- Không đụng latency lượt hội thoại giữa chừng (cần log `llm_metrics` nếu đồng nghiệp vẫn thấy chậm *sau* khi bot đã chào).
