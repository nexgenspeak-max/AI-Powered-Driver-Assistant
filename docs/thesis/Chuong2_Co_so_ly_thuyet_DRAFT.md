# Chương 2. Cơ sở lý thuyết và nghiên cứu liên quan

Chương này trình bày các khái niệm làm nền cho phân tích yêu cầu và lựa chọn kiến trúc ở các chương sau, gồm hai nhóm. Nhóm thứ nhất liên quan đến trợ lý giọng nói: chuỗi xử lý STT – LLM – TTS, cơ chế gọi công cụ và truyền thông thời gian thực. Nhóm thứ hai thuộc kỹ nghệ phần mềm: lớp người dùng và chân dung người dùng, yêu cầu và mô hình chất lượng sản phẩm, tiêu chí chấp nhận, chiến thuật kiến trúc, kiến trúc microservices và các mô hình điện toán đám mây. Cuối chương tổng quan năm hướng nghiên cứu liên quan, so sánh chúng theo cùng một bộ tiêu chí và xác định khoảng trống mà luận văn hướng tới.

## 2.1. Kiến trúc chuỗi xử lý của trợ lý giọng nói

Trợ lý giọng nói trong luận văn xử lý một lượt hội thoại qua ba khâu nối tiếp:

1. **Nhận dạng giọng nói (STT):** chuyển tín hiệu âm thanh thu từ micro thành văn bản.
2. **Hiểu và ra quyết định bằng mô hình ngôn ngữ lớn (LLM):** từ văn bản, mô hình sinh câu trả lời hoặc chọn một hành động nghiệp vụ.
3. **Tổng hợp giọng nói (TTS):** chuyển câu trả lời thành âm thanh phát ra loa.

Cách tổ chức này được gọi là chuỗi xử lý theo tầng (cascaded pipeline). Ưu điểm của chuỗi theo tầng là từng khâu có thể được thay thế độc lập (đổi nhà cung cấp STT, LLM hoặc TTS) mà không phải xây dựng lại toàn bộ hệ thống. Nhược điểm là độ trễ của các khâu cộng dồn: thời gian chờ nhận dạng xong phát ngôn, thời gian mô hình ngôn ngữ sinh token đầu tiên (time to first token; token là đơn vị chữ nhỏ nhất mà mô hình sinh ra, thường là một từ hoặc một phần của từ) và thời gian tổng hợp đoạn âm thanh đầu tiên. Khi tổng độ trễ lớn, người dùng cảm nhận trợ lý phản hồi chậm.

Các bộ đánh giá trợ lý giọng nói dựa trên LLM nhấn mạnh việc kiểm thử trong điều kiện gần thực tế (nhiễu nền, cách nói khác nhau), không chỉ trên dữ liệu sạch (Chen et al., 2024). Với tài xế, có thêm hai ràng buộc: nhiễu của khoang xe (động cơ, gió, mặt đường), và yêu cầu mọi câu trả lời phải khớp với dữ liệu nghiệp vụ thật, không được tự bịa ra thông tin không có trong dữ liệu (hiện tượng hallucination) chỉ để câu trả lời nghe trôi chảy.

## 2.2. Mô hình ngôn ngữ lớn có khả năng gọi công cụ

Trợ lý hội thoại thông thường chỉ sinh câu trả lời. Trợ lý cho tài xế còn phải thực hiện thao tác thay người dùng: nhận chuyến, cập nhật trạng thái đón và trả khách, gọi cho khách hàng, trả lời câu hỏi về cách sử dụng ứng dụng. Cơ chế gọi công cụ (function calling) cho phép mô hình chọn một công cụ đã được định nghĩa sẵn, điền các tham số theo mô tả (lược đồ tham số) của công cụ đó, sau đó hệ thống thực thi công cụ đó thông qua API của dịch vụ phía máy chủ (Schick et al., 2023).

Khi áp dụng cho nghiệp vụ tài xế, khó khăn không nằm ở việc định nghĩa danh sách công cụ mà ở ba điểm:

- **Công cụ gần nghĩa:** ví dụ "hủy chuyến đang chạy" và "từ chối chuyến mới" dễ bị mô hình chọn nhầm.
- **Thao tác khó hoàn tác:** hủy chuyến hay gọi một số điện thoại ngoài chuyến cần tài xế xác nhận trước khi thực hiện.
- **Câu trả lời bằng giọng nói:** phải ngắn, vì tài xế không thể đọc lại như trên màn hình.

Vì vậy, chất lượng của trợ lý phụ thuộc vào cách mô tả công cụ, cơ chế xác nhận hai bước và việc đo độ chính xác chọn công cụ trên kịch bản nghiệp vụ thực tế.

## 2.3. Truyền thông thời gian thực: WebRTC và SIP

