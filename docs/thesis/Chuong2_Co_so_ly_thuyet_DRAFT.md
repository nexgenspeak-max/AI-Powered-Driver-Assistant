# Chương 2. Cơ sở lý thuyết và nghiên cứu liên quan

Chương này trình bày các khái niệm làm nền cho phân tích yêu cầu và lựa chọn kiến trúc ở các chương sau, gồm hai nhóm. Nhóm thứ nhất liên quan đến trợ lý giọng nói: chuỗi xử lý STT – LLM – TTS, cơ chế gọi công cụ và truyền thông thời gian thực. Nhóm thứ hai thuộc kỹ nghệ phần mềm: mô hình chất lượng sản phẩm, kiến trúc microservices và các mô hình điện toán đám mây. Cuối chương đối chiếu với các nghiên cứu liên quan và xác định khoảng trống mà luận văn hướng tới.

## 2.1. Kiến trúc chuỗi xử lý của trợ lý giọng nói

Trợ lý giọng nói trong luận văn xử lý một lượt hội thoại qua ba khâu nối tiếp:

1. **Nhận dạng giọng nói** (Speech-to-Text – STT): chuyển tín hiệu âm thanh thu từ micro thành văn bản.
2. **Hiểu và ra quyết định** bằng mô hình ngôn ngữ lớn (Large Language Model – LLM): từ văn bản, mô hình sinh câu trả lời hoặc chọn một hành động nghiệp vụ.
3. **Tổng hợp giọng nói** (Text-to-Speech – TTS): chuyển câu trả lời thành âm thanh phát ra loa.

Cách tổ chức này được gọi là chuỗi xử lý theo tầng (cascaded pipeline). Ưu điểm của chuỗi theo tầng là từng khâu có thể được thay thế độc lập (đổi nhà cung cấp STT, LLM hoặc TTS) mà không phải xây dựng lại toàn bộ hệ thống. Nhược điểm là độ trễ của các khâu cộng dồn: thời gian chờ nhận dạng xong phát ngôn, thời gian mô hình ngôn ngữ sinh token đầu tiên (time to first token) và thời gian tổng hợp đoạn âm thanh đầu tiên. Khi tổng độ trễ lớn, người dùng cảm nhận trợ lý phản hồi chậm.

Các bộ đánh giá trợ lý giọng nói dựa trên LLM nhấn mạnh việc kiểm thử trong điều kiện gần thực tế (nhiễu nền, cách nói khác nhau), không chỉ trên dữ liệu sạch (Chen et al., 2024). Với tài xế, có thêm hai ràng buộc: nhiễu của khoang xe (động cơ, gió, mặt đường), và yêu cầu mọi câu trả lời phải khớp với dữ liệu nghiệp vụ thật, không được sinh thông tin không có nguồn (hallucination) để câu trả lời nghe trôi chảy.

## 2.2. Mô hình ngôn ngữ lớn có khả năng gọi công cụ

Trợ lý hội thoại thông thường chỉ sinh câu trả lời. Trợ lý cho tài xế còn phải thực hiện thao tác thay người dùng: nhận chuyến, cập nhật trạng thái đón và trả khách, gọi cho khách hàng, trả lời câu hỏi về cách sử dụng ứng dụng. Cơ chế gọi công cụ (function calling) cho phép mô hình chọn một công cụ đã được định nghĩa sẵn kèm lược đồ tham số, điền tham số, sau đó hệ thống thực thi công cụ đó thông qua giao diện lập trình ứng dụng (Application Programming Interface – API) của dịch vụ phía máy chủ (Schick et al., 2023).

Khi áp dụng cho nghiệp vụ tài xế, khó khăn không nằm ở việc định nghĩa danh sách công cụ mà ở ba điểm:

- **Công cụ gần nghĩa:** ví dụ "hủy chuyến đang chạy" và "từ chối chuyến mới" dễ bị mô hình chọn nhầm.
- **Thao tác khó hoàn tác:** hủy chuyến hay gọi một số điện thoại ngoài chuyến cần tài xế xác nhận trước khi thực hiện.
- **Câu trả lời bằng giọng nói:** phải ngắn, vì tài xế không thể đọc lại như trên màn hình.

