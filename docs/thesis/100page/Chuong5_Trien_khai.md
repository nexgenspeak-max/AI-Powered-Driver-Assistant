# Chương 5. Triển khai

Chương này trình bày hiện thực nguyên mẫu theo thiết kế ở Chương 4: công nghệ, mã nguồn, tác nhân hội thoại, dịch vụ backend, ứng dụng tài xế, triển khai AWS và bảng đối chiếu thiết kế với mã nguồn.

## 5.1. Công nghệ sử dụng

Công nghệ được chọn theo vai trò của từng lớp kiến trúc (Bảng 5.1). Nhà cung cấp STT, LLM và TTS được chọn bằng cấu hình qua lớp trừu tượng nhà cung cấp (mục 5.3.4), nên đổi nhà cung cấp không làm thay đổi kiến trúc.

**Bảng 5.1.** Công nghệ sử dụng theo lớp kiến trúc

| Lớp | Công nghệ | Vai trò |
|---|---|---|
| Máy khách | React Native (Expo), TypeScript, Tamagui; React (Vite) | Ứng dụng tài xế; trang quản trị |
| Hội thoại AI | Python, LiveKit Agents | STT, LLM gọi công cụ, TTS |
| Microservices | Node.js 20, TypeScript, Express, serverless-http | Dịch vụ nghiệp vụ, cục bộ và Lambda |
| Truyền thông thời gian thực | LiveKit Cloud (WebRTC, SIP); Twilio (SIP trunk, SMS) | Phòng hội thoại; gọi ra mạng điện thoại |
| Bản đồ | Goong Maps API; Google Maps Platform | Địa chỉ, lộ trình, ETA, ma trận khoảng cách |
| Dữ liệu | Amazon DynamoDB; Redis (tùy chọn) | Dữ liệu nghiệp vụ; trạng thái phiên |
| Truy xuất tri thức | LlamaIndex, sổ tay Markdown | Trả lời cách dùng ứng dụng |
| Hạ tầng dạng mã | AWS SAM, CloudFormation, Docker | Định nghĩa, triển khai tài nguyên AWS |

## 5.2. Tổ chức mã nguồn

Mã nguồn nằm trong kho GitHub https://github.com/nexgenspeak-max/AI-Powered-Driver-Assistant, phiên bản của luận văn gắn thẻ thesis-final. Kho đơn (monorepo) gồm src/backend với sáu dịch vụ (llm-orchestrator là Dịch vụ Liên lạc hội thoại thời gian thực; identity-service, external-api-service, external-channel-service, call-records-service và ops-service lần lượt là Dịch vụ Định danh, Chuyến đi và Điều phối, Liên lạc bằng tin nhắn, Nhật ký cuộc gọi và Giám sát vận hành), src/frontend với ứng dụng tài xế, trang quản trị và trang giám sát, src/e2e cho kiểm thử đầu cuối và infra chứa template SAM/CloudFormation cùng kịch bản triển khai. Mỗi dịch vụ Node.js có hai điểm vào, một chạy Express cục bộ và một bọc thành hàm Lambda, nên cùng một mã chạy ở cả hai môi trường.

## 5.3. Hiện thực Dịch vụ Liên lạc hội thoại thời gian thực

### 5.3.1. Khởi tạo phiên và phân loại phòng

Điểm vào của tác nhân phân loại phiên theo tên phòng và metadata (Bảng 4.7): tiền tố driver là phiên tài xế, có metadata chuyến là phiên mời nhận chuyến; custcall là cuộc gọi khách nền; customer là phiên của ứng dụng khách hàng (ngoài phạm vi, mục 3.5). Mỗi loại có tập công cụ riêng trong hai gói ngôn ngữ. Với phiên tài xế, tác nhân đăng ký phiên, phát lời chào cố định, tải trước ngữ cảnh rồi hỏi tài xế cần gì (sequence S2).

### 5.3.2. Xử lý lượt hội thoại và câu đệm

