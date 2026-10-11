# Kịch bản đo WER — Bảng 6.5 / Hình 6.2 (Chương 6)

Mục tiêu: đo **tỷ lệ lỗi từ** của nhận dạng giọng nói (STT) trong hai điều kiện âm thanh,
trên cùng một đoạn đọc cố định. Thời gian: ~5–10 phút đọc.

---

## 1. Đoạn đọc cố định (22 câu)

Đọc **rõ ràng, tốc độ bình thường**, nghỉ ~2 giây giữa mỗi câu để hệ thống chốt từng câu
thành một dòng `stt_final` riêng. Đọc **đúng thứ tự**, không sửa lời.

1. Tôi muốn kiểm tra lịch trình hôm nay.
2. Hôm nay tôi có bao nhiêu chuyến.
3. Chuyến đầu tiên đón khách ở đâu.
4. Chuyến sớm nhất đón lúc mấy giờ.
5. Khách của chuyến này tên là gì.
6. Giá cước chuyến đầu tiên là bao nhiêu.
7. Chuyến này đi bao nhiêu ki lô mét.
8. Điểm trả khách của chuyến thứ hai ở đâu.
9. Bạn kiểm tra lại xem chuyến thứ hai đã có thông tin điểm đến chưa.
10. Gọi cho khách của chuyến hiện tại giúp tôi.
11. Nhắn cho khách là mười lăm phút nữa tôi đến đón.
12. Tôi cần gọi cho khách đón ở Liễu Giai, không phải khách kia.
13. Xác nhận nhận chuyến này.
14. Tôi từ chối chuyến vừa được thông báo.
15. Cập nhật là tôi đã đón khách.
16. Báo khách không có mặt tại điểm đón.
17. Cho tôi xem thu nhập hôm nay.
18. Thu nhập bảy ngày gần đây của tôi là bao nhiêu.
19. Đón khách tại Tòa nhà Lotte, năm mươi tư Liễu Giai, Ba Đình, Hà Nội.
20. Trả khách ở bốn mươi lăm Nguyễn Huệ, Quận Một, Thành phố Hồ Chí Minh.
21. Nhắc tôi trước giờ đón mười lăm phút.
22. Kết thúc trợ lý, cảm ơn bạn.

> Ghi chú: số đọc bằng chữ ("năm mươi tư", "mười lăm"). Khi tính WER, digit ↔ chữ số
> được chuẩn hoá nên "54" và "năm mươi tư" **không** bị tính là lỗi.

---

## 2. Hai điều kiện âm thanh

| | Điều kiện | Cách tạo |
|---|---|---|
| **A** | Yên tĩnh | Phòng yên, không mở nhạc/quạt/điều hoà. |
| **B** | Nhiễu khoang xe giả lập | Mở một video "tiếng ồn trong xe khi chạy" / "car interior road noise" trên YouTube, phát qua loa điện thoại/laptop đặt cách micro ~50 cm, **âm lượng vừa** — đủ nghe rõ tiếng ồn nhưng không át giọng đọc (mô phỏng xe chạy ~50 km/h). Ghi lại **tên video + mức âm lượng ước lượng** để đưa vào luận văn. |

Đọc **trọn bộ 22 câu ở điều kiện A trước, rồi lặp lại trọn bộ 22 câu ở điều kiện B.**
Nếu có thời gian, đọc **2 lượt mỗi điều kiện** (kết quả ổn định hơn).

---

## 3. Cách thu (để log ghi được `stt_final`)

1. Chạy voice-agent như bình thường (`python -m app.main dev`).
2. Mở phiên trợ lý: `python test_server.py` → trình duyệt `http://localhost:8888` → **Connect**
   (hoặc gọi vào số thật). Dùng **micro thật của thiết bị**, không dùng mic ảo.
3. Đọc lần lượt 22 câu, nghỉ ~2 giây giữa các câu. Bỏ qua việc bot trả lời gì —
   chỉ cần nói hết câu.
4. Khi xong điều kiện A: **ghi lại mốc giờ bắt đầu / kết thúc** và `room=…` (xem trên log
   dòng `connected to room`). Ngắt phiên.
5. Lặp cho điều kiện B (mở tiếng ồn trước khi Connect).
6. Gửi lại cho tôi: 2 khoảng thời gian (A và B) + room id, hoặc chỉ cần nói "đã đọc xong,
   log ở `voice-agent/logs/`" — tôi tự lọc theo giờ.

---

## 4. Tôi làm phần còn lại

Có log rồi, tôi chạy `compute_wer.py` (sẽ viết): trích các dòng
`event=stt_final text="…"` trong khoảng A và B, canh theo thứ tự với 22 câu gốc, chuẩn hoá
(chữ thường, bỏ dấu câu, digit ↔ chữ số), tính S/D/I bằng khoảng cách sửa mức từ →

- **WER_A**, **WER_B**, chênh lệch B − A (điểm phần trăm) → điền **Bảng 6.5**
- Biểu đồ cột so sánh → **Hình 6.2**
- Ghi rõ: n câu, tổng số từ N, điều kiện nhiễu, thiết bị micro.

---

## 5. N (số từ tham chiếu) — cố định

22 câu ≈ **190 từ** (đếm chính xác khi chấm). Với 2 lượt/điều kiện thì N ≈ 380 từ mỗi điều kiện.
