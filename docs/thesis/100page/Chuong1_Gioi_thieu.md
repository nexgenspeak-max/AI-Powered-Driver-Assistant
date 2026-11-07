# Chương 1. Giới thiệu

Chương này xác lập bối cảnh, bài toán, mục tiêu, câu hỏi nghiên cứu, phạm vi, phương pháp và đóng góp của luận văn.

## 1.1. Bối cảnh và động lực nghiên cứu

Khi chạy xe, tài xế xe công nghệ phải xem và xác nhận chuyến, cập nhật trạng thái đón trả, liên lạc với khách và tra cứu lộ trình trên điện thoại, tức là rời mắt khỏi mặt đường và rời tay khỏi vô-lăng. Luận văn hướng tới hãng xe nhận đặt chuyến qua điện thoại và nhóm Zalo, có điều phối viên xếp chuyến; tài xế là nhóm duy nhất thao tác khi đang lái nên chịu rủi ro an toàn lớn nhất.

Nghiên cứu SHRP 2 trên hơn 900 vụ va chạm của hơn 3.500 người lái thấy yếu tố thuộc về người lái hiện diện trong gần 90% số vụ, và thao tác thiết bị cầm tay làm tăng đáng kể nguy cơ va chạm (Dingus et al., 2016); nguy cơ cao gấp khoảng hai đến sáu lần khi thao tác trên điện thoại (Insurance Institute for Highway Safety, n.d.). Tương tác bằng giọng nói giảm thời gian nhìn và chạm màn hình; giới hạn của hướng này được nêu ở mục 2.9.1.

Về kỹ thuật, nhận dạng giọng nói (Speech-to-Text – STT), mô hình ngôn ngữ lớn (Large Language Model – LLM) và tổng hợp giọng nói (Text-to-Speech – TTS) đã có dưới dạng dịch vụ trí tuệ nhân tạo (Artificial Intelligence – AI) ghép được thành chuỗi xử lý thời gian thực. Cơ chế gọi công cụ (function calling) cho phép mô hình chọn một chức năng kèm tham số, để phần mềm thực hiện qua giao diện lập trình ứng dụng (Application Programming Interface – API) (Schick et al., 2023). Giao thức truyền thông thời gian thực trên web (Web Real-Time Communication – WebRTC) nối ứng dụng với máy chủ, còn giao thức khởi tạo phiên (Session Initiation Protocol – SIP) nối với mạng điện thoại thường (LiveKit Inc., n.d.). Một hệ thống như vậy phải phản hồi nhanh, phục vụ nhiều phiên đồng thời, chịu được sự cố của một dịch vụ hoặc nhà cung cấp AI, và bảo vệ dữ liệu cá nhân. Chính các yêu cầu phi chức năng (Non-Functional Requirement – NFR) này dẫn luận văn tới kiến trúc microservices (Microservices Architecture – MSA) trên điện toán đám mây.

## 1.2. Phát biểu bài toán

Bài toán là thiết kế, triển khai và đánh giá một trợ lý AI bằng giọng nói hỗ trợ tài xế trong lúc chạy chuyến: nghe yêu cầu, hiểu ý định, thực hiện nghiệp vụ trên hệ thống quản lý chuyến đi qua gọi công cụ, rồi trả lời bằng giọng nói trong thời gian thực. Ngôn ngữ chính là tiếng Việt; tiếng Anh được hỗ trợ ở mức chức năng cho cùng tập nghiệp vụ, cho thấy kiến trúc cho phép thêm ngôn ngữ mà không sửa luồng xử lý; hội thoại tiếng Anh không được đánh giá định lượng.

Trợ lý hỗ trợ ba nhóm nghiệp vụ: tra cứu và quản lý chuyến đi, liên lạc với khách hàng (gọi điện, nhắn tin qua dịch vụ phía máy chủ) và hỗ trợ trong lúc vận hành (nhắc trước giờ đón, hướng dẫn dùng ứng dụng). Hệ thống chạy trong ứng dụng tài xế (WebRTC) và qua cuộc gọi điện thoại thường (SIP), phục vụ thêm khách hàng, điều phối viên và quản trị viên (mục 3.2), và phải đúng nghiệp vụ, đủ nhanh, chịu được tiếng ồn khoang xe, mở rộng và phục hồi được.

## 1.3. Mục tiêu nghiên cứu

Mục tiêu tổng quát là xây dựng một trợ lý AI bằng giọng nói giúp giảm thao tác thủ công trên thiết bị di động của tài xế, và đánh giá tính khả thi kỹ thuật bằng nguyên mẫu cùng các chỉ số đo được. Bốn mục tiêu cụ thể:

