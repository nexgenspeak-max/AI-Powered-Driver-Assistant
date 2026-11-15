# Chương 6. Thực nghiệm và đánh giá

Chương này đánh giá nguyên mẫu của Chương 5 theo các tiêu chí chấp nhận dạng Given – When – Then đã được cố định từ trước (Bảng 3.8) và trả lời bốn câu hỏi nghiên cứu RQ1–RQ4. Chương chỉ nêu kết quả và nhận định; script, dữ liệu và kết quả thô của từng phép đo nằm trong kho mã nguồn, thư mục docs/thesis/experiments, nơi tệp README.md liệt kê bằng chứng theo từng tiêu chí chấp nhận.

## 6.1. Mục tiêu và ma trận đánh giá

Bảng 6.1 liên kết từng yêu cầu với câu hỏi nghiên cứu, tiêu chí, kịch bản, chỉ số, ngưỡng và mục kết quả. Phạm vi đánh giá không bao gồm khảo sát khách hàng thật, đo an toàn giao thông thực địa, so sánh quy mô lớn giữa các nhà cung cấp STT, LLM, TTS, cũng như thử tải trên hạ tầng AWS thực tế.

**Bảng 6.1.** Ma trận đánh giá theo yêu cầu

| Yêu cầu | RQ | Tiêu chí | Kịch bản | Chỉ số | Ngưỡng | Mục |
|---|---|---|---|---|---|---|
| NFR-02 Hiệu năng | RQ2 | AC-15 | 22 câu tra cứu và hỏi đáp (UC01, UC03, UC07) | P50, P95 độ trễ | P95 ≤ 2 giây | 6.4 |
| Nhận dạng giọng nói | RQ3 | AC-19 | 22 câu, hai điều kiện | Tỷ lệ lỗi từ | So sánh tương đối | 6.5 |
| FR của tài xế | RQ4 | AC-01–AC-08 | UC01–UC08 | Đúng công cụ; hoàn thành | Báo cáo theo nhóm | 6.6 |
| NFR-01 Tính khả dụng | RQ4 | AC-14 | UC01–UC06, UC09 | Danh mục hành vi khi lái | 100% thao tác rủi ro có xác nhận | 6.7 |
| NFR-03 Khả năng mở rộng | RQ1 | AC-16 | SC-01, SC-02, SC-03 | P95, tỷ lệ lỗi theo số phiên | P95 tăng ≤ 20%; lỗi < 1% | 6.8 |
| NFR-04 Khả năng phục hồi | RQ1 | AC-17 | RS-01–RS-05 | Phiên duy trì; thời gian khôi phục | 100% phiên duy trì | 6.9 |
| NFR-05 Bảo mật | Tuân thủ | AC-18 | Mã nguồn, cấu hình, nhật ký | Danh mục | 100% mục đạt | 6.10 |
| Luồng khách hàng (FR-K) | RQ4 | AC-10, AC-11 | Kiểm thử khách hàng | Tỷ lệ ca đạt | Đạt / không đạt | 6.11 |
| FR-T07 Sắp xếp thứ tự ghé | RQ4 | Bổ sung | 600 bộ mô phỏng | Chênh lệch với tối ưu | Báo cáo | 6.11 |
| FR-O01, FR-O02 | Tuân thủ | AC-13 | Chỉ số phiên, báo cáo ngày | Tỷ lệ ca đạt | Đạt / không đạt | 6.11 |

## 6.2. Môi trường thực nghiệm

Số liệu được lấy từ bốn nguồn: đợt đo độ trễ ngày 15/11/2026 trên thiết kế hiện hành (mục 6.4); nhật ký các phiên hội thoại do tác giả thực hiện, chủ yếu ngày 05 và 06/09/2026 (mục 6.5, 6.6); bộ kiểm thử tự động của các dịch vụ; và thí nghiệm có kiểm soát trong môi trường mô phỏng cục bộ (mục 6.8, 6.9). Mọi phiên dùng tài khoản và chuyến thử nghiệm nội bộ; số điện thoại được che.

### 6.2.1. Môi trường đo hội thoại

Bảng 6.2 nêu cấu hình đo; gpt-5.6-luna là một mô hình thuộc họ GPT. Trong đợt đo độ trễ ngày 15/11/2026, người nói là một "tài xế ảo": một chương trình vào phòng LiveKit như ứng dụng tài xế và phát câu tiếng Việt do giọng máy đọc. Đợt đo gồm 12 phiên, mỗi phiên 10 lượt, tổng 120 lượt, lấy từ 22 câu tra cứu và hỏi đáp (lịch chuyến, thu nhập, cách dùng ứng dụng, tóm tắt cuộc gọi) lặp theo vòng; không có câu nào tạo cuộc gọi, gửi SMS hay đổi trạng thái chuyến. Mọi lượt đều được giữ, kể cả lượt chậm.

**Bảng 6.2.** Môi trường đo hội thoại

| Thành phần | Cấu hình |
|---|---|
| Dịch vụ Liên lạc hội thoại thời gian thực | Chạy trên máy phát triển, kết nối LiveKit Cloud qua WebRTC |
| Dịch vụ backend | Chạy cục bộ (Phụ lục D) |
| Người nói | Đợt 15/11/2026: tài xế ảo phát giọng máy tiếng Việt. Các đợt trước: tác giả đọc trên thiết bị thật hoặc trình giả lập |
| Mô hình AI | LLM gpt-5.6-luna; STT Google chirp_3 (vi-VN); TTS ElevenLabs eleven_v4_turbo trong đợt 15/11/2026, Google vi-VN-Chirp3-HD-Kore trong các đợt trước |
| Dữ liệu | Tài khoản và chuyến thử nghiệm nội bộ |

### 6.2.2. Môi trường mô phỏng thử tải và tiêm lỗi

Khả năng mở rộng và phục hồi được đánh giá trên một máy phát triển (Apple M4 Pro 14 nhân, 48 GB RAM), với các thành phần bên ngoài được giả lập: máy chủ tiêm lỗi thay cho dịch vụ nghiệp vụ (trả 503, treo hoặc từ chối kết nối); bộ giả lập STT, LLM, TTS có độ trễ cố định 0,3 / 0,8 / 0,2 giây; LiveKit mã nguồn mở chạy trong Docker cùng 1, 2 hoặc 4 tiến trình tác nhân thật; và công cụ sinh tải đóng vai tài xế. Vì độ trễ giả lập là cố định, mọi thay đổi độ trễ theo số phiên đều đến từ chính hệ thống đang được thử. Script và lệnh chạy ở Phụ lục E.

