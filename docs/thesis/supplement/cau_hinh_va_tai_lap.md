# Tài liệu bổ sung: cấu hình môi trường và tái lập số liệu

Tệp này chứa hai phần trước đây là phụ lục của luận văn. Luận văn dẫn tới đây từ mục 5.6.2, 6.2 và 6.13.

## 1. Cấu hình môi trường triển khai

Bảng dưới đây tóm tắt cấu hình chính của tác nhân hội thoại. Cấu hình không bí mật nằm trong envs/config.<môi trường>.toml; khóa bí mật nằm trong .env, không được đưa vào kho mã nguồn (tệp mẫu: envs/config.example.toml, envs/.env.example). Cột cuối ghi giá trị cấu hình hiện hành; giá trị nào khác với lúc đo phiên hội thoại thật (mục 6.2.1) thì được ghi kèm. Thử tải và tiêm lỗi dùng nhà cung cấp AI giả lập (mục 6.2.2).

| Biến | Ý nghĩa | Giá trị |
|---|---|---|
| `AGENT_LANG` | Gói ngôn ngữ mặc định của tác nhân | vn (lựa chọn khác: en) |
| `STT_PROVIDER` | Nhà cung cấp nhận dạng giọng nói | google (lựa chọn khác: openai / deepgram / inference) |
| `GOOGLE_STT_MODEL` | Mô hình STT của Google | chirp_3 |
| `STT_LANGUAGE` | Ngôn ngữ nhận dạng (BCP-47) | vi-VN |
| `LLM_PROVIDER` | Nhà cung cấp mô hình ngôn ngữ | openai (lựa chọn khác: gemini / kimi) |
| `LLM_MODEL` | Mô hình ngôn ngữ | gpt-5.6-luna |
| `TTS_PROVIDER` | Nhà cung cấp tổng hợp giọng nói | elevenlabs, mô hình eleven_v4_turbo, giọng Kiều Linh (nữ, miền Nam); đợt đo 05–06/09/2026 dùng google (lựa chọn khác: gemini / openai) |
| `GOOGLE_TTS_VOICE` | Giọng đọc tiếng Việt của Google TTS (dự phòng) | vi-VN-Chirp3-HD-Kore |
| `GOOGLE_TTS_SPEAKING_RATE` | Tốc độ đọc | 0,95 |
| `GOOGLE_TTS_PITCH` | Cao độ giọng | -2,0 |
| `STT_FALLBACK, LLM_FALLBACK, TTS_FALLBACK` | Nhà cung cấp dự phòng (danh sách, phân cách bằng dấu phẩy) | TTS_FALLBACK = google; STT, LLM không cấu hình dự phòng trong đợt đo |
| `EXTERNAL_API_SERVICE_URL` | Địa chỉ Dịch vụ Chuyến đi và Điều phối | http://localhost:8002 (cục bộ) |
| `CALL_RECORDS_SERVICE_URL` | Địa chỉ Dịch vụ Nhật ký cuộc gọi | http://localhost:8001 (cục bộ) |
| `LIVEKIT_URL` | Địa chỉ LiveKit Cloud | wss://<tên-project>.livekit.cloud |

Luận văn không công bố khóa API, token LiveKit, mật khẩu hay đường dẫn tới tệp thông tin xác thực.

## 2. Tái lập số liệu thực nghiệm

Bảng dưới đây liệt kê script và lệnh tạo lại các nhóm số liệu chính ở Chương 6; script nằm trong docs/thesis và docs/thesis/experiments. Thử tải và tiêm lỗi được chạy trong môi trường cô lập (cơ sở dữ liệu giả lập, thông tin đăng nhập AWS giả, số điện thoại giả lập), không gọi tới AWS hay nhà cung cấp bên ngoài.

Mục lục bằng chứng theo từng tiêu chí chấp nhận nằm ở [`../experiments/README.md`](../experiments/README.md).