Để tài xế hội thoại với trợ lý ngay trên điện thoại, âm thanh cần được truyền với độ trễ thấp. WebRTC là bộ giao thức chuẩn cho thoại và video thời gian thực trên trình duyệt và ứng dụng (Alvestrand, 2021). Trong luận văn, kênh chính của ứng dụng tài xế sử dụng WebRTC: tài xế mở trợ lý (bằng nút bấm hoặc từ khóa đánh thức) và tham gia một phòng hội thoại (room), tức một kênh âm thanh riêng trên máy chủ truyền thông, cùng với tác nhân hội thoại (conversational agent), là chương trình phía máy chủ nghe, hiểu và trả lời tài xế.

Khi cần kết nối mạng điện thoại công cộng (PSTN), chẳng hạn khi hệ thống gọi điện mời tài xế nhận chuyến hoặc gọi cho khách hàng, hệ thống sử dụng giao thức khởi tạo phiên (Session Initiation Protocol – SIP) qua một đường kết nối (SIP trunk) tới nhà cung cấp dịch vụ thoại. Điểm quan trọng về thiết kế là cùng một logic nghiệp vụ (nhận hoặc từ chối chuyến, gọi khách) được tái sử dụng trên cả hai kênh thay vì xây dựng hai trợ lý tách biệt. Các nền tảng như LiveKit Agents cung cấp khung để xây dựng tác nhân tham gia phòng hội thoại thời gian thực và tích hợp STT, LLM, TTS (LiveKit Inc., n.d.); luận văn dùng lại phần truyền âm thanh của nền tảng này thay vì tự xây dựng.

## 2.4. Yêu cầu phần mềm và mô hình chất lượng

### 2.4.1. Bên liên quan, lớp người dùng và chân dung người dùng

Phân tích yêu cầu bắt đầu từ việc xác định ai sẽ dùng hệ thống. Sommerville (2016) phân biệt yêu cầu người dùng (user requirements), viết bằng ngôn ngữ tự nhiên theo góc nhìn của người dùng, với yêu cầu hệ thống (system requirements), mô tả chi tiết điều phần mềm phải làm; yêu cầu người dùng được xác định trước và là đầu vào của yêu cầu hệ thống. Wiegers và Beatty (2013) đề xuất chia người dùng thành các lớp người dùng (user classes) theo tần suất sử dụng, chức năng cần dùng, hoàn cảnh và trình độ, và chỉ định một hoặc vài lớp người dùng ưu tiên (favored user classes) mà nhu cầu của họ được ưu tiên khi có xung đột. Để mỗi lớp người dùng không chỉ là một cái tên, Cooper et al. (2014) đề xuất mô tả bằng chân dung người dùng (persona): một hình mẫu cụ thể với mục tiêu, bối cảnh sử dụng và hành vi đặc trưng, giúp người thiết kế đánh giá một quyết định theo câu hỏi "điều này có giúp người dùng đạt mục tiêu của họ không".

Luận văn áp dụng ba khái niệm này theo trình tự: xác định bốn lớp người dùng (tài xế, khách hàng, điều phối viên, quản trị viên hệ thống), chọn tài xế là lớp người dùng ưu tiên vì là nhóm duy nhất thao tác trong lúc lái, mô tả mỗi lớp bằng một chân dung (Bảng 3.1), rồi viết yêu cầu chức năng theo từng chân dung (mục 3.3). Cách tổ chức này được giữ xuyên suốt: kiến trúc được trình bày bằng một mô hình tổng thể và bốn mô hình luồng hành vi theo bốn chân dung (mục 4.3), và kết quả đánh giá được tổng hợp theo các tiêu chí chấp nhận gắn với từng chân dung (Chương 6).

### 2.4.2. Yêu cầu chức năng, yêu cầu phi chức năng và mô hình ISO/IEC 25010

Yêu cầu chức năng mô tả hệ thống phải làm gì; yêu cầu phi chức năng mô tả hệ thống phải làm điều đó tốt đến mức nào. Để phân loại NFR một cách thống nhất, luận văn sử dụng mô hình chất lượng sản phẩm của tiêu chuẩn ISO/IEC 25010:2023. Mô hình này gồm chín đặc tính chất lượng: tính phù hợp chức năng (functional suitability), hiệu quả hiệu năng (performance efficiency), tính tương thích (compatibility), năng lực tương tác (interaction capability), độ tin cậy (reliability), bảo mật (security), khả năng bảo trì (maintainability), tính linh hoạt (flexibility) và tính an toàn (safety) (ISO/IEC, 2023). So với phiên bản 2011, bản 2023 đổi "usability" thành "interaction capability", đổi "portability" thành "flexibility" và bổ sung khả năng mở rộng (scalability) làm đặc tính con của tính linh hoạt, đồng thời bổ sung đặc tính an toàn.

Để thuật ngữ thống nhất trong toàn luận văn, ba quy ước sau được áp dụng:

- **Hiệu năng** được dùng như cách gọi ngắn của "hiệu quả hiệu năng" (performance efficiency); yêu cầu độ trễ của luận văn thuộc đặc tính con hành vi thời gian (time behaviour).
- **Tính khả dụng (usability)** được dùng tương đương với "năng lực tương tác" (interaction capability) của bản 2023, vì đây là thuật ngữ quen thuộc trong tài liệu kỹ nghệ phần mềm và trong Bass et al. (2021).
- **Khả năng phục hồi (resilience)** được dùng theo nghĩa tổng hợp ba đặc tính con của độ tin cậy: tính sẵn sàng (availability), khả năng chịu lỗi (fault tolerance) và khả năng khôi phục (recoverability). Theo Bass et al. (2021), lỗi (fault) là nguyên nhân bên trong, còn sự cố (failure) là hành vi sai lệch mà người dùng quan sát được; mục tiêu của khả năng phục hồi là ngăn lỗi trở thành sự cố.

### 2.4.3. Kịch bản thuộc tính chất lượng

Một đặc tính chất lượng chỉ có ý nghĩa kiểm chứng khi được đặc tả dưới dạng đo được. Bass, Clements và Kazman đề xuất mô tả mỗi yêu cầu chất lượng bằng một kịch bản thuộc tính chất lượng (quality attribute scenario) gồm sáu phần: nguồn kích thích (source of stimulus), kích thích (stimulus), môi trường (environment), thành phần chịu tác động (artifact), phản ứng (response) và thước đo phản ứng (response measure) (Bass et al., 2021). Ví dụ: "khi tài xế kết thúc phát ngôn (kích thích) trong phiên hội thoại bình thường (môi trường), hệ thống bắt đầu phát âm thanh trả lời (phản ứng) với P95 không quá 2 giây (thước đo)". Chương 3 áp dụng cách đặc tả này cho từng NFR; các NFR đó là động lực kiến trúc (architectural drivers) cho quyết định thiết kế ở Chương 4.

### 2.4.4. Tiêu chí chấp nhận

Trong kiểm thử phần mềm, tiêu chí chấp nhận (acceptance criteria) là các điều kiện mà một sản phẩm hoặc thành phần phải thỏa mãn để được bên liên quan chấp nhận (ISTQB, n.d.). Một tiêu chí chấp nhận tốt phải kiểm thử được, cho kết quả đạt hoặc không đạt rõ ràng và không phụ thuộc vào cách lập trình bên trong.

Luận văn viết tiêu chí chấp nhận theo dạng kịch bản Given – When – Then của phát triển hướng hành vi (Behaviour-Driven Development – BDD) (North, 2006):

- **Given (Cho trước):** ngữ cảnh hoặc trạng thái ban đầu của hệ thống.
- **When (Khi):** sự kiện hoặc hành động của người dùng.
- **Then (Thì):** kết quả quan sát được mà hệ thống phải tạo ra.

Ví dụ: *Cho trước* tài xế đang có một chuyến ở trạng thái đã xác nhận; *khi* tài xế nói "hủy chuyến này"; *thì* trợ lý hỏi lại để xác nhận và chuyến chỉ chuyển sang trạng thái đã hủy sau khi tài xế đồng ý. Dạng này nối trực tiếp kịch bản thuộc tính chất lượng (mục 2.4.3) với trường hợp kiểm thử ở Chương 6: phần Given tương ứng môi trường, phần When tương ứng kích thích, phần Then tương ứng phản ứng và thước đo.

## 2.5. Chiến thuật kiến trúc

Bass et al. (2021) định nghĩa chiến thuật kiến trúc (architectural tactic) là một quyết định thiết kế tác động trực tiếp đến phản ứng của hệ thống đối với một thuộc tính chất lượng. Chiến thuật là đơn vị thiết kế nhỏ hơn mẫu kiến trúc (architectural pattern): một mẫu kiến trúc thường gói nhiều chiến thuật lại với nhau. Mỗi chương về thuộc tính chất lượng trong sách trình bày một cây chiến thuật; ví dụ Hình 9.3 của sách trình bày các chiến thuật hiệu năng. Theo cách tiếp cận này, quan hệ giữa yêu cầu và kiến trúc được lập luận qua ba bước: kịch bản thuộc tính chất lượng → chiến thuật đáp ứng kịch bản → mẫu kiến trúc và cơ chế hiện thực các chiến thuật đó.

Bảng 2.1 liệt kê các chiến thuật được luận văn sử dụng, nhóm theo thuộc tính chất lượng tương ứng với năm NFR ở Chương 3. Tên tiếng Việt kèm tên gốc tiếng Anh để đối chiếu với sách.

**Bảng 2.1.** Các chiến thuật kiến trúc được sử dụng theo thuộc tính chất lượng

