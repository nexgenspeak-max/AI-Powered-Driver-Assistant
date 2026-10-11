# Chương 1. Giới thiệu

Chương này xác lập bối cảnh, bài toán và định hướng của luận văn: lý do cần một trợ lý giọng nói cho tài xế, những yêu cầu mà hệ thống phải đáp ứng và các tiêu chí dùng để đánh giá. Các mục tiêu và câu hỏi nghiên cứu nêu ở đây là căn cứ tổ chức nội dung các chương sau.

## 1.1. Bối cảnh và động lực nghiên cứu

Trong những năm gần đây, dịch vụ gọi xe công nghệ ngày càng phổ biến nhờ đáp ứng linh hoạt nhu cầu đi lại. Song song với sự mở rộng đó, tài xế phải thực hiện nhiều nghiệp vụ trong lúc điều khiển phương tiện: xem và xác nhận chuyến, cập nhật trạng thái đón và trả khách, liên lạc với khách hàng, tra cứu thông tin lộ trình. Các thao tác này thường diễn ra trên điện thoại thông minh, buộc tài xế rời mắt khỏi mặt đường và rời một tay khỏi vô-lăng trong khi vẫn phải tập trung vào giao thông.

Nhiều bằng chứng thực nghiệm đã chỉ ra mối liên hệ giữa việc sử dụng điện thoại khi lái xe và nguy cơ mất an toàn. Phân tích trên dữ liệu lái xe tự nhiên quy mô lớn cho thấy các yếu tố liên quan đến người lái (sai sót, suy giảm khả năng, mệt mỏi, xao nhãng) hiện diện trong gần 90% số vụ va chạm được quan sát, và xao nhãng do thao tác thiết bị cầm tay làm tăng đáng kể nguy cơ va chạm (Dingus et al., 2016). Tổng hợp của Insurance Institute for Highway Safety (IIHS) cũng nêu nguy cơ va chạm cao gấp khoảng hai đến sáu lần khi người lái thao tác trên điện thoại so với khi không bị xao nhãng (Insurance Institute for Highway Safety, n.d.). Những số liệu này cho thấy nhu cầu về một phương thức tương tác không dùng tay (hands-free) bằng giọng nói, giúp tài xế giảm thời gian nhìn và chạm màn hình khi lái.

Về điều kiện kỹ thuật, các mô hình trí tuệ nhân tạo (Artificial Intelligence – AI) cho hội thoại hiện đã được cung cấp dưới dạng dịch vụ thương mại: nhận dạng giọng nói (Speech-to-Text – STT), mô hình ngôn ngữ lớn (Large Language Model – LLM) và tổng hợp giọng nói (Text-to-Speech – TTS) có thể ghép thành một chuỗi xử lý thời gian thực. Cơ chế gọi công cụ (function calling) cho phép mô hình ngôn ngữ không chỉ trả lời bằng ngôn ngữ tự nhiên mà còn thực thi nghiệp vụ thông qua giao diện lập trình ứng dụng (Application Programming Interface – API) (Schick et al., 2023). Hạ tầng truyền thông thời gian thực — WebRTC cho ứng dụng và SIP cho mạng điện thoại — cũng đã sẵn có dưới dạng dịch vụ (LiveKit Inc., n.d.).

Tuy nhiên, một hệ thống ghép từ các thành phần trên để vận hành thực tế phải đáp ứng các yêu cầu chất lượng khắt khe hơn một ứng dụng hỏi đáp thông thường. Trợ lý phải phản hồi đủ nhanh để không gây gián đoạn khi lái, phục vụ đồng thời nhiều phiên hội thoại, tiếp tục hoạt động khi một dịch vụ phụ trợ hoặc một nhà cung cấp AI bên ngoài gặp sự cố, và bảo vệ dữ liệu cá nhân của tài xế và khách hàng. Đây là các yêu cầu phi chức năng (Non-Functional Requirement – NFR) quyết định lựa chọn kiến trúc của hệ thống, và là động lực để luận văn xem xét kiến trúc microservices (Microservices Architecture – MSA) trên nền tảng điện toán đám mây.

