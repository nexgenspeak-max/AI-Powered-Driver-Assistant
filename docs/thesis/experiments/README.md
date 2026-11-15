# Bằng chứng thực nghiệm của luận văn

Thư mục này chứa script, dữ liệu và kết quả thô của các phép đo ở Chương 6. Luận văn chỉ nêu kết quả và nhận định;
chi tiết từng phép đo nằm ở đây.

Đường dẫn trong bảng tính từ `docs/thesis/`. Lệnh chạy lại đầy đủ nằm ở `supplement/cau_hinh_va_tai_lap.md`.

## Mục lục theo tiêu chí chấp nhận

| Tiêu chí | Nội dung đo | Script hoặc quy trình | Kết quả thô | Trong luận văn |
|---|---|---|---|---|
| AC-15 (NFR-02) | Độ trễ phản hồi trước (120 lượt) và sau (200 lượt) khi sửa câu đệm, 15/11/2026 | `experiments/latency_20261115/audio_probe.py`, `analyze.py` | `experiments/latency_20261115/` (xem `README.md`, `results.txt`) | Mục 6.4 |
| AC-15 (NFR-02) | Độ trễ đợt đo 05–06/09/2026, khi còn nhánh rút gọn (chỉ để tham khảo) | `extract_ch6_metrics.py` | Nhật ký gốc của tác nhân không lưu trong kho mã | Bảng 6.5 |
| AC-19 | Tỷ lệ lỗi từ, 22 câu, yên tĩnh và có nhiễu | `compute_wer.py`, `wer_kich_ban.md` | `wer_ket_qua.md` | Mục 6.5 |
| AC-01 đến AC-08 | Độ chính xác gọi công cụ, tỷ lệ hoàn thành, phân loại lỗi (43 lượt, chấm tay) | `ch6_manual_scoring.md` | `ch6_manual_scoring.md` | Mục 6.6 |
| AC-14 (NFR-01) | Danh mục hành vi khi lái; câu báo lỗi | `test_call_error_message` trong bộ kiểm thử của tác nhân | `experiments/results_nfr05_rs_rerun.txt` (RS-04 chạy lại) | Mục 6.7 |
| AC-16 (NFR-03) | SC-01, SC-02: phiên hội thoại đồng thời, nhà cung cấp AI giả lập | `experiments/sc_sessions.py`, `fake_ai_server.py`, `sc_agent_env.sh`, `bench_worker.py` | `experiments/results_sc01.txt`, `results_sc02.txt` | Mục 6.8 |
| AC-16 (NFR-03) | SC-03: thử tải API (tham khảo) | `experiments/sc03_setup.sh`, `sc03_run.sh`, `sc03_trip_api.k6.js`, `sc03_analyze.py` | `experiments/results_sc03.txt`, `experiments/results/` | Mục 6.8 |
| AC-17 (NFR-04) | RS-01, RS-02, RS-04: tiêm lỗi mức thành phần | `experiments/rs_component_faults.py` | `experiments/results_rs_faults.txt` | Mục 6.9 |
| AC-17 (NFR-04) | RS-03: dừng một bản sao tác nhân | `experiments/rs03_replica_kill.py` | `experiments/results_rs03.txt` | Mục 6.9 |
| AC-17 (NFR-04) | RS-05: dự phòng nhà cung cấp LLM | `experiments/rs05_provider_fallback.py` | `experiments/results_rs05.txt` | Mục 6.9 |
| AC-18 (NFR-05) | Quét số điện thoại đầy đủ trong nhật ký sau khi che | `experiments/log_masking_check.py` | `experiments/results_nfr05_rs_rerun.txt` | Mục 6.10 |
| AC-10, AC-11, AC-13 | Luồng khách hàng, SMS, báo cáo ngày | Bộ kiểm thử tự động: `pytest` (tác nhân: `test_call_customer`, `test_outbound_call_modes`, `test_customer_outbound_opening`, `test_customer_call_faq`, `test_record_customer_request`, `test_resolve_customer_trip`, `test_session_metrics`, `test_send_sms_flow`), `npm run verify:ops`, `verify:records`, `verify:sms`, `verify:logger`; `tool_choice_eval.py`, `call_intent_eval.py` | Kết quả đạt hoặc không đạt khi chạy | Mục 6.11 |
| FR-T07 (bổ sung) | Chất lượng sắp xếp thứ tự ghé, 600 bộ điểm dừng | `experiments/route_opt_quality.js` | `experiments/results_route_opt.txt` | Mục 6.11 |
| AC-09, AC-12 | Từ khóa đánh thức; điều phối viên mời tài xế | Kiểm thử chức năng trên thiết bị thật do tác giả thực hiện | Chưa có tệp bằng chứng trong kho mã | Bảng 6.15 |

## Ghi chú

- Thử tải và tiêm lỗi (SC, RS) chạy trên một máy với nhà cung cấp AI giả lập; không chạy trên AWS.
- Nhật ký thô của tác nhân (`src/backend/llm-orchestrator/logs/`) không được đưa vào kho mã. Với đợt đo 15/11/2026,
  các dòng chỉ số cần cho việc tính lại đã được trích vào `latency_20261115/` (số điện thoại đã che).