| Thuộc tính chất lượng (chương trong Bass et al., 2021) | Nhóm chiến thuật | Chiến thuật |
|---|---|---|
| Hiệu năng (Chương 9) | Kiểm soát nhu cầu tài nguyên (control resource demand) | Giảm chi phí tính toán phụ trội (reduce computational overhead); giới hạn thời gian thực thi (bound execution times) |
| Hiệu năng (Chương 9) | Quản lý tài nguyên (manage resources) | Tăng tài nguyên (increase resources); đưa vào xử lý đồng thời (introduce concurrency); duy trì nhiều bản sao tính toán (maintain multiple copies of computations); duy trì nhiều bản sao dữ liệu (maintain multiple copies of data) |
| Tính sẵn sàng (Chương 4) | Phát hiện lỗi (detect faults) | Giám sát (monitor); nhịp tim (heartbeat); phát hiện ngoại lệ (exception detection) |
| Tính sẵn sàng (Chương 4) | Khôi phục sau lỗi (recover from faults) | Dự phòng thay thế (redundant spare); thử lại (retry); xử lý ngoại lệ (exception handling); suy giảm có kiểm soát (graceful degradation) |
| Bảo mật (Chương 11) | Chống tấn công (resist attacks) | Nhận diện đối tượng truy cập (identify actors); xác thực đối tượng truy cập (authenticate actors); phân quyền đối tượng truy cập (authorize actors); giới hạn truy cập (limit access); giới hạn phơi lộ (limit exposure); mã hóa dữ liệu (encrypt data) |
| Bảo mật (Chương 11) | Khôi phục sau tấn công (recover from attacks) | Lưu vết để kiểm tra lại (audit) |
| Tính khả dụng (Chương 13) | Hỗ trợ chủ động của người dùng (support user initiative) | Hủy bỏ (cancel) |
| Tính khả dụng (Chương 13) | Hỗ trợ chủ động của hệ thống (support system initiative) | Duy trì mô hình tác vụ (maintain task model); duy trì mô hình người dùng (maintain user model); duy trì mô hình hệ thống (maintain system model) |

Nguồn: Bass et al. (2021), các chương 4, 9, 11 và 13.

Bass et al. (2021) không trình bày khả năng mở rộng thành một cây chiến thuật riêng mà xem mở rộng theo chiều ngang là một cách tăng tài nguyên: thêm bản sao xử lý song song và phân phối tải giữa các bản sao. Vì vậy luận văn đáp ứng yêu cầu khả năng mở rộng bằng hai chiến thuật thuộc nhóm quản lý tài nguyên là tăng tài nguyên và duy trì nhiều bản sao tính toán.

Với tính khả dụng, chiến thuật kiến trúc được bổ sung bằng 10 nguyên tắc khả dụng (usability heuristics) của Nielsen, vốn được dùng rộng rãi để đánh giá giao diện người dùng (Nielsen, 1994). Các nguyên tắc liên quan trực tiếp đến tương tác bằng giọng nói gồm: hiển thị trạng thái hệ thống (visibility of system status), quyền kiểm soát và tự do của người dùng (user control and freedom), ngăn ngừa lỗi (error prevention), và giúp người dùng nhận biết, chẩn đoán, khôi phục khi có lỗi (help users recognize, diagnose, and recover from errors). Mục 4.8 đối chiếu thiết kế trợ lý với các nguyên tắc này.

## 2.6. Kiến trúc microservices

Kiến trúc microservices tổ chức một ứng dụng thành tập hợp các dịch vụ nhỏ, mỗi dịch vụ chạy trong tiến trình riêng, giao tiếp qua cơ chế nhẹ như HTTP, được xây dựng quanh một năng lực nghiệp vụ và có thể triển khai độc lập (Lewis & Fowler, 2014). Ở góc độ học thuật, microservice được định nghĩa là một tiến trình độc lập, chỉ đảm nhận một nhóm chức năng liên quan chặt chẽ với nhau, và tương tác với các thành phần khác thông qua thông điệp (Dragoni et al., 2017).

Theo cách tiếp cận ở mục 2.5, microservices là một mẫu kiến trúc gói nhiều chiến thuật. Bảng 2.2 tóm tắt các tính chất của microservices được luận văn sử dụng, ghi rõ nguồn của từng tính chất và chiến thuật mà tính chất đó hiện thực hóa.

**Bảng 2.2.** Các tính chất của kiến trúc microservices và chiến thuật tương ứng