Mọi phát ngôn đi qua mô hình ngôn ngữ kèm danh sách công cụ được phép của loại phiên. Mô-đun nhận dạng ý định chỉ gán nhãn để bỏ mảnh chữ thừa cuối câu và nhận ra câu đồng ý cho hành động đang chờ, không gọi công cụ; nhánh gọi thẳng công cụ theo ý định từng dùng trong đợt đo 05–06/09/2026 đã bị loại khỏi mã nguồn.

Gọi khách là thao tác không hoàn tác được, nên ngoài xác nhận hai bước còn có lớp chặn bổ sung sau phiên thử ngày 18/10/2026, khi câu "Ok." cho chủ đề khác đã làm cuộc gọi bắt đầu. Công cụ gọi khách chỉ chạy khi ý định vừa được nói rõ hoặc tài xế vừa đồng ý với câu hỏi của trợ lý; hành động chờ hủy sau 30 giây hoặc khi đổi chủ đề, và tài xế hủy được cuộc gọi bằng nút Czen (ở chế độ tác nhân gọi thay, lệnh hủy đi qua kênh dữ liệu riêng). Câu đệm phát sau 2,0 giây kể từ lúc tài xế dứt câu, tối đa một lần mỗi lượt, bị hủy nếu câu trả lời thật đã bắt đầu.

### 5.3.3. Gọi API nghiệp vụ

Mọi thao tác dữ liệu đi qua một mô-đun gọi API duy nhất với thời gian chờ riêng từng lời gọi (8 giây với API chuyến đi, 25 giây với khởi tạo cuộc gọi), token dịch vụ và nhật ký thời gian. Lỗi API được chuyển thành câu thông báo ngắn; tác nhân chỉ xác nhận sau khi API thành công và không có kết nối cơ sở dữ liệu (CON-01). Bảng 5.2 minh họa một lượt ngày 06/09/2026: SMS lỗi nhưng phiên không dừng; lượt chậm (khoảng 5 giây) chủ yếu do thời gian sinh token đầu.

**Bảng 5.2.** Một lượt thực tế: tài xế nhờ nhắn tin cho khách khi dịch vụ gửi SMS gặp lỗi

| Khâu | Dữ liệu trong nhật ký |
|---|---|
| Nhận dạng giọng nói | "Nhắn cho khách là 15 phút nữa tôi đến đón."; dứt câu sau 1,54 giây |
| Mô hình ngôn ngữ | Chọn công cụ gửi SMS; token đầu sau 3,48 giây |
| Gọi API nghiệp vụ | Không chuyển tiếp được SMS, trả 503 sau 1,31 giây |
| Xử lý lỗi trong công cụ | Bắt lỗi HTTP, ghi nhật ký, trả câu soạn sẵn |
| Tổng hợp giọng nói, tiếp tục phiên | "Không thể gửi tin nhắn lúc này. Vui lòng thử lại."; âm thanh đầu sau 0,17 giây |

Câu hỏi về cách dùng ứng dụng được trả lời bằng công cụ answer_app_faq: tác nhân truy xuất đoạn liên quan trong sổ tay Markdown bằng LlamaIndex rồi tóm thành một câu; chỉ mục vector được dựng lại tự động khi sổ tay đổi.

### 5.3.4. Lớp trừu tượng và dự phòng nhà cung cấp AI

Nhà cung cấp STT, LLM, TTS được tạo qua một hàm khởi tạo chung (factory) theo cấu hình. Khi có nhà cung cấp dự phòng, chuỗi được bọc bằng FallbackAdapter của LiveKit Agents: mỗi lần thử STT và LLM chờ tối đa 5 giây, nhà cung cấp lỗi bị đánh dấu không khả dụng và yêu cầu chuyển sang nhà cung cấp kế tiếp. Sự kiện chuyển đổi và phục hồi được ghi nhật ký.

### 5.3.5. Xử lý im lặng và kết thúc phiên

Sau 15 giây im lặng, tác nhân hỏi tài xế còn đó không; khi tài xế tắt micro và gõ chữ, ngưỡng tăng lên 60 giây. Sau hai lần nhắc không phản hồi, tác nhân chào kết thúc và gọi API kết thúc phiên. Bản ghi và tóm tắt được gửi tới Dịch vụ Nhật ký cuộc gọi với thời gian chờ 10 giây và số lần thử lại giới hạn; dịch vụ không khả dụng thì bản ghi được ghi vào nhật ký thay vì làm lỗi phiên (sequence S6).