## 6.3. Định nghĩa chỉ số

**Độ trễ phản hồi** là thời gian từ lúc tác nhân nhận biết tài xế đã dứt lời đến lúc tác nhân bắt đầu phát âm thanh đầu tiên, dù đó là câu trả lời hay câu đệm, đúng như cột Then của AC-15 (P50, P95); độ trễ theo chặng dùng để phân tích điểm nghẽn (Bảng 6.4). **Tỷ lệ lỗi từ** là WER = (S + D + I) / N, với S, D, I là số từ bị thay thế, xóa, chèn so với câu tham chiếu N từ. **Độ chính xác gọi công cụ**: một lượt đúng khi tên công cụ thuộc tập kỳ vọng, tham số chính đúng và không có lời gọi nào gây sai nghiệp vụ. **Tỷ lệ hoàn thành nghiệp vụ**: một lượt hoàn thành khi yêu cầu đạt kết quả ở cột Then của tiêu chí tương ứng (Bảng 3.8) ngay lần đầu, xét theo trạng thái dữ liệu backend chứ không theo câu trả lời. **Khả năng mở rộng** được đo bằng mức tăng tương đối của P95 và tỷ lệ phiên lỗi theo số phiên đồng thời; **khả năng phục hồi** được đo bằng tỷ lệ phiên không kết thúc bất thường khi tiêm lỗi và thời gian đến khi phiên mới được phục vụ sau khi một bản sao bị dừng.

Quy tắc xử lý dữ liệu được cố định từ trước: các chỉ số hội thoại tính theo lượt; giá trị ngoại lai được giữ; phân vị tính bằng nội suy tuyến tính; tỷ lệ kèm khoảng tin cậy 95% Wilson. Tiêu chí được xem là "đạt" khi thỏa ngưỡng ở Bảng 3.8, ghi kèm "mẫu nhỏ" khi cỡ mẫu nhỏ hơn dự kiến.

## 6.4. Kết quả hiệu năng — NFR-02 (RQ2)

Bảng 6.3 trình bày độ trễ của thiết kế hiện hành (mọi lượt qua LLM, câu đệm sau 2 giây) theo ba cách đo. Chỉ số A là chỉ số của AC-15. Chỉ số B tính tới câu trả lời thật, bỏ qua câu đệm. Chỉ số C đo từ phía tài xế ảo, gồm cả đường truyền hai chiều, nên là giới hạn trên của khoảng chờ mà tài xế cảm nhận.

**Bảng 6.3.** Độ trễ phản hồi của thiết kế hiện hành (giây; ngày 15/11/2026; 120 lượt trong 12 phiên)

| Chỉ số | Cách đo | n | P50 | P90 | P95 | Lớn nhất | Lượt ≤ 2 giây |
|---|---|---|---|---|---|---|---|
| A (AC-15) | Tác nhân nhận biết tài xế dứt lời → âm thanh đầu của tác nhân | 120 | 1,83 | 2,35 | 2,58 | 3,36 | 87/120 (72,5%) |
| B | Tổng ba chặng tới câu trả lời thật | 81 | 2,14 | 2,54 | 2,87 | 2,96 | 26/81 (32,1%) |
| C | Tài xế ảo phát hết câu → nhận âm thanh đầu | 120 | 2,94 | 3,49 | 3,62 | 4,44 | 2/120 (1,7%) |

Chỉ số B chỉ có ở 81 lượt, vì ở 39 lượt còn lại công cụ tự đọc kết quả và nhật ký không tách được ba chặng.

**Bảng 6.4.** Độ trễ theo chặng trong một lượt (giây; n = 81)

| Chặng | P50 | P95 | Nhận xét |
|---|---|---|---|
| Phát hiện kết thúc phát ngôn | 0,95 | 1,23 | Gần như toàn bộ là thời gian chờ STT trả kết quả cuối của câu |
| LLM sinh token đầu | 1,04 | 1,32 | Thuộc nhà cung cấp LLM |
| TTS đến âm thanh đầu | 0,17 | 0,19 | Không đáng kể |

![Biểu đồ P50 P95 độ trễ theo ba cách đo|h=8](thesis_screenshots/H6_1_latency.png)

**Hình 6.1.** P50 và P95 độ trễ phản hồi theo ba cách đo, đợt đo 15/11/2026 (n = 120 lượt)

**AC-15 không đạt:** P95 là 2,58 giây so với ngưỡng 2 giây. Phần lớn các lượt nằm sát dưới ngưỡng: 78 trong 120 lượt rơi vào khoảng 1,5–2,0 giây, và 33 lượt vượt 2 giây (24 lượt trong khoảng 2,0–2,5 giây, 9 lượt trên 2,5 giây). Có ba nhận định.

Thứ nhất, không chặng nào một mình vượt ngưỡng. Phát hiện kết thúc phát ngôn và token đầu của LLM mỗi chặng mất khoảng 1 giây ở trung vị; cộng lại, hai chặng này đã dùng gần hết ngân sách 2 giây, nên chỉ cần một chặng chậm hơn bình thường là lượt đó vượt ngưỡng. Chặng thứ nhất không phải do khoảng lặng chờ quá dài: tác nhân chỉ chờ 0,25–0,55 giây im lặng, còn lại là thời gian nhà cung cấp STT trả kết quả cuối của câu (trung vị 0,96 giây trong nhật ký). Cả hai chặng lớn vì vậy đều thuộc nhà cung cấp AI bên ngoài.

Thứ hai, câu đệm rút ngắn khoảng lặng nhưng không giúp đạt AC-15. Câu đệm được phát ở 33 lượt. Nó được kích hoạt đúng ở giây thứ 2 và còn cần thời gian tổng hợp giọng nói, nên âm thanh của nó luôn tới sau ngưỡng. Muốn đạt ngưỡng bằng câu đệm thì phải phát sớm hơn, đổi lại câu đệm sẽ xuất hiện ở nhiều lượt hơn.

