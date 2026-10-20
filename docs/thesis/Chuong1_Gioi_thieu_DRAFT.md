# Chương 1. Giới thiệu

Chương này xác lập bối cảnh, bài toán và định hướng của luận văn: lý do cần một trợ lý giọng nói cho tài xế, những yêu cầu mà hệ thống phải đáp ứng và các tiêu chí dùng để đánh giá. Các mục tiêu và câu hỏi nghiên cứu nêu ở đây là căn cứ tổ chức nội dung các chương sau.

## 1.1. Bối cảnh và động lực nghiên cứu

Trong những năm gần đây, dịch vụ gọi xe công nghệ ngày càng phổ biến nhờ đáp ứng linh hoạt nhu cầu đi lại. Trong lúc chạy xe, tài xế phải thực hiện nhiều nghiệp vụ: xem và xác nhận chuyến, cập nhật trạng thái đón và trả khách, liên lạc với khách hàng, tra cứu thông tin lộ trình. Các thao tác này thường diễn ra trên điện thoại thông minh, buộc tài xế rời mắt khỏi mặt đường và rời một tay khỏi vô-lăng trong khi vẫn phải tập trung vào giao thông.

Luận văn hướng tới mô hình vận hành của các hãng xe nhận đặt chuyến qua điện thoại và nhóm Zalo, có điều phối viên xếp chuyến cho tài xế. Mô hình này có bốn nhóm người tham gia. **Khách hàng** đặt xe bằng cách gọi điện hoặc nhắn tin vào nhóm Zalo của hãng. **Điều phối viên** tiếp nhận yêu cầu, tạo chuyến và gán tài xế. **Tài xế** nhận chuyến, đón khách và liên lạc với khách khi cần. **Quản trị viên hệ thống** bảo đảm các dịch vụ phần mềm hoạt động ổn định. Trong bốn nhóm này, tài xế là nhóm duy nhất phải thao tác trên hệ thống trong lúc điều khiển phương tiện, nên cũng là nhóm chịu rủi ro an toàn lớn nhất.

Nhiều bằng chứng thực nghiệm đã chỉ ra mối liên hệ giữa việc sử dụng điện thoại khi lái xe và nguy cơ mất an toàn. Phân tích hơn 900 vụ va chạm trong dữ liệu ghi lại từ xe của hơn 3.500 người lái trong điều kiện đi lại hằng ngày (nghiên cứu SHRP 2) cho thấy các yếu tố liên quan đến người lái (sai sót, suy giảm khả năng, mệt mỏi, xao nhãng) hiện diện trong gần 90% số vụ va chạm được quan sát, và xao nhãng do thao tác thiết bị cầm tay làm tăng đáng kể nguy cơ va chạm (Dingus et al., 2016). Tổng hợp của Insurance Institute for Highway Safety (IIHS) cũng nêu nguy cơ va chạm cao gấp khoảng hai đến sáu lần khi người lái thao tác trên điện thoại so với khi không bị xao nhãng (Insurance Institute for Highway Safety, n.d.). Vì vậy, tương tác bằng giọng nói, không cần dùng tay (hands-free), là một hướng giúp tài xế giảm thời gian nhìn và chạm màn hình khi lái; mục 2.9.1 trình bày giới hạn của hướng này.

Về điều kiện kỹ thuật, các mô hình trí tuệ nhân tạo (Artificial Intelligence – AI) cho hội thoại hiện đã được cung cấp dưới dạng dịch vụ thương mại: nhận dạng giọng nói (Speech-to-Text – STT), mô hình ngôn ngữ lớn (Large Language Model – LLM) và tổng hợp giọng nói (Text-to-Speech – TTS) có thể ghép thành một chuỗi xử lý thời gian thực. Cơ chế gọi công cụ (function calling) cho phép mô hình ngôn ngữ, ngoài việc trả lời bằng lời, chọn một chức năng của hệ thống (ví dụ "xác nhận chuyến") kèm tham số, để phần mềm thực hiện chức năng đó qua giao diện lập trình ứng dụng (Application Programming Interface – API) (Schick et al., 2023). Hạ tầng truyền âm thanh thời gian thực cũng đã có sẵn dưới dạng dịch vụ: WebRTC truyền âm thanh giữa ứng dụng và máy chủ qua Internet, SIP nối hệ thống với mạng điện thoại thường (LiveKit Inc., n.d.).

