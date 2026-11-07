# Chương 1. Giới thiệu

Chương này trình bày bối cảnh, bài toán, mục tiêu, câu hỏi nghiên cứu, phạm vi, phương pháp và đóng góp của luận văn.

## 1.1. Bối cảnh và động lực nghiên cứu

Khi đang lái xe, tài xế xe công nghệ vẫn phải dùng điện thoại để xem và xác nhận chuyến, cập nhật trạng thái đón trả, liên lạc với khách và tra cứu lộ trình. Mỗi thao tác như vậy buộc tài xế rời mắt khỏi mặt đường và rời tay khỏi vô-lăng. Luận văn hướng tới loại hãng xe nhận đặt chuyến qua điện thoại và nhóm Zalo, trong đó điều phối viên là người xếp chuyến. Trong các nhóm người dùng của hãng, tài xế là nhóm duy nhất thao tác khi đang lái, nên chịu rủi ro an toàn lớn nhất.

Nghiên cứu SHRP 2 trên hơn 900 vụ va chạm của hơn 3.500 người lái cho thấy yếu tố thuộc về người lái có mặt trong gần 90% số vụ, và thao tác thiết bị cầm tay làm tăng đáng kể nguy cơ va chạm (Dingus et al., 2016). Khi thao tác trên điện thoại, nguy cơ này cao gấp khoảng hai đến sáu lần (Insurance Institute for Highway Safety, n.d.). Tương tác bằng giọng nói giúp giảm thời gian nhìn và chạm vào màn hình; giới hạn của hướng tiếp cận này được trình bày ở mục 2.9.1.

Về kỹ thuật, nhận dạng giọng nói (Speech-to-Text – STT), mô hình ngôn ngữ lớn (Large Language Model – LLM) và tổng hợp giọng nói (Text-to-Speech – TTS) đều đã có sẵn dưới dạng dịch vụ trí tuệ nhân tạo (Artificial Intelligence – AI) và có thể ghép thành một chuỗi xử lý thời gian thực. Cơ chế gọi công cụ (function calling) cho phép mô hình chọn một chức năng cùng các tham số, sau đó phần mềm thực thi chức năng đó qua giao diện lập trình ứng dụng (Application Programming Interface – API) (Schick et al., 2023). Giao thức truyền thông thời gian thực trên web (Web Real-Time Communication – WebRTC) kết nối ứng dụng với máy chủ, còn giao thức khởi tạo phiên (Session Initiation Protocol – SIP) kết nối hệ thống với mạng điện thoại thông thường (LiveKit Inc., n.d.). Một hệ thống như vậy phải phản hồi nhanh, phục vụ nhiều phiên đồng thời, chịu được sự cố của một dịch vụ hoặc một nhà cung cấp AI, và bảo vệ dữ liệu cá nhân. Chính các yêu cầu phi chức năng (Non-Functional Requirement – NFR) này dẫn luận văn đến kiến trúc microservices (Microservices Architecture – MSA) trên nền tảng điện toán đám mây.

## 1.2. Phát biểu bài toán

Bài toán đặt ra là thiết kế, triển khai và đánh giá một trợ lý AI bằng giọng nói hỗ trợ tài xế trong lúc chạy chuyến. Trợ lý nghe yêu cầu, hiểu ý định, thực hiện nghiệp vụ trên hệ thống quản lý chuyến đi qua gọi công cụ, rồi trả lời bằng giọng nói trong thời gian thực. Ngôn ngữ chính là tiếng Việt. Tiếng Anh được hỗ trợ ở mức chức năng cho cùng tập nghiệp vụ, qua đó cho thấy kiến trúc cho phép thêm ngôn ngữ mà không phải sửa luồng xử lý; tuy vậy, hội thoại tiếng Anh không được đánh giá định lượng.

Trợ lý hỗ trợ ba nhóm nghiệp vụ: tra cứu và quản lý chuyến đi, liên lạc với khách hàng (gọi điện, nhắn tin qua dịch vụ phía máy chủ) và hỗ trợ trong lúc vận hành (nhắc trước giờ đón, hướng dẫn dùng ứng dụng). Hệ thống hoạt động trong ứng dụng tài xế (WebRTC) và qua cuộc gọi điện thoại thông thường (SIP); ngoài tài xế, hệ thống còn phục vụ khách hàng, điều phối viên và quản trị viên (mục 3.2). Hệ thống phải xử lý đúng nghiệp vụ, phản hồi đủ nhanh, chịu được tiếng ồn trong khoang xe, có khả năng mở rộng và phục hồi.

## 1.3. Mục tiêu nghiên cứu

Mục tiêu tổng quát là xây dựng một trợ lý AI bằng giọng nói giúp giảm thao tác thủ công của tài xế trên thiết bị di động, và đánh giá tính khả thi kỹ thuật của trợ lý bằng nguyên mẫu cùng các chỉ số đo được. Luận văn đặt ra bốn mục tiêu cụ thể:

