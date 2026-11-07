# Chương 6. Thực nghiệm và đánh giá

Chương này đánh giá nguyên mẫu của Chương 5 theo từng yêu cầu ở Chương 3 và trả lời bốn câu hỏi nghiên cứu RQ1–RQ4. Mỗi yêu cầu được xét theo tiêu chí chấp nhận Given – When – Then đã cố định trước (Bảng 3.8). Chương trình bày ma trận đánh giá, môi trường, định nghĩa chỉ số, kết quả theo từng yêu cầu, thảo luận theo câu hỏi nghiên cứu và các mối đe dọa đối với độ tin cậy.

## 6.1. Mục tiêu và ma trận đánh giá

Bảng 6.1 liên kết từng yêu cầu với câu hỏi nghiên cứu, tiêu chí chấp nhận, kịch bản, chỉ số, ngưỡng và mục trình bày kết quả. Ngoài phạm vi đánh giá: khảo sát khách hàng thật, đo an toàn giao thông thực địa, so sánh quy mô lớn giữa các nhà cung cấp STT, LLM, TTS và thử tải trên hạ tầng AWS thực tế.

**Bảng 6.1.** Ma trận đánh giá theo yêu cầu

| Yêu cầu | RQ | Tiêu chí | Kịch bản | Chỉ số | Ngưỡng | Mục |
|---|---|---|---|---|---|---|
| NFR-02 Hiệu năng | RQ2 | AC-15 | Phiên UC01, UC03, UC04, UC07 | P50, P95 độ trễ phản hồi | P95 ≤ 2 giây | 6.4 |
| Nhận dạng giọng nói | RQ3 | AC-19 | 22 câu, hai điều kiện âm thanh | Tỷ lệ lỗi từ | So sánh tương đối | 6.5 |
| FR-T, FR-C, FR-E, FR-F | RQ4 | AC-01–AC-08 | UC01–UC08 | Đúng công cụ; hoàn thành nghiệp vụ | Báo cáo theo nhóm | 6.6 |
| NFR-01 Tính khả dụng | RQ4 | AC-14 | UC01–UC06, UC09 | Danh mục hành vi khi lái | 100% thao tác rủi ro có xác nhận | 6.7 |
| NFR-03 Khả năng mở rộng | RQ1 | AC-16 | SC-01, SC-02, SC-03 | P95, tỷ lệ lỗi theo số phiên | P95 tăng ≤ 20%; lỗi < 1% | 6.8 |
| NFR-04 Khả năng phục hồi | RQ1 | AC-17 | RS-01–RS-05 | Tỷ lệ phiên duy trì; thời gian khôi phục | 100% phiên duy trì | 6.9 |
| NFR-05 Bảo mật | Tuân thủ | AC-18 | Mã nguồn, cấu hình, nhật ký | Danh mục bảo mật | 100% mục đạt | 6.10 |
| Luồng khách hàng (FR-K) | RQ4 | AC-10, AC-11 | Kiểm thử khách hàng | Tỷ lệ ca đạt | Đạt / không đạt | 6.11 |
| FR-T07 Sắp xếp thứ tự ghé | RQ4 | Bổ sung | 600 bộ điểm dừng mô phỏng | Chênh lệch so với tối ưu | Báo cáo | 6.11 |
| FR-O01, FR-O02 | Tuân thủ | AC-13 | Kiểm thử chỉ số phiên, báo cáo ngày | Tỷ lệ ca đạt | Đạt / không đạt | 6.11 |

## 6.2. Môi trường thực nghiệm

Số liệu lấy từ ba nguồn: nhật ký phiên hội thoại thật trên nguyên mẫu trong hai ngày 05 và 06/09/2026, bộ kiểm thử tự động của các dịch vụ, và các thí nghiệm có kiểm soát trên môi trường mô phỏng cục bộ. Mọi phiên dùng tài khoản và chuyến thử nghiệm nội bộ, người đọc kịch bản là tác giả, số điện thoại được che và nhật ký thô chỉ lưu trên máy phát triển.

### 6.2.1. Môi trường đo hội thoại

Bảng 6.2 mô tả môi trường đo độ trễ, tỷ lệ lỗi từ và độ chính xác gọi công cụ. Độ trễ được trích từ nhật ký turn_metrics của tác nhân (n = 341 lượt, kênh WebRTC trong ứng dụng) bằng script extract_ch6_metrics.py; gpt-5.6-luna là tên mô hình họ GPT trong cấu hình dự án.

**Bảng 6.2.** Môi trường đo hội thoại

| Thành phần | Cấu hình |
|---|---|
| Ứng dụng tài xế | Thiết bị thật hoặc trình giả lập |
| Dịch vụ Liên lạc hội thoại thời gian thực | Chạy cục bộ, kết nối LiveKit Cloud |
| Dịch vụ backend | Định danh, Chuyến đi và Điều phối chạy cục bộ (Phụ lục D) |
| Truyền thông | LiveKit Cloud, WebRTC; SIP qua Twilio cho UC02, UC04 |
| Mô hình AI | LLM gpt-5.6-luna; STT Google chirp_3 (vi-VN); TTS Google vi-VN-Chirp3-HD-Kore |
| Dữ liệu, kiểm thử | Tài khoản thử nghiệm nội bộ; pytest của tác nhân |

### 6.2.2. Môi trường mô phỏng thử tải và tiêm lỗi