Tuy nhiên, một hệ thống ghép từ các thành phần trên để vận hành thực tế phải đáp ứng các yêu cầu chất lượng khắt khe hơn một ứng dụng hỏi đáp thông thường. Trợ lý phải phản hồi đủ nhanh để không gây gián đoạn khi lái, phục vụ đồng thời nhiều phiên hội thoại, tiếp tục hoạt động khi một dịch vụ phụ trợ (ví dụ dịch vụ gửi tin nhắn) hoặc một nhà cung cấp AI bên ngoài gặp sự cố, và bảo vệ dữ liệu cá nhân của tài xế và khách hàng. Đây là các yêu cầu phi chức năng (Non-Functional Requirement – NFR) quyết định lựa chọn kiến trúc của hệ thống, và là động lực để luận văn xem xét kiến trúc microservices (Microservices Architecture – MSA) trên nền tảng điện toán đám mây.

Từ nhu cầu thực tiễn và điều kiện kỹ thuật trên, luận văn đặt vấn đề xây dựng và đánh giá một trợ lý giọng nói dành riêng cho công việc của tài xế, trình bày ở mục 1.2.

## 1.2. Phát biểu bài toán

Bài toán đặt ra là thiết kế, triển khai và đánh giá một hệ thống trợ lý AI bằng giọng nói hỗ trợ tài xế trong lúc chạy chuyến. Hệ thống cần nghe yêu cầu của tài xế, hiểu ý định, thực hiện nghiệp vụ tương ứng trên hệ thống quản lý chuyến đi thông qua cơ chế gọi công cụ, rồi trả lời bằng giọng nói trong thời gian thực. Ngôn ngữ chính là tiếng Việt, vì đối tượng phục vụ là tài xế tại Việt Nam. Tiếng Anh được hỗ trợ như ngôn ngữ thứ hai cho cùng tập nghiệp vụ, phục vụ tài xế hoặc khách hàng không dùng tiếng Việt và để kiểm chứng rằng kiến trúc cho phép bổ sung ngôn ngữ mà không phải sửa luồng xử lý.

Cụ thể, trợ lý cần hỗ trợ ba nhóm nghiệp vụ:

- **Tra cứu và quản lý chuyến đi:** xem lịch trình, cập nhật trạng thái, hủy chuyến khi đủ điều kiện.
- **Liên lạc với khách hàng:** gọi điện và gửi tin nhắn cho khách thông qua dịch vụ phía máy chủ (backend).
- **Hỗ trợ trong lúc vận hành:** nhắc trước giờ đón, trả lời câu hỏi thường gặp về cách dùng ứng dụng.

Hệ thống phải hoạt động trên hai kênh: trong ứng dụng tài xế (WebRTC) và qua cuộc gọi điện thoại thường (SIP), kênh thứ hai dùng khi hệ thống gọi cho tài xế hoặc cho khách hàng.

Để trợ lý vận hành được trong một quy trình thật, hệ thống còn phải phục vụ ba nhóm người dùng còn lại:

- **Khách hàng:** không cần cài ứng dụng; nhận cuộc gọi do trợ lý thực hiện thay tài xế, nói chuyện trực tiếp với tài xế khi cần và nhận tin nhắn xác nhận chuyến trên điện thoại thường.
- **Điều phối viên:** tạo chuyến từ yêu cầu đặt xe của khách, mời tài xế nhận chuyến, quản lý tài xế, khách hàng và xem nhật ký cuộc gọi.
- **Quản trị viên hệ thống:** theo dõi tình trạng các dịch vụ, cấu hình của trợ lý và chất lượng vận hành của trợ lý theo từng ngày.

Ngoài việc hội thoại được, hệ thống phải thực hiện đúng nghiệp vụ, giữ độ trễ ở mức tài xế chấp nhận được, hoạt động trong tiếng ồn của khoang xe, và đáp ứng yêu cầu về khả năng mở rộng và khả năng phục hồi của một hệ thống phân tán. Các yêu cầu này được cụ thể hóa thành mục tiêu và câu hỏi nghiên cứu ở các mục tiếp theo.

## 1.3. Mục tiêu nghiên cứu

Mục tiêu tổng quát của luận văn là xây dựng một giải pháp trợ lý AI bằng giọng nói giúp giảm thao tác thủ công trên thiết bị di động của tài xế xe công nghệ, và đánh giá tính khả thi kỹ thuật của giải pháp bằng một nguyên mẫu cùng các chỉ số đo được.

Các mục tiêu cụ thể gồm:

1. Phân tích yêu cầu chức năng (Functional Requirement – FR) theo từng nhóm người sử dụng (tài xế, khách hàng, điều phối viên, quản trị viên hệ thống) và yêu cầu phi chức năng của hệ thống; phân loại yêu cầu phi chức năng theo mô hình chất lượng chuẩn, đặc tả dưới dạng đo được và kèm tiêu chí chấp nhận kiểm thử được.
2. Đề xuất kiến trúc hệ thống theo mô hình microservices, lập luận lựa chọn kiến trúc từ các yêu cầu phi chức năng thông qua các chiến thuật kiến trúc (architectural tactics); tách tác nhân hội thoại (thành phần nghe, hiểu và trả lời tài xế) khỏi các dịch vụ nghiệp vụ; cho phép thay nhà cung cấp STT, LLM, TTS và tự chuyển sang nhà cung cấp dự phòng khi nhà cung cấp chính lỗi; phân biệt loại phiên hội thoại (trong ứng dụng, cuộc gọi mời nhận chuyến, cuộc gọi cho khách) để mỗi loại chỉ được thực hiện các nghiệp vụ phù hợp.
3. Triển khai hệ thống nguyên mẫu trên nền tảng truyền thông thời gian thực (WebRTC và SIP), ứng dụng di động của tài xế và các dịch vụ backend, với hạ tầng dạng mã (infrastructure as code: tài nguyên được mô tả bằng tệp cấu hình để triển khai tự động) cho Amazon Web Services (AWS).
4. Đánh giá hệ thống theo từng yêu cầu đã đặc tả: độ trễ phản hồi, độ chính xác nhận dạng giọng nói, độ chính xác gọi công cụ và tỷ lệ hoàn thành nghiệp vụ, khả năng mở rộng và khả năng phục hồi.

Đối với mục tiêu 4, luận văn đặt trước các ngưỡng định hướng (mốc kỳ vọng, chưa phải kết quả đo): độ trễ phản hồi, tính từ khi tài xế kết thúc phát ngôn đến khi hệ thống bắt đầu trả lời, có P95 ≤ 2 giây trên các luồng nghiệp vụ cốt lõi (P95 = 2 giây nghĩa là cứ 100 lượt hỏi thì tối đa 5 lượt phải chờ lâu hơn 2 giây; cơ sở chọn ngưỡng ở mục 2.8); tỷ lệ lỗi từ (Word Error Rate – WER) được so sánh tương đối giữa điều kiện yên tĩnh và điều kiện nhiễu mô phỏng khoang xe; độ chính xác gọi công cụ và tỷ lệ hoàn thành nghiệp vụ được báo cáo theo nhóm kịch bản; ngưỡng của khả năng mở rộng và khả năng phục hồi nêu cùng yêu cầu phi chức năng ở Chương 3. Cách đo cụ thể của từng chỉ số trình bày ở mục 6.3.

## 1.4. Câu hỏi nghiên cứu

Luận văn định hướng trả lời các câu hỏi nghiên cứu (Research Question – RQ) sau:

- **RQ1.** Kiến trúc microservices, được lựa chọn từ các yêu cầu phi chức năng, có đáp ứng được yêu cầu về khả năng mở rộng và khả năng phục hồi của một trợ lý giọng nói trả lời theo thời gian thực và thực hiện nghiệp vụ qua gọi công cụ hay không?
- **RQ2.** Với các luồng nghiệp vụ cốt lõi (tra cứu chuyến, nhận hoặc từ chối chuyến, liên lạc khách hàng), độ trễ phản hồi đạt mức nào so với ngưỡng P95 ≤ 2 giây, và thành phần nào trong chuỗi xử lý chi phối độ trễ đó?
- **RQ3.** Tỷ lệ lỗi từ của khâu nhận dạng giọng nói thay đổi như thế nào giữa môi trường yên tĩnh và môi trường có nhiễu nền mô phỏng khoang xe?
- **RQ4.** Trên bộ kịch bản nghiệp vụ đã thiết kế, tỷ lệ chọn đúng công cụ và hoàn thành đúng nghiệp vụ đạt mức nào, và những lỗi phổ biến nào ảnh hưởng đến trải nghiệm rảnh tay của tài xế?

Mối liên hệ giữa mục tiêu cụ thể, câu hỏi nghiên cứu và chương trả lời được tóm tắt trong Bảng 1.1.

**Bảng 1.1.** Ánh xạ mục tiêu nghiên cứu, câu hỏi nghiên cứu và chương trả lời