Thứ ba, khoảng chờ tài xế cảm nhận dài hơn chỉ số A. Đồng hồ của chỉ số A bắt đầu khi tác nhân nhận biết tài xế đã dứt lời, tức là sau khi tài xế thật sự ngừng nói một khoảng; chỉ số C tính cả khoảng này và đường truyền, cho P50 là 2,94 giây.

**Đối chiếu với đợt đo trước.** Bảng 6.5 đặt kết quả cạnh đợt đo 05–06/09/2026, khi nguyên mẫu còn nhánh rút gọn theo ý định (đã loại bỏ theo ADR-02, mục 4.2.2). Hai đợt khác nhau về thiết kế, người nói và tập câu, nên bảng chỉ dùng để tham khảo. Thời gian sinh token đầu của LLM ở đợt sau ngắn hơn rõ rệt dù cùng tên mô hình; luận văn không xác định được nguyên nhân. Nhật ký gốc của đợt đầu không còn được lưu, và số liệu của nhánh rút gọn ở đợt đó (P50 0,21 giây trên 167 lượt) không được dùng làm kết quả vì không kiểm tra lại được (mục 6.13).

**Bảng 6.5.** Đối chiếu hai đợt đo độ trễ (giây)

| Đợt đo | Thiết kế và người nói | n | P50 | P95 | Token đầu của LLM P50 / P95 | Phát hiện kết thúc phát ngôn P50 / P95 |
|---|---|---|---|---|---|---|
| 05–06/09/2026 | Còn nhánh rút gọn, chỉ tính lượt qua LLM; tác giả đọc | 174 | 1,54 | 3,75 | 1,25 / 2,49 | 0,94 / 1,70 |
| 15/11/2026 | Mọi lượt qua LLM, có câu đệm; tài xế ảo | 120 | 1,83 | 2,58 | 1,04 / 1,32 | 0,95 / 1,23 |

## 6.5. Kết quả nhận dạng giọng nói (RQ3)

Bộ 22 câu (tra cứu chuyến, xác nhận, gọi và nhắn tin cho khách, địa chỉ có số nhà, mốc giờ) được đọc một lượt ở mỗi điều kiện, cùng thiết bị và micro; ở điều kiện B, tiếng ồn khoang xe phát từ thiết bị khác để bộ khử tiếng vọng không lọc mất. Văn bản nhận dạng được chuẩn hóa chữ số và dấu câu rồi so với câu tham chiếu.

**Bảng 6.6.** Tỷ lệ lỗi từ theo điều kiện âm thanh (một người đọc, một lượt mỗi điều kiện)

| Điều kiện | Số câu / số từ | S / D / I | WER |
|---|---|---|---|
| A — Yên tĩnh | 22 / 192 | 1 / 5 / 0 | 3,1% |
| B — Nhiễu mô phỏng khoang xe | 22 / 192 | 3 / 5 / 6 | 7,3% |
| Chênh lệch B − A | Cùng bộ câu | +2 / 0 / +6 | +4,2 điểm phần trăm |

![Biểu đồ WER điều kiện A và B|h=8](thesis_screenshots/H6_2_wer.png)

**Hình 6.2.** Tỷ lệ lỗi từ ở điều kiện yên tĩnh và điều kiện nhiễu mô phỏng khoang xe

Khi có nhiễu, tỷ lệ lỗi từ tăng hơn gấp đôi do lỗi chèn và lỗi thay thế, trong đó có thay thế từ mang nghĩa ("thu nhập" thành "phim Nhật") và sai chữ số trong địa chỉ; lỗi xóa (như mất hư từ ngắn) không đổi. Trong mẫu này, nhận dạng vẫn dùng được cho câu lệnh ngắn nhưng độ tin cậy giảm. Luận văn không huấn luyện lại mô hình nhận dạng (mục 1.5.3).

## 6.6. Kết quả tính đúng chức năng (RQ4)

Bảng 6.7 là kết quả chấm thủ công một mẫu lượt trong nhật ký 05–06/09/2026 theo định nghĩa ở mục 6.3.

**Bảng 6.7.** Độ chính xác gọi công cụ và tỷ lệ hoàn thành nghiệp vụ (một người chấm, 43 lượt trong 13 phiên, nhật ký 05–06/09/2026)

| Kết quả chấm | Số lượt | Tỷ lệ |
|---|---|---|
| Đúng công cụ, hoàn thành ngay lần đầu | 32 | 74,4% |
| Đúng công cụ, hoàn thành sau khi tự sửa | 5 | 11,6% |
| Sai công cụ hoặc sai tham số | 6 | 14,0% |
| Tổng | 43 | 100% |

Tỷ lệ chọn đúng công cụ là 37/43 = 86,0% (khoảng tin cậy 95% Wilson: 72,7%–93,4%); hoàn thành đúng ngay lần đầu 32/43 = 74,4% (59,8%–85,1%). Do cỡ mẫu nhỏ, khoảng tin cậy còn rộng nên chưa thể so sánh giữa các nhóm nghiệp vụ; lượt sai tập trung ở gọi khách và tra cứu thu nhập (Bảng 6.8). Lỗi E-INTENT ở UC04 phát sinh từ nhánh rút gọn đã bị loại bỏ; kiểm thử test_spoken_intent xác nhận câu hỏi về cách gọi khách không còn kích hoạt công cụ gọi. Số liệu riêng cho UC03, UC05, UC06 cần đợt đánh giá có nhãn với ít nhất hai người chấm (mục 6.13).

**Bảng 6.8.** Phân loại lỗi quan sát trong mẫu chấm (43 lượt; một lượt có thể mang nhiều mã)

| Mã | Nhóm lỗi | Ví dụ | Khâu nghi ngờ | Số lần |
|---|---|---|---|---|
| E-INTENT | Nhận dạng đúng, chọn sai thao tác | Hỏi cách gọi khách thành lệnh gọi | Nhánh rút gọn (đã loại bỏ) | 4 |
| E-PARAM | Đúng công cụ, sai tham số | "Tháng vừa rồi" ra thu nhập hôm nay | Ngữ cảnh, LLM | 2 |
| E-UX | Hoàn thành nhưng khó nghe khi lái | Địa chỉ bị cắt; lời nhắn sai nghĩa | Lời nhắc, TTS | 3 |
| E-CONFIRM | Đáp lời nhưng chưa gọi công cụ | "Vâng" nhưng chỉ thực hiện khi hỏi lại | Hành động chờ xác nhận | 2 |
| E-STT | Nhận dạng sai tên riêng | "NexGen Speak" thành "Nick Jan Speed" | STT, nhiễu | 2 |
| E-API | Đúng công cụ nhưng API lỗi | Ngoài mẫu: SMS trả 503 ngày 06/09/2026 (Bảng 5.2) | Dịch vụ tin nhắn | 0 |

