# Chương 2. Cơ sở lý thuyết và nghiên cứu liên quan

Chương này gồm ba phần. Mục 2.1 đến 2.3 trình bày nền tảng kỹ thuật của trợ lý giọng nói: chuỗi xử lý, gọi công cụ và truyền thông thời gian thực. Mục 2.4 đến 2.7 trình bày nền tảng kỹ nghệ phần mềm dùng ở Chương 3 và Chương 4: yêu cầu, mô hình chất lượng, chiến thuật kiến trúc, microservices và điện toán đám mây. Mục 2.8 đến 2.11 nêu cơ sở chọn ngưỡng độ trễ, các công trình và hệ thống liên quan, chỉ số đánh giá và khoảng trống mà luận văn hướng tới.

## 2.1. Kiến trúc chuỗi xử lý của trợ lý giọng nói

Một lượt hội thoại đi qua ba khâu: nhận dạng giọng nói (STT) chuyển âm thanh thành văn bản; mô hình ngôn ngữ lớn (LLM) sinh câu trả lời hoặc chọn hành động nghiệp vụ; tổng hợp giọng nói (TTS) chuyển câu trả lời thành âm thanh. Chuỗi theo tầng này cho phép thay thế từng khâu độc lập nhưng cộng dồn độ trễ của các bước: phát hiện kết thúc phát ngôn, sinh token đầu tiên và tổng hợp đoạn âm thanh đầu tiên. Token là đơn vị văn bản nhỏ nhất mà mô hình sinh ra. Các đánh giá trợ lý giọng nói trước đây chủ yếu dùng giọng nói sạch (Chen et al., 2024), trong khi tài xế nói trong tiếng ồn khoang xe và cần câu trả lời khớp dữ liệu thật, không bịa thông tin.

## 2.2. Mô hình ngôn ngữ lớn có khả năng gọi công cụ

Mô hình ngôn ngữ có thể học cách dùng công cụ bên ngoài (Schick et al., 2023). Với cơ chế gọi công cụ (function calling), mô hình chọn một công cụ đã định nghĩa sẵn và điền tham số theo lược đồ để hệ thống thực thi qua API phía máy chủ (Patil et al., 2025); nhờ đó, trợ lý có thể nhận chuyến, cập nhật trạng thái hay gọi khách thay tài xế. Cách tiếp cận này gặp ba khó khăn: công cụ gần nghĩa như "hủy chuyến đang chạy" và "từ chối chuyến mới" dễ bị chọn nhầm; thao tác khó hoàn tác cần tài xế xác nhận trước; câu trả lời bằng giọng nói phải ngắn vì tài xế không thể đọc lại như với văn bản.

Với câu hỏi cần kiến thức nằm ngoài dữ liệu huấn luyện, phương pháp sinh câu trả lời có truy xuất kết hợp mô hình ngôn ngữ với một kho tài liệu bên ngoài: hệ thống tìm đoạn tài liệu liên quan rồi đưa vào ngữ cảnh của mô hình (Lewis et al., 2020). Luận văn dùng phương pháp này cho câu hỏi về cách dùng ứng dụng (FR-F01, Chương 5).

## 2.3. Truyền thông thời gian thực: WebRTC và SIP

WebRTC là bộ giao thức chuẩn cho thoại và video thời gian thực (Alvestrand, 2021). SIP là giao thức báo hiệu dùng để thiết lập, thay đổi và kết thúc phiên truyền thông, trong đó có cuộc gọi điện thoại qua Internet (Rosenberg et al., 2002). Tài xế và tác nhân hội thoại cùng tham gia một phòng hội thoại trên máy chủ truyền thông; cuộc gọi từ mạng điện thoại chuyển mạch công cộng (PSTN) được đưa vào phòng qua SIP trunk (đường kết nối SIP giữa nhà mạng viễn thông và máy chủ truyền thông) và dùng chung logic nghiệp vụ với kênh ứng dụng. Luận văn dùng khung LiveKit Agents (LiveKit Inc., n.d.) để truyền âm thanh, tích hợp các nhà cung cấp STT, LLM, TTS và dự phòng khi một nhà cung cấp lỗi (mục 5.3.4).

## 2.4. Yêu cầu phần mềm và mô hình chất lượng