Vì vậy, chất lượng của trợ lý phụ thuộc vào cách mô tả công cụ, cơ chế xác nhận hai bước và việc đo độ chính xác chọn công cụ trên kịch bản nghiệp vụ thực tế.

## 2.3. Truyền thông thời gian thực: WebRTC và SIP

Để tài xế hội thoại với trợ lý ngay trên điện thoại, âm thanh cần được truyền với độ trễ thấp. WebRTC là bộ giao thức chuẩn cho thoại và video thời gian thực trên trình duyệt và ứng dụng (Alvestrand, 2021). Trong luận văn, kênh chính của ứng dụng tài xế sử dụng WebRTC: tài xế mở trợ lý (bằng nút bấm hoặc từ khóa đánh thức) và tham gia một phòng hội thoại (room) cùng tác nhân hội thoại (conversational agent).

Khi cần kết nối mạng điện thoại công cộng (Public Switched Telephone Network – PSTN), chẳng hạn khi hệ thống gọi điện mời tài xế nhận chuyến hoặc gọi cho khách hàng, hệ thống sử dụng giao thức khởi tạo phiên (Session Initiation Protocol – SIP) qua cầu nối với nhà cung cấp dịch vụ thoại. Điểm quan trọng về thiết kế là cùng một logic nghiệp vụ (nhận hoặc từ chối chuyến, gọi khách) được tái sử dụng trên cả hai kênh thay vì xây dựng hai trợ lý tách biệt. Các nền tảng như LiveKit Agents cung cấp khung để xây dựng tác nhân tham gia phòng hội thoại thời gian thực và tích hợp STT, LLM, TTS (LiveKit Inc., n.d.); luận văn kế thừa tầng truyền thông này.

## 2.4. Yêu cầu phi chức năng và mô hình chất lượng phần mềm

Yêu cầu chức năng (Functional Requirement – FR) mô tả hệ thống phải làm gì; yêu cầu phi chức năng (Non-Functional Requirement – NFR) mô tả hệ thống phải làm điều đó tốt đến mức nào. Để phân loại NFR một cách thống nhất, luận văn sử dụng mô hình chất lượng sản phẩm của tiêu chuẩn ISO/IEC 25010:2023. Mô hình này gồm chín đặc tính chất lượng: tính phù hợp chức năng (functional suitability), hiệu năng (performance efficiency), tính tương thích (compatibility), khả năng tương tác (interaction capability), độ tin cậy (reliability), bảo mật (security), khả năng bảo trì (maintainability), tính linh hoạt (flexibility) và tính an toàn (safety) (ISO/IEC, 2023). So với phiên bản 2011, bản 2023 đổi "usability" thành "interaction capability", đổi "portability" thành "flexibility" và bổ sung khả năng mở rộng (scalability) làm đặc tính con của tính linh hoạt, đồng thời bổ sung đặc tính an toàn.

Luận văn dùng thuật ngữ **khả năng phục hồi (resilience)** theo nghĩa tổng hợp ba đặc tính con của độ tin cậy trong ISO/IEC 25010: tính sẵn sàng (availability), khả năng chịu lỗi (fault tolerance) và khả năng khôi phục (recoverability). Thuật ngữ **khả năng sử dụng (usability)** được dùng tương đương với "interaction capability".

Một đặc tính chất lượng chỉ có ý nghĩa kiểm chứng khi được đặc tả dưới dạng đo được. Bass, Clements và Kazman đề xuất mô tả mỗi yêu cầu chất lượng bằng một **kịch bản thuộc tính chất lượng** (quality attribute scenario) gồm sáu phần: nguồn kích thích, kích thích, môi trường, thành phần chịu tác động, phản ứng và thước đo phản ứng (Bass et al., 2021). Ví dụ, "khi tài xế kết thúc phát ngôn (kích thích) trong phiên hội thoại bình thường (môi trường), hệ thống bắt đầu phát âm thanh trả lời (phản ứng) với P95 không quá 2 giây (thước đo)". Chương 3 áp dụng cách đặc tả này cho từng NFR, và các NFR đó là động lực kiến trúc (architectural drivers) cho quyết định thiết kế ở Chương 4.

## 2.5. Kiến trúc microservices