## 6.7. Kết quả tính khả dụng — NFR-01

Bảng 6.9 là danh mục kiểm tra hành vi khi lái dùng cho AC-14.

**Bảng 6.9.** Danh mục kiểm tra hành vi khi lái

| STT | Tiêu chí | UC | Kết quả |
|---|---|---|---|
| 1 | Nghiệp vụ cốt lõi không cần chạm màn hình | UC01–UC04 | Đạt (mẫu) |
| 2 | Một ý chính mỗi câu (trung vị 44 ký tự, 93% ≤ 120 ký tự, n = 2.638) | UC01, UC03 | Đạt |
| 3 | Thao tác rủi ro có xác nhận | UC05, UC06 | Đạt |
| 4 | Không nêu dữ liệu không nguồn | UC01, UC08 | Đạt (mẫu) |
| 5 | Im lặng được nhắc rồi kết thúc phiên | UC09 | Đạt |
| 6 | Câu báo lỗi không chứa thông tin kỹ thuật | UC04, UC09 | Không đạt (11/10/2026); đạt sau sửa (13/10/2026) |

"Đạt (mẫu)" ở Bảng 6.9 và Bảng 6.12 nghĩa là mới chỉ được kiểm tra trên các phiên mẫu. Ngày 11/10/2026, phần định lượng của AC-14 đạt (100% thao tác rủi ro có bước xác nhận) nhưng danh mục chỉ đạt 5/6, vì câu báo lỗi khi gọi khách thất bại chứa thông tin kỹ thuật ("Kiểm tra trip-service (:8002) và SIP_TRUNK_ID."). Lỗi nằm ở một chuỗi văn bản trong bốn công cụ gọi điện, không nằm ở kiến trúc; theo vòng lặp xây dựng – đánh giá (Peffers et al., 2007), chuỗi này được sửa thành "Bạn thử lại sau ít phút nhé.", kiểm tra bằng test_call_error_message và RS-04 (20/20); lần kiểm tra lại ngày 13/10/2026 đạt 6/6, nên AC-14 **đạt sau một vòng sửa**. Đây là danh mục kiểm tra thiết kế, chưa phải nghiên cứu người dùng (mục 6.13).

## 6.8. Kết quả khả năng mở rộng — NFR-03 (RQ1)

Khả năng mở rộng được đánh giá ở mức phiên hội thoại (SC-01, SC-02, Bảng 6.10): mỗi mức tải kéo dài 90 giây; SC-01 dùng một bản sao tác nhân với 1 đến 40 phiên, SC-02 dùng hai và bốn bản sao với 20 và 40 phiên.

Phép thử tải ở mức API nghiệp vụ (SC-03, ngày 11/10/2026) chỉ dùng để tham khảo và không dùng để xét AC-16. Dịch vụ Chuyến đi và Điều phối không có yêu cầu lỗi tới 100 người dùng ảo; ở 200 người dùng ảo, 7,95% yêu cầu lỗi, nhưng khi đó bộ giả lập cơ sở dữ liệu đã bão hòa trong khi dịch vụ chỉ dùng 19–28% một nhân CPU. Phép thử vì vậy không đo được giới hạn tải hay khả năng tự mở rộng của Lambda và DynamoDB; số liệu đầy đủ nằm trong kho mã nguồn.

**Bảng 6.10.** Phiên hội thoại đồng thời (ngày 13/10/2026, nhà cung cấp AI giả lập)

| Mã | Bản sao | Phiên | Được phục vụ | Lượt | Độ trễ P50 / P95 (s) | Vào phiên P50 / lớn nhất (s) | RAM đỉnh (MB) |
|---|---|---|---|---|---|---|---|
| SC-01 | 1 | 1 | 1/1 | 13 | 1,53 / 1,54 | 0,42 / 0,42 | 1.315 |
| SC-01 | 1 | 5 | 5/5 | 62 | 1,51 / 1,52 | 1,27 / 1,37 | 2.820 |
| SC-01 | 1 | 10 | 10/10 | 115 | 1,50 / 1,51 | 1,37 / 1,44 | 4.965 |
| SC-01 | 1 | 20 | 20/20 | 208 | 1,50 / 1,51 | 1,44 / 1,61 | 7.173 |
| SC-01 (mở rộng) | 1 | 40 | 40/40 | 337 | 1,50 / 1,51 | 1,53 / 1,80 | 10.139 |
| SC-02 | 2 | 20 | 20/20 | 221 | 1,50 / 1,51 | 0,89 / 1,53 | 8.599 |
| SC-02 | 2 | 40 | 40/40 | 394 | 1,50 / 1,51 | 1,22 / 1,90 | 11.375 |
| SC-02 | 4 | 20 | 20/20 | 229 | 1,50 / 1,51 | 0,48 / 1,51 | 10.062 |
| SC-02 | 4 | 40 | 40/40 | 419 | 1,50 / 1,51 | 0,47 / 1,77 | 13.309 |

P95 không tăng theo số phiên (1,54 giây ở 1 phiên, 1,51 giây từ 20 tới 40 phiên) và mọi phiên đều được phục vụ, nên AC-16 (P95 tăng không quá 20%, phiên lỗi dưới 1%) **đạt trong môi trường mô phỏng**. Thêm bản sao rút ngắn thời gian vào phiên (20 phiên: P50 từ 1,44 xuống 0,48 giây khi tăng từ 1 lên 4 bản sao) vì mỗi bản sao giữ sẵn một tiến trình chờ, phù hợp với chiến thuật nhiều bản sao của AC-16 (Bảng 3.8). Bộ nhớ là tài nguyên giới hạn chính: RAM tăng khoảng 225 MB mỗi phiên, còn CPU đỉnh của tác nhân chỉ tăng khoảng 9% một nhân mỗi phiên. Với tác vụ Fargate 1 vCPU, 2 GB (Bảng 5.5), một bản sao chỉ chứa được khoảng 4 phiên (1.315 MB + 3 × 225 MB ≈ 1.990 MB), tối đa khoảng 9 phiên nếu bỏ qua bộ nhớ nền (2.048 MB / 225 MB), nên việc tự mở rộng cần dựa trên bộ nhớ hoặc số phiên. Kết quả chưa phản ánh năng lực tải trên AWS (mục 6.13).