Từ nhu cầu thực tiễn và điều kiện kỹ thuật trên, luận văn đặt vấn đề xây dựng và đánh giá một trợ lý giọng nói chuyên cho nghiệp vụ tài xế, trình bày ở mục 1.2.

## 1.2. Phát biểu bài toán

Bài toán đặt ra là thiết kế, triển khai và đánh giá một hệ thống trợ lý AI bằng giọng nói hỗ trợ tài xế khi đang vận hành chuyến đi. Hệ thống cần nghe yêu cầu của tài xế, hiểu ý định, thực hiện nghiệp vụ tương ứng trên hệ thống quản lý chuyến đi thông qua cơ chế gọi công cụ, rồi trả lời bằng giọng nói trong thời gian thực. Ngôn ngữ chính là tiếng Việt, vì đối tượng phục vụ là tài xế tại Việt Nam. Tiếng Anh được hỗ trợ như ngôn ngữ thứ hai cho cùng tập nghiệp vụ, phục vụ tài xế hoặc khách hàng không dùng tiếng Việt và để kiểm chứng rằng kiến trúc cho phép bổ sung ngôn ngữ mà không phải sửa luồng xử lý.

Cụ thể, trợ lý cần hỗ trợ ba nhóm nghiệp vụ:

- **Tra cứu và quản lý chuyến đi:** xem lịch trình, cập nhật trạng thái, hủy chuyến khi đủ điều kiện.
- **Liên lạc với khách hàng:** gọi điện và gửi tin nhắn cho khách thông qua dịch vụ phía máy chủ (backend).
- **Hỗ trợ trong lúc vận hành:** nhắc trước giờ đón, trả lời câu hỏi thường gặp về cách dùng ứng dụng.

Hệ thống phải hoạt động trên cả kênh trong ứng dụng (WebRTC) và kênh điện thoại (SIP) khi hệ thống gọi cho tài xế hoặc gọi cho khách hàng.

Bài toán không dừng ở việc duy trì hội thoại mà đòi hỏi hệ thống thực hiện đúng nghiệp vụ, kiểm soát độ trễ mà tài xế cảm nhận, hoạt động trong điều kiện nhiễu của khoang xe, đồng thời đáp ứng các yêu cầu về khả năng mở rộng và khả năng chịu lỗi của một hệ thống phân tán. Các yêu cầu này được cụ thể hóa thành mục tiêu và câu hỏi nghiên cứu ở các mục tiếp theo.

## 1.3. Mục tiêu nghiên cứu

Mục tiêu tổng quát của luận văn là xây dựng một giải pháp trợ lý AI bằng giọng nói giúp giảm thao tác thủ công trên thiết bị di động của tài xế xe công nghệ, đồng thời chứng minh tính khả thi kỹ thuật của giải pháp thông qua triển khai nguyên mẫu và đánh giá theo các chỉ số đo được.

Các mục tiêu cụ thể gồm:

1. Phân tích yêu cầu chức năng (Functional Requirement – FR) và yêu cầu phi chức năng cho trợ lý giọng nói dành cho tài xế; phân loại yêu cầu phi chức năng theo mô hình chất lượng chuẩn và đặc tả dưới dạng đo được.
2. Đề xuất kiến trúc hệ thống theo mô hình microservices, lập luận lựa chọn kiến trúc từ các yêu cầu phi chức năng; tách tác nhân hội thoại khỏi các dịch vụ nghiệp vụ, cho phép thay thế và dự phòng nhà cung cấp STT, LLM, TTS, và phân loại phiên hội thoại để giới hạn tập nghiệp vụ được phép thực hiện.
3. Triển khai hệ thống nguyên mẫu trên nền tảng truyền thông thời gian thực (WebRTC và SIP), ứng dụng di động của tài xế và các dịch vụ backend, với cấu hình hạ tầng dạng mã cho Amazon Web Services (AWS).
4. Đánh giá hệ thống theo từng yêu cầu đã đặc tả: độ trễ phản hồi, độ chính xác nhận dạng giọng nói, độ chính xác gọi công cụ và tỷ lệ hoàn thành nghiệp vụ, khả năng mở rộng và khả năng chịu lỗi.

