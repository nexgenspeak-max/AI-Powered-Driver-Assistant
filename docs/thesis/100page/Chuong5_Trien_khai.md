# Chương 5. Triển khai

## 5.1. Công nghệ sử dụng

Công nghệ được chọn theo vai trò của từng lớp kiến trúc (Bảng 5.1); nhà cung cấp STT, LLM, TTS được chọn qua cấu hình (mục 5.3.4) nên có thể đổi nhà cung cấp mà không phải sửa kiến trúc.

**Bảng 5.1.** Công nghệ sử dụng theo lớp kiến trúc

| Lớp | Công nghệ | Vai trò |
|---|---|---|
| Máy khách | React Native (Expo), TypeScript, Tamagui; React (Vite) | Ứng dụng tài xế; trang quản trị |
| Hội thoại AI | Python, LiveKit Agents | STT, LLM gọi công cụ, TTS |
| Microservices | Node.js 20, TypeScript, Express, serverless-http | Dịch vụ nghiệp vụ, chạy cục bộ và trên Lambda |
| Truyền thông thời gian thực | LiveKit Cloud (WebRTC, SIP); Twilio (SIP trunk, SMS) | Phòng hội thoại; gọi ra mạng điện thoại |
| Bản đồ | Goong Maps API; Google Maps Platform | Địa chỉ, lộ trình, ETA, ma trận khoảng cách |
| Dữ liệu | Amazon DynamoDB; Redis (tùy chọn) | Dữ liệu nghiệp vụ; bộ nhớ đệm ngắn hạn |
| Truy xuất tri thức | LlamaIndex, sổ tay Markdown | Trả lời cách dùng ứng dụng |
| Hạ tầng dạng mã | AWS SAM, CloudFormation, Docker | Định nghĩa và triển khai tài nguyên AWS |

## 5.2. Tổ chức mã nguồn

Mã nguồn nằm trong kho GitHub https://github.com/nexgenspeak-max/AI-Powered-Driver-Assistant (thẻ thesis-final), tổ chức dạng kho đơn (monorepo). Thư mục src/backend chứa sáu dịch vụ: llm-orchestrator, identity-service, external-api-service, external-channel-service, call-records-service và ops-service, lần lượt là Dịch vụ Liên lạc hội thoại thời gian thực, Định danh, Chuyến đi và Điều phối, Liên lạc bằng tin nhắn, Nhật ký cuộc gọi, Giám sát vận hành. Thư mục src/frontend chứa ứng dụng tài xế, trang quản trị và trang giám sát; src/e2e chứa kiểm thử đầu cuối; infra chứa hạ tầng dạng mã. Mỗi dịch vụ Node.js dùng chung một mã nguồn cho hai điểm vào: máy chủ Express khi chạy cục bộ và hàm Lambda khi chạy trên AWS.

## 5.3. Hiện thực Dịch vụ Liên lạc hội thoại thời gian thực

### 5.3.1. Khởi tạo phiên và phân loại phòng

Tác nhân phân loại phiên theo tên phòng và metadata (Bảng 4.7), rồi nạp tập công cụ tương ứng ở cả hai gói ngôn ngữ; tiền tố trip cũ vẫn được chấp nhận để tương thích ngược. Với phiên tài xế, tác nhân đăng ký phiên, phát lời chào cố định, tải trước ngữ cảnh rồi hỏi tài xế cần gì (biểu đồ tuần tự S2).

### 5.3.2. Xử lý lượt hội thoại và câu đệm

Mọi phát ngôn đều được đưa qua mô hình ngôn ngữ cùng các công cụ được phép của loại phiên. Mô-đun nhận dạng ý định không gọi công cụ mà chỉ gán nhãn, dùng để bỏ mảnh chữ thừa cuối câu và nhận ra câu đồng ý với hành động đang chờ; nhánh rút gọn theo ý định (gọi thẳng công cụ), dùng trong đợt đo 05–06/09/2026, đã được gỡ khỏi mã nguồn. Câu đệm (mục 4.6.1) được phát sau 2,0 giây kể từ khi tài xế dứt câu, tối đa một lần mỗi lượt.

