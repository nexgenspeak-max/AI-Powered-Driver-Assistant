# Chương 2. Cơ sở lý thuyết và nghiên cứu liên quan

Chương này trình bày nền tảng kỹ thuật của trợ lý giọng nói và nền tảng kỹ nghệ phần mềm, sau đó tổng quan các nghiên cứu liên quan để xác định khoảng trống nghiên cứu.

## 2.1. Kiến trúc chuỗi xử lý của trợ lý giọng nói

Một lượt hội thoại đi qua ba khâu nối tiếp. Khâu nhận dạng giọng nói (STT) chuyển âm thanh thành văn bản; mô hình ngôn ngữ lớn (LLM) hiểu văn bản, rồi sinh câu trả lời hoặc chọn hành động nghiệp vụ; khâu tổng hợp giọng nói (TTS) chuyển câu trả lời thành âm thanh. Chuỗi theo tầng này cho phép thay thế từng khâu độc lập, nhưng độ trễ của các khâu cộng dồn lại. Tổng độ trễ gồm thời gian để nhận dạng xong phát ngôn, thời gian sinh token đầu tiên (time to first token; token là đơn vị văn bản nhỏ nhất mà mô hình sinh ra) và thời gian tổng hợp đoạn âm thanh đầu tiên. Các đánh giá trước đây chủ yếu dùng giọng nói sạch (Chen et al., 2024), trong khi tài xế nói trong tiếng ồn của khoang xe và cần câu trả lời khớp với dữ liệu thật, không bịa thông tin (hallucination).

## 2.2. Mô hình ngôn ngữ lớn có khả năng gọi công cụ

Cơ chế gọi công cụ (function calling) cho phép mô hình chọn một công cụ được định nghĩa sẵn và điền tham số theo lược đồ; sau đó hệ thống thực thi công cụ qua API của dịch vụ phía máy chủ (Schick et al., 2023). Nhờ cơ chế này, trợ lý có thể nhận chuyến, cập nhật trạng thái hay gọi khách thay tài xế. Việc áp dụng cơ chế này gặp ba khó khăn. Thứ nhất, các công cụ gần nghĩa như "hủy chuyến đang chạy" và "từ chối chuyến mới" dễ bị chọn nhầm. Thứ hai, thao tác khó hoàn tác cần được tài xế xác nhận trước. Thứ ba, câu trả lời bằng giọng nói phải ngắn, vì tài xế không thể đọc lại.

## 2.3. Truyền thông thời gian thực: WebRTC và SIP

WebRTC là bộ giao thức chuẩn cho thoại và video thời gian thực trên trình duyệt và ứng dụng (Alvestrand, 2021). Trong hệ thống của luận văn, tài xế và tác nhân hội thoại cùng tham gia một phòng hội thoại (room) trên máy chủ truyền thông. Khi cần kết nối với mạng điện thoại công cộng (PSTN), hệ thống dùng giao thức khởi tạo phiên (Session Initiation Protocol – SIP) qua một đường trung kế SIP (SIP trunk); hai kênh dùng chung một logic nghiệp vụ. LiveKit Agents cung cấp khung để tác nhân tham gia phòng và tích hợp STT, LLM, TTS (LiveKit Inc., n.d.); luận văn tái sử dụng phần truyền âm thanh này.

## 2.4. Yêu cầu phần mềm và mô hình chất lượng

### 2.4.1. Bên liên quan, lớp người dùng và chân dung người dùng

Yêu cầu người dùng được viết theo góc nhìn của người dùng, khác với yêu cầu hệ thống, vốn mô tả chi tiết những gì phần mềm phải làm (Sommerville, 2016). Người dùng được chia thành các lớp theo tần suất sử dụng, chức năng sử dụng, hoàn cảnh và trình độ; khi yêu cầu giữa các lớp xung đột, lớp ưu tiên được đáp ứng trước (Wiegers & Beatty, 2013). Mỗi lớp được mô tả bằng một chân dung người dùng (persona) (Cooper et al., 2014). Luận văn xác định bốn lớp người dùng, trong đó tài xế là lớp ưu tiên (Bảng 3.1, mục 3.2).

### 2.4.2. Yêu cầu chức năng, yêu cầu phi chức năng và mô hình ISO/IEC 25010

Yêu cầu chức năng mô tả hệ thống phải làm gì; yêu cầu phi chức năng (NFR) mô tả hệ thống phải làm tốt đến mức nào. Luận văn phân loại NFR theo mô hình chất lượng sản phẩm ISO/IEC 25010:2023, gồm chín đặc tính: phù hợp chức năng, hiệu quả hiệu năng, tương thích, năng lực tương tác, độ tin cậy, bảo mật, khả năng bảo trì, tính linh hoạt và tính an toàn (ISO/IEC, 2023). Luận văn dùng các quy ước sau. **Hiệu năng** là cách gọi tắt của "hiệu quả hiệu năng", và độ trễ thuộc đặc tính con hành vi thời gian. **Tính khả dụng (usability)** được dùng tương đương với "năng lực tương tác". **Khả năng phục hồi (resilience)** gồm tính sẵn sàng, khả năng chịu lỗi và khả năng khôi phục; mục tiêu của nó là ngăn lỗi bên trong trở thành sự cố quan sát được (Bass et al., 2021).