### 2.4.1. Bên liên quan, lớp người dùng và chân dung người dùng

Yêu cầu người dùng được viết theo góc nhìn người dùng, còn yêu cầu hệ thống mô tả chi tiết phần mềm phải làm gì (Sommerville, 2016). Người dùng được chia lớp theo tần suất, chức năng sử dụng, hoàn cảnh và trình độ; khi yêu cầu xung đột, lớp ưu tiên được đáp ứng trước (Wiegers & Beatty, 2013). Mỗi lớp được mô tả bằng một chân dung người dùng (Cooper et al., 2014). Luận văn xác định bốn lớp người dùng, trong đó tài xế là lớp ưu tiên (Bảng 3.1, mục 3.2).

### 2.4.2. Yêu cầu chức năng, yêu cầu phi chức năng và mô hình ISO/IEC 25010

Yêu cầu chức năng mô tả hệ thống phải làm gì; yêu cầu phi chức năng (NFR) mô tả hệ thống phải làm tốt đến mức nào. Yêu cầu phi chức năng được phân loại theo ISO/IEC 25010:2023 với chín đặc tính: phù hợp chức năng, hiệu quả hiệu năng, tương thích, năng lực tương tác, độ tin cậy, bảo mật, khả năng bảo trì, tính linh hoạt và tính an toàn (ISO/IEC, 2023). Luận văn dùng bốn quy ước thuật ngữ:

- **Hiệu năng** là cách gọi tắt của "hiệu quả hiệu năng"; độ trễ thuộc đặc tính con "hành vi thời gian".
- **Tính khả dụng (usability)** tương đương "năng lực tương tác".
- **Khả năng mở rộng (scalability)** là đặc tính con của tính linh hoạt.
- **Khả năng phục hồi (resilience)** gồm ba đặc tính con của độ tin cậy: tính sẵn sàng, khả năng chịu lỗi và khả năng khôi phục.

Mục tiêu của khả năng phục hồi là ngăn lỗi bên trong trở thành sự cố quan sát được (Bass et al., 2021).

### 2.4.3. Kịch bản thuộc tính chất lượng

Mỗi yêu cầu chất lượng được đặc tả bằng kịch bản sáu phần: nguồn kích thích, kích thích, môi trường, thành phần chịu tác động, phản ứng và thước đo phản ứng (Bass et al., 2021). Các yêu cầu phi chức năng ở Chương 3 được đặc tả theo cấu trúc này và đóng vai trò động lực kiến trúc cho thiết kế ở Chương 4.

### 2.4.4. Tiêu chí chấp nhận

Tiêu chí chấp nhận là điều kiện sản phẩm phải thỏa mãn để được bên liên quan chấp nhận; tiêu chí phải kiểm thử được và cho kết quả đạt/không đạt rõ ràng (ISTQB, n.d.). Luận văn viết tiêu chí theo dạng Given – When – Then của phát triển hướng hành vi (behaviour-driven development) (North, 2006). So với kịch bản thuộc tính chất lượng, Given ứng với nguồn kích thích và môi trường, When ứng với kích thích, Then ứng với phản ứng kèm thước đo phản ứng.

## 2.5. Chiến thuật kiến trúc

Chiến thuật kiến trúc là quyết định thiết kế tác động trực tiếp đến phản ứng của hệ thống đối với một thuộc tính chất lượng; một mẫu kiến trúc thường gói nhiều chiến thuật (Bass et al., 2021). Luận văn lập luận theo trình tự từ kịch bản chất lượng đến chiến thuật rồi đến mẫu; Bảng 2.1 liệt kê chiến thuật cho các thuộc tính gắn với năm yêu cầu phi chức năng (mục 3.4.1) và tính chất microservices tương ứng.

**Bảng 2.1.** Các chiến thuật kiến trúc được sử dụng và tính chất microservices tương ứng