Vì cuộc gọi tới khách không hoàn tác được, ngoài xác nhận hai bước, hệ thống còn có một lớp chặn, được bổ sung sau khi câu "Ok." trả lời cho một chủ đề khác đã kích hoạt cuộc gọi trong phiên thử ngày 18/10/2026: công cụ gọi khách chỉ chạy khi tài xế vừa nói rõ ý định gọi hoặc vừa đồng ý; hành động đang chờ bị hủy sau 30 giây hoặc khi tài xế đổi chủ đề. Tài xế có thể hủy cuộc gọi bằng nút Czen; ở chế độ tác nhân gọi thay, lệnh hủy được gửi qua kênh dữ liệu riêng.

### 5.3.3. Gọi API nghiệp vụ

Mọi thao tác dữ liệu đi qua một mô-đun gọi API duy nhất, áp thời gian chờ theo Bảng 4.8, gắn token dịch vụ và ghi nhật ký thời gian xử lý. Tác nhân chỉ xác nhận với tài xế sau khi API trả về thành công và không kết nối cơ sở dữ liệu (CON-01). Bảng 5.2 minh họa một lượt ngày 06/09/2026, trong đó gửi SMS thất bại nhưng phiên vẫn tiếp tục; lượt này chậm chủ yếu do thời gian sinh token đầu của mô hình ngôn ngữ.

**Bảng 5.2.** Một lượt thực tế: tài xế nhờ nhắn tin cho khách khi dịch vụ gửi SMS gặp lỗi

| Khâu | Dữ liệu trong nhật ký |
|---|---|
| Nhận dạng giọng nói | "Nhắn cho khách là 15 phút nữa tôi đến đón."; phát hiện kết thúc phát ngôn sau 1,54 giây |
| Mô hình ngôn ngữ | Chọn công cụ gửi SMS; token đầu sau 3,48 giây |
| Gọi API nghiệp vụ | Không chuyển tiếp được SMS, trả mã 503 sau 1,31 giây |
| Xử lý lỗi trong công cụ | Bắt lỗi HTTP, ghi nhật ký, trả câu soạn sẵn |
| Tổng hợp giọng nói, tiếp tục phiên | "Không thể gửi tin nhắn lúc này. Vui lòng thử lại."; âm thanh đầu sau 0,17 giây |

Câu hỏi về cách dùng ứng dụng được trả lời bằng công cụ answer_app_faq: truy xuất đoạn liên quan trong sổ tay Markdown bằng LlamaIndex rồi tóm tắt thành một câu; chỉ mục vector tự dựng lại khi sổ tay thay đổi.

### 5.3.4. Lớp trừu tượng và dự phòng nhà cung cấp AI

Nhà cung cấp STT, LLM, TTS được tạo theo cấu hình qua một hàm khởi tạo chung (factory); khi có nhà cung cấp dự phòng, chuỗi nhà cung cấp được bọc bằng FallbackAdapter của LiveKit Agents. Mỗi lần thử STT và LLM chờ tối đa 5 giây; nhà cung cấp lỗi bị đánh dấu không khả dụng, yêu cầu được chuyển sang nhà cung cấp kế tiếp và sự kiện được ghi nhật ký.

Trước khi tới TTS, câu trả lời do LLM sinh ra được chuẩn hóa thành dạng đọc, còn bản hiển thị trên ứng dụng giữ nguyên. Số điện thoại được đọc từng chữ số, số tiền và số nhà dạng 5/9/36 được đổi sang chữ, còn từ viết tắt, đơn vị, giờ và biển số xe được đổi theo một tệp từ điển phát âm (pronunciation.toml). Ví dụ, "30A-123.45" được đọc là "ba mươi a, một hai ba, bốn năm", còn "14:30" là "14 giờ 30". Bước này đặt trước mọi nhà cung cấp TTS nên giọng chính và giọng dự phòng đọc giống nhau. Khi câu trả lời được truyền theo luồng, từ cuối của mỗi đoạn được giữ lại chờ đoạn kế tiếp, để một từ bị cắt giữa hai đoạn vẫn được nhận ra. Sau đợt đo ở Chương 6 (TTS Google, Bảng 6.2), cấu hình mặc định chuyển sang ElevenLabs eleven_v4_turbo với giọng nữ miền Nam và giữ Google làm dự phòng; các số liệu ở Chương 6 không đo lại với cấu hình này. Với giọng này, phiên tài xế dùng phong cách vui tươi: lời chào, lời cảm ơn hay tin vui có thể kèm thẻ âm thanh như cười khẽ hoặc giọng tươi vui, còn khi báo lỗi, xác nhận thao tác, đọc số tiền, số điện thoại và trong phiên với khách, trợ lý giữ giọng nghiêm túc; biểu tượng cảm xúc (emoji) trong câu trả lời bị loại bỏ trước khi đọc.

