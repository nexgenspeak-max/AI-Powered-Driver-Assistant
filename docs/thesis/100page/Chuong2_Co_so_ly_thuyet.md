# Chương 2. Cơ sở lý thuyết và nghiên cứu liên quan

Chương này trình bày nền tảng kỹ thuật của trợ lý giọng nói, nền tảng kỹ nghệ phần mềm, nghiên cứu liên quan và khoảng trống nghiên cứu.

## 2.1. Kiến trúc chuỗi xử lý của trợ lý giọng nói

Một lượt hội thoại đi qua ba khâu nối tiếp: STT chuyển âm thanh thành văn bản; LLM hiểu văn bản rồi sinh câu trả lời hoặc chọn hành động nghiệp vụ; TTS chuyển câu trả lời thành âm thanh. Chuỗi theo tầng này cho phép thay từng khâu độc lập, nhưng độ trễ cộng dồn gồm thời gian nhận dạng xong phát ngôn, thời gian sinh token đầu tiên (time to first token; token là đơn vị chữ nhỏ nhất mô hình sinh ra) và thời gian tổng hợp đoạn âm thanh đầu. Các đánh giá trước đây chủ yếu dùng giọng nói sạch (Chen et al., 2024), trong khi tài xế nói trong nhiễu khoang xe và cần câu trả lời khớp dữ liệu thật, không bịa thông tin (hallucination).

## 2.2. Mô hình ngôn ngữ lớn có khả năng gọi công cụ

Cơ chế gọi công cụ (function calling) cho phép mô hình chọn một công cụ định nghĩa sẵn, điền tham số theo lược đồ, rồi hệ thống thực thi công cụ qua API của dịch vụ phía máy chủ (Schick et al., 2023); nhờ đó trợ lý nhận chuyến, cập nhật trạng thái, gọi khách thay tài xế. Ba khó khăn: công cụ gần nghĩa ("hủy chuyến đang chạy" và "từ chối chuyến mới") dễ bị chọn nhầm; thao tác khó hoàn tác cần tài xế xác nhận trước; câu trả lời bằng giọng nói phải ngắn vì tài xế không đọc lại được.

## 2.3. Truyền thông thời gian thực: WebRTC và SIP

WebRTC là bộ giao thức chuẩn cho thoại và video thời gian thực trên trình duyệt và ứng dụng (Alvestrand, 2021). Trong ứng dụng, tài xế tham gia một phòng hội thoại (room) trên máy chủ truyền thông cùng tác nhân hội thoại; khi cần nối mạng điện thoại công cộng (PSTN), hệ thống dùng giao thức khởi tạo phiên (Session Initiation Protocol – SIP) qua một đường trung kế SIP (SIP trunk), với cùng logic nghiệp vụ cho hai kênh. LiveKit Agents cung cấp khung để tác nhân tham gia phòng và tích hợp STT, LLM, TTS (LiveKit Inc., n.d.); luận văn dùng lại phần truyền âm thanh này.

## 2.4. Yêu cầu phần mềm và mô hình chất lượng

### 2.4.1. Bên liên quan, lớp người dùng và chân dung người dùng

Yêu cầu người dùng được viết theo góc nhìn người dùng, khác với yêu cầu hệ thống mô tả chi tiết điều phần mềm phải làm (Sommerville, 2016). Người dùng được chia thành các lớp theo tần suất, chức năng, hoàn cảnh và trình độ, có lớp ưu tiên khi xung đột (Wiegers & Beatty, 2013), và mỗi lớp được mô tả bằng một chân dung người dùng (persona) (Cooper et al., 2014). Luận văn có bốn lớp, tài xế là lớp ưu tiên (Bảng 3.1, mục 3.2).

### 2.4.2. Yêu cầu chức năng, yêu cầu phi chức năng và mô hình ISO/IEC 25010

Yêu cầu chức năng mô tả hệ thống phải làm gì; yêu cầu phi chức năng mô tả phải làm tốt đến mức nào. Luận văn phân loại NFR theo mô hình chất lượng sản phẩm ISO/IEC 25010:2023 với chín đặc tính: phù hợp chức năng, hiệu quả hiệu năng, tương thích, năng lực tương tác, độ tin cậy, bảo mật, khả năng bảo trì, tính linh hoạt và tính an toàn (ISO/IEC, 2023). Quy ước: **hiệu năng** là "hiệu quả hiệu năng", độ trễ thuộc hành vi thời gian; **tính khả dụng (usability)** dùng tương đương "năng lực tương tác"; **khả năng phục hồi (resilience)** gồm tính sẵn sàng, khả năng chịu lỗi và khả năng khôi phục, với mục tiêu là ngăn lỗi bên trong trở thành sự cố quan sát được (Bass et al., 2021).