Khả năng mở rộng và khả năng phục hồi được đánh giá trên một máy phát triển (Apple M4 Pro 14 nhân, 48 GB RAM, Node.js 26.10, k6 2.3) trong môi trường cô lập. Mỗi thành phần bên ngoài được thay bằng bộ giả lập: DynamoDB bằng moto với 200 tài xế × 3 chuyến (SC-03); dịch vụ nghiệp vụ và Nhật ký cuộc gọi bằng máy chủ tiêm lỗi trả 503, treo hoặc từ chối kết nối (RS-01, RS-02, RS-04); nhà cung cấp LLM bằng bộ giả lập cấu hình được lỗi với attempt_timeout 5 s (RS-05); LiveKit Cloud bằng LiveKit mã nguồn mở 1.13.9 trong Docker với 1, 2 hoặc 4 tiến trình tác nhân thật; STT, LLM, TTS bằng giả lập tương thích OpenAI có độ trễ cố định 0,3 s, 0,8 s và 0,2 s, tài xế được thay bằng lk perf agent-load-test (SC-01, SC-02, RS-03). Nhờ độ trễ giả lập cố định, mọi thay đổi độ trễ theo số phiên đều do kiến trúc; script và lệnh chạy ở Phụ lục E.

## 6.3. Định nghĩa chỉ số

**Độ trễ phản hồi** là thời gian từ lúc tài xế kết thúc phát ngôn đến lúc tác nhân bắt đầu phát âm thanh trả lời, báo cáo P50 và P95; các mốc phụ (phát hiện kết thúc phát ngôn, token đầu của LLM, âm thanh đầu của TTS) dùng để phân tích điểm nghẽn. **Tỷ lệ lỗi từ** WER = (S + D + I) / N, với S, D, I là số từ bị thay thế, xóa, chèn so với câu tham chiếu có N từ. **Độ chính xác gọi công cụ**: một lượt đúng khi tên công cụ thuộc tập kỳ vọng, tham số chính đúng và không có lời gọi gây sai nghiệp vụ. **Tỷ lệ hoàn thành nghiệp vụ**: một trường hợp sử dụng hoàn thành khi đạt kết quả ở cột Then của tiêu chí chấp nhận tương ứng (Bảng 3.8), xét theo trạng thái dữ liệu backend; câu trả lời trôi chảy nhưng dữ liệu không thay đổi đúng vẫn tính là không hoàn thành. **Chỉ số khả năng mở rộng** là mức tăng tương đối của P95 và tỷ lệ phiên lỗi khi tăng số phiên đồng thời. **Chỉ số khả năng phục hồi** là tỷ lệ phiên không kết thúc bất thường khi tiêm lỗi và thời gian từ khi bản sao bị dừng đến khi phiên mới được phục vụ.

Quy tắc xử lý dữ liệu cố định trước: độ trễ và độ chính xác tính theo lượt, tỷ lệ lỗi từ gộp theo tổng số từ, tỷ lệ hoàn thành tính theo trường hợp sử dụng; loại các lượt không do người dùng nói nhưng không loại giá trị ngoại lai; phân vị nội suy tuyến tính; tỷ lệ kèm khoảng tin cậy 95% Wilson, P95 thử tải không kèm khoảng tin cậy vì mỗi mức chỉ chạy một lần; một tiêu chí "đạt" khi giá trị đo thỏa ngưỡng ở Bảng 3.8, ghi kèm "mẫu nhỏ" khi cỡ mẫu nhỏ hơn dự kiến.

## 6.4. Kết quả hiệu năng — NFR-02 (RQ2)

Số liệu thuộc đợt đo 05–06/09/2026, khi nguyên mẫu còn nhánh xử lý rút gọn theo ý định (Bảng 6.3). Nhánh này đã bị loại bỏ theo ADR-02 (mục 4.2.2), nhưng số liệu của nó cho thấy thời gian sinh token đầu của LLM là điểm nghẽn chính (Bảng 6.4). Nhánh được gán theo việc mô-đun nhận dạng ý định có kích hoạt hay không (cách gán xấp xỉ, mục 6.13).

**Bảng 6.3.** Độ trễ phản hồi theo nhánh xử lý (giây, nhật ký 05–06/09/2026, gpt-5.6-luna)

| Nhánh xử lý | n | P50 | P90 | P95 | Lượt ≥ 2 giây | P95 ≤ 2 giây |
|---|---|---|---|---|---|---|
| Rút gọn theo ý định (không qua LLM) | 167 | 0,21 | 1,48 | 2,00 | 5,4% | Đạt (sát ngưỡng) |
| Luồng đầy đủ qua LLM | 174 | 1,54 | 2,78 | 3,75 | 30,5% | Không đạt |
| Toàn bộ lượt | 341 | 0,50 | 2,29 | 2,87 | 18,2% | Không đạt |

**Bảng 6.4.** Phân tích điểm nghẽn độ trễ trong một lượt (mili-giây)

| Chặng | P50 | P95 | Nhận xét |
|---|---|---|---|
| Phát hiện kết thúc phát ngôn | 935 | 1.700 | Phụ thuộc mô hình phát hiện lượt |
| LLM sinh token đầu | 1.249 | 2.487 | Chi phí lớn nhất |
| TTS đến âm thanh đầu | 161 | 288 | Không đáng kể |

![Biểu đồ P50 P95 độ trễ theo nhánh xử lý|h=8](thesis_screenshots/H6_1_latency.png)

**Hình 6.1.** P50 và P95 độ trễ phản hồi theo nhánh xử lý, đợt đo 05–06/09/2026 (n = 341 lượt)

Nhánh rút gọn đạt ngưỡng sát biên; luồng đầy đủ qua LLM không đạt, nguyên nhân chính là thời gian sinh token đầu (P95 ≈ 2,5 giây). Trong thiết kế hiện hành mọi lượt đều qua LLM, nên câu đệm sau 2 giây báo hiệu hệ thống đang xử lý. Bảng 6.5 ghi bốn lượt còn lưu của thiết kế hiện hành: token đầu vẫn cùng khoảng với đợt đo trước, nhưng cần ít nhất 200 lượt để kết luận AC-15 cho thiết kế này.

**Bảng 6.5.** Độ trễ phản hồi trên thiết kế hiện hành (nhật ký ngày 11/10/2026)

| Nguồn | n | Độ trễ từng lượt (giây) | Lượt vượt 2 giây | Token đầu (giây) | Kết luận |
|---|---|---|---|---|---|
| Phiên trong ứng dụng, mọi lượt qua LLM, có câu đệm | 4 | 0,18; 0,50; 1,73; 2,49 | 1/4 | 0,99–2,23 | Chưa đủ mẫu để tính P95 |

