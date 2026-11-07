# Chương 1. Giới thiệu

## 1.1. Bối cảnh và động lực nghiên cứu

Tài xế xe công nghệ vẫn phải dùng điện thoại khi đang lái để xác nhận chuyến, cập nhật đón trả, liên lạc với khách và tra lộ trình, rời mắt khỏi đường và tay khỏi vô-lăng. Luận văn hướng tới hãng xe nhận đặt chuyến qua điện thoại và nhóm Zalo, do điều phối viên xếp chuyến; tài xế là nhóm duy nhất thao tác khi đang lái nên chịu rủi ro an toàn lớn nhất.

Nghiên cứu SHRP 2 trên hơn 900 vụ va chạm của hơn 3.500 người lái cho thấy yếu tố người lái có mặt trong gần 90% số vụ và thao tác thiết bị cầm tay làm tăng đáng kể nguy cơ (Dingus et al., 2016). Theo Viện Bảo hiểm An toàn Đường cao tốc Hoa Kỳ (Insurance Institute for Highway Safety – IIHS), thao tác trên điện thoại khi lái làm nguy cơ va chạm cao gấp khoảng hai đến sáu lần (Insurance Institute for Highway Safety, n.d.). Tương tác bằng giọng nói giảm thời gian nhìn và chạm màn hình (giới hạn ở mục 2.9.1).

Về kỹ thuật, nhận dạng giọng nói (Speech-to-Text – STT), mô hình ngôn ngữ lớn (Large Language Model – LLM) và tổng hợp giọng nói (Text-to-Speech – TTS) đều có sẵn dưới dạng dịch vụ trí tuệ nhân tạo (Artificial Intelligence – AI), ghép được thành chuỗi xử lý thời gian thực. Gọi công cụ (function calling) cho phép mô hình chọn chức năng và tham số để phần mềm thực thi qua giao diện lập trình ứng dụng (Application Programming Interface – API) (Schick et al., 2023). Giao thức truyền thông thời gian thực trên web (Web Real-Time Communication – WebRTC) nối ứng dụng với máy chủ, giao thức khởi tạo phiên (Session Initiation Protocol – SIP) nối với mạng điện thoại (LiveKit Inc., n.d.). Yêu cầu phản hồi nhanh, phục vụ nhiều phiên đồng thời, chịu sự cố của một dịch vụ hoặc nhà cung cấp AI và bảo vệ dữ liệu cá nhân. Chính các yêu cầu phi chức năng (Non-Functional Requirement – NFR) này dẫn luận văn đến kiến trúc microservices (Microservices Architecture) trên điện toán đám mây.

## 1.2. Phát biểu bài toán

Bài toán là thiết kế, triển khai và đánh giá trợ lý AI bằng giọng nói cho tài xế khi chạy chuyến: nghe yêu cầu, hiểu ý định, thực hiện nghiệp vụ trên hệ thống quản lý chuyến đi qua gọi công cụ và trả lời bằng giọng nói theo thời gian thực. Ngôn ngữ chính là tiếng Việt; tiếng Anh được hỗ trợ ở mức chức năng (minh họa việc thêm ngôn ngữ không cần sửa luồng xử lý), không được đánh giá định lượng.

Ba nhóm nghiệp vụ gồm: tra cứu và quản lý chuyến đi, liên lạc với khách hàng (gọi điện, nhắn tin qua máy chủ) và hỗ trợ vận hành (nhắc giờ đón, hướng dẫn dùng ứng dụng). Hệ thống chạy trong ứng dụng tài xế (WebRTC) và qua cuộc gọi điện thoại (SIP), đồng thời phục vụ khách hàng, điều phối viên và quản trị viên (mục 3.2). Ngoài các NFR ở mục 1.1, hệ thống phải chịu được tiếng ồn khoang xe.

## 1.3. Mục tiêu nghiên cứu

Mục tiêu tổng quát là xây dựng trợ lý AI bằng giọng nói giảm thao tác thủ công của tài xế trên điện thoại, và đánh giá tính khả thi kỹ thuật bằng nguyên mẫu cùng chỉ số đo được. Bốn mục tiêu cụ thể:

1. Phân tích yêu cầu chức năng (Functional Requirement – FR) theo nhóm người dùng và NFR theo mô hình chất lượng chuẩn, kèm tiêu chí chấp nhận kiểm thử được.
2. Đề xuất kiến trúc microservices lập luận từ NFR qua chiến thuật kiến trúc (architectural tactics): tách tác nhân hội thoại khỏi dịch vụ nghiệp vụ, tự chuyển nhà cung cấp STT, LLM, TTS dự phòng, phân biệt loại phiên.
3. Triển khai nguyên mẫu trên WebRTC và SIP: ứng dụng di động cho tài xế, dịch vụ backend và hạ tầng dạng mã (infrastructure as code) cho Amazon Web Services (AWS).
4. Đánh giá nguyên mẫu theo từng yêu cầu: độ trễ, độ chính xác nhận dạng giọng nói và gọi công cụ, tỷ lệ hoàn thành nghiệp vụ, khả năng mở rộng và phục hồi; tính khả dụng và bảo mật theo danh mục kiểm tra.

Ngưỡng định hướng cho độ trễ phản hồi (từ khi tài xế dứt lời đến khi hệ thống bắt đầu trả lời) là P95 ≤ 2 giây, tức tối đa 5 trên 100 lượt chờ quá 2 giây (mục 2.8); tỷ lệ lỗi từ (Word Error Rate – WER) được so sánh giữa điều kiện yên tĩnh và có nhiễu. Các ngưỡng khác ở Bảng 3.8; cách đo ở mục 6.3.

## 1.4. Câu hỏi nghiên cứu

Bốn câu hỏi nghiên cứu (Research Question – RQ) được ánh xạ tới mục tiêu và chương ở Bảng 1.1.

- **RQ1.** Kiến trúc microservices chọn từ các NFR có đáp ứng khả năng mở rộng và phục hồi cần cho một trợ lý giọng nói thời gian thực thực hiện nghiệp vụ qua gọi công cụ không?
- **RQ2.** Với các luồng cốt lõi (xem lịch chuyến, cập nhật tiến độ, liên lạc khách hàng, hỏi cách sử dụng), độ trễ phản hồi đạt mức nào so với ngưỡng P95 ≤ 2 giây, và thành phần nào chi phối?
- **RQ3.** WER của khâu nhận dạng giọng nói thay đổi thế nào giữa môi trường yên tĩnh và môi trường có nhiễu mô phỏng khoang xe?
- **RQ4.** Trên bộ kịch bản nghiệp vụ, tỷ lệ chọn đúng công cụ và hoàn thành đúng nghiệp vụ đạt mức nào, và lỗi phổ biến nào ảnh hưởng đến trải nghiệm rảnh tay?

**Bảng 1.1.** Ánh xạ giữa mục tiêu nghiên cứu, câu hỏi nghiên cứu và chương trả lời

| STT | Mục tiêu cụ thể | Câu hỏi | Tiêu chí / chỉ số định hướng | Chương |
|---|---|---|---|---|
| 1 | Phân tích yêu cầu | Cơ sở RQ1–RQ4 | FR theo nhóm người dùng; NFR theo ISO/IEC 25010; tiêu chí Given – When – Then | 3 |
| 2 | Đề xuất kiến trúc | RQ1 | Microservices lập luận từ NFR qua chiến thuật kiến trúc; mô hình cấu trúc, hành vi | 4 |
| 3 | Triển khai nguyên mẫu | RQ1 | Backend, tác nhân hội thoại, ứng dụng tài xế, hạ tầng dạng mã | 5 |
| 4 | Đánh giá | RQ1–RQ4 | Mở rộng, phục hồi (RQ1); P95 ≤ 2 giây (RQ2); WER (RQ3); gọi công cụ, hoàn thành nghiệp vụ (RQ4) | 6 |

## 1.5. Phạm vi và giới hạn nghiên cứu

### 1.5.1. Đối tượng, không gian và thời gian nghiên cứu

Đối tượng là trợ lý giọng nói cho tài xế xe công nghệ và kiến trúc hệ thống phục vụ trợ lý. Không gian là nguyên mẫu trên môi trường phát triển và thử nghiệm, không phải vận hành thương mại. Thời gian là 2025–2026; số liệu phản ánh cấu hình tại thời điểm đo (Chương 6).

### 1.5.2. Phạm vi nghiên cứu