### 5.3.6. Chỉ số chất lượng của phiên

Mỗi phiên có bộ thu chỉ số riêng phục vụ báo cáo vận hành ngày (FR-O01): độ trễ từng lượt, lời gọi HTTP, câu đệm, chuyển dự phòng, lỗi và kết quả công cụ. Khi phiên kết thúc, bản tổng hợp (số lượt, trung bình, P50, P95, công cụ và lỗi theo tên, số lần dự phòng) cùng độ trễ từng lượt được gửi kèm bản ghi, để P95 cả ngày tính từ mọi lượt thay vì trung bình từng phiên.

## 5.4. Hiện thực các dịch vụ backend

### 5.4.1. Dịch vụ Chuyến đi và Điều phối

Dịch vụ giữ bản chính thức của dữ liệu chuyến đi và khởi tạo phiên thoại, cuộc gọi (Bảng 5.3).

**Bảng 5.3.** Nhóm API của Dịch vụ Chuyến đi và Điều phối phục vụ trợ lý

| Nhóm | Mục đích |
|---|---|
| Phiên thoại; ngữ cảnh | Token LiveKit, đăng ký, kết thúc phiên; tải trước chuyến, thu nhập, cài đặt |
| Chuyến đi; sự cố | Tra cứu, cập nhật trạng thái, mời nhận chuyến; báo khách vắng, sự cố, gia hạn chờ |
| Cuộc gọi, tin nhắn | Gọi khách, kết thúc gọi nền, cuộc gọi mới nhất, gửi SMS |
| Thu nhập, trạng thái, nhắc việc | Thu nhập hôm nay, theo kỳ; bật tắt nhận chuyến; tạo nhắc việc |

Các trạng thái đòi tài xế có mặt (đã đến điểm đón, đã đón, hoàn thành) chỉ được ghi khi tài xế cách điểm đón, hoặc điểm trả với trạng thái hoàn thành, không quá 200 m; ngoài bán kính API trả 409 kèm khoảng cách còn lại, gọi khách vẫn được phép. Tác nhân cập nhật thay tài xế chịu cùng quy tắc với vị trí GPS mới nhất.

Dịch vụ nhắc khách khi tài xế sắp đến: khi tài xế bật tùy chọn và vừa vào bán kính đã chọn (500 m đến 3 km, mặc định 1 km) quanh điểm dừng đầu của lộ trình tối ưu, dịch vụ mở cuộc gọi nền tới khách; mỗi chuyến nhắc một lần, không ai nghe thì gọi lại tối đa hai lần cách nhau 60 giây. Ứng dụng gửi vị trí dày hơn khi gần điểm dừng (tới 15 giây hoặc 150 m khi còn dưới 3 km).

Cuộc gọi thoại đi qua SIP của LiveKit Cloud với SIP trunk Twilio; SMS chuyển tiếp tới Dịch vụ Liên lạc bằng tin nhắn, tại thời điểm đánh giá chưa giao được tới thuê bao Việt Nam vì chưa đăng ký tên người gửi (mục 6.13). Thông báo chuyến mới đi vào phòng thoại đang mở hoặc được lưu tạm và phát khi tài xế mở trợ lý.

### 5.4.2. Dịch vụ Định danh

Tài xế đăng nhập bằng số điện thoại và mật khẩu; mật khẩu lưu dạng băm bcrypt. Dịch vụ phát hành access token và refresh token, lưu băm của refresh token để thu hồi được. Cài đặt tài xế, gồm chế độ gọi khách mặc định, lưu ở bảng riêng và đưa vào ngữ cảnh phiên.

### 5.4.3. Dịch vụ Liên lạc bằng tin nhắn, Dịch vụ Nhật ký cuộc gọi và Dịch vụ Giám sát vận hành

Dịch vụ Liên lạc bằng tin nhắn gửi SMS qua Twilio và nhận webhook trạng thái, tin nhắn đến; webhook không yêu cầu JWT, các API còn lại có. Sự kiện nhà cung cấp được ghi xong trước khi trả lời webhook, vì trên Lambda tác vụ chạy sau khi trả lời có thể bị dừng.