| Tính chất | Nguồn | Nội dung | Chiến thuật hoặc thuộc tính chất lượng liên quan |
|---|---|---|---|
| Tổ chức theo năng lực nghiệp vụ (organized around business capabilities) | Lewis & Fowler (2014) | Mỗi dịch vụ sở hữu trọn vẹn một năng lực nghiệp vụ và có ranh giới rõ | Khả năng bảo trì |
| Quản lý dữ liệu phi tập trung (decentralized data management) | Lewis & Fowler (2014) | Mỗi dịch vụ sở hữu dữ liệu riêng; dịch vụ khác truy cập qua API | Khả năng bảo trì; cô lập lỗi giữa các dịch vụ |
| Thiết kế cho lỗi (design for failure) | Lewis & Fowler (2014) | Giả định dịch vụ phụ thuộc có thể lỗi bất kỳ lúc nào và phát hiện lỗi nhanh | Phát hiện lỗi; thử lại; suy giảm có kiểm soát; dự phòng thay thế |
| Tự động hóa hạ tầng (infrastructure automation) | Lewis & Fowler (2014) | Triển khai và cấu hình hạ tầng dạng mã, tự động | Khả năng bảo trì |
| Dễ triển khai (ease of deployment) | Newman (2021) | Thay đổi một dịch vụ không yêu cầu triển khai lại dịch vụ khác | Khả năng bảo trì |
| Mở rộng độc lập (scaling) | Newman (2021) | Chỉ những dịch vụ cần thêm năng lực xử lý mới được mở rộng | Tăng tài nguyên; duy trì nhiều bản sao tính toán |
| Tính bền vững trước lỗi (robustness) | Newman (2021) | Lỗi của một dịch vụ được cô lập, phần còn lại của hệ thống tiếp tục hoạt động | Suy giảm có kiểm soát |
| Đa dạng công nghệ (technology heterogeneity) | Newman (2021) | Mỗi dịch vụ có thể dùng ngôn ngữ và nền tảng phù hợp với tác vụ | Không phải chiến thuật chất lượng; tạo điều kiện chọn nền tảng chạy phù hợp với từng loại tải |

Ranh giới dịch vụ nên được vẽ theo miền nghiệp vụ. Newman (2021) dùng khái niệm ngữ cảnh giới hạn (bounded context) của thiết kế hướng miền (domain-driven design): một phạm vi trong miền nghiệp vụ mà bên trong đó các khái niệm có ý nghĩa thống nhất, và mỗi dịch vụ ẩn giấu dữ liệu của mình để thay đổi được độc lập. Richardson (2018) hệ thống hóa các mẫu thiết kế tương ứng như mỗi dịch vụ một cơ sở dữ liệu (database per service) và cổng API (API gateway), đồng thời mô tả ba trục mở rộng của "scale cube": trục X nhân bản dịch vụ, trục Y tách dịch vụ theo chức năng và trục Z chia dữ liệu thành nhiều phần theo một khóa (ví dụ theo khu vực).

Microservices cũng có chi phí đáng kể. Tổng quan tài liệu thực tiễn công nghiệp cho thấy các khó khăn chính gồm độ phức tạp vận hành của hệ thống phân tán, khó kiểm thử và giám sát xuyên dịch vụ, và khó bảo đảm nhất quán dữ liệu (Soldani et al., 2018). Do đó, lựa chọn microservices cần được lập luận từ yêu cầu cụ thể của hệ thống chứ không phải mặc định; Chương 4 trình bày lập luận này dưới dạng bản ghi quyết định kiến trúc (Architecture Decision Record – ADR).

## 2.7. Điện toán đám mây: serverless và container

Điện toán không máy chủ (serverless computing) chuyển gần như toàn bộ công việc quản trị hệ thống cho nhà cung cấp đám mây: nhà phát triển chỉ cung cấp hàm, nền tảng tự động cấp phát, mở rộng theo số yêu cầu và tính phí theo mức sử dụng (Jonas et al., 2019). Mô hình hàm như dịch vụ (Function as a Service – FaaS), điển hình là AWS Lambda, phù hợp với các API xử lý nhanh và phi trạng thái (không cần nhớ gì giữa hai lần gọi). Tuy nhiên, FaaS có giới hạn về thời gian chạy tối đa, có độ trễ khởi động nguội (cold start: lần gọi đầu sau một thời gian không dùng phải chờ nền tảng khởi tạo hàm) và không phù hợp với tác vụ cần duy trì kết nối dài như một tác nhân hội thoại giữ kết nối âm thanh liên tục (Jonas et al., 2019).

Với tác vụ chạy dài hạn, container được quản lý (ví dụ Amazon ECS trên AWS Fargate) là lựa chọn thay thế: nhà phát triển đóng gói ứng dụng cùng các thư viện cần thiết thành một image, nền tảng đảm nhận hạ tầng máy chủ, số bản sao tác vụ được điều chỉnh để mở rộng theo chiều ngang. Ở tầng dữ liệu, luận văn dùng Amazon DynamoDB, một cơ sở dữ liệu NoSQL do AWS quản lý, ở chế độ tính phí theo số yêu cầu; hàm Lambda truy cập DynamoDB qua API HTTP nên không phải duy trì kết nối cơ sở dữ liệu giữa các lần gọi.

Khung AWS Well-Architected Framework hệ thống hóa các nguyên tắc thiết kế trên AWS thành sáu trụ cột: vận hành xuất sắc, bảo mật, độ tin cậy, hiệu quả hiệu năng, tối ưu chi phí và tính bền vững (Amazon Web Services, 2024). Hai trụ cột độ tin cậy và hiệu quả hiệu năng tương ứng trực tiếp với các yêu cầu khả năng phục hồi, khả năng mở rộng và hiệu năng của luận văn.

