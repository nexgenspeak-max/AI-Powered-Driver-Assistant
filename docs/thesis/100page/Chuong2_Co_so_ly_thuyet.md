# Chương 2. Cơ sở lý thuyết và nghiên cứu liên quan

## 2.1. Kiến trúc chuỗi xử lý của trợ lý giọng nói

Một lượt hội thoại đi qua ba khâu: nhận dạng giọng nói (STT) chuyển âm thanh thành văn bản; mô hình ngôn ngữ lớn (LLM) sinh câu trả lời hoặc chọn hành động nghiệp vụ; tổng hợp giọng nói (TTS) chuyển câu trả lời thành âm thanh. Chuỗi theo tầng cho phép thay từng khâu độc lập nhưng cộng dồn độ trễ của các bước: phát hiện kết thúc phát ngôn, sinh token đầu tiên (time to first token; token là đơn vị văn bản nhỏ nhất mô hình sinh ra) và tổng hợp đoạn âm thanh đầu tiên. Các đánh giá trước đây chủ yếu dùng giọng nói sạch (Chen et al., 2024), trong khi tài xế nói trong tiếng ồn khoang xe và cần câu trả lời khớp dữ liệu thật, không bịa thông tin (hallucination).

## 2.2. Mô hình ngôn ngữ lớn có khả năng gọi công cụ

Gọi công cụ (function calling) cho phép mô hình chọn một công cụ định nghĩa sẵn và điền tham số theo lược đồ để hệ thống thực thi qua API phía máy chủ (Schick et al., 2023), nhờ đó trợ lý có thể nhận chuyến, cập nhật trạng thái hay gọi khách thay tài xế. Ba khó khăn là: công cụ gần nghĩa như "hủy chuyến đang chạy" và "từ chối chuyến mới" dễ bị chọn nhầm; thao tác khó hoàn tác cần tài xế xác nhận trước; câu trả lời bằng giọng nói phải ngắn vì tài xế không thể đọc lại.

## 2.3. Truyền thông thời gian thực: WebRTC và SIP

WebRTC là bộ giao thức chuẩn cho thoại và video thời gian thực (Alvestrand, 2021). Tài xế và tác nhân hội thoại cùng tham gia một phòng hội thoại (room) trên máy chủ truyền thông; kết nối với mạng điện thoại công cộng (PSTN) đi qua SIP trunk và dùng chung logic nghiệp vụ. Luận văn dùng khung LiveKit Agents (LiveKit Inc., n.d.) để truyền âm thanh và tích hợp, dự phòng các nhà cung cấp STT, LLM, TTS (mục 5.3.4).

## 2.4. Yêu cầu phần mềm và mô hình chất lượng

### 2.4.1. Bên liên quan, lớp người dùng và chân dung người dùng

Yêu cầu người dùng viết theo góc nhìn người dùng, còn yêu cầu hệ thống mô tả chi tiết phần mềm phải làm gì (Sommerville, 2016). Người dùng được chia lớp theo tần suất, chức năng sử dụng, hoàn cảnh và trình độ; khi yêu cầu xung đột, lớp ưu tiên được đáp ứng trước (Wiegers & Beatty, 2013). Mỗi lớp được mô tả bằng một chân dung người dùng (persona) (Cooper et al., 2014). Luận văn xác định bốn lớp người dùng, trong đó tài xế là lớp ưu tiên (Bảng 3.1, mục 3.2).

### 2.4.2. Yêu cầu chức năng, yêu cầu phi chức năng và mô hình ISO/IEC 25010

Yêu cầu chức năng mô tả hệ thống phải làm gì; yêu cầu phi chức năng (NFR) mô tả hệ thống phải làm tốt đến mức nào. NFR được phân loại theo ISO/IEC 25010:2023 với chín đặc tính: phù hợp chức năng, hiệu quả hiệu năng, tương thích, năng lực tương tác, độ tin cậy, bảo mật, khả năng bảo trì, tính linh hoạt và tính an toàn (ISO/IEC, 2023). Quy ước: **hiệu năng** là cách gọi tắt của "hiệu quả hiệu năng", độ trễ thuộc đặc tính con hành vi thời gian; **tính khả dụng (usability)** tương đương "năng lực tương tác"; **khả năng mở rộng (scalability)** là đặc tính con của tính linh hoạt; **khả năng phục hồi (resilience)** gồm ba đặc tính con của độ tin cậy là tính sẵn sàng, khả năng chịu lỗi và khả năng khôi phục, nhằm ngăn lỗi bên trong trở thành sự cố quan sát được (Bass et al., 2021).

