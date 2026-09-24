# Driver Question Taxonomy — Coverage Map

What ride-hailing / taxi / delivery drivers typically ask a voice assistant,  
and how **this project** handles each group today.

**Legend:** ✅ Supported · ⚠️ Partial · ❌ Out of scope · 🔮 Future (not capstone)

Related: [driver-support-scope.md](./driver-support-scope.md) · [scenario.md](./scenario.md) · [out-of-scope.md](./out-of-scope.md)

---

## Summary

| # | Category | Capstone focus? | Coverage |
|---|----------|-----------------|----------|
| 1 | Điều hướng & giao thông | Partial | ⚠️ ~30% |
| 2 | Chuyến đi | **Core** | ✅ ~90% |
| 3 | Xăng, sạc, bảo dưỡng | No | ❌ |
| 4 | Thời tiết | No | ❌ |
| 5 | Nghỉ ngơi | No | ❌ |
| 6 | Thu nhập | **Core** | ✅ ~70% |
| 7 | Pháp luật | No | ❌ |
| 8 | Hỗ trợ khẩn cấp | Escalate only | ⚠️ ~10% |
| 9 | Điều khiển điện thoại | No | ❌ |
| 10 | Thông tin chung | FAQ only | ⚠️ ~5% |

**Thesis recommendation:** Demo nhóm **2 (Chuyến đi)** + **6 (Thu nhập)** + một phần **1 (giao thông)**.  
Các nhóm khác → từ chối lịch sự hoặc RAG FAQ ngắn, không hứa tích hợp.

---

## 1. Điều hướng & giao thông

| Câu hỏi mẫu | Status | Tool / cách xử lý |
|-------------|--------|-------------------|
| Chỉ đường đến địa chỉ X | ❌ | Out of scope — *"Dùng Google Maps / Waze"* |
| Tuyến nào nhanh nhất? | ❌ | Không có routing engine realtime |
| Có kẹt xe không? | ✅ | `get_trip_traffic` — `traffic_note` từ Google Maps lúc tạo chuyến |
| Đường cấm / sửa đường? | ❌ | Không có dữ liệu |
| Trạm thu phí còn bao xa? | ❌ | Không có dữ liệu |
| Có đường tránh không? | ❌ | Không có reroute |
| Điểm đón ở đâu? | ✅ | `get_customer_location` |
| ETA bao lâu? | ✅ | `get_trip_traffic`, `get_current_trip_info` — `eta_minutes` |

**Dữ liệu:** `traffic_note`, `route_summary`, `eta_minutes`, `distance_km` (prefetch, không await).

---

## 2. Chuyến đi (CORE)

| Câu hỏi mẫu | Status | Tool |
|-------------|--------|------|
| Hôm nay có lịch chạy gì? | ✅ | `check_upcoming_trips` |
| Chuyến tiếp theo mấy giờ? | ✅ | `check_upcoming_trips` |
| Đón khách ở đâu? | ✅ | `get_customer_location` |
| Khách đã hủy chưa? | ⚠️ | Đọc `status` từ context; không push realtime |
| Gọi cho khách | ✅ | `call_customer` (agent / bridge) |
| Nhắn khách tôi đến sau 5 phút | ✅ | `confirm_trip_with_customer` (SMS stub) |
| Nhận / từ chối chuyến mới | ✅ | `confirm_trip` / `reject_trip` (outbound) |
| Hủy chuyến | ✅ | `request_cancel_trip` → `confirm_cancel_trip` |
| Đã đến / đón khách / xong chuyến | ✅ | `update_trip_status` |
| Khách không ra | ✅ | `report_customer_no_show` |
| Báo sự cố | ✅ | `report_trip_issue` |
| Gia hạn chờ / nhắc giờ đón | ✅ | `extend_wait_time`, `create_reminder` |

---

## 3. Xăng, sạc, bảo dưỡng

| Câu hỏi mẫu | Status | Gợi ý trả lời |
|-------------|--------|---------------|
| Cây xăng gần nhất | ❌ | *"Em không có dữ liệu xăng. Anh/chị dùng Maps."* |
| Giá xăng A95 hôm nay | ❌ | Không tích hợp API giá xăng |
| Trạm sạc EV gần đây | ❌ | |
| Áp suất lốp chuẩn | ⚠️ | `answer_app_faq` nếu có trong playbook — không chắc realtime |
| Kỳ thay dầu | ❌ | Cần telematics / hồ sơ xe |
| Đèn Check Engine | ❌ | |

**Capstone:** Không implement. Có thể thêm 1–2 câu FAQ chung vào playbook (không tool).

---

## 4. Thời tiết