## 2.8. An toàn khi lái và cơ sở lựa chọn ngưỡng độ trễ

Mục 1.1 đã dẫn bằng chứng về nguy cơ va chạm khi thao tác điện thoại lúc lái (Dingus et al., 2016). Ở góc độ thiết kế, hướng dẫn về xao nhãng do thiết bị điện tử trên xe của Cục An toàn Giao thông Đường cao tốc Hoa Kỳ (NHTSA) đặt tiêu chí chấp nhận cho các tác vụ cần vừa nhìn màn hình vừa dùng tay: thời lượng trung bình mỗi lần rời mắt khỏi mặt đường không vượt quá 2,0 giây và không quá 15% số lần rời mắt dài hơn 2,0 giây (National Highway Traffic Safety Administration, 2013). Tiêu chí này cho thấy mỗi thao tác cần nhìn màn hình phải rất ngắn; tương tác bằng giọng nói giúp loại bỏ phần lớn các lần rời mắt đó.

Luận văn không xây dựng trên các nền tảng hiển thị trên xe như Android Auto hay Apple CarPlay, vì trợ lý cần gắn trực tiếp với dữ liệu và nghiệp vụ riêng của hệ thống chuyến đi (nhận chuyến, gọi đúng khách của chuyến, báo khách không có mặt). Phạm vi được giới hạn ở trợ lý nghiệp vụ chạy trong ứng dụng tài xế và qua cuộc gọi điện thoại.

Về độ trễ, một nghiên cứu so sánh mười ngôn ngữ cho thấy khoảng lặng chuyển lượt trong hội thoại tự nhiên có giá trị phổ biến nhất trong khoảng 0 đến 200 mili-giây (Stivers et al., 2009). Một chuỗi xử lý STT – LLM – TTS qua mạng khó đạt mức này. Luận văn chọn ngưỡng P95 ≤ 2 giây như một ràng buộc kỹ thuật thực dụng cho bối cảnh vừa lái vừa nói, kết hợp với câu đệm (filler utterance) ngắn khi phản hồi chậm để người dùng biết hệ thống vẫn đang xử lý; câu đệm là một cách hiện thực nguyên tắc hiển thị trạng thái hệ thống (mục 2.5). Ngưỡng này là lựa chọn thiết kế của luận văn, không phải giá trị được rút ra trực tiếp từ các tài liệu trên.

## 2.9. Nghiên cứu liên quan

Mục này tổng quan năm hướng nghiên cứu gần với đề tài, sắp theo chân dung người dùng mà mỗi hướng liên quan: tương tác giọng nói trên xe (tài xế, mục 2.9.1); mô hình ngôn ngữ gọi công cụ (tài xế và khách hàng trong cuộc gọi do trợ lý thực hiện, mục 2.9.2); độ trễ và chuyển lượt trong hội thoại (tài xế và khách hàng, mục 2.9.3); trí tuệ nhân tạo trong dịch vụ gọi xe (điều phối viên và khách hàng, mục 2.9.4); và kiến trúc microservices trong thực tiễn (quản trị viên hệ thống, người vận hành hệ thống phân tán, mục 2.9.5). Mỗi hướng kết thúc bằng hệ quả đối với thiết kế hoặc đánh giá của luận văn; Bảng 2.3 so sánh các công trình tiêu biểu theo cùng một bộ tiêu chí.

### 2.9.1. Tương tác giọng nói trên xe và xao nhãng nhận thức

Strayer et al. (2019) đo tải thị giác và tải nhận thức khi người lái dùng hệ thống thông tin trên xe của nhiều mẫu xe khác nhau. Kết quả cho thấy mức tải thay đổi có hệ thống theo loại tác vụ, phương thức tương tác và mẫu xe, và nhiều chức năng gây xao nhãng đến mức không nên dùng khi đang lái. Nhóm tác giả kết luận rằng câu hỏi thiết kế nên là người lái *cần* được dùng chức năng nào khi xe chạy, thay vì cung cấp mọi chức năng *có thể* cung cấp. Như vậy, tương tác bằng giọng nói giảm thao tác nhìn và chạm nhưng không loại bỏ tải nhận thức. Hệ quả cho luận văn: tập chức năng được giới hạn theo loại phiên (FR-L03), mỗi lượt trả lời chỉ chứa một ý chính (NFR-01), và an toàn giao thông thực địa được ghi nhận là giới hạn của phép đánh giá (mục 6.13).

### 2.9.2. Mô hình ngôn ngữ gọi công cụ và cách đánh giá

