# Ma trận Truy vết Yêu cầu ↔ Jira ↔ Mã nguồn

- **Dự án:** AVDA — **Phiên bản:** 1.0 — 10/09/2026
- Trạng thái đối chiếu tại thời điểm rà backlog 10/09/2026 (xem comment trên từng ticket).

Chú thích trạng thái:
- ✅ **Có code** — đã hiện thực, khớp phần lớn tiêu chí chấp nhận, chờ review/verify.
- 🟡 **Một phần** — có hướng xử lý / một phần code, thiếu benchmark / báo cáo / test.
- ⬜ **Chưa** — không tìm thấy code.

---

## 1. Yêu cầu ↔ Epic ↔ Ticket ↔ Bằng chứng

| FR / UC | Epic | Ticket chính | Trạng thái | Bằng chứng mã nguồn |
|---|---|---|---|---|
| FR-T01, FR-T02, UC01 | AVDA-1, AVDA-2 | AVDA-9 (AVDA-37) | ✅ | `llm-orchestrator/app/voicebot/locales/vn/tools/check_upcoming_trips.py`, `get_my_trip.py`, `get_current_trip_info.py` |
| FR-T03, UC03 | AVDA-1 | AVDA-9 | ✅ | `update_trip_status.py` |
| FR-T04, UC02 | AVDA-1 | AVDA-22 (định tuyến phiên) | ✅ | `app/agent/session.py::_parse_room`; công cụ nhận/từ chối |
| FR-T05, UC05 | AVDA-1 | AVDA-9 (AVDA-38) | ✅ | `request_cancel_my_trip.py` + `confirm_cancel_my_trip.py` |
| FR-C01, UC04 | AVDA-4 | AVDA-18 (AVDA-57, AVDA-58) | ✅ | `call_customer.py`, `call_delivery_party.py`, `check_customer_call_status.py` |
| FR-C02, FR-D03 | AVDA-4 | AVDA-18 | ✅ | `call_custom_number.py`, `confirm_call_custom_number.py`, `end_conversation.py` |
| FR-C03 | AVDA-1 | AVDA-10 (AVDA-39, AVDA-40) | ✅ | `send_sms_to_customer.py`, `confirm_send_sms_to_custom_number.py` |
| FR-C04 | AVDA-2 | AVDA-13 (AVDA-47, AVDA-48) | ✅ | `get_customer_location.py` |
| FR-C05, UC06 | AVDA-4 | AVDA-19 (AVDA-59, AVDA-60) | ✅ | `summarize_last_call.py`; conversation_service |
| FR-W01 | AVDA-1 | AVDA-11 (AVDA-41, AVDA-42) | ✅ | `create_reminder.py` |
| FR-W02 | AVDA-4 | AVDA-20 (AVDA-61, AVDA-62) | ✅ | `extend_wait_time.py` |
| FR-I01, FR-I02, UC06 | AVDA-1 | AVDA-9 | ✅ | `report_customer_no_show.py`, `report_trip_issue.py` |
| FR-E01–E03, UC08 | AVDA-5 | AVDA-23 (AVDA-69, AVDA-70) | ✅ | `set_driver_status.py`, `get_today_earnings.py`, `get_earnings_summary.py`, `get_driver_stats.py` |
| FR-F01–F02, UC07 | AVDA-5 | AVDA-21 | ✅ | `answer_app_faq.py`; RAG `app/rag/`; `scripts/build_faq_index.py` |
| FR-L01–L03, UC10 | AVDA-6 | AVDA-34 (AVDA-63, AVDA-64) | ✅ | `app/voicebot/locales/en/` đầy đủ; `app/services/locale/` |
| FR-D01 | AVDA-2 | AVDA-14 (AVDA-49, AVDA-50) | 🟡 | `app/vision_api/delivery_extraction.py`; thiếu bộ test độ chính xác |
| FR-D02, UC10 | AVDA-6 | AVDA-27 (AVDA-77, AVDA-78) | ✅ | driver-app `features/assistant-wakeword`, `AssistantChatPanel.tsx`, `ChatVoiceDock.tsx` |
| UC09 (im lặng / lỗi API) | AVDA-6 | AVDA-26 (AVDA-75, AVDA-76) | ✅ | `app/services/silence_tracker.py`, `app/voicebot/processors/agent_call_silence.py` |
| Điều phối agent theo loại phòng | AVDA-5 | AVDA-22 (AVDA-67, AVDA-68) | ✅ | `app/agent/session.py` |
| Xác thực JWT thống nhất | AVDA-8 | AVDA-30 (AVDA-85, AVDA-86) | ✅ | `identity-service/src/services/tokenService.ts`, `src/middleware/authenticate.ts` |
| Đổi nhà cung cấp STT/LLM/TTS | AVDA-6 | AVDA-24 (AVDA-71, AVDA-72) | ✅ | `app/providers/{stt,llm,tts}/base.py` + provider files |
| POC LiveKit | AVDA-6 | AVDA-36 (AVDA-83, AVDA-84) | ✅ | `AI_Voicebot_LiveKit_Architecture.md`, `test_client.html` |
| NFR-P01 độ trễ ≤ 2s | AVDA-8 | AVDA-33 (AVDA-43), AVDA-31 (AVDA-87, AVDA-88) | 🟡 | `turn_metrics.py`; **thiếu benchmark ≥30 lượt + bảng số** |
| Nghe trong ồn (WER) | AVDA-6 | AVDA-25 (AVDA-73, AVDA-74) | 🟡 | STT đa provider + noise cancel; **thiếu số WER** |
| Bảo mật dữ liệu vị trí / khách | AVDA-8 | AVDA-32 (AVDA-89, AVDA-90) | 🟡 | quyền theo `trip_id`; **thiếu rà mã hóa + báo cáo rủi ro** |
| Màn hình hỗ trợ AI trên customer-app | AVDA-7 | AVDA-28 (AVDA-79, AVDA-80) | 🟡 | `customer-app/app/(app)/support.tsx`; **thiếu đấu nối + test luồng** |
| Trải nghiệm thực tế mượt (field trial) | AVDA-7 | AVDA-29, AVDA-81, AVDA-82 | ⬜ | chưa thực hiện |
| Nhắn tin nhóm tài xế | AVDA-3 | AVDA-15, AVDA-16, AVDA-17 (AVDA-51–56) | ⬜ | không tìm thấy code |