### 5.3.5. Xử lý im lặng và kết thúc phiên

Tác nhân xử lý im lặng theo Bảng 4.8; ngưỡng 15 giây được nâng lên 60 giây khi tài xế tắt micro và gõ chữ. Bản ghi và tóm tắt được gửi tới Dịch vụ Nhật ký cuộc gọi với thời gian chờ 10 giây và số lần thử lại có giới hạn; lỗi khi gửi không làm gián đoạn phiên (biểu đồ tuần tự S6).

### 5.3.6. Chỉ số chất lượng của phiên

Mỗi phiên có một bộ thu chỉ số riêng phục vụ báo cáo vận hành ngày (FR-O01), ghi lại độ trễ từng lượt, lời gọi HTTP, câu đệm, lần chuyển dự phòng, lỗi và kết quả công cụ. Bản tổng hợp (số lượt, trung bình, P50, P95, công cụ và lỗi theo tên, số lần dự phòng) và độ trễ từng lượt được gửi kèm bản ghi, nhờ đó P95 của cả ngày được tính trên toàn bộ các lượt.

## 5.4. Hiện thực các dịch vụ backend

### 5.4.1. Dịch vụ Chuyến đi và Điều phối

Dịch vụ này lưu bản chính thức của dữ liệu chuyến đi, đồng thời khởi tạo phiên thoại và cuộc gọi (Bảng 5.3).

**Bảng 5.3.** Nhóm API của Dịch vụ Chuyến đi và Điều phối phục vụ trợ lý

| Nhóm | Mục đích |
|---|---|
| Phiên thoại; ngữ cảnh | Cấp token LiveKit, đăng ký và kết thúc phiên; tải trước chuyến, thu nhập, cài đặt |
| Chuyến đi; sự cố | Tra cứu, cập nhật trạng thái, mời nhận chuyến; báo khách vắng, sự cố, gia hạn chờ |
| Cuộc gọi, tin nhắn | Gọi khách, kết thúc gọi nền, cuộc gọi mới nhất, gửi SMS |
| Thu nhập, trạng thái, nhắc việc | Thu nhập hôm nay và theo kỳ; bật/tắt nhận chuyến; tạo nhắc việc |

Các trạng thái đòi hỏi tài xế có mặt (đã đến điểm đón, đã đón, hoàn thành) chỉ được ghi nhận khi vị trí GPS mới nhất của tài xế cách điểm đón không quá 200 m (riêng trạng thái hoàn thành tính theo điểm trả); quy tắc này áp dụng cả khi tác nhân cập nhật thay tài xế. Ngoài bán kính này, API trả mã 409 kèm khoảng cách còn lại; riêng thao tác gọi khách vẫn được phép.

Dịch vụ còn nhắc khách khi tài xế sắp đến: nếu tài xế bật tùy chọn này và vừa vào bán kính đã chọn (500 m đến 3 km, mặc định 1 km) quanh điểm dừng đầu tiên của lộ trình tối ưu, dịch vụ mở một cuộc gọi nền tới khách (mỗi chuyến một lần) và gọi lại tối đa hai lần, cách nhau 60 giây, nếu khách không nghe máy.

Cuộc gọi thoại đi qua SIP của LiveKit Cloud và SIP trunk Twilio. Tại thời điểm đánh giá, SMS chưa giao được tới thuê bao Việt Nam vì chưa đăng ký tên người gửi (mục 6.13). Thông báo chuyến mới được phát ngay trong phòng thoại đang mở, hoặc được lưu tạm và phát khi tài xế mở trợ lý.

### 5.4.2. Dịch vụ Định danh

Dịch vụ Định danh hiện thực biểu đồ tuần tự S1 (mục 4.5.1). Cài đặt tài xế, gồm chế độ gọi khách mặc định, được lưu ở bảng riêng và đưa vào ngữ cảnh phiên.

### 5.4.3. Dịch vụ Liên lạc bằng tin nhắn, Dịch vụ Nhật ký cuộc gọi và Dịch vụ Giám sát vận hành