### 2.4.3. Kịch bản thuộc tính chất lượng

Mỗi yêu cầu chất lượng được đặc tả bằng kịch bản sáu phần: nguồn kích thích, kích thích, môi trường, thành phần chịu tác động, phản ứng và thước đo phản ứng (Bass et al., 2021). Các NFR ở Chương 3 được đặc tả theo cấu trúc này và là động lực kiến trúc (architectural drivers) cho thiết kế ở Chương 4.

### 2.4.4. Tiêu chí chấp nhận

Tiêu chí chấp nhận là điều kiện sản phẩm phải thỏa mãn để được bên liên quan chấp nhận; tiêu chí phải kiểm thử được và cho kết quả đạt/không đạt rõ ràng (ISTQB, n.d.). Luận văn viết tiêu chí theo dạng Given – When – Then của phát triển hướng hành vi (Behaviour-Driven Development – BDD) (North, 2006); ba phần này ứng với môi trường, kích thích và phản ứng của kịch bản thuộc tính chất lượng.

## 2.5. Chiến thuật kiến trúc

Chiến thuật kiến trúc là quyết định thiết kế tác động trực tiếp đến phản ứng của hệ thống đối với một thuộc tính chất lượng; một mẫu kiến trúc thường gói nhiều chiến thuật (Bass et al., 2021). Luận văn đi từ kịch bản chất lượng đến chiến thuật rồi đến mẫu; Bảng 2.1 liệt kê chiến thuật cho các thuộc tính gắn với năm NFR (mục 3.4.1) và tính chất microservices tương ứng.

**Bảng 2.1.** Các chiến thuật kiến trúc được sử dụng và tính chất microservices tương ứng

| Thuộc tính (chương trong Bass et al., 2021) | Chiến thuật sử dụng | Tính chất microservices hiện thực hóa |
|---|---|---|
| Hiệu năng (chương 9) | Kiểm soát nhu cầu: giảm chi phí phụ trội, giới hạn thời gian thực thi. Quản lý tài nguyên: tăng tài nguyên, xử lý đồng thời, nhiều bản sao | Mở rộng độc lập từng dịch vụ (Newman, 2021) |
| Khả năng phục hồi – tính sẵn sàng (chương 4) | Phát hiện: giám sát, nhịp tim, ngoại lệ. Khôi phục: dự phòng, thử lại, suy giảm có kiểm soát | Thiết kế cho lỗi (Lewis & Fowler, 2014); cô lập lỗi một dịch vụ (Newman, 2021) |
| Bảo mật (chương 11) | Nhận diện, xác thực, phân quyền; giới hạn truy cập và mức phơi lộ; mã hóa; lưu vết (audit) | Mỗi dịch vụ sở hữu dữ liệu riêng (Lewis & Fowler, 2014) |
| Tính khả dụng (chương 13) | Hủy bỏ; duy trì mô hình tác vụ, người dùng và hệ thống | Hiện thực trong tác nhân hội thoại và ứng dụng tài xế (mục 4.8) |
| Khả năng bảo trì | Không có NFR riêng nên không chọn chiến thuật riêng | Tổ chức theo năng lực nghiệp vụ, tự động hóa hạ tầng (Lewis & Fowler, 2014); triển khai độc lập (Newman, 2021) |

Khả năng mở rộng dùng chiến thuật tăng tài nguyên và nhiều bản sao, hiện thực bằng nhiều bản sao tác nhân (AC-16, Bảng 3.8). Tính khả dụng được bổ sung bằng 10 nguyên tắc của Nielsen (Nielsen, 1994), áp dụng ở mục 4.8.

## 2.6. Kiến trúc microservices

Microservices tổ chức ứng dụng thành các dịch vụ nhỏ chạy trong tiến trình riêng, giao tiếp qua cơ chế nhẹ như HTTP, xây dựng quanh một năng lực nghiệp vụ và triển khai độc lập (Dragoni et al., 2017; Lewis & Fowler, 2014). Mỗi dịch vụ ứng với một ngữ cảnh giới hạn (bounded context) và ẩn dữ liệu của mình (Newman, 2021), kèm các mẫu "mỗi dịch vụ một cơ sở dữ liệu" và "cổng API" (Richardson, 2018). Đổi lại là vận hành phức tạp, khó kiểm thử, giám sát xuyên dịch vụ và khó bảo đảm nhất quán dữ liệu (Soldani et al., 2018), nên việc chọn microservices phải được lập luận từ yêu cầu và ghi lại trong bản ghi quyết định kiến trúc (Architecture Decision Record – ADR) ở Chương 4.