Schick et al. (2023) cho thấy mô hình ngôn ngữ có thể học cách gọi công cụ bên ngoài. Patil et al. (2023) xây dựng Gorilla, mô hình được tinh chỉnh để gọi đúng hơn 1.600 API và giảm việc mô hình bịa ra lời gọi tới API không tồn tại; nhóm tác giả sau đó công bố bảng xếp hạng Berkeley Function Calling Leaderboard để so sánh khả năng gọi hàm của các mô hình. Qin et al. (2023) mở rộng quy mô lên hơn 16.000 API thực tế với ToolLLM. Gần với bài toán của luận văn nhất là τ-bench (Yao et al., 2024): tác nhân trao đổi với một người dùng giả lập, dùng công cụ theo chính sách nghiệp vụ, và một nhiệm vụ chỉ được tính là thành công khi trạng thái cơ sở dữ liệu cuối cùng khớp với trạng thái mong đợi. Trên τ-bench, ngay cả các mô hình gọi hàm tốt nhất tại thời điểm công bố cũng hoàn thành dưới 50% nhiệm vụ. Hệ quả cho luận văn: chỉ số "tỷ lệ hoàn thành nghiệp vụ" được định nghĩa theo trạng thái dữ liệu phía backend, không theo độ trôi chảy của câu trả lời (mục 6.3); thao tác có rủi ro được xác nhận hai bước thay vì tin hoàn toàn vào lựa chọn của mô hình.

### 2.9.3. Độ trễ và chuyển lượt trong hệ thống hội thoại

Trong hội thoại người với người, khoảng lặng chuyển lượt phổ biến nhất chỉ 0–200 mili-giây (Stivers et al., 2009). Skantze (2021) tổng quan các mô hình chuyển lượt trong hệ thống hội thoại và chỉ ra rằng nhiều hệ thống vẫn dựa vào ngưỡng im lặng để xác định người dùng đã nói xong, dẫn đến khoảng chờ không tự nhiên hoặc ngắt lời người dùng. Một hướng khắc phục là mô hình giọng nói đầu cuối song công, tức một mô hình nhận âm thanh và sinh âm thanh trực tiếp, không qua văn bản, và có thể vừa nghe vừa nói: Moshi (Défossez et al., 2024) đạt độ trễ khoảng 200 mili-giây trong thực tế, trong khi các trợ lý theo chuỗi xử lý theo tầng có độ trễ vài giây. Tuy nhiên, mô hình đầu cuối ở thời điểm đó chưa hỗ trợ gọi công cụ, điều kiện bắt buộc để thực thi nghiệp vụ. Hệ quả cho luận văn: chuỗi xử lý theo tầng được giữ lại để gọi công cụ, chấp nhận độ trễ cao hơn và bù bằng câu đệm; thời gian phát hiện kết thúc phát ngôn được tách riêng khi phân tích điểm nghẽn (Bảng 6.5).

### 2.9.4. Trí tuệ nhân tạo trong dịch vụ gọi xe

Một hướng nghiên cứu tập trung vào phía nền tảng: phân phối đơn, điều phối xe và điều tài xế tới khu vực có nhiều khách, trong đó mô hình ngôn ngữ đóng vai trò tác nhân ra quyết định (Lyu et al., 2025). Hướng này phục vụ vận hành mạng lưới, không giải quyết nhu cầu của tài xế đang lái cần tra lịch, gọi khách và cập nhật trạng thái mà không nhìn màn hình. Ở phía trải nghiệm, Alvarado Contreras et al. (2024) dùng chatbot giọng nói để tăng cảm giác an toàn cho hành khách; đối tượng và bài toán khác với tập nghiệp vụ của tài xế.

### 2.9.5. Kiến trúc microservices trong thực tiễn

Ngoài tổng quan tài liệu thực tiễn của Soldani et al. (2018) đã nêu ở mục 2.6, Taibi et al. (2017) phỏng vấn các nhà thực hành đã chuyển hệ thống sang microservices và tổng hợp động lực (khả năng bảo trì, khả năng mở rộng) cùng các vấn đề thường gặp (tách dữ liệu, giao tiếp giữa các dịch vụ, độ phức tạp điều phối). Các công trình này đánh giá microservices ở hệ thống doanh nghiệp nói chung; luận văn chưa tìm thấy công trình đánh giá thuộc tính chất lượng của microservices cho trợ lý giọng nói thực thi nghiệp vụ.

### 2.9.6. So sánh các công trình liên quan

Bảng 2.3 so sánh các công trình tiêu biểu theo năm tiêu chí tương ứng với phạm vi của luận văn. "Có" nghĩa là công trình giải quyết trực tiếp tiêu chí đó; "Một phần" nghĩa là có đề cập nhưng không phải trọng tâm.

**Bảng 2.3.** So sánh luận văn với các công trình liên quan