Kiến trúc microservices (Microservices Architecture – MSA) tổ chức một ứng dụng thành tập hợp các dịch vụ nhỏ, mỗi dịch vụ chạy trong tiến trình riêng, giao tiếp qua cơ chế nhẹ như HTTP, được xây dựng quanh một năng lực nghiệp vụ và có thể triển khai độc lập (Lewis & Fowler, 2014). Ở góc độ học thuật, microservice được định nghĩa là một tiến trình gắn kết, độc lập, tương tác với các thành phần khác thông qua thông điệp (Dragoni et al., 2017).

Bảng 2.1 tóm tắt các tính chất cơ bản của kiến trúc microservices được dùng làm căn cứ đối chiếu với NFR ở Chương 3.

**Bảng 2.1.** Các tính chất cơ bản của kiến trúc microservices

| Tính chất | Nội dung | Thuộc tính chất lượng được hỗ trợ |
|---|---|---|
| Tổ chức theo năng lực nghiệp vụ (organized around business capabilities) | Mỗi dịch vụ sở hữu trọn vẹn một năng lực nghiệp vụ và ranh giới rõ | Khả năng bảo trì |
| Triển khai độc lập (independent deployability) | Thay đổi một dịch vụ không yêu cầu triển khai lại dịch vụ khác | Khả năng bảo trì, tính sẵn sàng |
| Quản lý dữ liệu phi tập trung (decentralized data management) | Mỗi dịch vụ sở hữu cơ sở dữ liệu riêng; dịch vụ khác truy cập qua API | Khả năng bảo trì, khả năng chịu lỗi |
| Thiết kế cho lỗi (design for failure) | Giả định dịch vụ phụ thuộc có thể lỗi; dùng thời gian chờ, suy giảm có kiểm soát, dự phòng | Khả năng phục hồi |
| Mở rộng độc lập (independent scalability) | Mỗi dịch vụ được mở rộng theo nhu cầu tải của riêng nó | Khả năng mở rộng, hiệu năng |
| Dị biệt công nghệ (technology heterogeneity) | Mỗi dịch vụ chọn ngôn ngữ và nền tảng phù hợp với tác vụ | Hiệu năng |
| Tự động hóa hạ tầng (infrastructure automation) | Triển khai và cấu hình hạ tầng dạng mã, tự động | Khả năng bảo trì |

Nguồn: tổng hợp từ Lewis và Fowler (2014), Newman (2021), Richardson (2018).

Newman nhấn mạnh rằng ranh giới dịch vụ nên được vẽ theo miền nghiệp vụ và mỗi dịch vụ ẩn giấu dữ liệu của mình để thay đổi được độc lập (Newman, 2021). Richardson hệ thống hóa các mẫu thiết kế tương ứng như mỗi dịch vụ một cơ sở dữ liệu (database per service) và cổng API (API gateway), đồng thời mô tả ba trục mở rộng của "scale cube": trục X nhân bản dịch vụ, trục Y tách theo chức năng và trục Z phân mảnh dữ liệu (Richardson, 2018).

Microservices cũng có chi phí đáng kể. Tổng quan tài liệu thực tiễn công nghiệp cho thấy các khó khăn chính gồm độ phức tạp vận hành của hệ thống phân tán, khó kiểm thử và giám sát xuyên dịch vụ, và khó bảo đảm nhất quán dữ liệu (Soldani et al., 2018). Do đó, lựa chọn microservices cần được lập luận từ yêu cầu cụ thể của hệ thống chứ không phải mặc định; Chương 4 trình bày lập luận này dưới dạng bản ghi quyết định kiến trúc (Architecture Decision Record – ADR).

## 2.6. Điện toán đám mây: serverless và container

Điện toán không máy chủ (serverless computing) chuyển gần như toàn bộ công việc quản trị hệ thống cho nhà cung cấp đám mây: nhà phát triển chỉ cung cấp hàm, nền tảng tự động cấp phát, mở rộng theo số yêu cầu và tính phí theo mức sử dụng (Jonas et al., 2019). Mô hình hàm như dịch vụ (Function as a Service – FaaS), điển hình là AWS Lambda, phù hợp với các API giao dịch ngắn, phi trạng thái. Tuy nhiên, FaaS có giới hạn về thời gian thực thi, khởi động nguội (cold start) và không phù hợp với tác vụ cần duy trì kết nối dài như một tác nhân hội thoại giữ kết nối âm thanh liên tục (Jonas et al., 2019).

