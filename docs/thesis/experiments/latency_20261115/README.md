# Đợt đo độ trễ phản hồi ngày 15/11/2026 (AC-15, NFR-02)

Bằng chứng cho mục 6.4 của luận văn: độ trễ phản hồi của thiết kế hiện hành (mọi lượt qua LLM, có câu đệm).

## Cách đo

- **Người nói:** một "tài xế ảo" (`audio_probe.py`) vào phòng LiveKit như ứng dụng tài xế và phát câu tiếng Việt
  do giọng máy macOS (`say -v Linh`) đọc. Không có người thật tham gia.
- **Hệ thống:** tác nhân thật chạy trên máy phát triển, nối LiveKit Cloud; STT, LLM, TTS là nhà cung cấp thật
  (cấu hình `envs/config.local.toml`: Google Chirp 3, gpt-5.6-luna, ElevenLabs). Các dịch vụ backend chạy cục bộ.
- **Câu nói:** 22 câu chỉ đọc hoặc hỏi đáp (lịch chuyến, thu nhập, cách dùng ứng dụng, tóm tắt cuộc gọi, trò chuyện),
  lặp lại theo vòng. Không có câu tạo cuộc gọi, gửi SMS hay đổi trạng thái chuyến.
- **Quy mô:** 12 phiên, mỗi phiên 10 lượt, tổng 120 lượt; mọi lượt đều được giữ, kể cả lượt chậm.

## Chỉ số

| Ký hiệu | Ý nghĩa | Nguồn |
|---|---|---|
| A | Từ lúc tác nhân nhận biết tài xế dứt lời tới lúc tác nhân bắt đầu phát âm thanh (câu trả lời hoặc câu đệm). Đây là chỉ số của AC-15. | Dòng `turn wall` trong nhật ký tác nhân |
| B | Phát hiện kết thúc phát ngôn + token đầu của LLM + âm thanh đầu của TTS (tới câu trả lời thật, không tính câu đệm; không có ở lượt mà công cụ tự đọc kết quả). | Dòng `turn latency` |
| C | Từ lúc tài xế ảo phát hết câu tới lúc nhận được âm thanh đầu tiên của tác nhân. Gồm cả đường truyền hai chiều, nên là giới hạn trên. | `turns_*.jsonl` |

## Kết quả (sau khi sửa đồng hồ đo)

| Chỉ số | n | P50 | P90 | P95 | Lớn nhất | Lượt ≤ 2 giây |
|---|---|---|---|---|---|---|
| A (AC-15) | 120 | 1,83 s | 2,35 s | 2,58 s | 3,36 s | 87/120 (72,5%) |
| B | 81 | 2,14 s | 2,54 s | 2,87 s | 2,96 s | 26/81 (32,1%) |
| C | 120 | 2,94 s | 3,49 s | 3,62 s | 4,44 s | 2/120 (1,7%) |

Theo chặng (n = 81): phát hiện kết thúc phát ngôn P50 0,95 s, P95 1,23 s; token đầu của LLM P50 1,04 s, P95 1,32 s;
âm thanh đầu của TTS P50 0,17 s, P95 0,19 s. Câu đệm được phát ở 33 lượt.

**Kết luận:** AC-15 (P95 ≤ 2 giây) không đạt; P95 là 2,58 giây.

## Lỗi đo đã sửa trong cùng ngày

Lần chạy đầu (`turns_before_fix.jsonl`, 126 lượt) cho P95 2,23 giây nhưng con số này lệch thấp: ở các lượt mà công cụ tự
đọc kết quả, mã nguồn bấm giờ lại ngay trước khi nói, nên nhật ký ghi khoảng 0,2 giây thay cho thời gian chờ thật
(38 lượt ≤ 1 giây, trong khi độ trễ phía máy khách của các lượt đó không khác các lượt còn lại). Lỗi nằm ở hai lời gọi
`mark_user_stopped` trong `context_store.py` và `confirm_trip_flow.py`; sau khi bỏ, chỉ còn 2 lượt ≤ 1 giây.
Số liệu của lần chạy đầu được giữ lại chỉ để đối chiếu.

## Chạy lại

```bash
# 1. Khởi động backend và tác nhân
IDLE_MINUTES=0 bash run/start-all-mac.sh identity-service external-channel-service call-records-service external-api-service llm-orchestrator
# 2. Chạy tài xế ảo (trong src/backend/llm-orchestrator)
ENV=local .venv/bin/python ../../../docs/thesis/experiments/latency_20261115/audio_probe.py --sessions 12 --per-session 10 --out turns.jsonl
# 3. Phân tích lại số liệu đã lưu
cd docs/thesis/experiments/latency_20261115 && python3 analyze.py turns_after_fix.jsonl agent_metrics_after_fix.txt
```

## Tệp

| Tệp | Nội dung |
|---|---|
| `audio_probe.py` | Tài xế ảo: xin token, vào phòng, phát câu nói, ghi thời điểm nhận âm thanh trả lời |
| `analyze.py` | Tính P50, P90, P95 và phân bố từ hai tệp dữ liệu |
| `turns_after_fix.jsonl` | 120 lượt sau khi sửa đồng hồ đo (số liệu dùng trong luận văn) |
| `agent_metrics_after_fix.txt` | Các dòng chỉ số trích từ nhật ký tác nhân cho 12 phiên đó (số điện thoại đã che) |
| `turns_before_fix.jsonl`, `agent_metrics_before_fix.txt` | Lần chạy đầu, trước khi sửa; chỉ để đối chiếu |
| `results.txt` | Kết quả `analyze.py` cho cả hai lần chạy |