### 2.4.3. Kịch bản thuộc tính chất lượng

Mỗi yêu cầu chất lượng được đặc tả bằng một kịch bản gồm sáu phần: nguồn kích thích, kích thích, môi trường, thành phần chịu tác động, phản ứng và thước đo phản ứng (Bass et al., 2021). Chương 3 đặc tả từng NFR theo cách này; các NFR đó là động lực kiến trúc (architectural drivers) cho Chương 4.

### 2.4.4. Tiêu chí chấp nhận

Tiêu chí chấp nhận là điều kiện sản phẩm phải thỏa mãn để được bên liên quan chấp nhận, kiểm thử được và cho kết quả đạt hoặc không đạt rõ ràng (ISTQB, n.d.). Luận văn viết tiêu chí theo dạng Given – When – Then của phát triển hướng hành vi (Behaviour-Driven Development – BDD) (North, 2006), ứng với môi trường, kích thích và phản ứng của kịch bản thuộc tính chất lượng.

## 2.5. Chiến thuật kiến trúc

Chiến thuật kiến trúc là một quyết định thiết kế tác động trực tiếp đến phản ứng của hệ thống đối với một thuộc tính chất lượng; chiến thuật nhỏ hơn mẫu kiến trúc, và một mẫu thường gói nhiều chiến thuật (Bass et al., 2021). Luận văn đi từ kịch bản chất lượng tới chiến thuật rồi tới mẫu kiến trúc; Bảng 2.1 liệt kê chiến thuật cho các thuộc tính chất lượng gắn với năm NFR (mục 3.3.5), cộng khả năng bảo trì, và tính chất microservices hiện thực hóa chúng.

**Bảng 2.1.** Các chiến thuật kiến trúc được sử dụng và tính chất microservices tương ứng

| Thuộc tính (chương trong Bass et al., 2021) | Chiến thuật sử dụng | Tính chất microservices hiện thực hóa |
|---|---|---|
| Hiệu năng (chương 9) | Giảm chi phí phụ trội; giới hạn thời gian thực thi; tăng tài nguyên; xử lý đồng thời; nhiều bản sao | Mở rộng độc lập từng dịch vụ (Newman, 2021) |
| Khả năng phục hồi – tính sẵn sàng (chương 4) | Phát hiện: giám sát, nhịp tim, ngoại lệ. Khôi phục: dự phòng, thử lại, suy giảm có kiểm soát | Thiết kế cho lỗi (Lewis & Fowler, 2014); cô lập lỗi một dịch vụ (Newman, 2021) |
| Bảo mật (chương 11) | Nhận diện, xác thực, phân quyền đối tượng truy cập; giới hạn truy cập và phơi lộ; mã hóa; lưu vết để kiểm tra lại (audit) | Mỗi dịch vụ sở hữu dữ liệu riêng (Lewis & Fowler, 2014) |
| Tính khả dụng (chương 13) | Hủy bỏ; duy trì mô hình tác vụ, người dùng, hệ thống | Hiện thực ở tác nhân và ứng dụng tài xế (mục 4.8) |
| Khả năng bảo trì | Không có chiến thuật riêng | Tổ chức theo năng lực nghiệp vụ, tự động hóa hạ tầng (Lewis & Fowler, 2014); triển khai độc lập (Newman, 2021) |

Khả năng mở rộng được đáp ứng bằng tăng tài nguyên và nhiều bản sao tính toán; tính khả dụng được bổ sung bằng 10 nguyên tắc của Nielsen (Nielsen, 1994), áp dụng ở mục 4.8.

## 2.6. Kiến trúc microservices

Kiến trúc microservices tổ chức ứng dụng thành các dịch vụ nhỏ chạy trong tiến trình riêng, giao tiếp qua cơ chế nhẹ như HTTP, xây quanh một năng lực nghiệp vụ và triển khai độc lập (Lewis & Fowler, 2014) (Dragoni et al., 2017). Ranh giới dịch vụ vẽ theo miền nghiệp vụ, mỗi dịch vụ ứng với một ngữ cảnh giới hạn (bounded context) và ẩn dữ liệu của mình (Newman, 2021), với các mẫu mỗi dịch vụ một cơ sở dữ liệu và cổng API (Richardson, 2018). Microservices có chi phí: phức tạp vận hành, khó kiểm thử và giám sát xuyên dịch vụ, khó nhất quán dữ liệu (Soldani et al., 2018), nên lựa chọn phải được lập luận từ yêu cầu; Chương 4 trình bày lập luận này dưới dạng bản ghi quyết định kiến trúc (Architecture Decision Record – ADR).

