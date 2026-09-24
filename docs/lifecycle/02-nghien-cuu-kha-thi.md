# Nghiên cứu Khả thi — AI Voice Driver Assistant

- **Dự án:** AI Voice Driver Assistant (Jira: AVDA)
- **Phiên bản:** 1.0 — 10/09/2026
- **Nguồn:** luận văn Chương 1 (bối cảnh, mục tiêu, phạm vi) + hiện trạng mã nguồn + memory nội bộ (telephony, hardening).

---

## 1. Bối cảnh và động lực

Tài xế xe công nghệ / giao hàng phải thao tác điện thoại khi đang lái: xem/xác nhận chuyến, cập nhật trạng thái, liên lạc khách, tra lộ trình — buộc rời mắt khỏi đường và một tay rời vô-lăng. Bằng chứng thực nghiệm (Dingus et al., 2016; IIHS) cho thấy thao tác thiết bị cầm tay khi lái làm tăng nguy cơ va chạm 2–6 lần. Nhu cầu: một cách tương tác **rảnh tay bằng giọng nói**.

Điều kiện kỹ thuật đã chín: STT + LLM + TTS ghép thành chuỗi thời gian thực; **gọi công cụ** cho phép LLM thực thi nghiệp vụ qua API; hạ tầng WebRTC (ứng dụng) + SIP (điện thoại) sẵn có (LiveKit).

---

## 2. Khả thi kỹ thuật

| Khía cạnh | Đánh giá | Bằng chứng trong repo |
|---|---|---|
| Chuỗi STT→LLM→TTS thời gian thực | **Khả thi — đã chạy** | `src/backend/llm-orchestrator/app/providers/{stt,llm,tts}/` với nhiều nhà cung cấp; worker LiveKit |
| Gọi công cụ điều phối nghiệp vụ | **Khả thi — đã chạy** | ~50 công cụ tại `app/voicebot/locales/vn/tools/` + registry `tools_mapping.py` / `tools_definition.py` |
| Tách lớp AI khỏi nghiệp vụ | **Khả thi — đã chạy** | llm-orchestrator chỉ gọi HTTP; `external-api-service` là nguồn sự thật |
| Thay nhà cung cấp qua cấu hình | **Khả thi — đã chạy** | interface `providers/*/base.py`; chọn qua biến môi trường |
| Phân loại phiên theo phòng | **Khả thi — đã chạy** | `app/agent/session.py::_parse_room` |
| Kênh WebRTC trong ứng dụng | **Khả thi — đã chạy** | driver-app `features/home` + `services/api/voice.ts` |
| Kênh SIP (gọi ra / gọi vào) | **Khả thi ở mức thử nghiệm**; cần trunk thật | `scripts/setup_sip.py`; công cụ `call_customer.py`, `call_delivery_party.py` |
| Độ trễ P95 ≤ 2s | **Chưa chứng minh bằng số** — cần benchmark ≥30 lượt | `app/agent/turn_metrics.py`; đường tắt câu quen; câu đệm fallback |
| Nghe trong ồn (WER) | **Chưa đo** — cần bộ mẫu yên/nhiễu | STT đa nhà cung cấp; noise cancellation phía telephony |

**Rủi ro kỹ thuật chính:** (a) độ trễ đuôi khi LLM/telephony chậm — giảm nhẹ bằng câu đệm + đường tắt; (b) lẫn session khi self-call / sticky SIP — cần test tái hiện (Epic AVDA-11); (c) phụ thuộc nhà cung cấp bên thứ ba — giảm nhẹ bằng lớp trung gian đổi được provider.

---

## 3. Khả thi vận hành

| Khía cạnh | Đánh giá |
|---|---|
| Tài xế dùng được rảnh tay | Khả thi: wake-word + câu ngắn + xác nhận thao tác rủi ro; cần field trial ≥5 tài xế thật để xác nhận (Epic AVDA-7 / AVDA-29, AVDA-81 — **chưa làm**) |
| Tích hợp với hệ vận hành hiện có | Khả thi: đã có `external-api-service`, `identity-service`, bảng quản trị, lớp ops |
| Giám sát & xử lý sự cố | Một phần: log runtime chuẩn có; **thiếu** dashboard chất lượng cuộc gọi + cảnh báo (Epic AVDA-11 / AVDA-110) |
| Đa ngôn ngữ | Khả thi: locale `vn/` + `en/` đầy đủ |

---

## 4. Khả thi kinh tế (định tính)

- **Chi phí biến đổi:** phí API STT/LLM/TTS theo lượt gọi + phút SIP. Lớp trung gian cho phép chọn nhà cung cấp rẻ/chất lượng theo nhu cầu → kiểm soát được chi phí.
- **Chi phí hạ tầng:** LiveKit Cloud (môi trường thử nghiệm), các dịch vụ backend Node/Python — quy mô nguyên mẫu, chi phí thấp.
- **Lợi ích:** giảm thao tác thủ công khi lái → giảm rủi ro an toàn; nền tảng mở rộng sang nghiệp vụ mới (đặt vé nhà xe liên tỉnh — Epic AVDA-10).
- **Kết luận:** khả thi ở quy mô nguyên mẫu / thí điểm; cần mô hình chi phí theo lưu lượng trước khi mở rộng thương mại.

---

## 5. Khả thi pháp lý

| Vấn đề | Ghi chú |
|---|---|
| Gọi ra PSTN tại Việt Nam | Cần SIP trunk hợp lệ; phương án **Viettel Voice Brandname**, tuân thủ **Nghị định 91** về chống tin nhắn / cuộc gọi rác (Epic AVDA-11 / AVDA-107). Mốc rà pháp lý: xác minh lại tại thời điểm triển khai (mốc đóng băng tham chiếu 28/08/2025). |
| Dữ liệu cá nhân (SĐT, vị trí khách) | NFR-S: hạn chế lộ trên loa/nhật ký; chia sẻ vị trí theo API chuyến, không bịa tọa độ. Cần rà mã hóa truyền tải + IAM role (Epic AVDA-8 / AVDA-89). |
| Ghi âm / lưu vết cuộc gọi | `call-records-service` lưu tóm tắt; cần chính sách lưu trữ & thông báo phù hợp khi vận hành thật. |

---

## 6. Kết luận

Giải pháp **khả thi về kỹ thuật** ở mức nguyên mẫu — phần lớn năng lực lõi đã hiện thực và chạy được. Các điểm chưa đóng là **đo lường** (độ trễ P95, WER), **telephony production** (SIP trunk thật + hardening + giám sát) và **field trial**. Khả thi vận hành và kinh tế đạt ở quy mô thí điểm; khả thi pháp lý phụ thuộc việc hoàn tất đấu nối SIP hợp lệ và rà soát bảo mật dữ liệu.

**Khuyến nghị ưu tiên:** (1) Epic AVDA-11 telephony production; (2) benchmark độ trễ + WER (AVDA-31, AVDA-25); (3) field trial (AVDA-29, AVDA-81); (4) báo cáo bảo mật (AVDA-32).