Dịch vụ Liên lạc bằng tin nhắn gửi SMS qua Twilio và nhận webhook về trạng thái gửi và tin nhắn đến; các webhook không yêu cầu JWT, còn các API khác đều yêu cầu. Sự kiện được ghi xong trước khi phản hồi webhook, vì trên Lambda, tác vụ chạy sau khi đã phản hồi có thể bị dừng giữa chừng.

Dịch vụ Nhật ký cuộc gọi lưu bản ghi trong một bảng DynamoDB riêng (Bảng 5.4); truy vấn theo ngày dùng chỉ mục phụ và phân trang.

**Bảng 5.4.** Cấu trúc một bản ghi nhật ký cuộc gọi

| Trường | Ý nghĩa |
|---|---|
| call_id; caller | Mã phiên (khóa chính); số điện thoại tài xế |
| started_at, ended_at, duration_seconds; record_date | Thời điểm bắt đầu, kết thúc, thời lượng; ngày theo giờ Việt Nam |
| turns | Các lượt nói: vai người nói, nội dung, thời điểm |
| summary | Tóm tắt do mô hình ngôn ngữ sinh ra khi kết thúc phiên |
| stt_provider, llm_provider, llm_model | Nhà cung cấp và mô hình đã dùng |
| mode, metrics; ttl | Loại phiên, chỉ số phiên (mục 5.3.6); thời hạn tự xóa |

Dịch vụ Giám sát vận hành, chỉ dành cho quản trị viên hệ thống, thăm dò tình trạng các dịch vụ và cung cấp nhật ký, cấu hình tác nhân, báo cáo ngày cho trang giám sát. Mô-đun báo cáo hiện thực biểu đồ tuần tự S7 (mục 4.5.7), dùng LLM chấm một mẫu ngẫu nhiên được cố định theo ngày, và đọc bản ghi từ Dịch vụ Nhật ký cuộc gọi thay vì từ CloudWatch Logs.

### 5.4.4. Tích hợp dịch vụ bản đồ

Trong backend, chỉ Dịch vụ Chuyến đi và Điều phối gọi dịch vụ bản đồ bên ngoài (Hình 4.1). Ứng dụng chỉ tải trực tiếp lớp bản đồ nền từ Goong (luồng ㉕, Bảng 4.4); tìm địa chỉ, chỉ đường và ma trận khoảng cách đều đi qua backend (luồng ㉓), nơi có bộ điều hợp (adapter) cho cả Goong và Google Maps Platform. Thực nghiệm dùng Goong.

Tích hợp bản đồ phục vụ bốn chức năng: (1) tìm và chuẩn hóa địa chỉ; (2) lấy lộ trình và tình trạng giao thông khi tạo chuyến, lưu cùng chuyến cho công cụ get_trip_traffic (FR-T07); (3) sắp xếp thứ tự ghé điểm dừng theo ma trận khoảng cách đường bộ bằng heuristic láng giềng gần nhất rồi cải tiến 2-opt, với ràng buộc điểm đón đứng trước điểm trả của cùng chuyến; kết quả được lưu đệm, cập nhật theo vị trí GPS và dùng chung cho thẻ điểm dừng, tab Chuyến và trợ lý (get_optimal_route, suggest_next_stop, UC16); (4) hiển thị bản đồ và chỉ đường trong ứng dụng (Hình 5.1c), còn trợ lý giọng nói không đọc chỉ dẫn rẽ từng bước (mục 3.5).

Lỗi dịch vụ bản đồ không làm dừng nghiệp vụ (NFR-04): khi không lấy được ma trận, thứ tự ghé được tính theo khoảng cách đường chim bay với tốc độ giả định 25 km/h và gắn nhãn ước lượng; khi không lấy được chỉ đường, API điều hướng trả mã 502 nhưng chuyến vẫn được tạo. Chất lượng thứ tự ghé được đánh giá ở Bảng 6.15; độ chính xác của thời gian đến dự kiến trên đường thật chưa được đo.

## 5.5. Hiện thực ứng dụng tài xế

Ứng dụng tài xế hiện thực thiết kế ở mục 4.8 dưới thương hiệu Czen, với bộ 57 biểu tượng SVG riêng và nhãn chữ cho cả năm mục điều hướng. Hình 5.1 trình bày màn hình chào, màn hình đăng nhập và màn hình bản đồ có lộ trình tối ưu cùng thẻ điểm dừng kế tiếp.