## 6.5. Kết quả nhận dạng giọng nói (RQ3)

Cùng một bộ 22 câu (tra cứu chuyến, xác nhận, gọi và nhắn tin cho khách, địa chỉ có số nhà, mốc giờ) được đọc một lượt ở mỗi điều kiện, cùng thiết bị và micro. Ở điều kiện B, tiếng ồn khoang xe phát từ một thiết bị khác để bộ khử tiếng vọng không lọc mất. Văn bản nhận dạng lấy từ sự kiện stt_final, chuẩn hóa chữ số và dấu câu rồi so sánh bằng script compute_wer.py.

**Bảng 6.6.** Tỷ lệ lỗi từ theo điều kiện âm thanh (một người đọc, một lượt mỗi điều kiện)

| Điều kiện | Số câu / số từ | S / D / I | WER |
|---|---|---|---|
| A — Yên tĩnh | 22 / 192 | 1 / 5 / 0 | 3,1% |
| B — Nhiễu mô phỏng khoang xe | 22 / 192 | 3 / 5 / 6 | 7,3% |
| Chênh lệch B − A | Cùng bộ câu | +2 / 0 / +6 | +4,2 điểm phần trăm |

![Biểu đồ WER điều kiện A và B|h=8](thesis_screenshots/H6_2_wer.png)

**Hình 6.2.** Tỷ lệ lỗi từ ở điều kiện yên tĩnh và điều kiện nhiễu mô phỏng khoang xe

Tỷ lệ lỗi từ tăng hơn gấp đôi khi có nhiễu, với lỗi thay từ mang nghĩa ("thu nhập" thành "phim Nhật"), sai chữ số trong địa chỉ và mất hư từ ngắn. Nhận dạng vẫn dùng được cho câu lệnh ngắn nhưng độ tin cậy giảm; luận văn không huấn luyện lại mô hình (mục 1.5.3).

## 6.6. Kết quả tính đúng chức năng (RQ4)

**Bảng 6.7.** Độ chính xác gọi công cụ và tỷ lệ hoàn thành nghiệp vụ (một người chấm, 43 lượt trong 13 phiên, nhật ký 05–06/09/2026)

| Kết quả chấm | Số lượt | Tỷ lệ |
|---|---|---|
| Đúng công cụ, hoàn thành đúng ngay lần đầu | 32 | 74,4% |
| Đúng công cụ, hoàn thành sau khi trợ lý tự sửa | 5 | 11,6% |
| Sai công cụ hoặc sai tham số | 6 | 14,0% |
| Tổng | 43 | 100% |

Tỷ lệ chọn đúng công cụ là 37/43 = 86,0% (khoảng tin cậy 95% Wilson: 72,7%–93,4%); tỷ lệ hoàn thành đúng ngay lần đầu là 32/43 = 74,4% (59,8%–85,1%). Khoảng tin cậy rộng nên chưa so sánh được giữa các nhóm nghiệp vụ; lượt sai tập trung ở gọi khách và thu nhập (Bảng 6.8). Lỗi E-INTENT ở UC04 phát sinh từ nhánh rút gọn đã bị loại bỏ, và kiểm thử test_spoken_intent xác nhận câu hỏi cách gọi khách không còn kích hoạt công cụ gọi; UC03, UC05, UC06 cần một đợt đánh giá với ít nhất hai người chấm.

**Bảng 6.8.** Phân loại lỗi quan sát trong mẫu chấm (43 lượt; một lượt có thể mang nhiều mã)

| Mã | Nhóm lỗi | Ví dụ | Khâu nghi ngờ | Số lần |
|---|---|---|---|---|
| E-INTENT | Nhận dạng đúng, chọn sai thao tác | Hỏi cách gọi khách thành lệnh gọi | Nhánh rút gọn (đã loại bỏ) | 4 |
| E-PARAM | Đúng công cụ, sai tham số | "Tháng vừa rồi" trả về thu nhập hôm nay | Ngữ cảnh, LLM | 2 |
| E-UX | Hoàn thành nhưng câu nói khó nghe khi lái | Địa chỉ bị cắt; lời nhắn sai nghĩa | Lời nhắc hệ thống, TTS | 3 |
| E-CONFIRM | Đáp lời nhưng chưa gọi công cụ | "Vâng" nhưng không thực hiện tới khi hỏi lại | Hành động chờ xác nhận | 2 |
| E-STT | Nhận dạng sai tên riêng | "NexGen Speak" thành "Nick Jan Speed" | STT, nhiễu | 2 |
| E-API | Đúng công cụ nhưng API lỗi | Không có trong mẫu; một lần ngày 06/09/2026, SMS trả 503 (Bảng 5.2) | Dịch vụ tin nhắn | 0 |

## 6.7. Kết quả tính khả dụng — NFR-01

**Bảng 6.9.** Danh mục kiểm tra hành vi khi lái

| STT | Tiêu chí | UC | Kết quả |
|---|---|---|---|
| 1 | Nghiệp vụ cốt lõi không cần chạm màn hình | UC01–UC04 | Đạt (mẫu) |
| 2 | Mỗi câu trả lời một ý chính (trung vị 44 ký tự, 93% ≤ 120 ký tự, n = 2.638) | UC01, UC03 | Đạt |
| 3 | Thao tác rủi ro có bước xác nhận | UC05, UC06 | Đạt |
| 4 | Không đưa ra dữ liệu không có nguồn | UC01, UC08 | Đạt (mẫu) |
| 5 | Im lặng được nhắc rồi kết thúc phiên | UC09 | Đạt |
| 6 | Câu báo lỗi không chứa thông tin kỹ thuật | UC04, UC09 | Không đạt (11/10/2026); đạt sau khi sửa (13/10/2026) |