| Thuộc tính (chương trong Bass et al., 2021) | Chiến thuật sử dụng | Tính chất microservices hiện thực hóa |
|---|---|---|
| Hiệu năng (chương 9) | Kiểm soát nhu cầu: giảm chi phí phụ trội, giới hạn thời gian thực thi. Quản lý tài nguyên: tăng tài nguyên, xử lý đồng thời, nhiều bản sao | Mở rộng độc lập từng dịch vụ (Newman, 2021) |
| Khả năng phục hồi – tính sẵn sàng (chương 4) | Phát hiện: giám sát, nhịp tim, ngoại lệ. Khôi phục: dự phòng, thử lại, suy giảm có kiểm soát | Thiết kế cho lỗi (Lewis & Fowler, 2014); cô lập lỗi một dịch vụ (Newman, 2021) |
| Bảo mật (chương 11) | Nhận diện, xác thực, phân quyền; giới hạn truy cập và mức phơi lộ; mã hóa; lưu vết (audit) | Giới hạn truy cập nhờ mỗi dịch vụ sở hữu dữ liệu riêng (Lewis & Fowler, 2014); định danh tập trung ở một dịch vụ (mục 4.4) |
| Tính khả dụng – usability (chương 13) | Hủy bỏ; duy trì mô hình tác vụ, người dùng và hệ thống | Hiện thực trong tác nhân hội thoại và ứng dụng tài xế (mục 4.8) |

Khả năng mở rộng dùng chiến thuật tăng tài nguyên và nhiều bản sao, được hiện thực bằng cách chạy nhiều bản sao tác nhân (AC-16, Bảng 3.8). Ngoài các chiến thuật trên, tính khả dụng còn được bổ sung bằng 10 nguyên tắc của Nielsen (Nielsen, 1994), áp dụng ở mục 4.8. Khả năng bảo trì không có yêu cầu phi chức năng riêng nên luận văn không chọn chiến thuật riêng; kiến trúc microservices vẫn hỗ trợ thuộc tính này nhờ tổ chức theo năng lực nghiệp vụ, tự động hóa hạ tầng (Lewis & Fowler, 2014) và triển khai độc lập (Newman, 2021).

## 2.6. Kiến trúc microservices

Microservices tổ chức ứng dụng thành các dịch vụ nhỏ; mỗi dịch vụ chạy trong tiến trình riêng, giao tiếp qua cơ chế nhẹ như HTTP, được xây dựng quanh một năng lực nghiệp vụ và triển khai độc lập (Dragoni et al., 2017; Lewis & Fowler, 2014). Mỗi dịch vụ ứng với một ngữ cảnh giới hạn và ẩn dữ liệu của mình (Newman, 2021), thường đi kèm các mẫu "mỗi dịch vụ một cơ sở dữ liệu" và "cổng API" (Richardson, 2018). Đổi lại, kiến trúc này làm vận hành phức tạp hơn và khiến việc kiểm thử, giám sát xuyên dịch vụ cũng như bảo đảm nhất quán dữ liệu trở nên khó khăn (Soldani et al., 2018), nên việc chọn microservices phải được lập luận từ yêu cầu và ghi lại trong bản ghi quyết định kiến trúc (Architecture Decision Record – ADR) ở Chương 4.

## 2.7. Điện toán đám mây: serverless và container

Điện toán không máy chủ (serverless) giao việc quản trị hạ tầng cho nhà cung cấp: nền tảng tự cấp phát, mở rộng theo số yêu cầu và tính phí theo mức dùng (Jonas et al., 2019). Hàm dưới dạng dịch vụ (Function as a Service – FaaS), điển hình là AWS Lambda, phù hợp với các API xử lý nhanh, phi trạng thái, nhưng bị giới hạn thời gian chạy và độ trễ khởi động nguội (lần gọi đầu sau thời gian nhàn rỗi phải chờ khởi tạo hàm), nên không phù hợp với tác nhân hội thoại vốn giữ kết nối dài. Vì vậy, tác nhân chạy trên container được quản lý (Amazon ECS trên AWS Fargate), mở rộng ngang bằng cách tăng số bản sao. Hai trụ cột độ tin cậy và hiệu quả hiệu năng của AWS Well-Architected Framework (Amazon Web Services, 2024) tương ứng với các yêu cầu về khả năng phục hồi, khả năng mở rộng và hiệu năng.

## 2.8. An toàn khi lái và cơ sở lựa chọn ngưỡng độ trễ