## 6.9. Kết quả khả năng phục hồi — NFR-04 (RQ1)

Bảng 6.11 tổng hợp kết quả tiêm lỗi (mục 6.2.2); mỗi kiểu lỗi lặp 20 lần (RS-05: 30; RS-03: 10). Một lượt "đạt" khi lỗi không lọt khỏi công cụ dưới dạng ngoại lệ và tác nhân báo thao tác không thực hiện được; với RS-01, khi việc ghi bản ghi thất bại không làm ngoại lệ lọt ra hội thoại; với RS-05, khi vẫn nhận được câu trả lời từ nhà cung cấp dự phòng.

**Bảng 6.11.** Kết quả tiêm lỗi (RS-01, RS-02, RS-04, RS-05 ngày 11/10/2026; RS-03 ngày 13/10/2026; KTC = khoảng tin cậy 95% Wilson)

| Mã | Lỗi được tiêm | Kỳ vọng | Lượt đạt (KTC) | Thời gian xử lý xong lỗi | Đạt |
|---|---|---|---|---|---|
| RS-01 | Nhật ký cuộc gọi từ chối kết nối | Phiên không ảnh hưởng | 20/20 (84–100%) | Trung vị 4,01 s (2 lần thử lại) | Đạt |
| RS-01 | Nhật ký cuộc gọi trả 503 | Như trên | 20/20 (84–100%) | Trung vị 4,02 s | Đạt |
| RS-02 | Dịch vụ nghiệp vụ trả 503 | Báo lỗi; phiên tiếp tục | 20/20 (84–100%) | < 0,01 s | Đạt |
| RS-02 | Dịch vụ nghiệp vụ treo | Như trên | 20/20 (84–100%) | Trung vị 8,01 s (chờ 8 s) | Đạt |
| RS-02 | Dịch vụ nghiệp vụ từ chối kết nối | Như trên | 20/20 (84–100%) | < 0,01 s | Đạt |
| RS-03 | SIGKILL bản sao đang có phiên (hai bản sao) | Bản sao khác phục vụ phiên mới | Mới 10/10 (72–100%); đang chạy 0/10 | Phiên mới được phục vụ sau trung vị 0,1 s, lớn nhất 0,4 s | Đạt một phần |
| RS-04 | Kênh tin nhắn trả lỗi | Báo không gửi được | 20/20 (84–100%) | < 0,01 s | Đạt |
| RS-04 | Khởi tạo cuộc gọi trả lỗi | Báo không gọi được | 20/20 (84–100%) | < 0,01 s | Đạt (lộ chi tiết kỹ thuật, mục 6.7) |
| RS-05 | LLM chính trả lỗi ngay | Chuyển dự phòng | 30/30 (89–100%) | Token đầu 1,05 s (cơ sở 1,00 s) | Đạt |
| RS-05 | LLM chính treo | Như trên | 30/30 (89–100%) | Token đầu 6,00 s (5 s chờ + 1 s dự phòng) | Đạt (vượt ngân sách) |

Trong 200 lượt tiêm lỗi mức thành phần, không lượt nào để ngoại lệ thoát ra luồng hội thoại; kết quả này xác nhận điểm không rủi ro NR-1 (Bảng 4.11) và khớp với lỗi thật ngày 06/09/2026, khi SMS trả 503 mà phiên vẫn tiếp tục (Bảng 5.2). Điểm cần cải thiện là khi gặp lỗi treo, tài xế phải chờ đến khi hết thời gian chờ (8 giây với API nghiệp vụ; 6 giây với LLM chính), vượt ngân sách 2 giây của NFR-02. Đây là hai điểm đánh đổi TP-2 và TP-3 ở Bảng 4.11: rút ngắn thời gian chờ sẽ tăng báo lỗi giả khi mạng chậm.

Ở RS-03 (hai bản sao), mỗi lượt dừng đột ngột bản sao đang phục vụ một phiên rồi mở ngay phiên mới; phiên mới luôn được bản sao còn lại phục vụ (Bảng 6.11). Ngược lại, phiên đang chạy trên bản sao bị dừng đều mất (0/10) vì LiveKit không tự giao lại phiên; đường khôi phục ở tầng ứng dụng (khi tài xế mở lại trợ lý, API cấp token phân công lại tác nhân; biểu đồ tuần tự S2, Bảng 4.8) chưa được đo đầu cuối. Trong một lượt bổ sung không còn bản sao nào, phiên mở trong lúc đó vẫn không được phục vụ trong 30 giây sau khi bản sao mới khởi động xong. Vì vậy hệ thống cần tối thiểu hai bản sao, và AC-17 với RS-03 **đạt một phần**.

## 6.10. Kết quả bảo mật — NFR-05

Bảng 6.12 là danh mục kiểm tra bảo mật dùng cho AC-18.

**Bảng 6.12.** Danh mục kiểm tra bảo mật

| STT | Kiểm tra | Kết quả |
|---|---|---|
| 1 | JWT đăng nhập chỉ do Dịch vụ Định danh phát hành | Đạt |
| 2 | Bí mật không nằm trong mã nguồn | Đạt |
| 3 | Nhật ký không chứa token, mật khẩu | Đạt |
| 4 | Nhật ký không chứa số điện thoại đầy đủ | Không đạt (11/10/2026); đạt sau sửa (13/10/2026) |
| 5 | Tác nhân không truy cập cơ sở dữ liệu (CON-01) | Đạt |
| 6 | Vị trí khách chỉ lấy từ dữ liệu chuyến | Đạt (mẫu) |