### 2.4.3. Kịch bản thuộc tính chất lượng

Mỗi yêu cầu chất lượng được đặc tả bằng một kịch bản gồm sáu phần: nguồn kích thích, kích thích, môi trường, thành phần chịu tác động, phản ứng và thước đo phản ứng (Bass et al., 2021). Chương 3 đặc tả từng NFR theo cấu trúc này, và các NFR đó trở thành động lực kiến trúc (architectural drivers) cho thiết kế ở Chương 4.

### 2.4.4. Tiêu chí chấp nhận

Tiêu chí chấp nhận là các điều kiện mà sản phẩm phải thỏa mãn để được bên liên quan chấp nhận; mỗi tiêu chí phải kiểm thử được và cho kết quả đạt hoặc không đạt rõ ràng (ISTQB, n.d.). Luận văn viết tiêu chí theo dạng Given – When – Then của phát triển hướng hành vi (Behaviour-Driven Development – BDD) (North, 2006). Ba phần này lần lượt ứng với môi trường, kích thích và phản ứng trong kịch bản thuộc tính chất lượng.

## 2.5. Chiến thuật kiến trúc

Chiến thuật kiến trúc là một quyết định thiết kế tác động trực tiếp đến phản ứng của hệ thống đối với một thuộc tính chất lượng. Chiến thuật có phạm vi nhỏ hơn mẫu kiến trúc, và một mẫu thường gói nhiều chiến thuật (Bass et al., 2021). Luận văn đi từ kịch bản chất lượng đến chiến thuật, rồi đến mẫu kiến trúc. Bảng 2.1 liệt kê các chiến thuật cho những thuộc tính chất lượng gắn với năm NFR (mục 3.3.5) và cho khả năng bảo trì, kèm tính chất microservices hiện thực hóa các chiến thuật đó.

**Bảng 2.1.** Các chiến thuật kiến trúc được sử dụng và tính chất microservices tương ứng

| Thuộc tính (chương trong Bass et al., 2021) | Chiến thuật sử dụng | Tính chất microservices hiện thực hóa |
|---|---|---|
| Hiệu năng (chương 9) | Giảm chi phí phụ trội; giới hạn thời gian thực thi; tăng tài nguyên; xử lý đồng thời; nhiều bản sao | Mở rộng độc lập từng dịch vụ (Newman, 2021) |
| Khả năng phục hồi – tính sẵn sàng (chương 4) | Phát hiện: giám sát, nhịp tim, ngoại lệ. Khôi phục: dự phòng, thử lại, suy giảm có kiểm soát | Thiết kế cho lỗi (Lewis & Fowler, 2014); cô lập lỗi một dịch vụ (Newman, 2021) |
| Bảo mật (chương 11) | Nhận diện, xác thực, phân quyền đối tượng truy cập; giới hạn truy cập và mức phơi lộ; mã hóa; lưu vết để kiểm tra lại (audit) | Mỗi dịch vụ sở hữu dữ liệu riêng (Lewis & Fowler, 2014) |
| Tính khả dụng (chương 13) | Hủy bỏ; duy trì mô hình tác vụ, mô hình người dùng và mô hình hệ thống | Hiện thực trong tác nhân hội thoại và ứng dụng tài xế (mục 4.8) |
| Khả năng bảo trì | Không có chiến thuật riêng | Tổ chức theo năng lực nghiệp vụ, tự động hóa hạ tầng (Lewis & Fowler, 2014); triển khai độc lập (Newman, 2021) |

Khả năng mở rộng được đáp ứng bằng các chiến thuật tăng tài nguyên và nhiều bản sao tính toán. Tính khả dụng được bổ sung bằng 10 nguyên tắc của Nielsen (Nielsen, 1994), được áp dụng ở mục 4.8.

## 2.6. Kiến trúc microservices