Với tác vụ chạy dài hạn, container được quản lý (ví dụ Amazon ECS trên AWS Fargate) là lựa chọn thay thế: nhà phát triển đóng gói ứng dụng thành image, nền tảng đảm nhận hạ tầng máy chủ, số bản sao tác vụ được điều chỉnh để mở rộng theo chiều ngang. Ở tầng dữ liệu, luận văn dùng Amazon DynamoDB, một cơ sở dữ liệu NoSQL do AWS quản lý, ở chế độ tính phí theo số yêu cầu; hàm Lambda truy cập DynamoDB qua API HTTP nên không phải duy trì kết nối cơ sở dữ liệu giữa các lần gọi.

Khung AWS Well-Architected Framework hệ thống hóa các nguyên tắc thiết kế trên AWS thành sáu trụ cột: vận hành xuất sắc, bảo mật, độ tin cậy, hiệu quả hiệu năng, tối ưu chi phí và tính bền vững (Amazon Web Services, 2024). Hai trụ cột độ tin cậy và hiệu quả hiệu năng tương ứng trực tiếp với các yêu cầu khả năng phục hồi, khả năng mở rộng và hiệu năng của luận văn.

## 2.7. An toàn khi lái và cơ sở lựa chọn ngưỡng độ trễ

Thao tác điện thoại khi lái gắn với nguy cơ xao nhãng. Như đã dẫn ở mục 1.1, các yếu tố liên quan đến người lái hiện diện trong phần lớn vụ va chạm, và xao nhãng do thiết bị cầm tay làm tăng nguy cơ va chạm (Dingus et al., 2016). Hướng dẫn về xao nhãng do thiết bị điện tử trên xe của Cục An toàn Giao thông Đường cao tốc Hoa Kỳ (NHTSA) đặt tiêu chí chấp nhận cho các tác vụ thao tác nhìn–tay: thời lượng trung bình mỗi lần rời mắt khỏi mặt đường không vượt quá 2,0 giây và không quá 15% số lần rời mắt dài hơn 2,0 giây (National Highway Traffic Safety Administration, 2013). Tiêu chí này cho thấy mỗi thao tác cần nhìn màn hình phải rất ngắn; tương tác bằng giọng nói giúp loại bỏ phần lớn các lần rời mắt đó.

Luận văn không xây dựng trên các nền tảng hiển thị trên xe như Android Auto hay Apple CarPlay, vì trợ lý cần gắn trực tiếp với dữ liệu và nghiệp vụ riêng của hệ thống chuyến đi (nhận chuyến, gọi đúng khách của chuyến, báo khách không có mặt). Phạm vi được giới hạn ở trợ lý nghiệp vụ chạy trong ứng dụng tài xế và qua cuộc gọi điện thoại.

Về độ trễ, nghiên cứu liên ngôn ngữ trên mười ngôn ngữ cho thấy khoảng lặng chuyển lượt trong hội thoại tự nhiên có giá trị phổ biến nhất trong khoảng 0 đến 200 mili-giây (Stivers et al., 2009). Một chuỗi xử lý STT – LLM – TTS qua mạng khó đạt mức này. Luận văn chọn ngưỡng P95 ≤ 2 giây như một ràng buộc kỹ thuật thực dụng cho bối cảnh vừa lái vừa nói, kết hợp với câu đệm (filler utterance) ngắn khi phản hồi chậm để người dùng biết hệ thống vẫn đang xử lý. Ngưỡng này là lựa chọn thiết kế của luận văn, không phải giá trị được rút ra trực tiếp từ các tài liệu trên.

## 2.8. Nghiên cứu liên quan về AI trong dịch vụ gọi xe

Một hướng nghiên cứu AI cho dịch vụ gọi xe tập trung vào phía nền tảng: phân phối đơn, điều phối xe và tái định vị tài xế, trong đó mô hình ngôn ngữ đóng vai trò tác nhân ra quyết định (Lyu et al., 2025). Hướng này quan trọng cho vận hành mạng lưới nhưng không giải quyết nhu cầu của tài xế đang lái cần tra lịch, gọi khách và cập nhật trạng thái mà không nhìn màn hình.