1. Phân tích yêu cầu chức năng (Functional Requirement – FR) theo nhóm người dùng và NFR theo mô hình chất lượng chuẩn, kèm tiêu chí chấp nhận kiểm thử được.
2. Đề xuất kiến trúc microservices lập luận từ các NFR qua chiến thuật kiến trúc (architectural tactics): tách tác nhân hội thoại khỏi dịch vụ nghiệp vụ, tự chuyển dự phòng nhà cung cấp STT, LLM, TTS, phân biệt loại phiên.
3. Triển khai nguyên mẫu trên WebRTC và SIP, ứng dụng di động của tài xế và các dịch vụ backend, với hạ tầng dạng mã (infrastructure as code) cho Amazon Web Services (AWS).
4. Đánh giá theo từng yêu cầu: độ trễ, độ chính xác nhận dạng giọng nói, độ chính xác gọi công cụ, tỷ lệ hoàn thành nghiệp vụ, khả năng mở rộng và phục hồi.

Ngưỡng định hướng cho mục tiêu 4: độ trễ phản hồi (từ khi tài xế dứt lời đến khi hệ thống bắt đầu trả lời) có P95 ≤ 2 giây, tức tối đa 5 trên 100 lượt chờ quá 2 giây (cơ sở chọn ngưỡng ở mục 2.8). Tỷ lệ lỗi từ (Word Error Rate – WER) được so giữa điều kiện yên tĩnh và nhiễu khoang xe; các ngưỡng khác nêu ở Chương 3, cách đo ở mục 6.3.

## 1.4. Câu hỏi nghiên cứu

Luận văn trả lời bốn câu hỏi nghiên cứu (Research Question – RQ); Bảng 1.1 ánh xạ mục tiêu, câu hỏi và chương trả lời.

- **RQ1.** Kiến trúc microservices chọn từ các NFR có đáp ứng khả năng mở rộng và khả năng phục hồi của một trợ lý giọng nói thời gian thực thực hiện nghiệp vụ qua gọi công cụ hay không?
- **RQ2.** Với các luồng cốt lõi (xem lịch chuyến, cập nhật tiến độ chuyến, liên lạc khách hàng, hỏi cách sử dụng), độ trễ phản hồi đạt mức nào so với ngưỡng P95 ≤ 2 giây, và thành phần nào chi phối độ trễ đó?
- **RQ3.** Tỷ lệ lỗi từ của khâu nhận dạng giọng nói thay đổi thế nào giữa môi trường yên tĩnh và môi trường có nhiễu mô phỏng khoang xe?
- **RQ4.** Trên bộ kịch bản nghiệp vụ, tỷ lệ chọn đúng công cụ và hoàn thành đúng nghiệp vụ đạt mức nào, và lỗi phổ biến nào ảnh hưởng đến trải nghiệm rảnh tay của tài xế?

**Bảng 1.1.** Ánh xạ mục tiêu nghiên cứu, câu hỏi nghiên cứu và chương trả lời

| STT | Mục tiêu cụ thể | Câu hỏi | Tiêu chí / chỉ số định hướng | Chương |
|---|---|---|---|---|
| 1 | Phân tích yêu cầu | Cơ sở RQ1–RQ4 | FR theo nhóm người dùng; NFR theo ISO/IEC 25010; tiêu chí Given – When – Then | 3 |
| 2 | Đề xuất kiến trúc | RQ1 | Microservices từ NFR qua chiến thuật; mô hình cấu trúc, luồng hành vi | 4 |
| 3 | Triển khai nguyên mẫu | RQ1 | Backend, tác nhân hội thoại, ứng dụng tài xế, hạ tầng dạng mã | 5 |
| 4 | Đánh giá | RQ1–RQ4 | Mở rộng, phục hồi (RQ1); P95 ≤ 2 giây (RQ2); WER (RQ3); gọi công cụ, hoàn thành nghiệp vụ (RQ4) | 6 |

## 1.5. Phạm vi và giới hạn nghiên cứu

### 1.5.1. Đối tượng, không gian và thời gian nghiên cứu

Đối tượng nghiên cứu là trợ lý giọng nói cho tài xế xe công nghệ và kiến trúc phục vụ trợ lý. Không gian nghiên cứu là nguyên mẫu trên môi trường phát triển và thử nghiệm, không phải mạng lưới thương mại. Thời gian nghiên cứu là 2025–2026; số liệu phản ánh cấu hình tại thời điểm đo (Chương 6).

### 1.5.2. Phạm vi nghiên cứu