## 2.7. Điện toán đám mây: serverless và container

Điện toán không máy chủ (serverless) giao quản trị hạ tầng cho nhà cung cấp: nền tảng tự cấp phát, mở rộng theo số yêu cầu và tính phí theo mức dùng (Jonas et al., 2019). Hàm như dịch vụ (Function as a Service – FaaS), điển hình là AWS Lambda, phù hợp với API nhanh, phi trạng thái, nhưng bị giới hạn thời gian chạy và độ trễ khởi động nguội (cold start: lần gọi đầu sau thời gian nhàn rỗi phải chờ khởi tạo hàm), nên không phù hợp với tác nhân hội thoại vốn giữ kết nối dài; tác nhân này chạy trên container được quản lý (Amazon ECS trên AWS Fargate), mở rộng ngang bằng cách tăng số bản sao. Hai trụ cột độ tin cậy và hiệu quả hiệu năng của AWS Well-Architected Framework (Amazon Web Services, 2024) tương ứng với các yêu cầu về khả năng phục hồi, khả năng mở rộng và hiệu năng.

## 2.8. An toàn khi lái và cơ sở lựa chọn ngưỡng độ trễ

Hướng dẫn của Cục Quản lý An toàn Giao thông Đường cao tốc Quốc gia Hoa Kỳ (NHTSA) đặt tiêu chí cho tác vụ vừa nhìn vừa thao tác tay: mỗi lần rời mắt trung bình không quá 2,0 giây, không quá 15% số lần rời mắt dài hơn 2,0 giây, tổng thời gian rời mắt không quá 12 giây (National Highway Traffic Safety Administration, 2013). Giọng nói giảm rời mắt nhưng không loại bỏ tải nhận thức (mục 2.9.1). Khoảng lặng chuyển lượt phổ biến nhất trong hội thoại tự nhiên là 0–200 mili-giây (Stivers et al., 2009), mức mà chuỗi STT – LLM – TTS qua mạng khó đạt. Luận văn chọn P95 ≤ 2 giây làm ràng buộc kỹ thuật thực dụng, kèm câu đệm ngắn khi phản hồi chậm; đây là lựa chọn thiết kế, không rút ra trực tiếp từ các tài liệu trên.

## 2.9. Nghiên cứu liên quan

### 2.9.1. Tương tác giọng nói trên xe và xao nhãng nhận thức

Đo tải thị giác và nhận thức với hệ thống thông tin trên xe cho thấy nhiều chức năng gây xao nhãng đến mức không nên dùng khi lái; giọng nói giảm thao tác nhìn và chạm nhưng không loại bỏ tải nhận thức (Strayer et al., 2019). Vì vậy, luận văn giới hạn chức năng theo loại phiên (FR-L03), yêu cầu mỗi lượt trả lời một ý chính (NFR-01, mục 4.8) và coi an toàn thực địa là giới hạn của đánh giá (mục 6.13).

### 2.9.2. Mô hình ngôn ngữ gọi công cụ và cách đánh giá

Mô hình ngôn ngữ có thể học cách gọi công cụ (Schick et al., 2023). Gorilla (Patil et al., 2023) và ToolLLM (Qin et al., 2023) đánh giá độ chính xác gọi API ở quy mô hàng nghìn API. BFCL (Patil et al., 2025) chấm bằng so khớp cây cú pháp và cho thấy mô hình mạnh đã làm tốt lời gọi đơn lượt, còn ghi nhớ, quyết định nhiều bước và suy luận dài vẫn là thách thức. Gần luận văn nhất là τ-bench (Yao et al., 2024): tác nhân trao đổi với người dùng giả lập theo chính sách nghiệp vụ, nhiệm vụ chỉ thành công khi trạng thái cuối của cơ sở dữ liệu khớp với trạng thái mong đợi; mô hình tốt nhất khi công bố (GPT-4o) hoàn thành dưới 50% nhiệm vụ. Từ đó, luận văn định nghĩa "tỷ lệ hoàn thành nghiệp vụ" theo trạng thái dữ liệu backend (mục 6.3) và áp dụng xác nhận hai bước cho thao tác rủi ro.

### 2.9.3. Độ trễ và chuyển lượt trong hệ thống hội thoại