Ở lần đánh giá ngày 11/10/2026, phần định lượng của AC-14 đạt (100% thao tác rủi ro có bước xác nhận) nhưng danh mục chỉ đạt 5/6 vì câu báo lỗi khi gọi khách thất bại chứa thông tin kỹ thuật ("Kiểm tra trip-service (:8002) và SIP_TRUNK_ID."); lỗi nằm ở một chuỗi văn bản trong bốn công cụ gọi điện, không ở kiến trúc. Theo vòng lặp xây dựng – đánh giá của nghiên cứu khoa học thiết kế (Peffers et al., 2007), lỗi được sửa ("Bạn thử lại sau ít phút nhé.", kiểm bằng test_call_error_message và RS-04 20/20) và kiểm tra lại ngày 13/10/2026 đạt 6/6, nên AC-14 **đạt sau một vòng sửa**. Kết luận chỉ có phạm vi của danh mục kiểm tra thiết kế, chưa phải nghiên cứu người dùng (mục 6.13).

## 6.8. Kết quả khả năng mở rộng — NFR-03 (RQ1)

**Bảng 6.10.** Kết quả thử tải SC-03 (ngày 11/10/2026; mỗi người dùng ảo lặp đọc ngữ cảnh rồi cập nhật trạng thái chuyến trong 45 giây)

| Người dùng ảo | Số yêu cầu | Thông lượng (yêu cầu/giây) | API ngữ cảnh P50 / P95 (ms) | API cập nhật chuyến P50 / P95 (ms) | Yêu cầu lỗi |
|---|---|---|---|---|---|
| 10 | 5.040 | 112 | 123 / 177 | 51 / 92 | 0% |
| 50 | 4.800 | 105 | 350 / 437 | 488 / 1.221 | 0% |
| 100 | 9.200 | 203 | 703 / 796 | 259 / 392 | 0% |
| 200 | 9.764 | 212 | 1.351 / 1.577 | 627 / 1.053 | 7,95% |

Mỗi mức tải chạy một lần sau khi môi trường ổn định; hai lần chạy đầu bị loại vì bộ giả lập cơ sở dữ liệu đóng kết nối sau mỗi yêu cầu, làm cạn cổng mạng tạm thời và sinh lỗi 500 giả. Thông lượng dừng ở khoảng 200 yêu cầu/giây; ở mức 100 người dùng ảo, thành phần bão hòa là bộ giả lập cơ sở dữ liệu (106–113% CPU) trong khi dịch vụ chỉ dùng 19–28% một nhân. SC-03 vì vậy chỉ cho thấy dịch vụ không phải nút thắt tới 100 người dùng ảo, **không** đo được giới hạn tải hay khả năng tự mở rộng của Lambda và DynamoDB trên AWS.

SC-01 và SC-02 kiểm chứng ngưỡng của NFR-03 ở mức phiên hội thoại (Bảng 6.11): mỗi mức tải 90 giây, SC-01 một bản sao với 1–40 phiên, SC-02 hai và bốn bản sao với 20 và 40 phiên. CPU đỉnh của máy chủ LiveKit tăng từ 6% một nhân (1 phiên) lên 36% (40 phiên, 1 bản sao) và 46–48% (40 phiên, 2 hoặc 4 bản sao).

**Bảng 6.11.** Phiên hội thoại đồng thời (ngày 13/10/2026, nhà cung cấp AI giả lập)

| Mã | Bản sao | Phiên | Được phục vụ | Lượt | Độ trễ P50 / P95 (s) | Vào phiên P50 / lớn nhất (s) | CPU tác nhân TB / đỉnh (%) | RAM đỉnh (MB) |
|---|---|---|---|---|---|---|---|---|
| SC-01 | 1 | 1 | 1/1 | 13 | 1,53 / 1,54 | 0,42 / 0,42 | 16 / 26 | 1.315 |
| SC-01 | 1 | 5 | 5/5 | 62 | 1,51 / 1,52 | 1,27 / 1,37 | 44 / 145 | 2.820 |
| SC-01 | 1 | 10 | 10/10 | 115 | 1,50 / 1,51 | 1,37 / 1,44 | 77 / 143 | 4.965 |
| SC-01 | 1 | 20 | 20/20 | 208 | 1,50 / 1,51 | 1,44 / 1,61 | 125 / 213 | 7.173 |
| SC-01 (mở rộng) | 1 | 40 | 40/40 | 337 | 1,50 / 1,51 | 1,53 / 1,80 | 230 / 374 | 10.139 |
| SC-02 | 2 | 20 | 20/20 | 221 | 1,50 / 1,51 | 0,89 / 1,53 | 120 / 309 | 8.599 |
| SC-02 | 2 | 40 | 40/40 | 394 | 1,50 / 1,51 | 1,22 / 1,90 | 252 / 444 | 11.375 |
| SC-02 | 4 | 20 | 20/20 | 229 | 1,50 / 1,51 | 0,48 / 1,51 | 131 / 398 | 10.062 |
| SC-02 | 4 | 40 | 40/40 | 419 | 1,50 / 1,51 | 0,47 / 1,77 | 278 / 587 | 13.309 |

Độ trễ không tăng theo số phiên: P95 là 1,54 giây ở 1 phiên, 1,51 giây ở 20 phiên và giữ nguyên tới 40 phiên, mọi phiên đều được phục vụ, nên AC-16 (P95 tăng không quá 20%, phiên lỗi dưới 1%) **đạt trong môi trường mô phỏng**. Thêm bản sao rút ngắn thời gian vào phiên (20 phiên: P50 từ 1,44 giây với 1 bản sao xuống 0,48 giây với 4 bản sao) nhờ mỗi bản sao giữ sẵn một tiến trình chờ, đúng chiến thuật duy trì nhiều bản sao (Bảng 3.8). Bộ nhớ là tài nguyên giới hạn: RAM tăng khoảng 225 MB mỗi phiên, CPU đỉnh chỉ khoảng 9% một nhân mỗi phiên, nên với tác vụ Fargate 1 vCPU, 2 GB (Bảng 5.5) một bản sao chứa khoảng 7 phiên và tự mở rộng nên dựa trên bộ nhớ hoặc số phiên. Các kết quả này chưa phải năng lực tải trên AWS (mục 6.13).

