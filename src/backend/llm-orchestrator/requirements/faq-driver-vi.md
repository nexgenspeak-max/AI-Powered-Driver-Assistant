# Driver FAQ — Tiếng Việt

Sample driver utterances the AI should understand. Each item maps to a tool (see [capability-matrix.md](./capability-matrix.md)) or a **static FAQ** answer (no tool).

---

## 1. Lịch chuyến & chuyến hiện tại

| ID | Câu hỏi / câu nói mẫu | Tool | Ghi chú |
|----|------------------------|------|---------|
| T01 | "Chuyến tiếp theo của tôi là gì?" | `check_upcoming_trips` | |
| T02 | "Hôm nay tôi còn mấy chuyến?" | `check_upcoming_trips` | |
| T03 | "Tôi có chuyến nào sắp tới không?" | `check_upcoming_trips` | |
| T04 | "Cho tôi xem lịch chuyến." | `check_upcoming_trips` | |
| T05 | "Chuyến hiện tại của tôi thế nào?" | `check_upcoming_trips` / current trip | Ưu tiên chuyến đang active |

---

## 2. Cập nhật trạng thái chuyến

| ID | Câu hỏi / câu nói mẫu | Tool | Status |
|----|------------------------|------|--------|
| T10 | "Tôi đến nơi rồi." | `update_trip_status` → `ARRIVED_PICKUP` | |
| T11 | "Đang chờ khách ở điểm đón." | `update_trip_status` → `ARRIVED_PICKUP` | |
| T12 | "Khách đã lên xe." | `update_trip_status` → `PICKED_UP` | |
| T13 | "Đón khách xong rồi." | `update_trip_status` → `PICKED_UP` | |
| T14 | "Xong chuyến rồi." | `update_trip_status` → `COMPLETED` | |
| T15 | "Đã trả khách." | `update_trip_status` → `COMPLETED` | |

---

## 3. Điểm đón & địa chỉ khách

| ID | Câu hỏi / câu nói mẫu | Tool |
|----|------------------------|------|
| T20 | "Khách đứng ở đâu?" | `get_customer_location` |
| T21 | "Điểm đón ở đâu?" | `get_customer_location` |
| T22 | "Địa chỉ đón là gì?" | `get_customer_location` |
| T23 | "Tôi cần đến chỗ nào?" | `get_customer_location` |

---

## 4. Liên lạc khách hàng

| ID | Câu hỏi / câu nói mẫu | Tool | Flow |
|----|------------------------|------|------|
| T30 | "Gọi cho khách giúp tôi." | `call_customer` | Dùng chế độ mặc định của tài xế, không hỏi lại |
| T31 | "Cho tôi nói chuyện với khách." | `call_customer` → `bridge` | |
| T32 | "Để AI gọi và tóm tắt lại." | `call_customer` → `agent` | Sau đó `summarize_last_call` |
| T33 | "Cuộc gọi vừa rồi khách nói gì?" | `summarize_last_call` | |
| T34 | "Tóm tắt cuộc gọi giúp tôi." | `summarize_last_call` | |
| T35 | "Nhắn tin báo khách tôi đang đến." | `confirm_trip_with_customer` | SMS |
| T36 | "Xác nhận với khách là tôi sắp tới." | `confirm_trip_with_customer` | |

---

## 5. Nhận / từ chối / hủy chuyến

| ID | Câu hỏi / câu nói mẫu | Tool | Mode |
|----|------------------------|------|------|
| T40 | "Có, tôi nhận." | `confirm_trip` | Outbound only |
| T41 | "Ok, nhận chuyến." | `confirm_trip` | Outbound |
| T42 | "Không, tôi bận." | `reject_trip` | Outbound |
| T43 | "Từ chối chuyến này." | `reject_trip` | Outbound |
| T44 | "Tôi muốn hủy chuyến." | `request_cancel_trip` | 2 bước |
| T45 | "Hủy chuyến đi." | `request_cancel_trip` | Hỏi xác nhận |
| T46 | "Có, hủy đi." | `confirm_cancel_trip` | Sau T44/T45 |

---

## 6. Chờ khách & nhắc nhở

| ID | Câu hỏi / câu nói mẫu | Tool |
|----|------------------------|------|
| T50 | "Cho tôi chờ thêm 5 phút." | `extend_wait_time` |
| T51 | "Gia hạn thời gian chờ." | `extend_wait_time` |
| T52 | "Khách chưa ra, tôi cần chờ thêm." | `extend_wait_time` |
| T53 | "Nhắc tôi trước 10 phút giờ đón." | `create_reminder` |
| T54 | "Đặt nhắc nhở trước giờ đón." | `create_reminder` |