Ngày 11/10/2026, danh mục chỉ đạt 5/6 vì nhật ký ghi số điện thoại đầy đủ (2.352 lần trong 5/19 tệp nhật ký của tác nhân được quét và 10 lần trong nhật ký Dịch vụ Chuyến đi và Điều phối), nên AC-18 **không đạt**. Đây là lỗi hiện thực: chiến thuật giới hạn phơi lộ (Bảng 3.8) đã được chọn nhưng chưa được áp dụng ở tầng ghi nhật ký. Sau đó, số điện thoại được che ngay trong bộ định dạng nhật ký dùng chung của tác nhân và năm dịch vụ Node.js (0888123798 thành 0888xxx798), kiểm tra bằng test_log_phone_mask và verify:logger; lần kiểm tra lại ngày 13/10/2026 ghi nhận 0 số đầy đủ trong 5.335 dòng DEBUG, nên AC-18 **đạt sau một vòng sửa**. Sự kiện Twilio trong bảng channel-events vẫn chứa số điện thoại vì đây là dữ liệu nghiệp vụ, chỉ Dịch vụ Liên lạc bằng tin nhắn mới truy cập được (CON-02).

## 6.11. Kết quả luồng khách hàng, giám sát vận hành và sắp xếp điểm dừng

Bảng 6.13 là kết quả kiểm thử tự động dùng cho AC-10, AC-11 và AC-13; tên từng ca kiểm thử nằm trong tệp README.md của thư mục bằng chứng.

**Bảng 6.13.** Kết quả các trường hợp kiểm thử phía khách hàng và giám sát vận hành

| Nhóm | Nội dung kiểm tra | Kết quả |
|---|---|---|
| Gọi khách từ tài xế | Đúng chế độ; không quay số khi thiếu chuyến | Đạt |
| Tác nhân trao đổi với khách | Mở đầu đúng; không bịa giờ đến, giá; tóm tắt về tài xế | Đạt |
| Ghi nhận yêu cầu khách | Lưu yêu cầu chờ thêm, ghi chú; gửi tóm tắt | Đạt |
| Chỉ số phiên (FR-O01) | Độ trễ, câu đệm, công cụ, lỗi HTTP, dự phòng | Đạt |
| Báo cáo ngày (FR-O01) | Số phiên, độ trễ TB/P95, công cụ, API lỗi, mẫu chấm | Đạt |
| Báo cáo trên dữ liệu thật (FR-O01, FR-O02) | 5 ngày có dữ liệu (30/08–10/09/2026) từ nhật ký cuộc gọi | Đạt |
| Gửi SMS cho khách (FR-C03, FR-K03, AC-11) | Đúng nội dung, đúng khách; 09… thành +84…; báo lỗi khi thất bại | Đạt ở mức kiểm thử |
| Truy vấn bản ghi theo ngày | Quy đổi giờ Việt Nam, biên ngày UTC | Đạt |

Ở lần chạy ngày 15/11/2026, tác nhân đạt 733/733 ca kiểm thử đơn vị. Bài đánh giá chọn công cụ với mô hình thật (25/10/2026) đạt 276/276 lượt (23 câu × 12 lần); các lần chạy trước đã giúp sửa hai lỗi về thứ tự công cụ và giá trị mặc định của tham số. Lớp chặn gọi khách (7 tình huống × 3 lần) đúng 20/21 lượt: không câu mơ hồ nào tạo cuộc gọi, lượt sai duy nhất là hỏi lại một yêu cầu đã rõ. Luồng khách hàng hoạt động đúng trong phạm vi kiểm thử, nhưng các kết quả này không cho biết mức hài lòng của khách hàng thật.

**Chất lượng sắp xếp thứ tự ghé điểm dừng (FR-T07).** Heuristic láng giềng gần nhất kết hợp 2-opt (mục 5.4.4) được so với lời giải tối ưu bằng vét cạn, cùng ràng buộc đón trước, trả sau, trên 600 bộ dữ liệu (200 bộ cho mỗi cỡ 2, 3, 4 chuyến) sinh ngẫu nhiên trong khung 15 km × 15 km quanh trung tâm TP.HCM; chi phí là khoảng cách đường chim bay × 1,3, đường cơ sở là thứ tự "theo danh sách".

**Bảng 6.14.** Chất lượng sắp xếp thứ tự ghé so với lời giải tối ưu (ngày 13/10/2026, 200 bộ dữ liệu mỗi dòng)

| Số chuyến (điểm dừng) | Đúng lời giải tối ưu | Chênh lệch TB | Chênh lệch lớn nhất | Theo danh sách: chênh lệch TB | Thời gian tính TB |
|---|---|---|---|---|---|
| 2 (4) | 171/200 (85,5%) | 1,2% | 46,7% | 22,9% | 0,004 ms |
| 3 (6) | 108/200 (54,0%) | 3,7% | 37,6% | 41,3% | 0,004 ms |
| 4 (8) | 80/200 (40,0%) | 6,3% | 49,5% | 62,2% | 0,007 ms |

Không bộ nào vi phạm ràng buộc đón trước, trả sau. Một số ít trường hợp dài hơn tối ưu tới khoảng 50% do kẹt ở cực tiểu địa phương; với tối đa 8 điểm dừng, có thể dùng vét cạn (vài mili-giây). Thời gian đến trên đường thật chưa được đo.

## 6.12. Tổng hợp và thảo luận theo câu hỏi nghiên cứu

Bảng 6.15 tổng hợp kết quả theo từng tiêu chí chấp nhận.

**Bảng 6.15.** Tổng hợp kết quả theo tiêu chí chấp nhận