## 6.9. Kết quả khả năng phục hồi — NFR-04 (RQ1)

Bảng 6.12 tổng hợp kết quả tiêm lỗi ở mức thành phần và mức bản sao tác nhân (mục 6.2.2); mỗi kiểu lỗi lặp 20 lần (RS-05: 30; RS-03: 10). Một lượt "đạt" khi lỗi không lọt ra khỏi công cụ dưới dạng ngoại lệ và câu cuối của tác nhân báo thao tác không thực hiện được; với RS-05, khi tác nhân vẫn nhận được câu trả lời từ nhà cung cấp dự phòng.

**Bảng 6.12.** Kết quả tiêm lỗi (RS-01, RS-02, RS-04, RS-05 ngày 11/10/2026; RS-03 ngày 13/10/2026; KTC = khoảng tin cậy 95% Wilson)

| Mã | Lỗi được tiêm | Kỳ vọng | Lượt đạt (KTC) | Thời gian xử lý xong lỗi | Đạt |
|---|---|---|---|---|---|
| RS-01 | Nhật ký cuộc gọi từ chối kết nối | Phiên không ảnh hưởng | 20/20 (84–100%) | Trung vị 4,01 s (2 lần thử lại) | Đạt |
| RS-01 | Nhật ký cuộc gọi trả 503 | Như trên | 20/20 (84–100%) | Trung vị 4,02 s | Đạt |
| RS-02 | Dịch vụ nghiệp vụ trả 503 | Tác nhân báo lỗi; phiên tiếp tục | 20/20 (84–100%) | < 0,01 s | Đạt |
| RS-02 | Dịch vụ nghiệp vụ treo | Như trên | 20/20 (84–100%) | Trung vị 8,01 s (thời gian chờ 8 s) | Đạt |
| RS-02 | Dịch vụ nghiệp vụ từ chối kết nối | Như trên | 20/20 (84–100%) | < 0,01 s | Đạt |
| RS-03 | SIGKILL một bản sao đang có phiên (hai bản sao) | Phiên mới do bản sao khác phục vụ | Phiên mới 10/10 (72–100%); phiên đang chạy 0/10 | Phiên mới < 1 s; bản sao đăng ký lại sau trung vị 4,1 s | Đạt một phần |
| RS-04 | Kênh tin nhắn trả lỗi | Báo không gửi được | 20/20 (84–100%) | < 0,01 s | Đạt |
| RS-04 | Khởi tạo cuộc gọi trả lỗi | Báo không gọi được | 20/20 (84–100%) | < 0,01 s | Đạt (lỗi khả dụng, mục 6.7) |
| RS-05 | LLM chính trả lỗi ngay | Chuyển dự phòng | 30/30 (89–100%) | Token đầu 1,05 s (cơ sở 1,00 s) | Đạt |
| RS-05 | LLM chính treo | Như trên | 30/30 (89–100%) | Token đầu 6,00 s (5 s chờ + 1 s dự phòng) | Đạt (vượt ngân sách độ trễ) |

Cô lập lỗi hoạt động đúng thiết kế: trong 200 lượt tiêm lỗi mức thành phần, không lượt nào để ngoại lệ thoát ra luồng hội thoại, xác nhận điểm không rủi ro NR-1 ở Bảng 4.11; kết quả khớp với lỗi thật ngày 06/09/2026 khi SMS trả 503 và phiên vẫn tiếp tục (Bảng 5.2). Điểm cần cải thiện là lỗi dạng treo tốn thời gian bằng thời gian chờ (8 giây với API nghiệp vụ, 6 giây với LLM chính), vượt ngân sách 2 giây của NFR-02 và là điểm đánh đổi TP-2, TP-3 ở Bảng 4.11 vì rút ngắn thời gian chờ sẽ tăng báo lỗi giả khi mạng chậm.

RS-03 chạy với hai bản sao: mỗi lượt mở một phiên, dừng đột ngột bản sao đang phục vụ rồi mở ngay phiên mới. Phiên mới luôn được bản sao còn lại phục vụ dưới 1 giây (10/10) và bản sao khởi động lại đăng ký với LiveKit sau trung vị 4,1 giây; phiên đang chạy trên bản sao bị dừng bị mất (0/10) vì LiveKit không tự giao lại phiên, và đường khôi phục ở tầng ứng dụng (sequence S2 bước 4) chưa được đo đầu cuối. Vì vậy cần giữ tối thiểu hai bản sao, và AC-17 với RS-03 **đạt một phần**: phiên mới đạt, phiên đang chạy trên bản sao bị dừng thì không.

## 6.10. Kết quả bảo mật — NFR-05

**Bảng 6.13.** Danh mục kiểm tra bảo mật

| STT | Kiểm tra | Kết quả |
|---|---|---|
| 1 | JWT đăng nhập chỉ do Dịch vụ Định danh phát hành | Đạt |
| 2 | Tham số bí mật không nằm trong mã nguồn | Đạt |
| 3 | Nhật ký không chứa token, mật khẩu | Đạt |
| 4 | Nhật ký không chứa số điện thoại đầy đủ | Không đạt (11/10/2026); đạt sau khi sửa (13/10/2026) |
| 5 | Tác nhân không truy cập cơ sở dữ liệu (CON-01) | Đạt |
| 6 | Vị trí khách chỉ lấy từ dữ liệu chuyến | Đạt (mẫu) |