| Câu hỏi mẫu | Status |
|-------------|--------|
| Hôm nay có mưa không? | ❌ — cần Weather API |
| Thời tiết đường đi X | ❌ |
| Có bão không? | ❌ |
| Nhiệt độ hiện tại | ❌ |

**Liên quan gián tiếp:** `traffic_note` phản ánh delay giao thông, không phải dự báo thời tiết.

---

## 5. Nghỉ ngơi

| Câu hỏi mẫu | Status |
|-------------|--------|
| Trạm dừng nghỉ / quán ăn / cà phê | ❌ — cần Places API |
| Nhà vệ sinh | ❌ |
| Chỗ ngủ qua đêm | ❌ |

---

## 6. Thu nhập (CORE)

| Câu hỏi mẫu | Status | Tool |
|-------------|--------|------|
| Hôm nay kiếm được bao nhiêu? | ✅ | `get_today_earnings` |
| Giá / fare chuyến này? | ✅ | `check_upcoming_trips`, `get_current_trip_info` — `estimated_fare` |
| Còn bao nhiêu chuyến đạt mục tiêu? | ❌ | Không có goal tracking |
| Tuần này doanh thu? | 🔮 | API `get_earnings_summary` có, **chưa có tool** |
| Thưởng hôm nay? | ✅ | `get_bonus_info` |
| Rating / thống kê | ✅ | `get_driver_stats` |

---

## 7. Pháp luật

| Câu hỏi mẫu | Status |
|-------------|--------|
| Tốc độ tối đa đoạn này | ❌ |
| Mức phạt vượt đèn / cồn | ⚠️ | `answer_app_faq` — chỉ nếu ghi trong playbook, không tư vấn pháp lý |
| Được quay đầu ở đây không? | ❌ |

**Quy tắc:** Không đưa số liệu phạt cụ thể trừ khi có nguồn RAG đã verify. Ưu tiên *"Tuân thủ biển báo và luật giao thông."*

---

## 8. Hỗ trợ khẩn cấp

| Câu hỏi mẫu | Status | Cách xử lý |
|-------------|--------|------------|
| Gọi cứu hộ / bảo hiểm | ❌ tool | Hướng dẫn gọi **113 / 115 / 114** |
| Gọi người thân | ❌ | Ngoài phạm vi — cần OS dialer |
| Xe chết máy | ⚠️ FAQ | RAG ngắn + khuyên gọi cứu hộ |
| Tai nạn | ⚠️ | `report_trip_issue(safety_concern)` + **gọi 113/115 ngay** |

**Capstone:** Không tích hợp gọi khẩn cấp. Prompt phải ưu tiên an toàn.

---

## 9. Điều khiển điện thoại

| Câu hỏi mẫu | Status |
|-------------|--------|
| Gọi vợ / gọi tùy ý | ❌ | Chỉ `call_customer` cho **khách chuyến hiện tại** |
| Đọc / trả lời tin nhắn | ❌ | Cần quyền OS + SMS |
| Mở nhạc / âm lượng / Maps | ❌ | Cần CarPlay / Android Auto / assistant OS |

**Phạm vi dự án:** Voice bot **trong app nền tảng**, không phải trợ lý hệ điều hành.

---

## 10. Thông tin chung

| Câu hỏi mẫu | Status |
|-------------|--------|
| Tỷ giá / vàng / tin tức / bóng đá / lịch âm | ❌ tool |
| Ứng dụng hỗ trợ gì? / Cách dùng bot? | ✅ | `answer_app_faq` (RAG playbook) |

---

## Chiến lược trả lời khi OUT OF SCOPE

```
1. Từ chối ngắn — một câu
2. Gợi ý thay thế an toàn (Maps, 113, hotline, app UI)
3. Offer lại trong phạm vi: "Em có thể giúp lịch chuyến, gọi khách, thu nhập..."
```

Template: xem [out-of-scope.md](./out-of-scope.md).

---

## Roadmap (sau capstone)

| Priority | Feature | Nhóm |
|----------|---------|------|
| P1 | Tool `get_weekly_earnings` | 6 |
| P2 | Refresh traffic realtime (Maps re-query) | 1 |
| P3 | Weather API cho chuyến dài | 4 |
| P4 | Places API (xăng, rest stop) | 3, 5 |
| P5 | OS-level phone control | 9 |

---

## Tool count (driver inbound)

**21 tools** today: trip schedule, traffic, earnings, calls, incidents, FAQ, …  
Cover **~85% câu hỏi thực tế trong lúc chạy chuyến** (nhóm 2 + 6 + phần 1).  
Không cover assistant đa năng kiểu Siri/Google Assistant.