1. Phân tích yêu cầu chức năng (Functional Requirement – FR) theo từng nhóm người dùng và NFR theo một mô hình chất lượng chuẩn, kèm tiêu chí chấp nhận có thể kiểm thử.
2. Đề xuất kiến trúc microservices được lập luận từ các NFR thông qua chiến thuật kiến trúc (architectural tactics): tách tác nhân hội thoại khỏi các dịch vụ nghiệp vụ, tự động chuyển sang nhà cung cấp STT, LLM, TTS dự phòng, và phân biệt các loại phiên.
3. Triển khai nguyên mẫu chạy trên WebRTC và SIP, gồm ứng dụng di động cho tài xế và các dịch vụ backend, cùng hạ tầng dạng mã (infrastructure as code) cho Amazon Web Services (AWS).
4. Đánh giá nguyên mẫu theo từng yêu cầu: độ trễ, độ chính xác nhận dạng giọng nói, độ chính xác gọi công cụ, tỷ lệ hoàn thành nghiệp vụ, khả năng mở rộng và khả năng phục hồi.

Với mục tiêu 4, ngưỡng định hướng cho độ trễ phản hồi (tính từ khi tài xế dứt lời đến khi hệ thống bắt đầu trả lời) là P95 ≤ 2 giây, nghĩa là tối đa 5 trên 100 lượt phải chờ quá 2 giây; cơ sở chọn ngưỡng này được trình bày ở mục 2.8. Tỷ lệ lỗi từ (Word Error Rate – WER) được so sánh giữa điều kiện yên tĩnh và điều kiện có nhiễu khoang xe. Các ngưỡng khác được nêu ở Chương 3, còn cách đo được trình bày ở mục 6.3.

## 1.4. Câu hỏi nghiên cứu

Luận văn trả lời bốn câu hỏi nghiên cứu (Research Question – RQ) dưới đây. Bảng 1.1 ánh xạ từng mục tiêu tới câu hỏi tương ứng và chương trả lời.

- **RQ1.** Kiến trúc microservices được chọn dựa trên các NFR có đáp ứng được yêu cầu về khả năng mở rộng và khả năng phục hồi của một trợ lý giọng nói thời gian thực, vốn thực hiện nghiệp vụ qua gọi công cụ, hay không?
- **RQ2.** Với các luồng cốt lõi (xem lịch chuyến, cập nhật tiến độ chuyến, liên lạc khách hàng, hỏi cách sử dụng), độ trễ phản hồi đạt mức nào so với ngưỡng P95 ≤ 2 giây, và thành phần nào chi phối độ trễ đó?
- **RQ3.** Tỷ lệ lỗi từ của khâu nhận dạng giọng nói thay đổi thế nào giữa môi trường yên tĩnh và môi trường có nhiễu mô phỏng khoang xe?
- **RQ4.** Trên bộ kịch bản nghiệp vụ, tỷ lệ chọn đúng công cụ và tỷ lệ hoàn thành đúng nghiệp vụ đạt mức nào, và những lỗi phổ biến nào ảnh hưởng đến trải nghiệm rảnh tay của tài xế?

**Bảng 1.1.** Ánh xạ giữa mục tiêu nghiên cứu, câu hỏi nghiên cứu và chương trả lời

| STT | Mục tiêu cụ thể | Câu hỏi | Tiêu chí / chỉ số định hướng | Chương |
|---|---|---|---|---|
| 1 | Phân tích yêu cầu | Cơ sở RQ1–RQ4 | FR theo nhóm người dùng; NFR theo ISO/IEC 25010; tiêu chí Given – When – Then | 3 |
| 2 | Đề xuất kiến trúc | RQ1 | Microservices lập luận từ NFR qua chiến thuật kiến trúc; mô hình cấu trúc, luồng hành vi | 4 |
| 3 | Triển khai nguyên mẫu | RQ1 | Backend, tác nhân hội thoại, ứng dụng tài xế, hạ tầng dạng mã | 5 |
| 4 | Đánh giá | RQ1–RQ4 | Khả năng mở rộng, phục hồi (RQ1); P95 ≤ 2 giây (RQ2); WER (RQ3); gọi công cụ, hoàn thành nghiệp vụ (RQ4) | 6 |

## 1.5. Phạm vi và giới hạn nghiên cứu

### 1.5.1. Đối tượng, không gian và thời gian nghiên cứu

Đối tượng nghiên cứu là trợ lý giọng nói cho tài xế xe công nghệ và kiến trúc hệ thống phục vụ trợ lý này. Không gian nghiên cứu là nguyên mẫu chạy trên môi trường phát triển và thử nghiệm, không phải trên mạng lưới vận hành thương mại. Thời gian nghiên cứu là 2025–2026; các số liệu phản ánh cấu hình hệ thống tại thời điểm đo (Chương 6).

### 1.5.2. Phạm vi nghiên cứu