Ở lần đánh giá ngày 11/10/2026, danh mục chỉ đạt 5/6 vì nhật ký ghi số điện thoại đầy đủ (2.350 số trong 19 tệp tác nhân, 10 trong nhật ký dịch vụ), nên AC-18 **không đạt**. Đây là lỗi hiện thực, không phải lỗi kiến trúc: chiến thuật giới hạn phơi lộ (Bảng 3.8) đã được chọn nhưng chưa áp dụng ở tầng ghi nhật ký. Cách sửa là che số ngay trong bộ định dạng nhật ký dùng chung của tác nhân và năm dịch vụ Node.js (0888123798 thành 0888xxx798, kiểm bằng test_log_phone_mask và verify:logger); kiểm tra lại ngày 13/10/2026 cho 0 số đầy đủ trên 5.335 dòng DEBUG, nên AC-18 **đạt sau một vòng sửa**. Sự kiện Twilio trong bảng channel-events vẫn có số điện thoại vì là dữ liệu nghiệp vụ và chỉ Dịch vụ Liên lạc bằng tin nhắn truy cập được (CON-02).

## 6.11. Kết quả luồng khách hàng, giám sát vận hành và sắp xếp điểm dừng

**Bảng 6.14.** Kết quả trường hợp kiểm thử phía khách hàng và giám sát vận hành

| Nhóm | Nội dung kiểm tra | Trường hợp kiểm thử | Kết quả |
|---|---|---|---|
| Gọi khách từ tài xế | Đúng chế độ; không quay số khi thiếu chuyến | test_call_customer, test_outbound_call_modes | Đạt |
| Tác nhân trao đổi với khách | Mở đầu đúng; không bịa giờ đến, giá; tóm tắt về tài xế | test_customer_outbound_opening, test_customer_call_faq | Đạt |
| Ghi nhận yêu cầu khách | Yêu cầu chờ thêm, ghi chú được lưu và gửi tóm tắt | test_record_customer_request, test_resolve_customer_trip | Đạt |
| Chỉ số phiên (FR-O01) | Độ trễ, câu đệm, công cụ, lỗi HTTP, dự phòng | test_session_metrics (4 ca) | Đạt |
| Báo cáo ngày (FR-O01) | Số phiên, độ trễ TB/P95, tỷ lệ công cụ, API lỗi, mẫu chấm | ops-service selfcheck (verify:ops) | Đạt |
| Báo cáo trên dữ liệu thật (FR-O01, FR-O02) | Dựng lại 5 ngày (30/08–10/09/2026) từ nhật ký cuộc gọi (giao diện như Hình 5.3) | ops-service + call-records-service cục bộ | Đạt |
| Gửi SMS cho khách (FR-C03, FR-K03, AC-11) | Đúng nội dung tới khách của chuyến; 09… thành +84…; thất bại thì báo lỗi | test_send_sms_flow (4 ca); verify:sms (12 + 8 ca); Twilio giả lập | Đạt ở mức kiểm thử |
| Truy vấn bản ghi theo ngày | Quy đổi giờ Việt Nam, biên ngày UTC | call-records-service selfcheck (verify:records) | Đạt |

Bộ kiểm thử tự động của tác nhân lớn dần theo các lần sửa và ở mốc cuối (25/10/2026) đạt 662/662 ca kiểm thử đơn vị; bài đánh giá chọn công cụ với mô hình thật (tool_choice_eval.py) đạt 23 câu × 12 lần = 276/276. Hai lỗi được phát hiện và sửa nhờ bài đánh giá này: mô hình đôi khi gọi công cụ đứng đầu danh sách với toàn tham số mặc định (khắc phục bằng cách đưa create_walkup_trip, công cụ bắt buộc có tham số, lên đầu), và với câu hỏi theo số thứ tự mô hình tự điền day=today vì tham số day thiếu giá trị "mọi ngày" (khắc phục bằng giá trị all đặt làm mặc định). Lớp chặn gọi khách được kiểm bằng call_intent_eval.py (7 tình huống × 3 lần): 20/21 lượt đúng, mọi câu mơ hồ đều không tạo cuộc gọi. Các ca đạt chứng minh luồng khách hàng hoạt động trong phạm vi thiết kế, không cho biết mức hài lòng của khách hàng thật.

**Chất lượng sắp xếp thứ tự ghé điểm dừng (FR-T07).** Heuristic láng giềng gần nhất kết hợp 2-opt (mục 5.4.4) được so với lời giải tối ưu bằng vét cạn, cùng ràng buộc đón trước trả, trên 600 bộ dữ liệu (200 bộ cho mỗi cỡ 2, 3, 4 chuyến) sinh ngẫu nhiên với seed cố định trong khung 15 km × 15 km quanh trung tâm TP.HCM; chi phí là khoảng cách đường chim bay nhân hệ số 1,3; đường cơ sở là thứ tự "theo danh sách" (experiments/route_opt_quality.js).

**Bảng 6.15.** Chất lượng sắp xếp thứ tự ghé so với lời giải tối ưu (ngày 13/10/2026, 200 bộ dữ liệu mỗi dòng)

| Số chuyến (điểm dừng) | Đúng lời giải tối ưu | Chênh lệch TB so với tối ưu | Chênh lệch lớn nhất | Theo danh sách: chênh lệch TB | Thời gian tính TB |
|---|---|---|---|---|---|
| 2 (4) | 171/200 (85,5%) | 1,2% | 46,7% | 22,9% | 0,004 ms |
| 3 (6) | 108/200 (54,0%) | 3,7% | 37,6% | 41,3% | 0,004 ms |
| 4 (8) | 80/200 (40,0%) | 6,3% | 49,5% | 62,2% | 0,007 ms |

Không bộ dữ liệu nào vi phạm ràng buộc đón trước trả. Heuristic cho quãng đường trung bình chỉ dài hơn tối ưu 1,2–6,3%, so với 22,9–62,2% khi đi theo danh sách; một số ít trường hợp dài hơn tới khoảng 50% do kẹt ở cực tiểu địa phương, nên có thể dùng vét cạn (vài mili-giây với tối đa 8 điểm dừng) cho bài toán nhỏ. Kết quả dùng khoảng cách mô phỏng; thời gian đến trên đường thật chưa được đo.

## 6.12. Tổng hợp và thảo luận theo câu hỏi nghiên cứu

**Bảng 6.16.** Tổng hợp kết quả theo tiêu chí chấp nhận