Luận văn tập trung vào trợ lý và kiến trúc tích hợp trợ lý với nền tảng vận hành chuyến đi, không xây dựng hệ thống quản lý vận tải hoàn chỉnh (phân chuyến tối ưu, tính cước, thanh toán). Phạm vi gồm ba nhóm nghiệp vụ và hội thoại song ngữ ở mục 1.2, từ khóa đánh thức (wake-word) và kênh SIP kết nối mạng điện thoại chuyển mạch công cộng (Public Switched Telephone Network – PSTN). Hệ thống gồm sáu dịch vụ (mục 4.4); "tác nhân hội thoại" (conversational agent) chỉ hành vi hội thoại của Dịch vụ Liên lạc hội thoại thời gian thực.

### 1.5.3. Giới hạn

Luận văn không huấn luyện lại mô hình STT, LLM, TTS mà dùng mô hình của nhà cung cấp qua lớp trung gian thay thế được. Không gồm nhắn tin nhóm giữa tài xế, dẫn đường từng ngã rẽ, tranh chấp thanh toán và khiếu nại pháp lý. Mở rộng và phục hồi được thử trên môi trường mô phỏng cục bộ, không phải AWS thật. Hệ thống chưa được thử với tài xế thật; các phiên hội thoại do tác giả thực hiện (phân tích ở mục 6.13).

## 1.6. Phương pháp nghiên cứu

Luận văn áp dụng nghiên cứu khoa học thiết kế (design science research – DSR): xây dựng sản phẩm thiết kế (kiến trúc và nguyên mẫu) cho bài toán thực tiễn rồi đánh giá chặt chẽ (Hevner et al., 2004). Sáu hoạt động DSR (Peffers et al., 2007) – xác định vấn đề, xác định mục tiêu, thiết kế và phát triển, minh họa, đánh giá, truyền đạt – ứng với: mục 1.1–1.2 và Chương 2; mục 1.3–1.4 và Chương 3; Chương 4–5; Chương 5 và Phụ lục B; Chương 6; toàn văn luận văn cùng mã nguồn công khai (mục 5.2).

Chiến lược đánh giá theo khung FEDS (Venable et al., 2016): vì rủi ro chính là rủi ro kỹ thuật nên đánh giá trong điều kiện nhân tạo trước, với người dùng thật sau. Luận văn mới thực hiện giai đoạn đầu (chưa đánh giá với người dùng thật): nhật ký phiên của tác giả, bộ câu tham chiếu, chấm thủ công một mẫu lượt, thử tải và tiêm lỗi mô phỏng. Mỗi yêu cầu có mã (ví dụ FR-T01, NFR-02) để truy vết tới thiết kế, hiện thực và đánh giá (mục 4.9, 5.7 và Bảng 6.16). Mối đe dọa đối với độ tin cậy được phân tích ở mục 6.13 theo bốn loại: nội tại, bên ngoài, cấu trúc và kết luận (Wohlin et al., 2012).

## 1.7. Những đóng góp của luận văn

Bốn đóng góp dưới đây được đối chiếu với công trình liên quan ở Bảng 2.2.

1. **Kiến trúc tham chiếu cho trợ lý giọng nói thực thi nghiệp vụ:** microservices hướng tới AWS, lập luận từ năm NFR, kèm phân tích đánh đổi và rủi ro (Chương 3, 4).
2. **Nguyên mẫu đầu cuối, mã nguồn công khai:** chuỗi STT – LLM gọi công cụ – TTS, có câu đệm (phát khi sau 2 giây chưa có trả lời) và nhà cung cấp dự phòng, chạy trên WebRTC và SIP (Chương 5).
3. **Khung đánh giá gắn với tiêu chí chấp nhận:** 19 tiêu chí Given – When – Then cùng truy vết từ yêu cầu đến kết quả (Chương 3, 6).
4. **Bằng chứng thực nghiệm về giới hạn của chuỗi xử lý theo tầng:** trong cấu hình đã đo, thời gian sinh token đầu tiên của mô hình là thành phần lớn nhất của độ trễ, nên đạt ngưỡng 2 giây phụ thuộc vào nhà cung cấp mô hình hơn là cách chia dịch vụ (Chương 6).

## 1.8. Cấu trúc luận văn

Chương 2: cơ sở lý thuyết; Chương 3: phân tích yêu cầu; Chương 4: thiết kế; Chương 5: triển khai; Chương 6: thực nghiệm và đánh giá. Kết luận nêu hạn chế và hướng phát triển; Phụ lục chứa tài liệu bổ trợ.

## Kết luận chương

Chương 1 đã xác lập bài toán, mục tiêu, RQ, phương pháp và đóng góp; Chương 2 trình bày cơ sở lý thuyết.