![Hình 5.1|row=4.6](thesis_screenshots/landing.jpg;thesis_screenshots/login.jpg;thesis_screenshots/map.jpg)

**Hình 5.1.** Ứng dụng tài xế: (a) màn hình chào, (b) đăng nhập, (c) bản đồ sau khi bật trạng thái hoạt động

Bảng mời nhận chuyến toàn màn hình có cước ước tính, vòng đếm ngược 30 giây và hai nút Từ chối và Nhận chuyến (Hình C.2); thời hạn được nâng từ 20 lên 30 giây vì việc vào phòng thoại trước khi trợ lý đọc chuyến có lúc mất 10–16 giây. Khung trò chuyện có một thanh nhập với nút micro và nút Czen; tài xế chạm nút Czen để bắt đầu hoặc kết thúc phiên. Câu gợi ý nhanh và bản ghi hội thoại được minh họa ở Hình 5.2.

![Hình 5.2|row=4.6](thesis_screenshots/trolyczen1.jpg;thesis_screenshots/trolyaidangketnoi.jpg)

**Hình 5.2.** Phiên trợ lý giọng nói: (a) tài xế chọn câu gợi ý nhanh, trợ lý đang xử lý; (b) hội thoại tra cứu lịch trình trong ngày

Trang "Báo cáo ngày" của trang giám sát hiển thị các nhóm chỉ số (Hình 5.3), các câu trả lời bị bộ chấm LLM đánh giá sai và xu hướng 7 ngày (Hình 5.4). Dữ liệu ngày 18/10/2026 lấy từ một tài khoản thử nghiệm, chỉ dùng để minh họa và không dùng cho đánh giá ở Chương 6; dù vậy, các câu bị chấm sai đã giúp phát hiện và sửa hai lỗi thực tế.

![Hình 5.3|h=11](thesis_screenshots/superadmin/baocaongay.png)

**Hình 5.3.** Trang báo cáo vận hành ngày: các chỉ số tổng hợp (dữ liệu ngày 18/10/2026)

![Hình 5.4](thesis_screenshots/superadmin/baocaongay_xuhuong.png)

**Hình 5.4.** Trang báo cáo vận hành ngày: câu trả lời bị chấm sai và xu hướng 7 ngày (dữ liệu ngày 18/10/2026)

Trang cài đặt trợ lý cho phép chọn ngôn ngữ, chế độ gọi khách mặc định và bán kính nhắc khách. Từ khóa đánh thức được nhận dạng trên thiết bị bằng thư viện Vosk; khi nhận ra từ khóa, ứng dụng mở phiên giống như khi tài xế chạm nút Czen. Các ảnh giao diện khác được trình bày ở Phụ lục C.

## 5.6. Triển khai trên AWS

### 5.6.1. Hạ tầng dạng mã

Mỗi dịch vụ có một stack hạ tầng dạng mã riêng trong thư mục infra, triển khai độc lập (Bảng 5.5). API Gateway chuyển mọi đường dẫn tới ứng dụng Express nên thêm API mới không cần sửa template; tham số bí mật được nạp từ tệp môi trường ngoài kho mã (NFR-05).

**Bảng 5.5.** Tài nguyên AWS theo stack

| Stack | Tài nguyên AWS | Yêu cầu |
|---|---|---|
| identity-service | API Gateway; Lambda; DynamoDB accounts, driver-settings | NFR-03, NFR-05 |
| external-api-service | API Gateway REST, WebSocket; Lambda; DynamoDB trips, ws-connections | NFR-02, NFR-03 |
| external-channel-service | API Gateway; Lambda; DynamoDB channel-events (TTL 90 ngày) | NFR-04 |
| call-records-service | API Gateway; Lambda; DynamoDB call-records (chỉ mục ngày) | NFR-04, FR-O01 |
| ops-service | API Gateway; Lambda; DynamoDB daily-reports; EventBridge Scheduler 00:15 | FR-O01, NFR-04 |
| llm-orchestrator | ECR; ECS trên Fargate (1 vCPU, 2 GB), chỉ kết nối chiều ra | NFR-02, NFR-03, NFR-04 |
| frontend | Amazon S3 (trang quản trị, trang giám sát tĩnh) | FR-Q, FR-S |