| STT | Mục tiêu cụ thể | Câu hỏi nghiên cứu | Tiêu chí / chỉ số định hướng | Chương |
|---|---|---|---|---|
| 1 | Phân tích yêu cầu | Cơ sở cho RQ1–RQ4 | FR theo nhóm người sử dụng; NFR phân loại theo ISO/IEC 25010, đặc tả đo được; tiêu chí chấp nhận dạng Given–When–Then | Chương 3 |
| 2 | Đề xuất kiến trúc | RQ1 | Lập luận chọn microservices từ NFR qua chiến thuật kiến trúc; mô hình cấu trúc và luồng hành vi trên AWS | Chương 4 |
| 3 | Triển khai nguyên mẫu | RQ1 | Dịch vụ backend, tác nhân hội thoại, ứng dụng tài xế, hạ tầng dạng mã | Chương 5 |
| 4 | Đánh giá theo yêu cầu | RQ1–RQ4 | Khả năng mở rộng, khả năng phục hồi (RQ1); P95 ≤ 2 giây (RQ2); WER (RQ3); độ chính xác gọi công cụ, tỷ lệ hoàn thành nghiệp vụ (RQ4) | Chương 6 |

## 1.5. Phạm vi và giới hạn nghiên cứu

### 1.5.1. Đối tượng, không gian và thời gian nghiên cứu

- **Đối tượng nghiên cứu:** trợ lý AI bằng giọng nói dành cho tài xế xe công nghệ và kiến trúc hệ thống phục vụ trợ lý. Hệ thống có bốn nhóm người sử dụng: tài xế, khách hàng, điều phối viên và quản trị viên hệ thống; tài xế là người dùng chính và là trọng tâm đánh giá, ngôn ngữ ưu tiên là tiếng Việt.
- **Không gian nghiên cứu:** hệ thống nguyên mẫu trên môi trường phát triển và thử nghiệm (LiveKit Cloud, các dịch vụ backend, ứng dụng di động, cấu hình triển khai AWS), không phải mạng lưới vận hành thương mại quy mô lớn.
- **Thời gian nghiên cứu:** giai đoạn thiết kế, triển khai và đánh giá trong quá trình thực hiện luận văn (2025–2026); số liệu thực nghiệm phản ánh cấu hình hệ thống tại thời điểm đo, được ghi rõ ở Chương 6.

### 1.5.2. Phạm vi nghiên cứu

Luận văn tập trung vào trợ lý giọng nói và kiến trúc tích hợp trợ lý với nền tảng vận hành chuyến đi, không nhằm xây dựng một hệ thống quản lý vận tải hoàn chỉnh (tự động phân chuyến tối ưu cho cả đội xe, tính giá cước, thanh toán, bảo hiểm). Ứng dụng di động, dịch vụ định danh và dịch vụ quản lý chuyến đi được xem là nền tảng tích hợp cần thiết để trợ lý thực thi nghiệp vụ thật, và được trình bày ở mức đủ để làm rõ cách các thành phần phối hợp.

Về chức năng, ngoài ba nhóm nghiệp vụ ở mục 1.2, phạm vi gồm hai chức năng hỗ trợ: hội thoại song ngữ Việt – Anh và kích hoạt trợ lý bằng từ khóa đánh thức (wake-word). Kênh SIP được dùng khi cần kết nối mạng điện thoại công cộng (Public Switched Telephone Network – PSTN). Các dịch vụ cấu thành hệ thống được đặt tên theo chức năng (Dịch vụ Định danh, Dịch vụ Chuyến đi và Điều phối, Dịch vụ Liên lạc bằng tin nhắn, Dịch vụ Nhật ký cuộc gọi, Dịch vụ Giám sát vận hành và Dịch vụ Liên lạc hội thoại thời gian thực). Dịch vụ Liên lạc hội thoại thời gian thực chạy tác nhân hội thoại giọng nói (conversational agent); trong luận văn, từ "tác nhân" được dùng khi nói về hành vi hội thoại của dịch vụ này. Tên thư mục mã nguồn của từng dịch vụ có ở Bảng 5.2.

### 1.5.3. Giới hạn