Đối với mục tiêu 4, luận văn đặt trước các ngưỡng định hướng sau; đây là mốc kỳ vọng khi đánh giá, chưa phải kết quả đo (phương pháp đo trình bày ở Chương 6):

- **Độ trễ phản hồi:** khoảng thời gian từ khi tài xế kết thúc phát ngôn đến khi hệ thống bắt đầu phát âm thanh trả lời. Thay vì dùng giá trị trung bình, vốn che mất những lần phản hồi chậm, luận văn dùng chỉ số P95: sắp xếp mọi lần đo từ nhanh đến chậm, P95 là thời gian mà 95% số lần phản hồi nhanh hơn hoặc bằng. Ví dụ, P95 = 2 giây nghĩa là cứ 100 lượt hỏi thì tối đa 5 lượt phải chờ lâu hơn 2 giây. Ngưỡng định hướng là P95 ≤ 2 giây trên các luồng nghiệp vụ cốt lõi. Cơ sở lựa chọn ngưỡng trình bày ở Chương 2.
- **Tỷ lệ lỗi từ** (Word Error Rate – WER): tỷ lệ từ bị thay thế, bị xóa hoặc bị chèn so với câu tham chiếu. Luận văn không đặt ngưỡng tuyệt đối mà so sánh tương đối giữa điều kiện yên tĩnh và điều kiện nhiễu mô phỏng khoang xe.
- **Độ chính xác gọi công cụ và tỷ lệ hoàn thành nghiệp vụ:** báo cáo theo nhóm kịch bản.
- **Khả năng mở rộng và khả năng chịu lỗi:** đánh giá bằng thử nghiệm tải và tiêm lỗi trên môi trường mô phỏng; ngưỡng cụ thể được nêu cùng yêu cầu phi chức năng ở Chương 3.

## 1.4. Câu hỏi nghiên cứu

Luận văn định hướng trả lời các câu hỏi nghiên cứu (Research Question – RQ) sau:

- **RQ1.** Kiến trúc microservices, được lựa chọn từ các yêu cầu phi chức năng, có đáp ứng được yêu cầu về khả năng mở rộng và khả năng chịu lỗi của một trợ lý giọng nói thời gian thực thực thi nghiệp vụ qua gọi công cụ hay không?
- **RQ2.** Với các luồng nghiệp vụ cốt lõi (tra cứu chuyến, nhận hoặc từ chối chuyến, liên lạc khách hàng), độ trễ phản hồi đạt mức nào, và P95 có duy trì được ở mức không quá 2 giây hay không?
- **RQ3.** Tỷ lệ lỗi từ của khâu nhận dạng giọng nói thay đổi như thế nào giữa môi trường yên tĩnh và môi trường có nhiễu nền mô phỏng khoang xe?
- **RQ4.** Trên bộ kịch bản nghiệp vụ đã thiết kế, tỷ lệ chọn đúng công cụ và hoàn thành đúng nghiệp vụ đạt mức nào, và những lỗi phổ biến nào ảnh hưởng đến trải nghiệm không dùng tay của tài xế?

Mối liên hệ giữa mục tiêu cụ thể, câu hỏi nghiên cứu và chương trả lời được tóm tắt trong Bảng 1.1.

**Bảng 1.1.** Ánh xạ mục tiêu nghiên cứu, câu hỏi nghiên cứu và chương trả lời

| STT | Mục tiêu cụ thể | Câu hỏi nghiên cứu | Tiêu chí / chỉ số định hướng | Chương |
|---|---|---|---|---|
| 1 | Phân tích yêu cầu | Cơ sở cho RQ1–RQ4 | FR có điều kiện chấp nhận; NFR phân loại theo ISO/IEC 25010, đặc tả đo được | Chương 3 |
| 2 | Đề xuất kiến trúc | RQ1 | Lập luận chọn microservices từ NFR; kiến trúc trên AWS; sequence cho từng dịch vụ | Chương 4 |
| 3 | Triển khai nguyên mẫu | RQ1 | Dịch vụ backend, tác nhân hội thoại, ứng dụng tài xế, hạ tầng dạng mã | Chương 5 |
| 4 | Đánh giá theo yêu cầu | RQ1–RQ4 | Khả năng mở rộng, khả năng chịu lỗi (RQ1); P95 ≤ 2 giây (RQ2); WER (RQ3); độ đúng gọi công cụ, hoàn thành nghiệp vụ (RQ4) | Chương 6 |