**Trạng thái triển khai tại thời điểm đánh giá.** Mã hạ tầng đã hoàn chỉnh nhưng nguyên mẫu thực nghiệm chưa chạy trên kiến trúc AWS đầy đủ: kiểm tra tài khoản AWS ngày 13/10/2026 chỉ thấy các bảng DynamoDB của môi trường phát triển (774 bản ghi nhật ký cuộc gọi), hai stack Lambda phiên bản cũ và chưa có cụm ECS nào. Trong thực nghiệm, các dịch vụ và tác nhân chạy trên máy phát triển, nên kết quả ở Chương 6 phản ánh kiến trúc và mã nguồn, chưa phản ánh hành vi của Lambda, API Gateway và Fargate (mục 6.13).

### 5.6.2. Môi trường phát triển và thử nghiệm

Khi thực nghiệm, các dịch vụ Node.js chạy cục bộ bằng Express trên các bảng DynamoDB của môi trường phát triển; tác nhân chạy cục bộ và kết nối LiveKit Cloud. Khóa bí mật nằm trong tệp .env ngoài kho mã; kho mã kèm tệp mẫu để tái lập môi trường (Phụ lục D). Để chạy hệ thống đầu cuối, cần tối thiểu Dịch vụ Định danh, Dịch vụ Chuyến đi và Điều phối, tác nhân và ứng dụng tài xế; SIP trunk Twilio chỉ cần khi gọi điện.

## 5.7. Đối chiếu thiết kế và hiện thực

Bảng 5.6 đối chiếu quyết định thiết kế ở Chương 4 với vị trí hiện thực trong mã nguồn, làm căn cứ khoanh vùng lỗi ở Chương 6.

**Bảng 5.6.** Đối chiếu quyết định thiết kế và hiện thực

| Quyết định thiết kế | Hiện thực (đường dẫn trong kho mã) |
|---|---|
| Tác nhân chỉ gọi API (CON-01) | llm-orchestrator/app/services/backend_api.py |
| Khởi tạo phiên, lời chào, tải trước; cấp token, tái sử dụng phòng (S2) | llm-orchestrator/app/agent/session.py, voicebot/processors/prefetch.py; external-api-service/src/routes/voice.ts |
| Một luồng LLM duy nhất (ADR-02); câu đệm 2 giây | llm-orchestrator/app/voicebot/processors/spoken_intent.py, intent_classify.py, turn_filler.py |
| Dự phòng nhà cung cấp AI | llm-orchestrator/app/providers/__init__.py, fallback.py |
| Phân loại phiên và tập công cụ | session.py; voicebot/locales/{vn,en}/agent.py |
| Mời nhận chuyến (S4); gọi khách ba chế độ (S5) | external-api-service/src/services/dispatchService.ts, callService.ts, telephony/livekit.ts |
| Nhật ký cuộc gọi (S6); truy vấn theo ngày | llm-orchestrator/app/services/conversation_service.py; call-records-service/src/services/recordService.ts |
| Đăng nhập, JWT (S1) | identity-service/src/routes/auth.ts |
| Từ khóa đánh thức | driver-app/src/features/assistant-wakeword/wakeWordService.ts |
| Trả lời câu hỏi thường gặp | Công cụ answer_app_faq; llm-orchestrator/app/rag/, llm-orchestrator/requirements/knowledge/ |
| Chỉ số phiên; sự kiện nhà cung cấp thoại | llm-orchestrator/app/services/session_metrics.py; external-channel-service/src/services/events/ |
| Báo cáo vận hành ngày (S7) | ops-service/src/services/reports/; super-admin-panel/src/pages/ReportsPage.tsx |
| Hạ tầng AWS | infra/<dịch vụ>/sam.yaml, infra/llm-orchestrator/cfn.yaml, infra/deploy-all.sh |

## Kết luận chương

Nguyên mẫu hiện thực các quyết định thiết kế ở Chương 4 (Bảng 5.6) nhưng tại thời điểm đánh giá vẫn chạy trên máy phát triển chứ chưa chạy trên kiến trúc AWS đầy đủ (mục 5.6.1). Chương 6 đánh giá nguyên mẫu theo các yêu cầu ở Chương 3.