- **Mô hình AI:** luận văn không huấn luyện lại các mô hình STT, LLM, TTS mà dùng mô hình có sẵn của nhà cung cấp, thông qua một lớp trung gian trong mã nguồn để có thể đổi nhà cung cấp mà không sửa phần còn lại.
- **Chức năng:** không bao gồm nhắn tin nhóm giữa các tài xế, dẫn đường từng ngã rẽ bằng giọng nói (đã có ứng dụng bản đồ chuyên dụng; ứng dụng tài xế chỉ hiển thị chỉ dẫn trên màn hình), xử lý tranh chấp thanh toán và khiếu nại pháp lý.
- **Môi trường thử nghiệm:** khả năng mở rộng và khả năng phục hồi được thử trên môi trường mô phỏng cục bộ, không trên hạ tầng AWS thật; chưa có thử nghiệm với tài xế thật, các phiên hội thoại do tác giả thực hiện.

Ảnh hưởng của các giới hạn này đến độ tin cậy của kết luận được thảo luận ở Chương 6.

## 1.6. Phương pháp nghiên cứu

Luận văn theo phương pháp nghiên cứu khoa học thiết kế (design science research – DSR). Trong phương pháp này, tri thức được tạo ra bằng cách xây dựng một sản phẩm thiết kế (artifact) để giải quyết một bài toán thực tiễn, rồi đánh giá chặt chẽ sản phẩm đó (Hevner et al., 2004). Sản phẩm thiết kế của luận văn gồm kiến trúc hệ thống và nguyên mẫu trợ lý giọng nói. Quy trình nghiên cứu được tổ chức theo sáu hoạt động của Peffers et al. (2007); Bảng 1.2 ánh xạ từng hoạt động vào phần tương ứng của luận văn.

**Bảng 1.2.** Ánh xạ các hoạt động nghiên cứu khoa học thiết kế vào luận văn

| STT | Hoạt động (Peffers et al., 2007) | Nội dung trong luận văn | Vị trí |
|---|---|---|---|
| 1 | Xác định vấn đề và động lực | Rủi ro khi tài xế thao tác điện thoại lúc lái; yêu cầu chất lượng của trợ lý thực thi nghiệp vụ | Mục 1.1, 1.2 |
| 2 | Xác định mục tiêu của giải pháp | Mục tiêu, câu hỏi nghiên cứu, yêu cầu chức năng và phi chức năng, tiêu chí chấp nhận | Mục 1.3, 1.4; Chương 3 |
| 3 | Thiết kế và phát triển | Quyết định kiến trúc, mô hình cấu trúc và luồng hành vi, nguyên mẫu | Chương 4, Chương 5 |
| 4 | Minh họa | Phiên hội thoại thật trên nguyên mẫu, kịch bản thoại mẫu | Chương 5; Phụ lục B |
| 5 | Đánh giá | Đo theo từng tiêu chí chấp nhận AC-01 đến AC-19 | Chương 6 |
| 6 | Truyền đạt | Luận văn và mã nguồn công khai | Toàn văn; mục 5.2 |

Chiến lược đánh giá được chọn theo khung FEDS (Venable et al., 2016). Rủi ro chính của đề tài là rủi ro kỹ thuật: độ trễ, gọi sai công cụ, hệ thống ngừng khi một thành phần lỗi. Vì vậy luận văn chọn chiến lược "rủi ro kỹ thuật và hiệu quả" (technical risk and efficacy). Chiến lược này bắt đầu bằng đánh giá trong điều kiện nhân tạo, chưa cần người dùng thật (kiểm thử tự động, môi trường mô phỏng, bộ câu tham chiếu), để phát hiện sớm rủi ro kỹ thuật, rồi mới chuyển sang đánh giá với người dùng thật. Luận văn thực hiện giai đoạn đầu của chiến lược, kèm một số phiên hội thoại thật do tác giả thực hiện trên nguyên mẫu; đánh giá với tài xế thật chưa được thực hiện (mục 6.13). Việc đánh giá kết hợp bốn cách:

- Đo độ trễ và phân tích nhật ký của các phiên hội thoại thật.
- Đo tỷ lệ lỗi từ trên bộ câu tham chiếu.
- Chấm thủ công việc trợ lý chọn đúng công cụ trên bộ kịch bản soạn sẵn.
- Thử tải và tiêm lỗi (fault injection: cố ý làm một thành phần bị lỗi để xem hệ thống phản ứng ra sao) trên môi trường mô phỏng để kiểm chứng khả năng mở rộng và khả năng phục hồi.

Mỗi yêu cầu được gán một mã (ví dụ FR-T01, NFR-02) và được theo dõi qua quyết định thiết kế, thành phần hiện thực và kịch bản đánh giá (ma trận đối chiếu yêu cầu ở Phụ lục E). Các mối đe dọa đối với độ tin cậy của kết quả được phân tích theo bốn loại của Wohlin et al. (2012): độ tin cậy nội tại, độ tin cậy bên ngoài, độ tin cậy cấu trúc và độ tin cậy của kết luận (mục 6.13).