Hướng dẫn của Cục Quản lý An toàn Giao thông Đường cao tốc Quốc gia Hoa Kỳ đặt tiêu chí cho tác vụ vừa nhìn vừa thao tác tay: mỗi lần rời mắt trung bình không quá 2,0 giây, không quá 15% số lần rời mắt dài hơn 2,0 giây, tổng thời gian rời mắt không quá 12 giây (National Highway Traffic Safety Administration, 2013). Các tiêu chí này nói về thời gian rời mắt, không phải thời gian chờ phản hồi; chúng là lý do luận văn chọn tương tác bằng giọng nói, vốn giảm việc rời mắt nhưng không loại bỏ tải nhận thức (mục 2.9.1).

Về thời gian chờ, khoảng lặng chuyển lượt phổ biến nhất trong hội thoại tự nhiên là 0–200 mili-giây (Stivers et al., 2009), mức mà chuỗi STT – LLM – TTS qua mạng khó đạt. Trong tương tác người – máy, khoảng 1 giây là giới hạn để mạch suy nghĩ của người dùng không bị gián đoạn; khi phải chờ lâu hơn, hệ thống nên cho thấy nó đang xử lý (Nielsen, 1993). Với robot giao tiếp bằng lời nói, người dùng đánh giá cao nhất khi robot trả lời sau khoảng 1 giây và mức đánh giá giữ ổn định tới 2 giây; các tác giả khuyến nghị robot phản hồi trong vòng 2 giây, và cho thấy một câu đệm làm dịu ấn tượng xấu khi người dùng phải chờ lâu (Shiwa et al., 2009). Với trợ lý giọng nói trên xe, tài xế không nhìn màn hình nên khoảng im lặng kéo dài dễ khiến họ tưởng hệ thống không nghe thấy.

Từ các kết quả này, luận văn chọn P95 ≤ 2 giây làm ngưỡng cho độ trễ phản hồi và phát một câu đệm ngắn trước mốc 2 giây khi câu trả lời chưa sẵn sàng, để báo rằng hệ thống đang xử lý. Ngưỡng này dựa trên nghiên cứu về robot giao tiếp và giao diện người – máy; luận văn chưa kiểm chứng nó với tài xế đang lái.

## 2.9. Nghiên cứu liên quan

Phần này không phải một tổng quan hệ thống. Các nguồn được chọn theo mức liên quan trực tiếp tới bài toán, gồm hai nhóm: công trình nghiên cứu có số liệu đánh giá đã công bố (mục 2.9.1) và tài liệu chính thức của các sản phẩm, nền tảng đang được dùng trong thực tế (mục 2.9.2). Mục 2.9.3 đặt luận văn cạnh cả hai nhóm.

### 2.9.1. Các công trình nghiên cứu

Các công trình dưới đây được xếp theo chủ đề; mỗi chủ đề nêu kết quả đã công bố và điều luận văn kế thừa.

**Tương tác giọng nói trên xe và xao nhãng nhận thức.** Các phép đo tải thị giác và nhận thức khi dùng hệ thống thông tin trên xe cho thấy nhiều chức năng gây xao nhãng đến mức không nên dùng khi lái; tương tác bằng giọng nói giảm thao tác nhìn và chạm nhưng không loại bỏ tải nhận thức (Strayer et al., 2019). Vì vậy, luận văn giới hạn chức năng theo loại phiên (FR-L03), yêu cầu mỗi lượt trả lời một ý chính (NFR-01, mục 4.8) và coi an toàn thực địa là giới hạn của đánh giá (mục 6.13).