Dịch vụ Nhật ký cuộc gọi lưu bản ghi hội thoại trên bảng DynamoDB riêng (Bảng 5.4); bản ghi gán ngày theo giờ Việt Nam, truy vấn theo ngày dùng chỉ mục phụ và trả theo trang.

**Bảng 5.4.** Cấu trúc một bản ghi nhật ký cuộc gọi

| Trường | Ý nghĩa |
|---|---|
| call_id; caller | Mã phiên (khóa chính); số điện thoại tài xế |
| started_at, ended_at, duration_seconds; record_date | Thời điểm bắt đầu, kết thúc, thời lượng; ngày theo giờ Việt Nam |
| turns | Các lượt nói: vai, nội dung, thời điểm |
| summary | Tóm tắt do mô hình ngôn ngữ sinh khi kết thúc phiên |
| stt_provider, llm_provider, llm_model | Nhà cung cấp và mô hình đã dùng |
| mode, metrics; ttl | Loại phiên, chỉ số phiên (mục 5.3.6); thời hạn tự xóa |

Dịch vụ Giám sát vận hành thăm dò tình trạng các dịch vụ, cung cấp nhật ký, cấu hình tác nhân và báo cáo ngày cho trang giám sát; chỉ quản trị viên hệ thống được truy cập. Mô-đun báo cáo gồm hàm tổng hợp, bộ chấm bằng LLM trên mẫu ngẫu nhiên cố định theo ngày và API đọc, dựng lại báo cáo; trên AWS, Lambda nhận lịch từ EventBridge Scheduler và đọc CloudWatch Logs.

### 5.4.4. Tích hợp dịch vụ bản đồ

Dữ liệu vị trí và lộ trình do Dịch vụ Chuyến đi và Điều phối lấy từ dịch vụ bản đồ bên ngoài (Hình 4.1); tác nhân không gọi nhà cung cấp bản đồ. Ứng dụng chỉ tải lớp bản đồ nền từ Goong (luồng ㉕, Bảng 4.4); tìm địa chỉ, chỉ đường và ma trận khoảng cách đi qua backend (luồng ㉓), nơi mô-đun bản đồ có hai bộ điều hợp (adapter) Goong và Google Maps Platform; thực nghiệm dùng Goong.

Tích hợp phục vụ bốn chức năng. Thứ nhất là tìm và chuẩn hóa địa chỉ. Thứ hai là lấy lộ trình và tình trạng giao thông khi tạo chuyến; độ chậm được lưu cùng chuyến để công cụ get_trip_traffic đọc lại (FR-T07). Thứ ba là sắp xếp thứ tự ghé các điểm dừng từ ma trận khoảng cách đường bộ: thuật toán đi lần lượt tới điểm gần nhất chưa ghé (heuristic láng giềng gần nhất), rồi thử đảo từng đoạn lộ trình và giữ lại nếu quãng đường ngắn hơn (cải tiến 2-opt), với ràng buộc điểm đón đứng trước điểm trả của cùng chuyến. Kết quả được lưu đệm và cập nhật theo GPS, nên thẻ điểm dừng, tab Chuyến và câu trả lời của trợ lý dùng cùng số liệu (get_optimal_route, suggest_next_stop, UC16). Thứ tư là hiển thị bản đồ và chỉ đường trong ứng dụng (Hình 5.1c); trợ lý không đọc chỉ dẫn rẽ (mục 3.5).

Lỗi dịch vụ bản đồ không làm dừng nghiệp vụ (suy giảm có kiểm soát, NFR-04): không có ma trận thì thứ tự ghé tính theo đường chim bay với tốc độ giả định 25 km/h và gắn nhãn ước lượng; không có chỉ đường thì API điều hướng trả 502, chuyến vẫn được tạo. Chất lượng thứ tự ghé được đánh giá ở Bảng 6.15; thời gian đến dự kiến trên đường thật chưa được đo.

## 5.5. Hiện thực ứng dụng tài xế