| Số liệu | Script hoặc lệnh | Dữ liệu đầu vào | Kết quả trong luận văn |
|---|---|---|---|
| Độ trễ phản hồi và độ trễ theo chặng (Bảng 6.3, 6.4) | docs/thesis/experiments/latency_20261115: audio_probe.py (đo); python3 analyze.py turns_inline_filler.jsonl agent_metrics_inline_filler.txt (tính lại đợt thứ hai) | Hai đợt của tài xế ảo ngày 15/11/2026 (120 và 200 lượt); các dòng chỉ số trích từ nhật ký tác nhân | P50, P90, P95 theo ba cách đo; độ trễ theo chặng |
| Tỷ lệ lỗi từ (Bảng 6.6) | python3 docs/thesis/compute_wer.py --room <mã phòng> --label A\|B | Nhật ký STT của phiên đọc 22 câu tham chiếu | WER theo điều kiện âm thanh |
| SC-03 – thử tải API (mục 6.8, tham khảo) | docs/thesis/experiments/sc03_setup.sh; sc03_run.sh; python3 sc03_analyze.py | Bảng bench-trips (200 tài xế giả lập × 3 chuyến) trên DynamoDB giả lập; k6 | P50, P95 theo số người dùng ảo; tỷ lệ lỗi |
| RS-01, RS-02, RS-04 – tiêm lỗi mức thành phần (Bảng 6.11) | PYTHONPATH=. .venv/bin/python docs/thesis/experiments/rs_component_faults.py --trials 20 (chạy trong src/backend/llm-orchestrator) | Máy chủ tiêm lỗi trả mã 503, treo hoặc từ chối kết nối | Tỷ lệ lượt đạt; thời gian đến khi tác nhân báo lỗi |
| RS-05 – dự phòng nhà cung cấp LLM (Bảng 6.11) | .venv/bin/python docs/thesis/experiments/rs05_provider_fallback.py --trials 30 (chạy trong src/backend/llm-orchestrator) | FallbackAdapter của LiveKit Agents với nhà cung cấp giả lập | Tỷ lệ thành công; thời gian đến token đầu khi chuyển đổi |
| SC-01, SC-02 – phiên hội thoại đồng thời (Bảng 6.10) | Máy chủ LiveKit: docker run livekit/livekit-server --dev; python3 experiments/fake_ai_server.py; source experiments/sc_agent_env.sh; bản sao tác nhân: python -m app.main start hoặc experiments/bench_worker.py; python3 experiments/sc_sessions.py --levels 1 5 10 20 40 | Tác nhân thật, nhà cung cấp AI giả lập (STT 0,3 giây, LLM 0,8 giây, TTS 0,2 giây), lk perf agent-load-test | Phiên được phục vụ; P50, P95 độ trễ phản hồi; thời gian vào phiên; CPU, RAM |
| RS-03 – dừng một bản sao tác nhân (Bảng 6.11) | python3 docs/thesis/experiments/rs03_replica_kill.py --trials 10 (chạy trong src/backend/llm-orchestrator, cùng môi trường SC-01) | Hai bản sao tác nhân; SIGKILL bản sao đang phục vụ phiên | Phiên mới được phục vụ; phiên đang chạy được giữ; thời gian khôi phục bản sao |
| Kiểm tra lại nhật ký sau khi che số điện thoại (Bảng 6.12, dòng 4) | .venv/bin/python docs/thesis/experiments/log_masking_check.py --trials 20 (chạy trong src/backend/llm-orchestrator) | Chạy lại RS-01, RS-02, RS-04 với nhật ký mức DEBUG; phát lại nhật ký cũ qua hàm che | Số lần xuất hiện số điện thoại đầy đủ (kỳ vọng 0) |
| Sắp xếp thứ tự ghé (Bảng 6.14) | node docs/thesis/experiments/route_opt_quality.js (chạy trong src/backend/external-api-service) | 600 bộ điểm dừng sinh ngẫu nhiên, hạt giống 20261013 | Tỷ lệ đạt lời giải tối ưu; chênh lệch quãng đường so với tối ưu và với thứ tự theo danh sách |
| Độ chính xác gọi công cụ, tỷ lệ hoàn thành và phân loại lỗi (Bảng 6.7, 6.8) | Chấm tay theo docs/thesis/ch6_manual_scoring.md (tiêu chí, bảng chấm từng phiên) | Nhật ký tác nhân agent.*.log 05–06/09/2026, 13 phiên, 43 lượt; một người chấm | Đúng công cụ; hoàn thành ngay lần đầu; mã lỗi |
| Đánh giá chọn công cụ với mô hình thật (mục 6.11) | .venv/bin/python -m app.voicebot.testing.tool_choice_eval [số lần chạy] (chạy trong src/backend/llm-orchestrator; cần OPENAI_API_KEY) | 23 câu nói mẫu, mỗi câu chạy 12 lần với mô hình thật | Số lượt chọn đúng công cụ và tham số |
| Luồng khách hàng và báo cáo ngày (Bảng 6.13) | pytest trong src/backend/llm-orchestrator (733 ca, gồm test_send_sms_flow); npm run verify:ops; npm run verify:records; npm run verify:sms (hai dịch vụ); npm run verify:logger | Bộ kiểm thử tự động | Kết quả đạt/không đạt |