---

## 2. Epic mới (chưa có trên board trước 10/09/2026)

| Epic | Nội dung | Ticket con |
|---|---|---|
| AVDA-91 — Epic 9 Luận văn ThS | 6 chương + Kết luận, stylesheet DOCX UIT/UEH, hình minh hoạ | AVDA-95…100 |
| AVDA-92 — Epic 10 Coach booking voice | Module `coach` trong llm-orchestrator, dispatch DID, đặt/đổi/huỷ vé liên tỉnh | AVDA-101…106 |
| AVDA-93 — Epic 11 Telephony production | SIP Viettel Brandname (NĐ 91), self-call/sticky SIP, hardening, giám sát | AVDA-107…111 |
| AVDA-94 — Epic 12 UI driver-app + Admin/Super Admin | M3 NavigationBar + orb, map HUD, admin i18n, super-admin + ops-service, P2 UI | AVDA-112…116 |

---

## 3. Việc còn lại

1. Sửa workflow project (UI): thêm To Do / In Progress / In Review / Testing / Done — hiện là template CRM.
2. Bulk-transition nhóm ✅ sang Testing/Done sau khi có workflow.
3. Tạo Sprint 9 (UI) và kéo Epic 9–12 vào.
4. Đóng dứt điểm nhóm 🟡 bằng benchmark / báo cáo / test.
5. Lập kế hoạch lại Epic AVDA-3 (nhắn tin nhóm) hoặc chính thức đưa ra ngoài phạm vi.