Ứng dụng tài xế hiện thực các yêu cầu ở mục 4.8 dưới thương hiệu Czen với bộ 57 biểu tượng SVG riêng, năm mục điều hướng đều có nhãn chữ. Màn hình chào có hai lối vào đăng nhập, đăng ký (Hình 5.1a); tài xế đăng nhập bằng số điện thoại và mật khẩu (Hình 5.1b); màn hình chính hiển thị bản đồ, vị trí xe, lộ trình tối ưu và thẻ điểm dừng kế tiếp kèm nút chỉ đường và nút gọi (Hình 5.1c).

![Hình 5.1|row=4.6](thesis_screenshots/landing.jpg;thesis_screenshots/login.jpg;thesis_screenshots/map.jpg)

**Hình 5.1.** Ứng dụng tài xế: (a) màn hình chào, (b) đăng nhập, (c) bản đồ sau khi bật trạng thái hoạt động

Khi có chuyến mới, ứng dụng hiện bảng mời nhận chuyến toàn màn hình với cước ước tính, vòng đếm ngược 30 giây và hai nút Từ chối, Nhận chuyến (Hình C.2); thời hạn nâng từ 20 lên 30 giây vì trợ lý chỉ đọc chuyến mới khi điện thoại đã vào phòng thoại, có lúc mất 10–16 giây. Khung trò chuyện có một thanh nhập duy nhất: nút micro bên trái và nút Czen bên phải để kết nối, thành sóng âm khi đang nói và chạm để kết thúc. Câu gợi ý nhanh nằm dưới lời chào cho tới lượt nói đầu tiên (Hình 5.2a); bản ghi hội thoại hiển thị đồng bộ với lời nói (Hình 5.2b).

![Hình 5.2|row=4.6](thesis_screenshots/trolyczen1.jpg;thesis_screenshots/trolyaidangketnoi.jpg)

**Hình 5.2.** Phiên trợ lý giọng nói: (a) tài xế chọn câu gợi ý nhanh, trợ lý đang xử lý; (b) hội thoại tra cứu lịch trình trong ngày

Trang giám sát hệ thống có trang "Báo cáo ngày" hiển thị các nhóm chỉ số (Hình 5.3), gồm câu trả lời bị bộ chấm LLM đánh giá sai và xu hướng 7 ngày (Hình 5.4). Ảnh chụp dùng dữ liệu thật ngày 18/10/2026 của một tài khoản thử nghiệm; các câu bị chấm sai đã chỉ ra hai lỗi thật được sửa. Số liệu một ngày chỉ minh họa cách đọc báo cáo, không dùng để đánh giá ở Chương 6.

![Hình 5.3|h=11](thesis_screenshots/superadmin/baocaongay.png)

**Hình 5.3.** Trang báo cáo vận hành ngày: các chỉ số tổng hợp (dữ liệu ngày 18/10/2026)

![Hình 5.4](thesis_screenshots/superadmin/baocaongay_xuhuong.png)

**Hình 5.4.** Trang báo cáo vận hành ngày: câu trả lời bị chấm sai và xu hướng 7 ngày (dữ liệu ngày 18/10/2026)

Trang cài đặt trợ lý cho phép chọn ngôn ngữ, chế độ gọi khách mặc định và bán kính nhắc khách. Từ khóa đánh thức được nhận dạng trên thiết bị bằng thư viện Vosk; khi khớp, ứng dụng mở phiên như khi bấm nút. Các ảnh giao diện khác đặt ở Phụ lục C.

## 5.6. Triển khai trên AWS

### 5.6.1. Hạ tầng dạng mã

Mỗi dịch vụ có một stack hạ tầng dạng mã riêng trong thư mục infra, triển khai độc lập, tài nguyên gắn thẻ layer trùng tên lớp trên Hình 4.1 (Bảng 5.5). API Gateway chuyển mọi đường dẫn tới ứng dụng Express nên thêm API không phải sửa template; tham số bí mật nạp từ tệp môi trường ngoài kho mã (NFR-05).

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