**Mô hình ngôn ngữ gọi công cụ và cách đánh giá.** Mô hình ngôn ngữ có thể học cách gọi công cụ (Schick et al., 2023). Gorilla (Patil et al., 2023) và ToolLLM (Qin et al., 2023) đánh giá độ chính xác gọi API ở quy mô từ hơn một nghìn tới hơn 16.000 API. BFCL (Patil et al., 2025) chấm điểm bằng so khớp cây cú pháp trừu tượng và cho thấy mô hình mạnh đã làm tốt lời gọi đơn lượt, còn ghi nhớ, quyết định nhiều bước và suy luận dài hạn vẫn là thách thức. Gần luận văn nhất là τ-bench (Yao et al., 2024): tác nhân trao đổi với người dùng giả lập theo chính sách nghiệp vụ, nhiệm vụ chỉ thành công khi trạng thái cuối của cơ sở dữ liệu khớp với trạng thái mong đợi; mô hình tốt nhất khi công bố (GPT-4o) hoàn thành dưới 50% nhiệm vụ, và dưới 25% nếu yêu cầu thành công ở cả tám lần chạy lặp trong miền bán lẻ. Với tác nhân giọng nói, τ-Voice (Ray et al., 2026) đánh giá 278 nhiệm vụ có gọi công cụ: tác nhân giọng nói song công hoàn thành 31–51% số nhiệm vụ khi âm thanh sạch và 26–38% khi có nhiễu và nhiều giọng nói khác nhau, trong khi mô hình văn bản tốt nhất đạt 85%. Từ đó, luận văn định nghĩa "tỷ lệ hoàn thành nghiệp vụ" theo trạng thái dữ liệu backend (mục 6.3) và áp dụng xác nhận hai bước cho thao tác rủi ro.

**Độ trễ và chuyển lượt trong hệ thống hội thoại.** Nhiều hệ thống dùng ngưỡng im lặng để xác định người dùng đã nói xong, gây khoảng chờ không tự nhiên hoặc ngắt lời (Skantze, 2021). Mô hình đầu cuối song công Moshi (Défossez et al., 2024) đạt độ trễ khoảng 200 mili-giây, thấp hơn nhiều so với chuỗi theo tầng (luận văn đo P50 1,79 giây tới âm thanh đầu tiên, mục 6.4), nhưng Moshi không gọi công cụ. Một số dịch vụ giọng nói thời gian thực thương mại đã cho phép cấu hình công cụ (mục 2.9.2). Luận văn vẫn giữ chuỗi theo tầng vì thay được từng khâu STT, LLM, TTS và có nhà cung cấp dự phòng cho từng khâu (mục 4.7); độ trễ được bù một phần bằng câu đệm, và thời gian phát hiện kết thúc phát ngôn được tách riêng khi phân tích điểm nghẽn (Bảng 6.4).

**Nhận dạng giọng nói tiếng Việt và điều kiện nhiễu.** Whisper large-v2 đạt tỷ lệ lỗi từ 10,3% trên tập FLEURS tiếng Việt (Radford et al., 2023); luận văn dùng con số này để định vị kết quả nhận dạng giọng nói ở Bảng 6.16. VoiceBench (Chen et al., 2024) chỉ ra rằng các đánh giá trợ lý giọng nói trước đó chủ yếu dùng giọng nói sạch, nên luận văn đo tỷ lệ lỗi từ ở cả điều kiện yên tĩnh và điều kiện có nhiễu mô phỏng khoang xe (mục 6.5).

**Trí tuệ nhân tạo trong dịch vụ gọi xe.** Một hướng nghiên cứu dùng mô hình ngôn ngữ làm tác nhân phân phối đơn, điều phối xe và điều tài xế tới khu vực đông khách (Lyu et al., 2025); hướng khác dùng chatbot giọng nói để tăng cảm giác an toàn cho hành khách (Alvarado Contreras et al., 2024). Cả hai hướng đều khác luận văn về đối tượng và bài toán.

**Kiến trúc microservices trong thực tiễn.** Taibi et al. (2017) khảo sát các nhà thực hành đã chuyển sang microservices và tổng hợp động lực (bảo trì, mở rộng) cùng các vấn đề thường gặp (tách dữ liệu, giao tiếp giữa dịch vụ, điều phối phức tạp). Công trình này và Soldani et al. (2018) đều xét hệ thống doanh nghiệp nói chung; trong các nguồn đã khảo sát, luận văn chưa tìm thấy công trình nào đánh giá microservices cho trợ lý giọng nói thực thi nghiệp vụ.

### 2.9.2. Các hệ thống và ứng dụng thực tế

Ngoài công trình nghiên cứu, đã có sản phẩm thương mại giải quyết từng phần của bài toán. Các sản phẩm này thường không công bố kiến trúc hay số liệu đánh giá, nên luận văn chỉ so sánh theo năng lực mà nhà cung cấp công bố (truy cập tháng 11/2026).