## 1.5. Phạm vi và giới hạn nghiên cứu

### 1.5.1. Đối tượng, không gian và thời gian nghiên cứu

- **Đối tượng nghiên cứu:** trợ lý AI bằng giọng nói dành cho tài xế xe công nghệ và kiến trúc hệ thống phục vụ trợ lý; đối tượng sử dụng chính là tài xế, ngôn ngữ ưu tiên là tiếng Việt.
- **Không gian nghiên cứu:** hệ thống nguyên mẫu trên môi trường phát triển và thử nghiệm (LiveKit Cloud, các dịch vụ backend, ứng dụng di động, cấu hình triển khai AWS), không phải mạng lưới vận hành thương mại quy mô lớn.
- **Thời gian nghiên cứu:** giai đoạn thiết kế, triển khai và đánh giá trong quá trình thực hiện luận văn (2025–2026); số liệu thực nghiệm phản ánh cấu hình hệ thống tại thời điểm đo, được ghi rõ ở Chương 6.

### 1.5.2. Phạm vi nghiên cứu

Luận văn tập trung vào trợ lý giọng nói và kiến trúc tích hợp trợ lý với nền tảng vận hành chuyến đi, không nhằm xây dựng một hệ thống quản lý vận tải hoàn chỉnh (điều phối tối ưu toàn mạng, định giá cước, thanh toán, bảo hiểm). Ứng dụng di động, dịch vụ định danh và dịch vụ quản lý chuyến đi được xem là nền tảng tích hợp cần thiết để trợ lý thực thi nghiệp vụ thật, và được trình bày ở mức đủ để làm rõ cách các thành phần phối hợp.

Về chức năng, luận văn bao gồm: tương tác bằng giọng nói tiếng Việt và tiếng Anh; quản lý chuyến đi bằng giọng nói; liên lạc và xác nhận với khách hàng; nhắc lịch và trả lời câu hỏi thường gặp có truy xuất tri thức; kích hoạt trợ lý bằng từ khóa đánh thức (wake-word) trên ứng dụng tài xế. Hệ thống hoạt động trên kênh WebRTC trong ứng dụng và kênh SIP khi cần kết nối mạng điện thoại công cộng (Public Switched Telephone Network – PSTN). Các dịch vụ cấu thành hệ thống được đặt tên theo chức năng (Dịch vụ Định danh, Dịch vụ Chuyến đi và Điều phối, Dịch vụ Kênh liên lạc, Dịch vụ Nhật ký cuộc gọi, Dịch vụ Giám sát vận hành và Tác nhân hội thoại giọng nói); bảng đối chiếu tên chức năng với tên kỹ thuật trong mã nguồn đặt ở Phụ lục G.

### 1.5.3. Giới hạn

- **Mô hình AI:** luận văn không huấn luyện lại các mô hình STT, LLM, TTS mà dùng mô hình có sẵn của nhà cung cấp, thông qua một lớp trung gian để có thể thay nhà cung cấp khi cần.
- **Chức năng:** không bao gồm nhắn tin nhóm giữa các tài xế, dẫn đường từng ngã rẽ (đã có ứng dụng bản đồ chuyên dụng), xử lý tranh chấp thanh toán và khiếu nại pháp lý.
- **Môi trường thử nghiệm:** khả năng mở rộng và khả năng chịu lỗi được thử trên môi trường mô phỏng cục bộ, không trên hạ tầng AWS thật; số tài xế thật tham gia thử nghiệm còn ít.

Ảnh hưởng của các giới hạn này đến độ tin cậy của kết luận được thảo luận ở Chương 6.

## 1.6. Phương pháp nghiên cứu