Ở phía trải nghiệm người dùng, có công trình sử dụng chatbot giọng nói để tăng cảm giác an toàn cho hành khách trong chuyến đi (Alvarado Contreras et al., 2024). Đối tượng và bài toán của công trình này khác với tập nghiệp vụ của tài xế.

## 2.9. Chỉ số đánh giá

Một trợ lý có thể nhận dạng chính xác nhưng vẫn không hoàn thành nghiệp vụ nếu chọn sai công cụ, phản hồi chậm, hoặc ngừng hoạt động khi một thành phần gặp sự cố. Các khung đánh giá trợ lý giọng nói dựa trên LLM khuyến nghị dùng nhiều chỉ số bổ sung nhau thay vì một điểm số tổng (Chen et al., 2024). Bảng 2.2 liệt kê các chỉ số được luận văn sử dụng; định nghĩa vận hành và phương pháp đo trình bày ở Chương 6.

**Bảng 2.2.** Các chỉ số đánh giá và câu hỏi nghiên cứu tương ứng

| STT | Chỉ số | Ý nghĩa | Câu hỏi nghiên cứu |
|---|---|---|---|
| 1 | Độ trễ phản hồi (P50, P95) | Thời gian từ khi tài xế kết thúc phát ngôn đến khi hệ thống bắt đầu phát âm thanh trả lời | RQ2 |
| 2 | Tỷ lệ lỗi từ (WER) | WER = (S + D + I) / N, với S, D, I là số từ bị thay thế, bị xóa, bị chèn; N là số từ của câu tham chiếu | RQ3 |
| 3 | Độ chính xác gọi công cụ | Tỷ lệ lượt chọn đúng công cụ và đúng tham số | RQ4 |
| 4 | Tỷ lệ hoàn thành nghiệp vụ | Tỷ lệ kịch bản đạt trạng thái nghiệp vụ mong đợi | RQ4 |
| 5 | Chỉ số khả năng mở rộng | Biến thiên P95 và tỷ lệ lỗi khi tăng số phiên đồng thời và số bản sao tác nhân | RQ1 |
| 6 | Chỉ số khả năng phục hồi | Tỷ lệ phiên duy trì khi tiêm lỗi; thời gian khôi phục | RQ1 |

## 2.10. Khoảng trống nghiên cứu và định hướng luận văn

Từ các nội dung trên, luận văn xác định ba khoảng trống gắn trực tiếp với đề tài:

1. Thiếu một giải pháp tích hợp đồng thời hội thoại thời gian thực, mô hình ngôn ngữ có gọi công cụ, nghiệp vụ của tài xế gọi xe và mục tiêu giảm thao tác khi lái.
2. Các nghiên cứu AI trong dịch vụ gọi xe nghiêng về tối ưu phía nền tảng hoặc trải nghiệm hành khách, chưa tập trung vào trợ lý thực thi nghiệp vụ cho tài xế.
3. Các công trình về trợ lý giọng nói ít trình bày lập luận kiến trúc từ yêu cầu phi chức năng và ít đánh giá các thuộc tính chất lượng của hệ thống phân tán (khả năng mở rộng, khả năng phục hồi) bên cạnh các chỉ số hội thoại.

Luận văn hướng tới lấp các khoảng trống này bằng cách phân tích yêu cầu theo mô hình chất lượng chuẩn, lập luận lựa chọn kiến trúc microservices trên AWS, triển khai nguyên mẫu và đánh giá theo từng yêu cầu.

## Kết luận chương

Chương 2 đã trình bày chuỗi xử lý STT – LLM – TTS, cơ chế gọi công cụ, truyền thông thời gian thực, mô hình chất lượng ISO/IEC 25010 cùng cách đặc tả kịch bản thuộc tính chất lượng, các tính chất của kiến trúc microservices, các mô hình điện toán đám mây, cơ sở chọn ngưỡng độ trễ và bộ chỉ số đánh giá. Chương 3 vận dụng các khái niệm này để phân tích yêu cầu của hệ thống.

---

## Tài liệu trích dẫn trong Chương 2 (bản nháp — gộp vào danh mục cuối)

Xem danh mục REFERENCES trong build_thesis_final.py (đã kiểm DOI/URL ngày 2026-09-27).