**Trợ lý giọng nói trên xe.** Android Auto cho phép người lái dùng giọng nói để dẫn đường, gửi tin nhắn và phát nhạc (Google, n.d.); CarPlay cho phép gọi điện, nghe và trả lời tin nhắn, phát nhạc qua Siri (Apple, n.d.). Các trợ lý này phục vụ người lái nói chung và gắn chặt với xe và điện thoại. Tài liệu công bố không mô tả việc kết nối với hệ thống quản lý chuyến của hãng xe, nên chúng không thay tài xế xem lịch chuyến hay cập nhật trạng thái chuyến.

**Trợ lý trong ứng dụng tài xế của nền tảng gọi xe.** Grab công bố Driver AI Assistant, cho phép tài xế nói hoặc gõ yêu cầu để được hướng dẫn xử lý tình huống thường gặp, gợi ý tăng thu nhập, phân tích kết quả làm việc và soạn tin nhắn cho khách; trợ lý có ở sáu nước, trong đó có Việt Nam (Grab, 2026). Bài công bố không nêu việc trợ lý nhận chuyến hay cập nhật trạng thái chuyến, cũng không nêu ngôn ngữ hỗ trợ. Tại Việt Nam, Green SM có "Trợ lý Tài xế" theo dõi tỷ lệ vận doanh và gửi gợi ý, cảnh báo trong ứng dụng; bài công bố không nhắc tới tương tác bằng giọng nói (Green SM, 2026). Các sản phẩm này chạy thật với số lượng lớn tài xế, điều luận văn chưa có. Tuy vậy, chúng gắn với ứng dụng của từng nền tảng, nên hãng xe nhận chuyến qua tổng đài không dùng được.

**Nền tảng xây dựng tác nhân giọng nói.** LiveKit Agents cung cấp chuỗi STT – LLM – TTS, cơ chế khai báo công cụ, và khả năng gọi đi, nhận cuộc gọi qua SIP (LiveKit Inc., n.d.). OpenAI Realtime API nhận cuộc gọi điện thoại qua SIP và nối cuộc gọi với mô hình thời gian thực đã được cấu hình công cụ (OpenAI, n.d.). Như vậy, chuỗi xử lý giọng nói và kết nối điện thoại là thành phần có sẵn, không phải đóng góp của luận văn. Đóng góp của luận văn nằm ở yêu cầu và nghiệp vụ của hãng xe có điều phối viên, kiến trúc được lập luận từ yêu cầu phi chức năng, và kết quả đánh giá được công bố.

### 2.9.3. So sánh và định vị

Bảng 2.2 đặt luận văn cạnh các công trình và hệ thống ở hai mục trên. "Một phần" nghĩa là có nhưng không phải trọng tâm hoặc chỉ đáp ứng một phần; "Không công bố" nghĩa là nguồn đã dẫn không nêu.

**Bảng 2.2.** So sánh luận văn với các công trình và hệ thống liên quan

| Công trình, hệ thống | Loại | Giọng nói thời gian thực | Thực hiện tác vụ qua công cụ | Tài xế gọi xe | Kênh điện thoại | Đánh giá hệ thống phân tán |
|---|---|---|---|---|---|---|
| Strayer et al. (2019) | Nghiên cứu người lái | Một phần | Không | Không (người lái nói chung) | Không | Không |
| Patil et al. (2023) – Gorilla | Mô hình | Không | Có | Không | Không | Không |
| Yao et al. (2024) – τ-bench | Bộ đo chuẩn | Không (văn bản) | Có | Không | Không | Không |
| Ray et al. (2026) – τ-Voice | Bộ đo chuẩn | Có | Có | Không | Không | Không |
| Chen et al. (2024) – VoiceBench | Bộ đo chuẩn | Một phần | Không | Không | Không | Không |
| Défossez et al. (2024) – Moshi | Mô hình | Có | Không | Không | Không | Không |
| Lyu et al. (2025) | Khung điều phối xe | Không | Một phần | Không | Không | Không |
| Alvarado Contreras et al. (2024) | Nguyên mẫu | Có | Không | Không (hành khách) | Không | Không |
| Taibi et al. (2017) | Khảo sát | Không | Không | Không | Không | Một phần |
| Android Auto, CarPlay | Sản phẩm | Có | Một phần (dẫn đường, tin nhắn, nhạc) | Không (người lái nói chung) | Không | Không công bố |
| Grab – Driver AI Assistant | Sản phẩm | Có (nói hoặc gõ) | Một phần (tư vấn, soạn tin nhắn) | Có | Không công bố | Không công bố |
| LiveKit Agents | Nền tảng | Có | Có | Không (đa mục đích) | Có | Không công bố |
| OpenAI Realtime API | Nền tảng | Có | Có | Không (đa mục đích) | Có | Không công bố |
| **Luận văn này** | **Nguyên mẫu** | **Có** | **Có** | **Có** | **Có** | **Có (mô phỏng)** |