Luận văn theo tiếp cận nghiên cứu khoa học thiết kế (design science research) với chu trình thiết kế – xây dựng – đánh giá. Bốn mục tiêu ở mục 1.3 tương ứng bốn giai đoạn: phân tích yêu cầu (Chương 3), thiết kế kiến trúc (Chương 4), triển khai nguyên mẫu (Chương 5) và đánh giá thực nghiệm (Chương 6). Mỗi yêu cầu được gán mã định danh và được đối chiếu qua quyết định thiết kế, thành phần hiện thực và kịch bản đánh giá (ma trận đối chiếu yêu cầu ở Phụ lục E). Việc đánh giá kết hợp bốn cách:

- Đo độ trễ và phân tích nhật ký của các phiên hội thoại thật.
- Đo tỷ lệ lỗi từ trên bộ câu tham chiếu.
- Chấm độ đúng gọi công cụ trên bộ kịch bản có kiểm soát.
- Thử tải và cố ý gây lỗi (fault injection) trên môi trường mô phỏng để kiểm chứng khả năng mở rộng và khả năng chịu lỗi.

## 1.7. Những đóng góp của luận văn

Luận văn hướng tới ba đóng góp chính:

1. **Xác định khoảng trống nghiên cứu:** thiếu một trợ lý giọng nói vừa hội thoại thời gian thực, vừa thực thi nghiệp vụ vận tải qua gọi công cụ, vừa được đánh giá theo tiêu chí của tài xế (Chương 2).
2. **Đề xuất và hiện thực một kiến trúc microservices có lập luận từ yêu cầu phi chức năng:** tác nhân hội thoại tách khỏi các dịch vụ nghiệp vụ, chuỗi xử lý STT – LLM kèm gọi công cụ – TTS có câu đệm và cơ chế dự phòng nhà cung cấp, phân loại phiên hội thoại theo ngữ cảnh, triển khai trên AWS (Chương 3–5).
3. **Xây dựng bộ kịch bản và khung đánh giá theo từng yêu cầu** (độ trễ, tỷ lệ lỗi từ, gọi công cụ, hoàn thành nghiệp vụ, khả năng mở rộng, khả năng chịu lỗi) cùng ma trận đối chiếu từ yêu cầu đến kết quả (Chương 6).

## 1.8. Cấu trúc luận văn

Ngoài chương này, luận văn gồm:

- **Chương 2:** cơ sở lý thuyết về trợ lý giọng nói, mô hình chất lượng phần mềm, kiến trúc microservices, điện toán đám mây và khoảng trống nghiên cứu.
- **Chương 3:** phân tích yêu cầu chức năng và phi chức năng.
- **Chương 4:** quyết định kiến trúc và thiết kế hệ thống.
- **Chương 5:** triển khai nguyên mẫu.
- **Chương 6:** thực nghiệm và đánh giá.
- **Kết luận:** đóng góp, hạn chế và hướng phát triển.

Các nội dung bổ trợ (danh mục công cụ, kịch bản hội thoại mẫu, ảnh màn hình, cấu hình môi trường, ma trận đối chiếu yêu cầu, bảng kiểm sequence và bảng ánh xạ tên thành phần) đặt ở Phụ lục.

## Kết luận chương

Chương 1 đã xác lập bối cảnh, bài toán, bốn mục tiêu và bốn câu hỏi nghiên cứu cùng các ngưỡng đánh giá định hướng. Trọng tâm nghiên cứu là trợ lý AI bằng giọng nói cho tài xế xe công nghệ và kiến trúc hệ thống đáp ứng các yêu cầu phi chức năng của trợ lý. Chương 2 trình bày cơ sở lý thuyết làm nền cho việc phân tích yêu cầu và lựa chọn kiến trúc.

---

## Tài liệu trích dẫn trong Chương 1 (bản nháp — sẽ gộp vào danh mục cuối)

1. Dingus, T. A., et al. (2016). https://doi.org/10.1073/pnas.1513271113
2. Insurance Institute for Highway Safety. (n.d.). https://www.iihs.org/research-areas/distracted-driving
3. Schick, T., et al. (2023). arXiv:2302.04761
4. LiveKit Inc. (n.d.). https://docs.livekit.io/agents/