Kiến trúc microservices tổ chức ứng dụng thành các dịch vụ nhỏ; mỗi dịch vụ chạy trong tiến trình riêng, giao tiếp qua cơ chế nhẹ như HTTP, được xây dựng quanh một năng lực nghiệp vụ và triển khai độc lập (Lewis & Fowler, 2014) (Dragoni et al., 2017). Ranh giới dịch vụ được vạch theo miền nghiệp vụ: mỗi dịch vụ ứng với một ngữ cảnh giới hạn (bounded context) và ẩn dữ liệu của mình (Newman, 2021). Đi kèm là các mẫu "mỗi dịch vụ một cơ sở dữ liệu" và "cổng API" (Richardson, 2018). Tuy nhiên, microservices có chi phí: vận hành phức tạp, khó kiểm thử và giám sát xuyên dịch vụ, khó bảo đảm nhất quán dữ liệu (Soldani et al., 2018). Vì vậy, lựa chọn kiến trúc này phải được lập luận từ yêu cầu; Chương 4 trình bày lập luận đó dưới dạng bản ghi quyết định kiến trúc (Architecture Decision Record – ADR).

## 2.7. Điện toán đám mây: serverless và container

Điện toán không máy chủ (serverless) chuyển việc quản trị hạ tầng cho nhà cung cấp đám mây: nhà phát triển chỉ cung cấp hàm, còn nền tảng tự cấp phát tài nguyên, mở rộng theo số yêu cầu và tính phí theo mức sử dụng (Jonas et al., 2019). Mô hình hàm như dịch vụ (Function as a Service – FaaS), điển hình là AWS Lambda, phù hợp với API xử lý nhanh và phi trạng thái. Tuy nhiên, FaaS có giới hạn thời gian chạy, có độ trễ khởi động nguội (cold start: lần gọi đầu tiên sau một thời gian không dùng phải chờ khởi tạo hàm) và không phù hợp với tác vụ giữ kết nối dài như tác nhân hội thoại. Với tác vụ chạy dài, container được quản lý (Amazon ECS trên AWS Fargate) là lựa chọn thay thế, mở rộng theo chiều ngang bằng cách tăng số bản sao. Hai trụ cột độ tin cậy và hiệu quả hiệu năng của AWS Well-Architected Framework (Amazon Web Services, 2024) tương ứng với các yêu cầu về khả năng phục hồi, khả năng mở rộng và hiệu năng.

## 2.8. An toàn khi lái và cơ sở lựa chọn ngưỡng độ trễ

Hướng dẫn của NHTSA (Cục An toàn Giao thông Đường cao tốc Hoa Kỳ) đặt tiêu chí cho các tác vụ đòi hỏi vừa nhìn vừa thao tác tay: mỗi lần rời mắt khỏi mặt đường kéo dài trung bình không quá 2,0 giây, không quá 15% số lần rời mắt dài hơn 2,0 giây, và tổng thời gian rời mắt không quá 12 giây (National Highway Traffic Safety Administration, 2013). Tương tác bằng giọng nói giảm được phần lớn các lần rời mắt đó. Trong hội thoại tự nhiên, khoảng lặng chuyển lượt phổ biến nhất ở mức 0–200 mili-giây (Stivers et al., 2009); chuỗi STT – LLM – TTS chạy qua mạng khó đạt mức này. Luận văn chọn ngưỡng P95 ≤ 2 giây làm ràng buộc kỹ thuật thực dụng, kết hợp với câu đệm ngắn khi phản hồi chậm. Ngưỡng này là một lựa chọn thiết kế, không được rút ra trực tiếp từ các tài liệu trên.

## 2.9. Nghiên cứu liên quan

Mỗi hướng nghiên cứu dưới đây được trình bày kèm hệ quả của nó đối với luận văn.

### 2.9.1. Tương tác giọng nói trên xe và xao nhãng nhận thức

Kết quả đo tải thị giác và tải nhận thức khi người lái dùng hệ thống thông tin trên xe cho thấy nhiều chức năng gây xao nhãng đến mức không nên dùng khi lái; giọng nói giảm thao tác nhìn và chạm nhưng không loại bỏ tải nhận thức (Strayer et al., 2019). Vì vậy, luận văn giới hạn tập chức năng theo loại phiên (FR-L03), yêu cầu mỗi lượt trả lời mang một ý chính (NFR-01), và coi an toàn trên thực địa là một giới hạn của phép đánh giá (mục 6.13).

### 2.9.2. Mô hình ngôn ngữ gọi công cụ và cách đánh giá

Mô hình ngôn ngữ có thể học được cách gọi công cụ (Schick et al., 2023). Các bộ đo như Gorilla (Patil et al., 2023) và ToolLLM (Qin et al., 2023) đánh giá độ chính xác gọi API ở quy mô hàng nghìn API. Bảng xếp hạng BFCL (Patil et al., 2025) chấm lời gọi hàm bằng cách so khớp cây cú pháp. Kết quả của BFCL cho thấy các mô hình mạnh đã xử lý tốt lời gọi đơn lượt, nhưng khả năng ghi nhớ, ra quyết định nhiều bước và suy luận dài vẫn là thách thức. Công trình gần với luận văn nhất là τ-bench (Yao et al., 2024). Trong τ-bench, tác nhân trao đổi với người dùng giả lập theo chính sách nghiệp vụ, và một nhiệm vụ chỉ thành công khi trạng thái cuối của cơ sở dữ liệu khớp với trạng thái mong đợi. Mô hình tốt nhất tại thời điểm công bố (GPT-4o) hoàn thành dưới 50% số nhiệm vụ. Từ đó, luận văn định nghĩa "tỷ lệ hoàn thành nghiệp vụ" theo trạng thái dữ liệu ở backend (mục 6.3) và áp dụng xác nhận hai bước cho các thao tác có rủi ro.