Bảng 2.2 cho thấy từng năng lực riêng lẻ đều đã có. Các hệ thống hiện có mạnh hơn luận văn ở ba điểm: sản phẩm của các nền tảng lớn đã chạy với tài xế thật, trợ lý trên xe tích hợp sâu với phương tiện, và mô hình song công có độ trễ thấp hơn nhiều. Luận văn khác ở chỗ ghép các năng lực này cho một bối cảnh chưa được mô tả công khai, là hãng xe có điều phối viên và nhận chuyến qua tổng đài: trợ lý thực hiện nghiệp vụ chuyến đi có bước xác nhận, dùng chung logic cho ứng dụng và cuộc gọi điện thoại, kèm kiến trúc, mã nguồn và số liệu đánh giá công khai, kể cả kết quả không đạt.

## 2.10. Chỉ số đánh giá

Luận văn dùng sáu chỉ số định lượng, gắn với bốn câu hỏi nghiên cứu: khả năng mở rộng và khả năng phục hồi cho câu hỏi thứ nhất; độ trễ phản hồi P50 và P95 cho câu hỏi thứ hai; tỷ lệ lỗi từ cho câu hỏi thứ ba; độ chính xác gọi công cụ và tỷ lệ hoàn thành nghiệp vụ cho câu hỏi thứ tư. Tỷ lệ hoàn thành nghiệp vụ được tính theo trạng thái dữ liệu, theo cách của τ-bench (Yao et al., 2024); độ chính xác gọi công cụ so khớp tên công cụ và tham số, theo cách của BFCL (Patil et al., 2025). Tính khả dụng và bảo mật được đánh giá bằng hai danh mục kiểm tra (mục 6.7 và 6.10). Định nghĩa và cách đo được trình bày ở mục 6.3.

## 2.11. Khoảng trống nghiên cứu và định hướng luận văn

Từ Bảng 2.2, có ba khoảng trống trong phạm vi các nguồn đã khảo sát: (1) chưa có công bố nào mô tả đồng thời hội thoại giọng nói thời gian thực, thực hiện nghiệp vụ chuyến đi qua gọi công cụ và kênh cuộc gọi điện thoại cho tài xế gọi xe, dù từng thành phần đều đã có trên nền tảng thương mại; (2) nghiên cứu AI trong gọi xe nghiêng về nền tảng hoặc hành khách, còn trợ lý cho tài xế của các nền tảng lớn là sản phẩm đóng, gắn với ứng dụng riêng, nên hãng xe nhận chuyến qua tổng đài chưa có giải pháp được mô tả công khai; (3) các nguồn này không công bố lập luận kiến trúc từ yêu cầu phi chức năng, cũng không công bố số liệu về khả năng mở rộng và khả năng phục hồi của trợ lý giọng nói thực hiện nghiệp vụ. Đây là khoảng trống của tài liệu công khai, không phải khẳng định rằng chưa có hệ thống tương tự. Các chương sau giải quyết ba khoảng trống này trong phạm vi nêu ở mục 1.5.

## Kết luận chương

Chương 2 đã trình bày nền tảng kỹ thuật và kỹ nghệ phần mềm, cơ sở của ngưỡng độ trễ 2 giây, các công trình và hệ thống liên quan (Bảng 2.2), sáu chỉ số đánh giá và ba khoảng trống mà luận văn hướng tới (mục 2.11). Chương 3 vận dụng các khái niệm này để phân tích yêu cầu.