Luận văn tập trung vào trợ lý giọng nói và kiến trúc tích hợp trợ lý với nền tảng vận hành chuyến đi. Luận văn không xây dựng một hệ thống quản lý vận tải hoàn chỉnh (phân chuyến tối ưu, tính cước, thanh toán). Phạm vi gồm ba nhóm nghiệp vụ nêu ở mục 1.2, hội thoại song ngữ Việt – Anh, từ khóa đánh thức (wake-word) và kênh SIP kết nối với mạng điện thoại chuyển mạch công cộng (Public Switched Telephone Network – PSTN). Hệ thống gồm sáu dịch vụ được đặt tên theo chức năng (mục 4.4). Trong đó, Dịch vụ Liên lạc hội thoại thời gian thực chạy tác nhân hội thoại (conversational agent); trong luận văn, "tác nhân" chỉ hành vi hội thoại của dịch vụ này.

### 1.5.3. Giới hạn

Luận văn không huấn luyện lại các mô hình STT, LLM, TTS mà sử dụng mô hình của nhà cung cấp thông qua một lớp trung gian cho phép thay đổi nhà cung cấp. Phạm vi không bao gồm nhắn tin nhóm giữa các tài xế, dẫn đường bằng giọng nói, tranh chấp thanh toán và khiếu nại pháp lý. Khả năng mở rộng và phục hồi được thử nghiệm trên môi trường mô phỏng cục bộ, không phải trên AWS thật. Hệ thống chưa được thử nghiệm với tài xế thật; các phiên hội thoại do tác giả thực hiện (ảnh hưởng của giới hạn này được phân tích ở mục 6.13).

## 1.6. Phương pháp nghiên cứu

Luận văn áp dụng phương pháp nghiên cứu khoa học thiết kế (design science research – DSR), tức là xây dựng một sản phẩm thiết kế (ở đây là kiến trúc và nguyên mẫu) để giải quyết một bài toán thực tiễn, rồi đánh giá chặt chẽ sản phẩm đó (Hevner et al., 2004). Quy trình gồm sáu hoạt động (Peffers et al., 2007): xác định vấn đề, xác định mục tiêu, thiết kế và phát triển, minh họa, đánh giá, truyền đạt. Các hoạt động này lần lượt ứng với mục 1.1–1.4, Chương 3, Chương 4–5, Chương 5 và Phụ lục B, Chương 6, và toàn văn luận văn cùng mã nguồn công khai (mục 5.2).

Chiến lược đánh giá theo khung FEDS (Venable et al., 2016). Vì rủi ro chính là rủi ro kỹ thuật, luận văn đánh giá trước trong điều kiện nhân tạo (nhật ký phiên thật, câu tham chiếu, kịch bản chấm thủ công, thử tải và tiêm lỗi mô phỏng) rồi mới đánh giá với người dùng thật; giai đoạn đánh giá với người dùng thật chưa được thực hiện. Mỗi yêu cầu có mã riêng (ví dụ FR-T01, NFR-02) để truy vết tới thiết kế, hiện thực và đánh giá (mục 4.9, 5.7). Các mối đe dọa đối với độ tin cậy của kết quả được phân tích ở mục 6.13 theo bốn loại: nội tại, bên ngoài, cấu trúc và kết luận (Wohlin et al., 2012).

## 1.7. Những đóng góp của luận văn

Luận văn có bốn đóng góp. Mức độ mới của các đóng góp này so với các công trình liên quan được đối chiếu ở Bảng 2.2.

1. **Kiến trúc tham chiếu cho trợ lý giọng nói thực thi nghiệp vụ:** kiến trúc microservices trên AWS được lập luận từ năm NFR, kèm phân tích đánh đổi và rủi ro (Chương 3, 4).
2. **Nguyên mẫu hoạt động đầu cuối, mã nguồn công khai:** chuỗi STT – LLM gọi công cụ – TTS, có câu đệm (câu ngắn được phát khi phản hồi chậm quá khoảng 2 giây) và nhà cung cấp dự phòng, chạy trên WebRTC và SIP (Chương 5).
3. **Khung đánh giá gắn với tiêu chí chấp nhận:** 19 tiêu chí Given – When – Then cùng truy vết từ yêu cầu đến kết quả (Chương 3, 6).
4. **Bằng chứng thực nghiệm về giới hạn của chuỗi xử lý theo tầng:** thời gian mô hình sinh token đầu tiên chiếm phần lớn độ trễ, còn các biện pháp kiến trúc chỉ rút ngắn được phần còn lại (Chương 6).

## 1.8. Cấu trúc luận văn

Chương 2 trình bày cơ sở lý thuyết, Chương 3 phân tích yêu cầu, Chương 4 trình bày thiết kế, Chương 5 trình bày triển khai, Chương 6 trình bày thực nghiệm và đánh giá. Phần Kết luận nêu hạn chế và hướng phát triển; Phụ lục chứa các tài liệu bổ trợ.

## Kết luận chương

Chương 1 đã xác lập bài toán, bốn mục tiêu, bốn câu hỏi nghiên cứu, phương pháp và bốn đóng góp của luận văn. Chương 2 trình bày cơ sở lý thuyết.