| Yêu cầu | Tiêu chí | Kết quả chính | Trạng thái |
|---|---|---|---|
| NFR-02 Hiệu năng | AC-15 | Luồng qua LLM: P95 = 3,75 giây (n = 174); điểm nghẽn token đầu (P95 ≈ 2,5 giây) | Không đạt |
| Nhận dạng giọng nói | AC-19 | WER 3,1% (yên tĩnh), 7,3% (nhiễu); một người đọc, 22 câu | Đã đo (mẫu nhỏ) |
| FR của tài xế | AC-01–AC-08 | 37/43 (86,0%; KTC 72,7–93,4%) đúng công cụ; 32/43 (74,4%; 59,8–85,1%) hoàn thành ngay lần đầu | Đã đo (mẫu nhỏ) |
| NFR-01 Tính khả dụng | AC-14 | 100% thao tác rủi ro có xác nhận; danh mục 5/6 lần đầu, 6/6 sau khi sửa | Đạt sau một vòng sửa |
| NFR-03 Khả năng mở rộng | AC-16 | P95 1,54 giây (1 phiên), 1,51 giây (20 phiên), 100% phiên tới 40; RAM ≈ 225 MB/phiên; API không lỗi tới 100 người dùng ảo | Đạt (môi trường mô phỏng) |
| NFR-04 Khả năng phục hồi | AC-17 | 200/200 lượt tiêm lỗi mức thành phần; lỗi treo chậm 6–8 giây; RS-03: phiên mới 10/10, phiên đang chạy bị mất | Đạt mức thành phần; đạt một phần khi dừng bản sao |
| NFR-05 Bảo mật | AC-18 | 5/6 lần đầu (nhật ký có số điện thoại); 6/6 sau khi che số | Đạt sau một vòng sửa |
| Luồng khách hàng (FR-K) | AC-10, AC-11 | Kiểm thử gọi khách, SMS đạt (Bảng 6.14); SMS chưa giao tới thuê bao Việt Nam (mục 6.13) | Đạt ở mức kiểm thử |
| FR-O01, FR-O02 | AC-13 | Kiểm thử đạt; báo cáo dựng trên dữ liệu thật (giao diện như Hình 5.3) | Đạt |
| FR-A01, FR-Q02 | AC-09, AC-12 | Đã hiện thực (mục 5.5, Hình 4.9); chưa có phép đo riêng trong đợt đánh giá | Chưa đánh giá |
| FR-T07 Sắp xếp thứ tự ghé | Bổ sung | Dài hơn tối ưu 1,2–6,3%, so với 22,9–62,2% theo danh sách (Bảng 6.15) | Đã đo (mô phỏng) |

**RQ1 – Kiến trúc microservices có đáp ứng khả năng mở rộng và khả năng phục hồi không?** Có ở mức thành phần và trong môi trường mô phỏng: 200/200 lượt tiêm lỗi không làm hỏng luồng hội thoại, độ trễ không tăng từ 1 lên 40 phiên và thêm bản sao rút ngắn thời gian vào phiên (Bảng 6.10–6.12). Giới hạn còn lại là phiên đang chạy bị mất khi bản sao bị dừng, lỗi treo kéo dài 6–8 giây, và chưa kiểm chứng trên AWS với nhà cung cấp AI thật.

**RQ2 – Độ trễ phản hồi đạt mức nào và thành phần nào chi phối?** Trên 174 lượt qua LLM, P95 là 3,75 giây, không đạt ngưỡng 2 giây; thành phần chi phối là thời gian sinh token đầu của LLM (P95 2,49 giây), lớn hơn phát hiện kết thúc phát ngôn (1,70 giây) và TTS (0,29 giây). Với mô hình dùng qua API bên ngoài, ngưỡng 2 giây phụ thuộc chủ yếu vào nhà cung cấp mô hình, không vào cách chia dịch vụ (rủi ro R-1 ở Bảng 4.11); thiết kế hiện hành với câu đệm chưa được đo lại trên phiên thật (Bảng 6.5).

**RQ3 – Tỷ lệ lỗi từ thay đổi thế nào khi có nhiễu?** Tỷ lệ lỗi từ tăng từ 3,1% lên 7,3% khi thêm nhiễu mô phỏng khoang xe, chủ yếu ở từ mang nghĩa và chữ số trong địa chỉ. Kết quả dựa trên một người đọc và 22 câu nên chỉ cho thấy xu hướng.

**RQ4 – Tỷ lệ chọn đúng công cụ, hoàn thành nghiệp vụ và các lỗi phổ biến?** Trên 43 lượt được chấm, 37 lượt (86,0%) chọn đúng công cụ và 32 lượt (74,4%) hoàn thành đúng ngay lần đầu, với khoảng tin cậy rộng do cỡ mẫu nhỏ; lỗi chính là chọn sai thao tác với phát ngôn không rõ ý định, sai phạm vi tham số và đáp lời nhưng chưa thực hiện (Bảng 6.8). Kết quả tương đồng với nhận định của Yao et al. (2024) rằng tác nhân gọi công cụ còn thiếu ổn định, và củng cố quyết định xác nhận hai bước cho thao tác có rủi ro.

**Đối chiếu với các benchmark đã công bố.** Bảng 6.17 đặt kết quả của luận văn cạnh số liệu của các benchmark ở mục 2.9. Các con số không so sánh ngang hàng được vì khác nhiệm vụ, ngôn ngữ, cỡ mẫu và cách tính, nên bảng chỉ dùng để định vị kết quả.

**Bảng 6.17.** Định vị kết quả của luận văn so với các benchmark đã công bố