| Yêu cầu | Tiêu chí | Kết quả chính | Trạng thái |
|---|---|---|---|
| NFR-02 Hiệu năng | AC-15 | P50 1,83 s, P95 2,58 s (n = 120); 72,5% lượt ≤ 2 s; chờ kết quả cuối của STT và token đầu của LLM mỗi chặng ≈ 1 s | Không đạt |
| Nhận dạng giọng nói | AC-19 | WER 3,1% (yên tĩnh), 7,3% (nhiễu); 1 người đọc, 22 câu | Đã đo (mẫu nhỏ) |
| FR của tài xế | AC-01–AC-08 | Đúng công cụ 37/43 (86,0%; KTC 72,7–93,4%); hoàn thành ngay 32/43 (74,4%; 59,8–85,1%) | Đã đo (mẫu nhỏ) |
| NFR-01 Tính khả dụng | AC-14 | 100% thao tác rủi ro có xác nhận; danh mục 5/6, sau sửa 6/6 | Đạt sau một vòng sửa |
| NFR-03 Khả năng mở rộng | AC-16 | P95 1,54 s (1 phiên), 1,51 s (20 phiên); 100% phiên được phục vụ tới 40 phiên; RAM ≈ 225 MB/phiên | Đạt (môi trường mô phỏng) |
| NFR-04 Khả năng phục hồi | AC-17 | 200/200 lượt mức thành phần; lỗi treo chậm 6–8 s; RS-03: phiên mới 10/10, phiên đang chạy mất | Đạt mức thành phần; một phần khi dừng bản sao |
| NFR-05 Bảo mật | AC-18 | 5/6 (nhật ký có số điện thoại); 6/6 sau khi che số | Đạt sau một vòng sửa |
| Luồng khách hàng (FR-K) | AC-10, AC-11 | Kiểm thử gọi khách, SMS đạt (Bảng 6.13); SMS chưa tới thuê bao Việt Nam (mục 6.13) | Đạt ở mức kiểm thử |
| FR-O01, FR-O02 | AC-13 | Kiểm thử đạt; báo cáo dựng được trên dữ liệu thật của 5 ngày (giao diện minh họa ở Hình C.21) | Đạt |
| FR-A01, FR-Q02 | AC-09, AC-12 | Kiểm thử chức năng trên thiết bị thật do tác giả thực hiện: nói từ khóa đánh thức thì phiên được mở như khi bấm nút; tài xế nhận được lời mời của điều phối viên (mục 5.5, Hình 4.5). Chưa đo tỷ lệ đánh thức đúng và đánh thức nhầm | Đạt (kiểm thử trên thiết bị thật) |
| FR-T07 Sắp xếp thứ tự ghé | Bổ sung | Dài hơn tối ưu 1,2–6,3%; theo danh sách 22,9–62,2% (Bảng 6.14) | Đã đo (mô phỏng) |

**RQ1 – Kiến trúc microservices có đáp ứng khả năng mở rộng và khả năng phục hồi không?** Có, ở mức thành phần và trong môi trường mô phỏng: 200/200 lượt tiêm lỗi không làm hỏng luồng hội thoại và P95 không tăng khi số phiên tăng từ 1 lên 40 (Bảng 6.10, Bảng 6.11). Giới hạn là phiên đang chạy bị mất khi bản sao bị dừng, lỗi treo kéo dài 6–8 giây, và kết quả chưa được kiểm chứng trên AWS với nhà cung cấp AI thật.

**RQ2 – Độ trễ phản hồi đạt mức nào và thành phần nào chi phối?** Trên 120 lượt của thiết kế hiện hành, P50 là 1,83 giây và P95 là 2,58 giây, không đạt ngưỡng 2 giây; 72,5% số lượt nằm trong ngưỡng (Bảng 6.3). Độ trễ do hai chặng chi phối với mức gần bằng nhau: phát hiện kết thúc phát ngôn (P50 0,95 giây) và token đầu của LLM (P50 1,04 giây) (Bảng 6.4). Cả hai đều thuộc nhà cung cấp AI bên ngoài: chặng thứ nhất gần như toàn bộ là thời gian STT trả kết quả cuối của câu, chặng thứ hai là thời gian của LLM (điểm nhạy SP-1, SP-2, rủi ro R-1, Bảng 4.11). Cách chia dịch vụ không phải là nguyên nhân: với nhà cung cấp AI giả lập, độ trễ không đổi khi số phiên tăng (Bảng 6.10).

**RQ3 – Tỷ lệ lỗi từ thay đổi thế nào khi có nhiễu?** Tăng từ 3,1% lên 7,3%, do lỗi chèn và thay thế tăng (mục 6.5); với một người đọc và 22 câu, đây chỉ là xu hướng.

**RQ4 – Tỷ lệ chọn đúng công cụ và tỷ lệ hoàn thành nghiệp vụ là bao nhiêu, lỗi nào phổ biến?** 86,0% đúng công cụ và 74,4% hoàn thành ngay lần đầu trên 43 lượt, khoảng tin cậy còn rộng do cỡ mẫu nhỏ; lỗi chính là chọn sai thao tác (E-INTENT, từ nhánh rút gọn đã loại bỏ), sai tham số (E-PARAM) và đáp lời nhưng chưa thực hiện (E-CONFIRM) (Bảng 6.8). Kết quả tương đồng với nhận định của Yao et al. (2024) rằng tác nhân gọi công cụ còn thiếu ổn định, và củng cố quyết định xác nhận hai bước cho thao tác có rủi ro.

**Đối chiếu với các benchmark đã công bố.** Bảng 6.16 đặt kết quả cạnh các bộ đo chuẩn ở mục 2.9.1 chỉ để định vị, vì khác nhiệm vụ, ngôn ngữ, cỡ mẫu và cách tính.

**Bảng 6.16.** Định vị kết quả của luận văn so với các benchmark đã công bố

| Khía cạnh | Luận văn | Benchmark công bố | Khác biệt cần lưu ý |
|---|---|---|---|
| Hoàn thành nghiệp vụ | 74,4% hoàn thành ngay; 86,0% đúng công cụ (43 lượt) | τ-bench: GPT-4o hoàn thành dưới 50% nhiệm vụ; pass^8 dưới 25% ở miền bán lẻ (Yao et al., 2024) | τ-bench tính theo nhiệm vụ nhiều lượt; luận văn theo lượt |
| Chọn công cụ đơn lượt | 276/276 (23 câu × 12 lần) | BFCL: mô hình mạnh tốt ở đơn lượt, yếu ở nhiều bước (Patil et al., 2025) | Câu đơn lẻ, công cụ chỉ đọc |
| Độ trễ phản hồi | P50 1,83 giây; P95 2,58 giây | Moshi: 160 ms lý thuyết, 200 ms thực tế (Défossez et al., 2024); chuyển lượt tự nhiên 0–200 ms (Stivers et al., 2009) | Moshi song công, không gọi công cụ |
| Tỷ lệ lỗi từ tiếng Việt | 3,1% (yên tĩnh); 7,3% (nhiễu) | Whisper large-v2 trên FLEURS tiếng Việt: 10,3% (Radford et al., 2023) | FLEURS đa chủ đề; luận văn 22 câu ngắn, đúng miền, 1 người đọc |