**Trạng thái triển khai tại thời điểm đánh giá.** Mã hạ tầng đã hoàn chỉnh, nhưng nguyên mẫu dùng trong thực nghiệm chưa chạy trên kiến trúc AWS đầy đủ: kiểm tra tài khoản AWS ngày 13/10/2026 chỉ thấy các bảng DynamoDB của môi trường phát triển (774 bản ghi nhật ký cuộc gọi) và hai stack Lambda phiên bản cũ, chưa có cụm ECS. Dịch vụ và tác nhân chạy trên máy phát triển, nên kết quả ở Chương 6 phản ánh kiến trúc và mã nguồn, chưa phản ánh hành vi của Lambda, API Gateway và Fargate (mục 6.13).

### 5.6.2. Môi trường phát triển và thử nghiệm

Trong phát triển và thực nghiệm, các dịch vụ Node.js chạy cục bộ bằng Express với các bảng DynamoDB của môi trường phát triển trên AWS; tác nhân chạy cục bộ và kết nối LiveKit Cloud. Khóa bí mật nằm trong tệp .env ngoài kho mã, có tệp mẫu để tái lập (Phụ lục D). Chạy đầu cuối tối thiểu cần Dịch vụ Định danh, Dịch vụ Chuyến đi và Điều phối, tác nhân và ứng dụng tài xế; SIP trunk Twilio chỉ cần cho gọi điện, còn Dịch vụ Liên lạc bằng tin nhắn và Dịch vụ Nhật ký cuộc gọi có thể tắt mà không ảnh hưởng hội thoại.

## 5.7. Đối chiếu thiết kế và hiện thực

Bảng 5.6 đối chiếu các quyết định thiết kế ở Chương 4 với vị trí hiện thực trong mã nguồn, làm căn cứ khoanh vùng lỗi ở Chương 6.

**Bảng 5.6.** Đối chiếu quyết định thiết kế và hiện thực

| Quyết định thiết kế | Hiện thực (đường dẫn trong kho mã) |
|---|---|
| Tác nhân chỉ gọi API (CON-01) | llm-orchestrator/app/services/backend_api.py |
| Khởi tạo phiên, lời chào, tải trước; cấp token, tái sử dụng phòng (S2) | llm-orchestrator/app/agent/session.py, processors/prefetch.py; external-api-service/src/routes/voice.ts |
| Một luồng LLM duy nhất (ADR-02); câu đệm 2 giây | llm-orchestrator/app/voicebot/processors/spoken_intent.py, intent_classify.py, turn_filler.py |
| Dự phòng nhà cung cấp AI | llm-orchestrator/app/providers/__init__.py, fallback.py |
| Phân loại phiên và tập công cụ | session.py; voicebot/locales/{vn,en}/agent.py |
| Mời nhận chuyến (S4); gọi khách ba chế độ (S5) | external-api-service/src/services/dispatchService.ts, callService.ts, telephony/livekit.ts |
| Nhật ký cuộc gọi (S6); truy vấn theo ngày | llm-orchestrator/app/services/conversation_service.py; call-records-service/src/services/recordService.ts |
| Đăng nhập, JWT (S1) | identity-service/src/routes/auth.ts |
| Từ khóa đánh thức | driver-app/src/features/assistant-wakeword/wakeWordService.ts |
| Trả lời câu hỏi thường gặp | Công cụ answer_app_faq; llm-orchestrator/app/rag/; requirements/knowledge/ |
| Chỉ số phiên; sự kiện nhà cung cấp thoại | llm-orchestrator/app/services/session_metrics.py; external-channel-service/src/services/events/ |
| Báo cáo vận hành ngày (S7) | ops-service/src/services/reports/; super-admin-panel/src/pages/ReportsPage.tsx |
| Hạ tầng AWS | infra/<dịch vụ>/sam.yaml, infra/llm-orchestrator/cfn.yaml, infra/deploy-all.sh |

## Kết luận chương

Chương 5 đã trình bày công nghệ, mã nguồn, tác nhân hội thoại với dự phòng nhà cung cấp AI, dịch vụ backend kèm tích hợp bản đồ, ứng dụng tài xế, hạ tầng AWS và trạng thái triển khai thực tế. Chương 6 đánh giá nguyên mẫu theo từng yêu cầu ở Chương 3.