| Khía cạnh | Luận văn | Benchmark công bố | Khác biệt cần lưu ý |
|---|---|---|---|
| Hoàn thành nghiệp vụ | 74,4% lượt hoàn thành ngay lần đầu; 86,0% chọn đúng công cụ (43 lượt) | τ-bench: gpt-4o hoàn thành dưới 50% nhiệm vụ; tỷ lệ thành công cả 8 lần chạy lại (pass^8) dưới 25% ở miền bán lẻ (Yao et al., 2024) | τ-bench tính theo nhiệm vụ nhiều lượt với người dùng giả lập; luận văn tính theo lượt |
| Chọn công cụ đơn lượt | 276/276 (23 câu × 12 lần) | BFCL: mô hình mạnh làm tốt lời gọi đơn lượt, nhiều bước còn khó (Patil et al., 2025) | Bài đánh giá của luận văn chỉ gồm câu đơn lẻ và công cụ chỉ đọc |
| Độ trễ phản hồi | P95 3,75 giây; token đầu P95 2,49 giây | Moshi: 160 ms lý thuyết, 200 ms thực tế (Défossez et al., 2024); chuyển lượt tự nhiên 0–200 ms (Stivers et al., 2009) | Moshi là mô hình song công, không gọi công cụ |
| Tỷ lệ lỗi từ tiếng Việt | 3,1% (yên tĩnh); 7,3% (nhiễu) | Whisper large-v2 trên FLEURS tiếng Việt: 10,3% (Radford et al., 2023) | FLEURS là câu đọc đa chủ đề; bộ 22 câu của luận văn ngắn, đúng miền nghiệp vụ, một người đọc |

Có ba nhận xét. Thứ nhất, tỷ lệ hoàn thành của luận văn cao hơn τ-bench một phần vì đơn vị tính là một lượt chứ không phải một nhiệm vụ nhiều bước; với nhiệm vụ nhiều bước, các lỗi E-CONFIRM và E-PARAM (Bảng 6.8) sẽ cộng dồn. Thứ hai, độ trễ của chuỗi theo tầng cao hơn mô hình song công hơn một bậc độ lớn; đây là cái giá của việc gọi được công cụ, đúng như đánh đổi đã nêu ở mục 2.9.3. Thứ ba, tỷ lệ lỗi từ thấp hơn mức của Whisper trên FLEURS chưa cho phép kết luận khâu nhận dạng tốt hơn, vì bộ câu ngắn, đúng miền và do một người đọc.

## 6.13. Mối đe dọa đối với độ tin cậy của kết quả

Các hạn chế được phân tích theo bốn loại mối đe dọa của Wohlin et al. (2012), kèm biện pháp đã áp dụng và rủi ro còn lại.

**Độ tin cậy nội tại (internal validity).** Số liệu độ trễ lấy từ 341 lượt trong hai ngày, một tài khoản thử nghiệm, kịch bản do tác giả đọc, nhánh xử lý gán xấp xỉ; biện pháp là tách số liệu theo nhánh và theo chặng (Bảng 6.3, Bảng 6.4). Độ chính xác gọi công cụ do một người chấm biết trước kết quả mong đợi theo tiêu chí cố định trước, nên rủi ro còn lại là thiên lệch người chấm; cần ít nhất hai người chấm độc lập và hệ số đồng thuận.

**Độ tin cậy bên ngoài (external validity).** Thử tải và tiêm lỗi chạy trên một máy với nhà cung cấp AI giả lập, nên chứng minh tính chất của kiến trúc chứ không phải năng lực tải trên AWS: khởi động nguội của Lambda, giới hạn của API Gateway, tăng số bản sao trên Fargate và giới hạn tốc độ của nhà cung cấp AI thật chưa được quan sát (mục 5.6.1). Kết quả gắn với cấu hình STT, LLM, TTS tại thời điểm đo (Phụ lục D), và nhiễu mô phỏng không đại diện cho mọi khoang xe. SMS mới được kiểm chứng với Twilio giả lập: nhà mạng Việt Nam chỉ nhận SMS quốc tế từ tên người gửi và mẫu tin đã đăng ký (Twilio, n.d.), và phép thử gửi thật ngày 12/10/2026 bị từ chối với mã lỗi 21612, nên AC-11 chỉ được đánh giá ở mức kiểm thử. Hội thoại tiếng Anh chỉ được hỗ trợ ở mức chức năng, chưa được đo độ chính xác hay độ trễ.

**Độ tin cậy cấu trúc (construct validity).** Độ trễ phản hồi đo trải nghiệm hội thoại, không đo an toàn giao thông thực địa (mục 2.9.1); danh mục hành vi khi lái (Bảng 6.9) đo việc thiết kế tuân thủ nguyên tắc, không thay thế nghiên cứu người dùng. Các địa chỉ nhận thông báo từ Twilio chưa kiểm tra chữ ký X-Twilio-Signature, nên sự kiện giả có thể lọt vào bảng channel-events; Bảng 6.13 không đo được rủi ro này vì dùng Twilio giả lập.

**Độ tin cậy của kết luận (conclusion validity).** Thử tải chạy mỗi mức một lần nên chưa ước lượng được độ biến thiên giữa các lần chạy. Cỡ mẫu nhỏ (22 câu; 43 lượt chấm) được xử lý bằng cách báo cáo khoảng tin cậy, ghi "mẫu nhỏ" bên cạnh kết luận và không khẳng định khác biệt khi khoảng tin cậy chồng lấn; script và quy tắc xử lý dữ liệu được công bố kèm luận văn (Phụ lục E).

## Kết luận chương

Chương 6 đã đối chiếu nguyên mẫu với 19 tiêu chí chấp nhận (Bảng 6.16): 17 tiêu chí có kết quả, còn AC-09 (từ khóa đánh thức) và AC-12 (điều phối viên mời tài xế) đã được hiện thực nhưng chưa được đánh giá riêng. Khả năng phục hồi đạt ở mức thành phần và khả năng mở rộng đạt trong môi trường mô phỏng; hai lỗi hiện thực về tính khả dụng và bảo mật nhật ký đã được sửa và đạt khi kiểm tra lại; độ trễ của luồng qua LLM (P95 = 3,75 giây) là kết quả không đạt duy nhất còn lại, và RS-03 đạt một phần vì phiên đang chạy trên bản sao bị dừng bị mất.