---

## 7. Sự cố & báo cáo

| ID | Câu hỏi / câu nói mẫu | Tool | Ghi chú |
|----|------------------------|------|---------|
| T60 | "Khách không ra." | `report_customer_no_show` | Xác nhận trước |
| T61 | "Đợi mãi không thấy khách." | `report_customer_no_show` | |
| T62 | "Khách vắng mặt." | `report_customer_no_show` | |
| T63 | "Khách hành xử không tốt." | `report_trip_issue` → `inappropriate_behavior` | |
| T64 | "Địa chỉ sai." | `report_trip_issue` → `wrong_address` | |
| T65 | "Có vấn đề an toàn." | `report_trip_issue` → `safety_concern` | |
| T66 | "Xe bị hỏng trong chuyến." | `report_trip_issue` → `vehicle_damage` | |
| T67 | "Tôi muốn báo cáo sự cố." | `report_trip_issue` | Hỏi loại sự cố |

---

## 8. Thu nhập & thống kê

| ID | Câu hỏi / câu nói mẫu | Tool |
|----|------------------------|------|
| T70 | "Hôm nay tôi kiếm được bao nhiêu?" | `get_today_earnings` |
| T71 | "Thu nhập hôm nay thế nào?" | `get_today_earnings` |
| T72 | "Tôi chạy được mấy chuyến hôm nay?" | `get_today_earnings` |
| T73 | "Điểm đánh giá của tôi bao nhiêu?" | `get_driver_stats` |
| T74 | "Rating của tôi?" | `get_driver_stats` |
| T75 | "Tỷ lệ chấp nhận chuyến?" | `get_driver_stats` |
| T76 | "Hôm nay có thưởng không?" | `get_bonus_info` |
| T77 | "Vùng tăng giá ở đâu?" | `get_bonus_info` |
| T78 | "Có khuyến mãi / bonus không?" | `get_bonus_info` |

---

## 9. Trạng thái làm việc

| ID | Câu hỏi / câu nói mẫu | Tool |
|----|------------------------|------|
| T80 | "Bật nhận chuyến." | `set_driver_status` → online |
| T81 | "Tôi sẵn sàng nhận chuyến." | `set_driver_status` → online |
| T82 | "Tắt nhận chuyến." | `set_driver_status` → offline |
| T83 | "Tôi nghỉ ca." | `set_driver_status` → offline |
| T84 | "Đi offline." | `set_driver_status` → offline |

---

## 10. FAQ chung (không cần tool — trả lời bằng LLM)

| ID | Câu hỏi | Câu trả lời gợi ý |
|----|---------|-------------------|
| G01 | "Bạn có thể giúp gì?" | Liệt kê ngắn: lịch chuyến, gọi khách, thu nhập, báo cáo sự cố |
| G02 | "Làm sao để gọi khách?" | Giải thích 2 chế độ: AI gọi hộ hoặc kết nối trực tiếp |
| G03 | "Làm sao hủy chuyến?" | Nói yêu cầu hủy → AI hỏi xác nhận → xác nhận lần 2 |
| G04 | "Khách không ra thì làm gì?" | Gợi ý: gia hạn chờ → gọi khách → báo no-show |
| G05 | "An toàn khi dùng giọng nói?" | Chỉ nói ngắn; AI không yêu cầu thao tác phức tạp khi lái |
| G06 | "Bạn có lưu cuộc gọi không?" | Có thể lưu tóm tắt qua call-logger (nếu bật) |

---

## 11. Câu hỏi liên quan / follow-up

Sau khi trả lời, AI nên hỗ trợ các câu hỏi nối tiếp sau:

| Sau câu trả lời về… | Follow-up thường gặp |
|---------------------|----------------------|
| Lịch chuyến | "Gọi khách được không?", "Điểm đón ở đâu?" |
| Điểm đón | "Gọi khách giúp tôi", "Nhắn tin cho khách" |
| Gọi khách (agent) | "Tóm tắt cuộc gọi", "Khách nói gì?" |
| No-show | "Hủy chuyến", "Báo cáo khách vắng" |
| Thu nhập | "Có bonus không?", "Mấy chuyến nữa?" |

---

## 12. Outbound — nhận chuyến mới (SIP)

| ID | Câu nói mẫu | Tool |
|----|--------------|------|
| O01 | "Nhận." / "Có." / "Ok." | `confirm_trip` |
| O02 | "Không nhận." / "Bận." | `reject_trip` |
| O03 | "Điểm đón ở đâu?" (trong cuộc gọi outbound) | Đọc từ trip context, không cần tool |
| O04 | "Bao lâu nữa đến?" | ETA từ trip metadata |