### 2.9.3. Độ trễ và chuyển lượt trong hệ thống hội thoại

Nhiều hệ thống vẫn dựa vào ngưỡng im lặng để xác định người dùng đã nói xong, dẫn đến khoảng chờ không tự nhiên hoặc ngắt lời người dùng (Skantze, 2021). Mô hình đầu cuối song công như Moshi (Défossez et al., 2024) đạt độ trễ khoảng 200 mili-giây, so với vài giây của chuỗi theo tầng, nhưng chưa hỗ trợ gọi công cụ. Vì vậy, luận văn giữ chuỗi theo tầng, bù độ trễ bằng câu đệm và tách riêng thời gian phát hiện kết thúc phát ngôn khi phân tích điểm nghẽn (Bảng 6.4).

### 2.9.4. Trí tuệ nhân tạo trong dịch vụ gọi xe

Một hướng nghiên cứu dùng mô hình ngôn ngữ làm tác nhân phân phối đơn, điều phối xe và điều tài xế tới khu vực đông khách (Lyu et al., 2025). Một hướng khác dùng chatbot giọng nói để tăng cảm giác an toàn cho hành khách (Alvarado Contreras et al., 2024). Cả hai hướng đều khác luận văn về đối tượng và bài toán.

### 2.9.5. Kiến trúc microservices trong thực tiễn

Một khảo sát với các nhà thực hành đã chuyển sang microservices tổng hợp các động lực chuyển đổi (bảo trì, mở rộng) và các vấn đề thường gặp (tách dữ liệu, giao tiếp giữa dịch vụ, điều phối phức tạp) (Taibi et al., 2017). Cùng với Soldani et al. (2018), các công trình này xét hệ thống doanh nghiệp nói chung; trong phạm vi khảo sát, chưa có công trình nào đánh giá microservices cho trợ lý giọng nói thực thi nghiệp vụ.

### 2.9.6. So sánh các công trình liên quan

Bảng 2.2 so sánh luận văn với các công trình liên quan theo năm tiêu chí; "Một phần" nghĩa là công trình có đề cập đến tiêu chí đó nhưng không xem là trọng tâm.

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

Luận văn dùng sáu chỉ số, mỗi chỉ số gắn với một câu hỏi nghiên cứu: độ trễ phản hồi P50 và P95 (RQ2); tỷ lệ lỗi từ WER (RQ3); độ chính xác gọi công cụ và tỷ lệ hoàn thành nghiệp vụ (RQ4); khả năng mở rộng và khả năng phục hồi của hệ thống phân tán (RQ1). Mục 6.3 trình bày định nghĩa và cách đo từng chỉ số.

## 2.11. Khoảng trống nghiên cứu và định hướng luận văn

Từ Bảng 2.2, luận văn xác định ba khoảng trống. (1) Còn thiếu giải pháp tích hợp đồng thời hội thoại thời gian thực, gọi công cụ, nghiệp vụ của tài xế gọi xe và mục tiêu giảm thao tác khi lái. (2) Nghiên cứu AI trong lĩnh vực gọi xe nghiêng về phía nền tảng hoặc hành khách, chưa tập trung vào trợ lý thực thi nghiệp vụ cho tài xế. (3) Các công trình về trợ lý giọng nói ít lập luận kiến trúc từ NFR và ít đánh giá khả năng mở rộng, khả năng phục hồi của hệ thống phân tán. Các chương tiếp theo giải quyết các khoảng trống này.

## Kết luận chương

Chương 2 đã trình bày nền tảng kỹ thuật của trợ lý giọng nói, gồm chuỗi STT – LLM – TTS, cơ chế gọi công cụ, WebRTC và SIP. Chương cũng trình bày nền tảng kỹ nghệ phần mềm: mô hình chất lượng ISO/IEC 25010, kịch bản thuộc tính chất lượng, tiêu chí chấp nhận dạng Given – When – Then, chiến thuật kiến trúc và microservices như một mẫu gói nhiều chiến thuật. Tổng quan các công trình liên quan cho thấy ba khoảng trống mà luận văn hướng tới. Chương 3 vận dụng các khái niệm này để phân tích yêu cầu của hệ thống.