Nhiều hệ thống dùng ngưỡng im lặng để xác định người dùng đã nói xong, gây khoảng chờ không tự nhiên hoặc ngắt lời (Skantze, 2021). Mô hình đầu cuối song công như Moshi (Défossez et al., 2024) đạt độ trễ khoảng 200 mili-giây, so với vài giây của chuỗi theo tầng, nhưng chưa hỗ trợ gọi công cụ. Vì vậy, luận văn giữ chuỗi theo tầng, bù độ trễ bằng câu đệm và tách riêng thời gian phát hiện kết thúc phát ngôn khi phân tích điểm nghẽn (Bảng 6.4).

### 2.9.4. Trí tuệ nhân tạo trong dịch vụ gọi xe

Một hướng nghiên cứu dùng mô hình ngôn ngữ làm tác nhân phân phối đơn, điều phối xe và điều tài xế tới khu vực đông khách (Lyu et al., 2025); hướng khác dùng chatbot giọng nói để tăng cảm giác an toàn cho hành khách (Alvarado Contreras et al., 2024). Cả hai khác luận văn về đối tượng và bài toán.

### 2.9.5. Kiến trúc microservices trong thực tiễn

Taibi et al. (2017) khảo sát các nhà thực hành đã chuyển sang microservices và tổng hợp động lực (bảo trì, mở rộng) cùng các vấn đề thường gặp (tách dữ liệu, giao tiếp giữa dịch vụ, điều phối phức tạp). Công trình này và Soldani et al. (2018) đều xét hệ thống doanh nghiệp nói chung; trong phạm vi khảo sát, chưa có công trình nào đánh giá microservices cho trợ lý giọng nói thực thi nghiệp vụ.

### 2.9.6. So sánh các công trình liên quan

Bảng 2.2 so sánh theo năm tiêu chí; "Một phần" nghĩa là có đề cập nhưng không phải trọng tâm.

**Bảng 2.2.** So sánh luận văn với các công trình liên quan

| Công trình | Giọng nói thời gian thực | Gọi công cụ | Đối tượng tài xế | Kênh điện thoại | Đánh giá hệ thống phân tán |
|---|---|---|---|---|---|
| Strayer et al. (2019) | Một phần | Không | Có (người lái) | Không | Không |
| Patil et al. (2023) – Gorilla | Không | Có | Không | Không | Không |
| Yao et al. (2024) – τ-bench | Không (văn bản) | Có | Không | Không | Không |
| Chen et al. (2024) – VoiceBench | Một phần | Không | Không | Không | Không |
| Défossez et al. (2024) – Moshi | Có | Không | Không | Không | Không |
| Lyu et al. (2025) | Không | Một phần | Không | Không | Không |
| Alvarado Contreras et al. (2024) | Có | Không | Không (hành khách) | Không | Không |
| Taibi et al. (2017) | Không | Không | Không | Không | Một phần |
| **Luận văn này** | **Có** | **Có** | **Có** | **Có** | **Có (mô phỏng)** |

## 2.10. Chỉ số đánh giá

Sáu chỉ số đánh giá gắn với các câu hỏi nghiên cứu: độ trễ phản hồi P50 và P95 (RQ2); tỷ lệ lỗi từ (WER) (RQ3); độ chính xác gọi công cụ và tỷ lệ hoàn thành nghiệp vụ (RQ4); khả năng mở rộng và khả năng phục hồi (RQ1). Định nghĩa và cách đo ở mục 6.3.

## 2.11. Khoảng trống nghiên cứu và định hướng luận văn

Từ Bảng 2.2 và mục 2.9.5, có ba khoảng trống: (1) thiếu giải pháp tích hợp đồng thời hội thoại thời gian thực, gọi công cụ, nghiệp vụ của tài xế gọi xe và mục tiêu giảm thao tác khi lái; (2) nghiên cứu AI trong gọi xe nghiêng về nền tảng hoặc hành khách, chưa tập trung vào trợ lý thực thi nghiệp vụ cho tài xế; (3) công trình về trợ lý giọng nói ít lập luận kiến trúc từ NFR và ít đánh giá khả năng mở rộng, khả năng phục hồi của hệ thống phân tán. Các chương sau giải quyết các khoảng trống này trong phạm vi mục 1.5.

## Kết luận chương

Chương 2 xác lập nền tảng kỹ thuật và kỹ nghệ phần mềm, sáu chỉ số đánh giá và ba khoảng trống nghiên cứu (mục 2.11). Chương 3 vận dụng các khái niệm này để phân tích yêu cầu.