## 2.7. Điện toán đám mây: serverless và container

Điện toán không máy chủ (serverless) chuyển việc quản trị cho nhà cung cấp đám mây: nhà phát triển chỉ cung cấp hàm, nền tảng tự cấp phát, mở rộng theo số yêu cầu và tính phí theo mức dùng (Jonas et al., 2019). Mô hình hàm như dịch vụ (Function as a Service – FaaS), điển hình là AWS Lambda, hợp với API xử lý nhanh và phi trạng thái, nhưng có giới hạn thời gian chạy, độ trễ khởi động nguội (cold start: lần gọi đầu sau một thời gian không dùng phải chờ khởi tạo hàm) và không hợp với tác vụ giữ kết nối dài như tác nhân hội thoại; với tác vụ chạy dài, container được quản lý (Amazon ECS trên AWS Fargate) là lựa chọn thay thế, mở rộng theo chiều ngang bằng số bản sao. Hai trụ cột độ tin cậy và hiệu quả hiệu năng của AWS Well-Architected Framework (Amazon Web Services, 2024) ứng với các yêu cầu phục hồi, mở rộng và hiệu năng.

## 2.8. An toàn khi lái và cơ sở lựa chọn ngưỡng độ trễ

Hướng dẫn của NHTSA (Cục An toàn Giao thông Đường cao tốc Hoa Kỳ) đặt tiêu chí cho tác vụ vừa nhìn vừa dùng tay: mỗi lần rời mắt khỏi mặt đường trung bình không quá 2,0 giây, không quá 15% số lần dài hơn 2,0 giây, tổng thời gian rời mắt không quá 12 giây (National Highway Traffic Safety Administration, 2013); giọng nói giảm phần lớn các lần rời mắt đó. Khoảng lặng chuyển lượt trong hội thoại tự nhiên phổ biến nhất ở mức 0–200 mili-giây (Stivers et al., 2009), mức mà chuỗi STT – LLM – TTS qua mạng khó đạt; luận văn chọn ngưỡng P95 ≤ 2 giây như một ràng buộc kỹ thuật thực dụng, kết hợp câu đệm ngắn khi phản hồi chậm, và xem đây là lựa chọn thiết kế chứ không rút trực tiếp từ các tài liệu trên.

## 2.9. Nghiên cứu liên quan

Mỗi hướng dưới đây nêu hệ quả đối với luận văn.

### 2.9.1. Tương tác giọng nói trên xe và xao nhãng nhận thức

Đo tải thị giác và nhận thức khi người lái dùng hệ thống thông tin trên xe cho thấy nhiều chức năng gây xao nhãng đến mức không nên dùng khi lái, và giọng nói giảm thao tác nhìn, chạm nhưng không loại bỏ tải nhận thức (Strayer et al., 2019). Luận văn vì vậy giới hạn tập chức năng theo loại phiên (FR-L03), mỗi lượt trả lời một ý chính (NFR-01), và xem an toàn thực địa là giới hạn của phép đánh giá (mục 6.13).

### 2.9.2. Mô hình ngôn ngữ gọi công cụ và cách đánh giá

Mô hình ngôn ngữ học được cách gọi công cụ (Schick et al., 2023), và các bộ đo như Gorilla (Patil et al., 2023), ToolLLM (Qin et al., 2023) đánh giá độ chính xác gọi API ở quy mô hàng nghìn API. Bảng xếp hạng BFCL (Patil et al., 2025) chấm lời gọi hàm bằng so khớp cây cú pháp và cho thấy các mô hình mạnh đã làm tốt lời gọi đơn lượt, còn ghi nhớ, ra quyết định nhiều bước và suy luận dài vẫn là thách thức. Gần luận văn nhất là τ-bench (Yao et al., 2024): tác nhân trao đổi với người dùng giả lập theo chính sách nghiệp vụ, nhiệm vụ chỉ thành công khi trạng thái cơ sở dữ liệu cuối khớp mong đợi, và mô hình tốt nhất lúc công bố (GPT-4o) hoàn thành dưới 50%. Từ đó, "tỷ lệ hoàn thành nghiệp vụ" được định nghĩa theo trạng thái dữ liệu backend (mục 6.3), và thao tác có rủi ro được xác nhận hai bước.

### 2.9.3. Độ trễ và chuyển lượt trong hệ thống hội thoại