| Công trình | Hội thoại giọng nói thời gian thực | Thực thi nghiệp vụ qua gọi công cụ | Đối tượng là tài xế | Kênh điện thoại (SIP/PSTN) | Đánh giá thuộc tính chất lượng của hệ thống phân tán |
|---|---|---|---|---|---|
| Strayer et al. (2019) | Có (đo tương tác giọng nói trên xe) | Không | Có (người lái nói chung) | Không | Không |
| Patil et al. (2023) – Gorilla | Không | Có | Không | Không | Không |
| Yao et al. (2024) – τ-bench | Không (văn bản) | Có | Không | Không | Không |
| Chen et al. (2024) – VoiceBench | Một phần (đánh giá trợ lý giọng nói) | Không | Không | Không | Không |
| Défossez et al. (2024) – Moshi | Có | Không | Không | Không | Không |
| Lyu et al. (2025) | Không | Một phần (LLM ra quyết định điều phối) | Không (phía nền tảng) | Không | Không |
| Alvarado Contreras et al. (2024) | Có | Không | Không (hành khách) | Không | Không |
| Taibi et al. (2017) | Không | Không | Không | Không | Một phần (động lực và vấn đề khi chuyển sang microservices) |
| **Luận văn này** | **Có** | **Có** | **Có** | **Có** | **Có** |

## 2.10. Chỉ số đánh giá

Một trợ lý có thể nhận dạng chính xác nhưng vẫn không hoàn thành nghiệp vụ nếu chọn sai công cụ, phản hồi chậm, hoặc ngừng hoạt động khi một thành phần gặp sự cố. Các khung đánh giá trợ lý giọng nói dựa trên LLM khuyến nghị dùng nhiều chỉ số bổ sung nhau thay vì một điểm số tổng (Chen et al., 2024). Bảng 2.4 liệt kê các chỉ số được luận văn sử dụng; cách đo cụ thể trình bày ở Chương 6.

**Bảng 2.4.** Các chỉ số đánh giá và câu hỏi nghiên cứu tương ứng

| STT | Chỉ số | Ý nghĩa | Câu hỏi nghiên cứu |
|---|---|---|---|
| 1 | Độ trễ phản hồi (P50, P95) | Thời gian từ khi tài xế kết thúc phát ngôn đến khi hệ thống bắt đầu phát âm thanh trả lời | RQ2 |
| 2 | Tỷ lệ lỗi từ (WER) | WER = (S + D + I) / N, với S, D, I là số từ bị thay thế, bị xóa, bị chèn; N là số từ của câu tham chiếu | RQ3 |
| 3 | Độ chính xác gọi công cụ | Tỷ lệ lượt chọn đúng công cụ và đúng tham số | RQ4 |
| 4 | Tỷ lệ hoàn thành nghiệp vụ | Tỷ lệ kịch bản đạt trạng thái nghiệp vụ mong đợi | RQ4 |
| 5 | Chỉ số khả năng mở rộng | Biến thiên P95 và tỷ lệ lỗi khi tăng số phiên đồng thời và số bản sao tác nhân | RQ1 |
| 6 | Chỉ số khả năng phục hồi | Tỷ lệ phiên duy trì khi tiêm lỗi; thời gian khôi phục | RQ1 |

## 2.11. Khoảng trống nghiên cứu và định hướng luận văn

Từ Bảng 2.3, luận văn xác định ba khoảng trống gắn trực tiếp với đề tài:

1. Thiếu một giải pháp tích hợp đồng thời hội thoại thời gian thực, mô hình ngôn ngữ có gọi công cụ, nghiệp vụ của tài xế gọi xe và mục tiêu giảm thao tác khi lái.
2. Các nghiên cứu AI trong dịch vụ gọi xe nghiêng về tối ưu phía nền tảng hoặc trải nghiệm hành khách, chưa tập trung vào trợ lý thực thi nghiệp vụ cho tài xế.
3. Các công trình về trợ lý giọng nói ít trình bày lập luận kiến trúc từ yêu cầu phi chức năng và ít đánh giá các thuộc tính chất lượng của hệ thống phân tán (khả năng mở rộng, khả năng phục hồi) bên cạnh các chỉ số hội thoại.

Luận văn hướng tới lấp các khoảng trống này bằng cách phân tích yêu cầu theo mô hình chất lượng chuẩn, lập luận lựa chọn kiến trúc microservices trên AWS qua các chiến thuật kiến trúc, triển khai nguyên mẫu và đánh giá theo từng yêu cầu.

## Kết luận chương

Chương 2 đã trình bày nền tảng kỹ thuật của trợ lý giọng nói (chuỗi STT – LLM – TTS, gọi công cụ, WebRTC và SIP) và nền tảng kỹ nghệ phần mềm để phân tích và thiết kế hệ thống: mô hình chất lượng ISO/IEC 25010, kịch bản thuộc tính chất lượng, tiêu chí chấp nhận dạng Given – When – Then, chiến thuật kiến trúc và kiến trúc microservices như một mẫu gói các chiến thuật. Chương 3 vận dụng các khái niệm này để phân tích yêu cầu của hệ thống.

---

## Tài liệu trích dẫn trong Chương 2 (bản nháp — gộp vào danh mục cuối)

Xem danh mục REFERENCES trong build_thesis_final.py (đã kiểm DOI/URL ngày 2026-09-27; bổ sung ISTQB, North 2006, Nielsen 1994 ngày 2026-10-11).