Luận văn tập trung vào trợ lý giọng nói và kiến trúc tích hợp trợ lý với nền tảng vận hành chuyến đi, không xây dựng hệ thống quản lý vận tải hoàn chỉnh (phân chuyến tối ưu, tính cước, thanh toán). Phạm vi gồm ba nhóm nghiệp vụ ở mục 1.2, hội thoại song ngữ Việt – Anh, từ khóa đánh thức (wake-word) và kênh SIP nối mạng điện thoại công cộng (Public Switched Telephone Network – PSTN). Hệ thống gồm sáu dịch vụ đặt tên theo chức năng (mục 4.4); Dịch vụ Liên lạc hội thoại thời gian thực chạy tác nhân hội thoại (conversational agent), và "tác nhân" trong luận văn chỉ hành vi hội thoại của dịch vụ này.

### 1.5.3. Giới hạn

Luận văn không huấn luyện lại STT, LLM, TTS mà dùng mô hình của nhà cung cấp qua một lớp trung gian cho phép đổi nhà cung cấp; không gồm nhắn tin nhóm giữa tài xế, dẫn đường bằng giọng nói, tranh chấp thanh toán và khiếu nại pháp lý. Khả năng mở rộng và phục hồi được thử trên môi trường mô phỏng cục bộ, không trên AWS thật; chưa thử nghiệm với tài xế thật; các phiên hội thoại do tác giả thực hiện (ảnh hưởng ở mục 6.13).

## 1.6. Phương pháp nghiên cứu

Luận văn theo phương pháp nghiên cứu khoa học thiết kế (design science research – DSR): xây dựng một sản phẩm thiết kế, ở đây là kiến trúc và nguyên mẫu, để giải quyết bài toán thực tiễn rồi đánh giá chặt chẽ (Hevner et al., 2004). Quy trình theo sáu hoạt động xác định vấn đề, xác định mục tiêu, thiết kế và phát triển, minh họa, đánh giá, truyền đạt (Peffers et al., 2007), lần lượt ứng với mục 1.1–1.4, Chương 3, Chương 4–5, Chương 5 và Phụ lục B, Chương 6, và toàn văn cùng mã nguồn công khai (mục 5.2).

Chiến lược đánh giá theo khung FEDS (Venable et al., 2016): rủi ro chính là rủi ro kỹ thuật, nên luận văn đánh giá trước trong điều kiện nhân tạo (nhật ký phiên thật, câu tham chiếu, kịch bản chấm thủ công, thử tải và tiêm lỗi mô phỏng) rồi mới đánh giá với người dùng thật; giai đoạn sau chưa thực hiện. Mỗi yêu cầu có mã riêng (ví dụ FR-T01, NFR-02) để truy vết tới thiết kế, hiện thực và đánh giá (mục 4.9, 5.7). Các mối đe dọa đối với độ tin cậy của kết quả được phân tích theo bốn loại nội tại, bên ngoài, cấu trúc và kết luận (Wohlin et al., 2012) ở mục 6.13.

## 1.7. Những đóng góp của luận văn

Luận văn có bốn đóng góp; mức độ mới so với các công trình liên quan được đối chiếu ở Bảng 2.2.

1. **Kiến trúc tham chiếu cho trợ lý giọng nói thực thi nghiệp vụ:** microservices trên AWS lập luận từ năm NFR, kèm phân tích đánh đổi và rủi ro (Chương 3, 4).
2. **Nguyên mẫu hoạt động đầu cuối, mã nguồn công khai:** chuỗi STT – LLM gọi công cụ – TTS có câu đệm (câu ngắn phát khi trả lời chậm quá khoảng 2 giây), nhà cung cấp dự phòng, chạy trên WebRTC và SIP (Chương 5).
3. **Khung đánh giá gắn với tiêu chí chấp nhận:** 19 tiêu chí Given – When – Then và truy vết từ yêu cầu đến kết quả (Chương 3, 6).
4. **Bằng chứng thực nghiệm về giới hạn của chuỗi xử lý theo tầng:** thời gian mô hình sinh token đầu chiếm phần lớn độ trễ, các biện pháp kiến trúc chỉ rút ngắn phần còn lại (Chương 6).

## 1.8. Cấu trúc luận văn

Chương 2 trình bày cơ sở lý thuyết, Chương 3 phân tích yêu cầu, Chương 4 thiết kế, Chương 5 triển khai, Chương 6 thực nghiệm và đánh giá; Kết luận nêu hạn chế và hướng phát triển, Phụ lục chứa tài liệu bổ trợ.

## Kết luận chương

Chương 1 đã xác lập bài toán, bốn mục tiêu, bốn câu hỏi nghiên cứu, phương pháp và bốn đóng góp; Chương 2 trình bày cơ sở lý thuyết.