Nhiều hệ thống vẫn dựa vào ngưỡng im lặng để biết người dùng đã nói xong, gây chờ không tự nhiên hoặc ngắt lời (Skantze, 2021). Mô hình đầu cuối song công như Moshi (Défossez et al., 2024) đạt độ trễ khoảng 200 mili-giây so với vài giây của chuỗi theo tầng, nhưng chưa hỗ trợ gọi công cụ; luận văn vì vậy giữ chuỗi theo tầng, bù độ trễ bằng câu đệm và tách riêng thời gian phát hiện kết thúc phát ngôn khi phân tích điểm nghẽn (Bảng 6.4).

### 2.9.4. Trí tuệ nhân tạo trong dịch vụ gọi xe

Một hướng dùng mô hình ngôn ngữ làm tác nhân phân phối đơn, điều phối xe và điều tài xế tới khu vực đông khách (Lyu et al., 2025); hướng khác dùng chatbot giọng nói để tăng cảm giác an toàn cho hành khách (Alvarado Contreras et al., 2024). Cả hai khác đối tượng và bài toán với luận văn.

### 2.9.5. Kiến trúc microservices trong thực tiễn

Khảo sát các nhà thực hành đã chuyển sang microservices tổng hợp động lực (bảo trì, mở rộng) cùng vấn đề thường gặp (tách dữ liệu, giao tiếp giữa dịch vụ, phức tạp điều phối) (Taibi et al., 2017); cùng với Soldani et al. (2018), các công trình này xét hệ thống doanh nghiệp nói chung, chưa có công trình đánh giá microservices cho trợ lý giọng nói thực thi nghiệp vụ.

### 2.9.6. So sánh các công trình liên quan

Bảng 2.2 so sánh theo năm tiêu chí; "Một phần" là có đề cập nhưng không phải trọng tâm.

**Bảng 2.2.** So sánh luận văn với các công trình liên quan

| Công trình | Giọng nói thời gian thực | Gọi công cụ | Đối tượng tài xế | Kênh điện thoại | Đánh giá hệ thống phân tán |
|---|---|---|---|---|---|
| Strayer et al. (2019) | Có | Không | Có (người lái) | Không | Không |
| Patil et al. (2023) – Gorilla | Không | Có | Không | Không | Không |
| Yao et al. (2024) – τ-bench | Không (văn bản) | Có | Không | Không | Không |
| Chen et al. (2024) – VoiceBench | Một phần | Không | Không | Không | Không |
| Défossez et al. (2024) – Moshi | Có | Không | Không | Không | Không |
| Lyu et al. (2025) | Không | Một phần | Không | Không | Không |
| Alvarado Contreras et al. (2024) | Có | Không | Không (hành khách) | Không | Không |
| Taibi et al. (2017) | Không | Không | Không | Không | Một phần |
| **Luận văn này** | **Có** | **Có** | **Có** | **Có** | **Có (mô phỏng)** |

## 2.10. Chỉ số đánh giá

Luận văn dùng sáu chỉ số, mỗi chỉ số gắn với một câu hỏi nghiên cứu: độ trễ phản hồi P50, P95 (RQ2); tỷ lệ lỗi từ WER (RQ3); độ chính xác gọi công cụ và tỷ lệ hoàn thành nghiệp vụ (RQ4); khả năng mở rộng và khả năng phục hồi của hệ thống phân tán (RQ1). Định nghĩa và cách đo từng chỉ số ở mục 6.3.

## 2.11. Khoảng trống nghiên cứu và định hướng luận văn

Từ Bảng 2.2, luận văn xác định ba khoảng trống: (1) thiếu giải pháp tích hợp đồng thời hội thoại thời gian thực, gọi công cụ, nghiệp vụ của tài xế gọi xe và mục tiêu giảm thao tác khi lái; (2) nghiên cứu AI trong gọi xe nghiêng về nền tảng hoặc hành khách, chưa tập trung vào trợ lý thực thi nghiệp vụ cho tài xế; (3) các công trình về trợ lý giọng nói ít lập luận kiến trúc từ NFR và ít đánh giá khả năng mở rộng, phục hồi của hệ thống phân tán. Các chương sau lấp các khoảng trống này.

## Kết luận chương

Chương 2 đã trình bày nền tảng kỹ thuật của trợ lý giọng nói (chuỗi STT – LLM – TTS, gọi công cụ, WebRTC và SIP) và nền tảng kỹ nghệ phần mềm: mô hình chất lượng ISO/IEC 25010, kịch bản thuộc tính chất lượng, tiêu chí chấp nhận Given – When – Then, chiến thuật kiến trúc và microservices như một mẫu gói các chiến thuật; các công trình liên quan cho thấy ba khoảng trống mà luận văn hướng tới. Chương 3 vận dụng các khái niệm này để phân tích yêu cầu của hệ thống.