Tỷ lệ hoàn thành cao hơn τ-bench một phần vì tính theo lượt; ở nhiệm vụ nhiều bước, lỗi E-CONFIRM và E-PARAM sẽ cộng dồn. Độ trễ của chuỗi xử lý theo tầng cao hơn mô hình song công khoảng một bậc độ lớn (P50 1,83 giây so với khoảng 0,2 giây); đó là đánh đổi của chuỗi theo tầng để thay được từng khâu xử lý (mục 2.9.1). Việc WER thấp hơn Whisper trên FLEURS chưa đủ để kết luận khâu nhận dạng tốt hơn.

## 6.13. Mối đe dọa đối với độ tin cậy của kết quả

Các hạn chế được phân tích theo bốn loại mối đe dọa của Wohlin et al. (2012), kèm biện pháp đã áp dụng và rủi ro còn lại.

**Độ tin cậy nội tại (internal validity).** Số liệu độ trễ lấy từ 120 lượt trong một ngày, với một tài khoản thử nghiệm, một máy và một đường mạng. Trong lần chạy đầu của ngày 15/11/2026, đồng hồ đo của tác nhân có lỗi: ở các lượt mà công cụ tự đọc kết quả, mã nguồn bấm giờ lại ngay trước khi nói, nên nhật ký ghi khoảng 0,2 giây thay cho thời gian chờ thật và P95 lệch thấp (2,23 giây). Lỗi được sửa trong cùng ngày, đợt đo được chạy lại, và Bảng 6.3 chỉ dùng số liệu sau khi sửa; số liệu của lần chạy đầu được giữ trong kho mã nguồn để đối chiếu. Đợt đo 05–06/09/2026 có thể đã chịu cùng lỗi này ở các lượt tương tự, nhưng nhật ký gốc không còn nên không kiểm tra lại được; vì vậy Bảng 6.5 chỉ dùng để tham khảo. Độ chính xác gọi công cụ do một người chấm (biết trước kết quả mong đợi) đánh giá theo tiêu chí đã cố định từ trước; rủi ro còn lại là thiên lệch người chấm. Bảng chấm chi tiết thiếu dòng của một trong 13 phiên (mất khi chép sang tệp chấm); các lượt của phiên này chỉ còn được tính trong tổng 43 lượt. Đợt đánh giá sau cần ít nhất hai người chấm độc lập và hệ số đồng thuận giữa họ.

**Độ tin cậy bên ngoài (external validity).** Thử tải và tiêm lỗi chạy trên một máy với nhà cung cấp AI giả lập; khởi động nguội của Lambda, giới hạn của API Gateway, việc tăng bản sao trên Fargate và giới hạn tốc độ của nhà cung cấp AI thật chưa được quan sát (mục 5.6.1). Kết quả gắn với cấu hình STT, LLM, TTS lúc đo (Phụ lục D), và nhiễu mô phỏng không đại diện cho mọi khoang xe. Đợt đo độ trễ dùng giọng máy, phát âm rõ và đều hơn người thật, và chỉ gồm câu tra cứu, hỏi đáp; độ trễ của các lượt gọi điện, gửi SMS hay đổi trạng thái chuyến, cũng như của người nói thật trong khoang xe, chưa được đo trên thiết kế hiện hành. SMS mới được kiểm tra với Twilio giả lập: nhà mạng Việt Nam chỉ nhận SMS quốc tế từ tên người gửi và mẫu tin đã đăng ký (Twilio, n.d.), và phép thử gửi thật ngày 12/10/2026 bị từ chối với mã lỗi 21612, nên AC-11 chỉ được đánh giá ở mức kiểm thử. Hội thoại tiếng Anh mới được hỗ trợ ở mức chức năng, chưa đo độ chính xác hay độ trễ. Các dịch vụ được đo khi chạy cục bộ trên Node.js 26.10, trong khi cấu hình Lambda dùng môi trường nodejs20.x (Bảng 5.1), nên hiệu năng trên AWS có thể khác.

**Độ tin cậy cấu trúc (construct validity).** Độ trễ phản hồi đo trải nghiệm hội thoại, không đo an toàn giao thông thực địa (mục 2.9.1). Chỉ số của AC-15 bắt đầu tính từ lúc tác nhân nhận biết tài xế dứt lời nên thấp hơn khoảng chờ tài xế thật sự cảm nhận; số đo từ phía máy khách (chỉ số C, Bảng 6.3) cao hơn khoảng 1,1 giây ở trung vị. Ngoài ra, danh mục hành vi khi lái (Bảng 6.9) đo việc thiết kế tuân thủ nguyên tắc, không thay thế nghiên cứu người dùng. Các webhook nhận sự kiện từ Twilio (mục 5.4.3) chưa kiểm tra chữ ký X-Twilio-Signature, nên sự kiện giả mạo có thể lọt vào bảng channel-events; Bảng 6.12 không đo được rủi ro này vì dùng Twilio giả lập.

**Độ tin cậy của kết luận (conclusion validity).** Mỗi mức thử tải và đợt đo độ trễ chỉ chạy một lần nên chưa ước lượng được độ biến thiên giữa các lần chạy. Với cỡ mẫu nhỏ (22 câu; 43 lượt chấm), luận văn báo cáo khoảng tin cậy, ghi "mẫu nhỏ" và không khẳng định khác biệt khi khoảng tin cậy chồng lấn. Script và quy tắc xử lý dữ liệu ở Phụ lục E.

## Kết luận chương

Cả 19 tiêu chí chấp nhận (Bảng 6.15) đều đã được đánh giá; AC-09 (từ khóa đánh thức) và AC-12 (điều phối viên mời tài xế) đạt khi kiểm thử chức năng trên thiết bị thật, chưa có số đo định lượng về tỷ lệ đánh thức đúng và đánh thức nhầm. Khả năng phục hồi và khả năng mở rộng đạt ở mức thành phần, trong môi trường mô phỏng; hai lỗi hiện thực về tính khả dụng và bảo mật nhật ký đã được sửa và đạt khi kiểm tra lại. Kết quả không đạt duy nhất còn lại là độ trễ phản hồi (P95 = 2,58 giây so với ngưỡng 2 giây, AC-15); ngoài ra, RS-03 chỉ đạt một phần (mất phiên đang chạy khi bản sao bị dừng) và AC-11 mới đạt ở mức kiểm thử.