## 1.7. Những đóng góp của luận văn

Luận văn có bốn đóng góp. Mức độ mới của từng đóng góp so với các công trình liên quan được đối chiếu ở Bảng 2.3.

1. **Kiến trúc tham chiếu cho trợ lý giọng nói thực thi nghiệp vụ:** kiến trúc microservices trên AWS được lập luận từ năm yêu cầu phi chức năng qua các chiến thuật kiến trúc, trình bày bằng một mô hình kiến trúc tổng thể và bốn mô hình luồng hành vi, mỗi mô hình cho một nhóm người sử dụng, kèm phân tích đánh đổi và rủi ro (Chương 3, Chương 4).
2. **Nguyên mẫu hoạt động đầu cuối, mã nguồn công khai:** chuỗi xử lý STT – LLM kèm gọi công cụ – TTS có câu đệm (câu ngắn "Đợi mình một chút…" phát khi câu trả lời chưa sẵn sàng sau khoảng 2 giây) và nhà cung cấp dự phòng, phân loại phiên hội thoại, hoạt động trên cả WebRTC và SIP, kèm hạ tầng dạng mã cho từng dịch vụ (Chương 5).
3. **Khung đánh giá gắn với tiêu chí chấp nhận:** 19 tiêu chí chấp nhận dạng Given – When – Then, bộ kịch bản đo và ma trận truy vết từ yêu cầu đến kết quả (Chương 3, Chương 6, Phụ lục E).
4. **Bằng chứng thực nghiệm về giới hạn của chuỗi xử lý theo tầng** (nhận dạng giọng nói, mô hình ngôn ngữ, tổng hợp giọng nói chạy nối tiếp): phân tích nhật ký cho thấy thời gian mô hình ngôn ngữ sinh ra phần đầu tiên của câu trả lời (token đầu) chiếm phần lớn độ trễ phản hồi, trong khi các biện pháp ở phía kiến trúc (tải sẵn dữ liệu của tài xế khi mở phiên, tách tác nhân khỏi API) chỉ rút ngắn được phần còn lại (Chương 6).

## 1.8. Cấu trúc luận văn

Ngoài chương này, luận văn gồm:

- **Chương 2:** cơ sở lý thuyết về trợ lý giọng nói, yêu cầu và mô hình chất lượng phần mềm, chiến thuật kiến trúc, kiến trúc microservices, điện toán đám mây và khoảng trống nghiên cứu.
- **Chương 3:** phân tích yêu cầu chức năng theo nhóm người sử dụng, yêu cầu phi chức năng và tiêu chí chấp nhận.
- **Chương 4:** quyết định kiến trúc và thiết kế hệ thống.
- **Chương 5:** triển khai nguyên mẫu.
- **Chương 6:** thực nghiệm và đánh giá.
- **Kết luận:** đóng góp, hạn chế và hướng phát triển.

Các nội dung bổ trợ (danh mục công cụ, kịch bản hội thoại mẫu, ảnh màn hình, cấu hình môi trường, ma trận đối chiếu yêu cầu, cách tái lập số liệu và bảng thuật ngữ) đặt ở Phụ lục.

## Kết luận chương

Chương 1 đã xác lập bối cảnh, bài toán, bốn mục tiêu và bốn câu hỏi nghiên cứu cùng các ngưỡng đánh giá định hướng, phương pháp nghiên cứu khoa học thiết kế và bốn đóng góp của luận văn. Trọng tâm nghiên cứu là trợ lý AI bằng giọng nói cho tài xế xe công nghệ và kiến trúc hệ thống đáp ứng các yêu cầu phi chức năng của trợ lý. Chương 2 trình bày cơ sở lý thuyết làm nền cho việc phân tích yêu cầu và lựa chọn kiến trúc.

---

## Tài liệu trích dẫn trong Chương 1 (bản nháp — sẽ gộp vào danh mục cuối)

1. Dingus, T. A., et al. (2016). https://doi.org/10.1073/pnas.1513271113
2. Insurance Institute for Highway Safety. (n.d.). https://www.iihs.org/research-areas/distracted-driving
3. Schick, T., et al. (2023). arXiv:2302.04761
4. LiveKit Inc. (n.d.). https://docs.livekit.io/agents/
