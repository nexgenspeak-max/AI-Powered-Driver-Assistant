# Chương 5. Triển khai

Chương này trình bày cách hiện thực nguyên mẫu theo thiết kế ở Chương 4, gồm công nghệ sử dụng, tổ chức mã nguồn, tác nhân hội thoại, các dịch vụ backend, ứng dụng tài xế, triển khai trên AWS và bảng đối chiếu thiết kế với mã nguồn.

## 5.1. Công nghệ sử dụng

Công nghệ được chọn theo vai trò của từng lớp kiến trúc (Bảng 5.1). Nhà cung cấp STT, LLM và TTS được chọn qua cấu hình của lớp trừu tượng nhà cung cấp (mục 5.3.4), nên đổi nhà cung cấp không đòi hỏi thay đổi kiến trúc.

**Bảng 5.1.** Công nghệ sử dụng theo lớp kiến trúc

| Lớp | Công nghệ | Vai trò |
|---|---|---|
| Máy khách | React Native (Expo), TypeScript, Tamagui; React (Vite) | Ứng dụng tài xế; trang quản trị |
| Hội thoại AI | Python, LiveKit Agents | STT, LLM gọi công cụ, TTS |
| Microservices | Node.js 20, TypeScript, Express, serverless-http | Dịch vụ nghiệp vụ, chạy cục bộ và trên Lambda |
| Truyền thông thời gian thực | LiveKit Cloud (WebRTC, SIP); Twilio (SIP trunk, SMS) | Phòng hội thoại; gọi ra mạng điện thoại |
| Bản đồ | Goong Maps API; Google Maps Platform | Địa chỉ, lộ trình, ETA, ma trận khoảng cách |
| Dữ liệu | Amazon DynamoDB; Redis (tùy chọn) | Dữ liệu nghiệp vụ; bộ nhớ đệm ngắn hạn của Dịch vụ Chuyến đi và Điều phối |
| Truy xuất tri thức | LlamaIndex, sổ tay Markdown | Trả lời cách dùng ứng dụng |
| Hạ tầng dạng mã | AWS SAM, CloudFormation, Docker | Định nghĩa và triển khai tài nguyên AWS |

## 5.2. Tổ chức mã nguồn

Mã nguồn nằm trong kho GitHub https://github.com/nexgenspeak-max/AI-Powered-Driver-Assistant, phiên bản dùng cho luận văn được gắn thẻ thesis-final. Kho đơn (monorepo) được tổ chức như sau. Thư mục src/backend chứa sáu dịch vụ: llm-orchestrator là Dịch vụ Liên lạc hội thoại thời gian thực; identity-service, external-api-service, external-channel-service, call-records-service và ops-service lần lượt là Dịch vụ Định danh, Dịch vụ Chuyến đi và Điều phối, Dịch vụ Liên lạc bằng tin nhắn, Dịch vụ Nhật ký cuộc gọi và Dịch vụ Giám sát vận hành. Thư mục src/frontend chứa ứng dụng tài xế, trang quản trị và trang giám sát; src/e2e chứa kiểm thử đầu cuối; infra chứa template SAM/CloudFormation cùng kịch bản triển khai. Mỗi dịch vụ Node.js có hai điểm vào: một chạy Express cục bộ, một bọc thành hàm Lambda; nhờ đó cùng một mã nguồn chạy được ở cả hai môi trường.

## 5.3. Hiện thực Dịch vụ Liên lạc hội thoại thời gian thực

### 5.3.1. Khởi tạo phiên và phân loại phòng

Điểm vào của tác nhân phân loại phiên theo tên phòng và metadata (Bảng 4.7). Phòng có tiền tố driver là phiên tài xế. Nếu phòng driver mang metadata chuyến (mã chuyến), đó là phiên mời nhận chuyến; Dịch vụ Chuyến đi và Điều phối gắn thêm sip_identity khi mời qua cuộc gọi SIP ra. Mã nguồn vẫn chấp nhận tiền tố trip cũ để tương thích. Tiền tố custcall ứng với cuộc gọi khách nền, còn customer ứng với phiên của ứng dụng khách hàng (ngoài phạm vi, mục 3.5). Mỗi loại phiên có tập công cụ riêng ở cả hai gói ngôn ngữ. Với phiên tài xế, tác nhân đăng ký phiên, phát lời chào cố định, tải trước ngữ cảnh rồi hỏi tài xế cần gì (sequence S2).

### 5.3.2. Xử lý lượt hội thoại và câu đệm

Mọi phát ngôn đều được đưa qua mô hình ngôn ngữ cùng danh sách công cụ mà loại phiên đó được phép dùng. Mô-đun nhận dạng ý định chỉ gán nhãn để bỏ mảnh chữ thừa ở cuối câu và nhận ra câu đồng ý với hành động đang chờ; mô-đun này không gọi công cụ. Nhánh rút gọn theo ý định (gọi thẳng công cụ, không qua mô hình ngôn ngữ), từng được dùng trong đợt đo 05–06/09/2026, đã bị loại khỏi mã nguồn. Câu đệm được phát sau 2,0 giây kể từ lúc tài xế dứt câu, tối đa một lần mỗi lượt, và bị hủy nếu câu trả lời thật đã bắt đầu.

Gọi khách là thao tác không hoàn tác được. Vì vậy, ngoài xác nhận hai bước, hệ thống còn có một lớp chặn bổ sung. Lớp này được thêm sau phiên thử ngày 18/10/2026, trong đó câu "Ok." dành cho một chủ đề khác đã khởi động cuộc gọi. Công cụ gọi khách chỉ chạy khi tài xế vừa nói rõ ý định hoặc vừa đồng ý với câu hỏi của trợ lý. Hành động đang chờ bị hủy sau 30 giây hoặc khi tài xế đổi chủ đề. Tài xế cũng có thể hủy cuộc gọi bằng nút Czen; ở chế độ tác nhân gọi thay, lệnh hủy đi qua một kênh dữ liệu riêng.

### 5.3.3. Gọi API nghiệp vụ

Mọi thao tác dữ liệu đều đi qua một mô-đun gọi API duy nhất. Mô-đun này đặt thời gian chờ riêng cho từng lời gọi (chẳng hạn 8 giây với phần lớn API chuyến đi, 25 giây với khởi tạo cuộc gọi), gắn token dịch vụ và ghi nhật ký thời gian. Lỗi API được chuyển thành câu thông báo ngắn. Tác nhân chỉ xác nhận sau khi API thành công; bản thân tác nhân không có kết nối cơ sở dữ liệu (CON-01). Bảng 5.2 minh họa một lượt ngày 06/09/2026: việc gửi SMS bị lỗi nhưng phiên không dừng. Lượt này chậm, chủ yếu do thời gian sinh token đầu (3,48 giây).

**Bảng 5.2.** Một lượt thực tế: tài xế nhờ nhắn tin cho khách khi dịch vụ gửi SMS gặp lỗi

| Khâu | Dữ liệu trong nhật ký |
|---|---|
| Nhận dạng giọng nói | "Nhắn cho khách là 15 phút nữa tôi đến đón."; phát hiện kết thúc phát ngôn sau 1,54 giây |
| Mô hình ngôn ngữ | Chọn công cụ gửi SMS; token đầu sau 3,48 giây |
| Gọi API nghiệp vụ | Không chuyển tiếp được SMS, trả 503 sau 1,31 giây |
| Xử lý lỗi trong công cụ | Bắt lỗi HTTP, ghi nhật ký, trả câu soạn sẵn |
| Tổng hợp giọng nói, tiếp tục phiên | "Không thể gửi tin nhắn lúc này. Vui lòng thử lại."; âm thanh đầu sau 0,17 giây |

Câu hỏi về cách dùng ứng dụng được trả lời bằng công cụ answer_app_faq: tác nhân truy xuất đoạn liên quan trong sổ tay Markdown bằng LlamaIndex rồi tóm tắt thành một câu. Chỉ mục vector được tự động dựng lại khi sổ tay thay đổi.

### 5.3.4. Lớp trừu tượng và dự phòng nhà cung cấp AI

Các nhà cung cấp STT, LLM và TTS được tạo theo cấu hình qua một hàm khởi tạo chung (factory). Khi có nhà cung cấp dự phòng, chuỗi nhà cung cấp được bọc bằng FallbackAdapter của LiveKit Agents. Mỗi lần thử với STT và LLM chờ tối đa 5 giây; nhà cung cấp gặp lỗi bị đánh dấu không khả dụng và yêu cầu được chuyển sang nhà cung cấp kế tiếp. Các sự kiện chuyển đổi và phục hồi đều được ghi nhật ký.

### 5.3.5. Xử lý im lặng và kết thúc phiên

Sau 15 giây im lặng, tác nhân hỏi tài xế còn ở đó không; khi tài xế tắt micro và gõ chữ, ngưỡng này tăng lên 60 giây. Nếu tài xế không phản hồi sau hai lần nhắc, tác nhân chào kết thúc và gọi API kết thúc phiên. Bản ghi hội thoại và bản tóm tắt được gửi tới Dịch vụ Nhật ký cuộc gọi với thời gian chờ 10 giây và số lần thử lại có giới hạn. Nếu dịch vụ này không khả dụng, bản ghi được ghi ra nhật ký thay vì làm lỗi phiên (sequence S6).

### 5.3.6. Chỉ số chất lượng của phiên

Mỗi phiên có một bộ thu chỉ số riêng phục vụ báo cáo vận hành ngày (FR-O01), ghi nhận độ trễ từng lượt, các lời gọi HTTP, câu đệm, lần chuyển dự phòng, lỗi và kết quả công cụ. Khi phiên kết thúc, bản tổng hợp (số lượt, trung bình, P50, P95, công cụ và lỗi theo tên, số lần dự phòng) và độ trễ từng lượt được gửi kèm bản ghi. Nhờ đó, P95 của cả ngày được tính từ mọi lượt thay vì từ giá trị trung bình của từng phiên.

## 5.4. Hiện thực các dịch vụ backend

### 5.4.1. Dịch vụ Chuyến đi và Điều phối

Dịch vụ này giữ bản chính thức của dữ liệu chuyến đi, đồng thời khởi tạo phiên thoại và cuộc gọi (Bảng 5.3).

**Bảng 5.3.** Nhóm API của Dịch vụ Chuyến đi và Điều phối phục vụ trợ lý

| Nhóm | Mục đích |
|---|---|
| Phiên thoại; ngữ cảnh | Cấp token LiveKit, đăng ký và kết thúc phiên; tải trước chuyến, thu nhập, cài đặt |
| Chuyến đi; sự cố | Tra cứu, cập nhật trạng thái, mời nhận chuyến; báo khách vắng, sự cố, gia hạn chờ |
| Cuộc gọi, tin nhắn | Gọi khách, kết thúc gọi nền, cuộc gọi mới nhất, gửi SMS |
| Thu nhập, trạng thái, nhắc việc | Thu nhập hôm nay và theo kỳ; bật/tắt nhận chuyến; tạo nhắc việc |

Các trạng thái đòi hỏi tài xế có mặt (đã đến điểm đón, đã đón, hoàn thành) chỉ được ghi khi tài xế cách điểm đón không quá 200 m; riêng trạng thái hoàn thành tính theo điểm trả. Ngoài bán kính này, API trả mã 409 kèm khoảng cách còn lại, nhưng thao tác gọi khách vẫn được phép. Khi tác nhân cập nhật trạng thái thay tài xế, cùng quy tắc này được áp dụng với vị trí GPS mới nhất.

Dịch vụ còn nhắc khách khi tài xế sắp đến. Nếu tài xế đã bật tùy chọn này và vừa đi vào bán kính đã chọn (500 m đến 3 km, mặc định 1 km) quanh điểm dừng đầu tiên của lộ trình tối ưu, dịch vụ mở một cuộc gọi nền tới khách. Mỗi chuyến chỉ nhắc một lần; nếu không ai nghe máy, dịch vụ gọi lại tối đa hai lần, cách nhau 60 giây. Khi còn cách điểm dừng dưới 3 km, ứng dụng gửi vị trí dày hơn (tới mức 15 giây hoặc 150 m một lần).

Cuộc gọi thoại đi qua SIP của LiveKit Cloud và SIP trunk Twilio. SMS được chuyển tiếp tới Dịch vụ Liên lạc bằng tin nhắn; tại thời điểm đánh giá, SMS chưa giao được tới thuê bao Việt Nam vì chưa đăng ký tên người gửi (mục 6.13). Thông báo chuyến mới được đưa vào phòng thoại đang mở, hoặc được lưu tạm và phát khi tài xế mở trợ lý.

### 5.4.2. Dịch vụ Định danh

Tài xế đăng nhập bằng số điện thoại và mật khẩu; mật khẩu được lưu dưới dạng băm bcrypt. Dịch vụ phát hành access token và refresh token, đồng thời lưu giá trị băm của refresh token để có thể thu hồi. Cài đặt của tài xế, trong đó có chế độ gọi khách mặc định, được lưu ở bảng riêng và đưa vào ngữ cảnh phiên.

### 5.4.3. Dịch vụ Liên lạc bằng tin nhắn, Dịch vụ Nhật ký cuộc gọi và Dịch vụ Giám sát vận hành

Dịch vụ Liên lạc bằng tin nhắn gửi SMS qua Twilio và nhận webhook về trạng thái và tin nhắn đến. Webhook không yêu cầu JWT, còn các API khác đều yêu cầu. Sự kiện từ nhà cung cấp được ghi xong trước khi trả lời webhook, vì trên Lambda, tác vụ chạy sau khi đã trả lời có thể bị dừng.

Dịch vụ Nhật ký cuộc gọi lưu bản ghi hội thoại trong một bảng DynamoDB riêng (Bảng 5.4). Mỗi bản ghi được gán ngày theo giờ Việt Nam; truy vấn theo ngày dùng chỉ mục phụ và trả kết quả theo trang.

**Bảng 5.4.** Cấu trúc một bản ghi nhật ký cuộc gọi

| Trường | Ý nghĩa |
|---|---|
| call_id; caller | Mã phiên (khóa chính); số điện thoại tài xế |
| started_at, ended_at, duration_seconds; record_date | Thời điểm bắt đầu, kết thúc, thời lượng; ngày theo giờ Việt Nam |
| turns | Các lượt nói: vai người nói, nội dung, thời điểm |
| summary | Tóm tắt do mô hình ngôn ngữ sinh ra khi kết thúc phiên |
| stt_provider, llm_provider, llm_model | Nhà cung cấp và mô hình đã dùng |
| mode, metrics; ttl | Loại phiên, chỉ số phiên (mục 5.3.6); thời hạn tự xóa |

Dịch vụ Giám sát vận hành thăm dò tình trạng các dịch vụ, đồng thời cung cấp nhật ký, cấu hình tác nhân và báo cáo ngày cho trang giám sát. Chỉ quản trị viên hệ thống được truy cập dịch vụ này. Mô-đun báo cáo gồm hàm tổng hợp, bộ chấm bằng LLM chạy trên một mẫu ngẫu nhiên cố định theo ngày, và API để đọc hoặc dựng lại báo cáo. Trên AWS, hàm Lambda báo cáo được EventBridge Scheduler kích hoạt theo lịch và đọc các bản ghi cuộc gọi trong ngày từ Dịch vụ Nhật ký cuộc gọi; CloudWatch Logs chỉ là nguồn dữ liệu cho trang nhật ký và trang tổng quan.

### 5.4.4. Tích hợp dịch vụ bản đồ

Dữ liệu vị trí và lộ trình do Dịch vụ Chuyến đi và Điều phối lấy từ dịch vụ bản đồ bên ngoài (Hình 4.1); tác nhân không gọi nhà cung cấp bản đồ. Ứng dụng chỉ tải trực tiếp lớp bản đồ nền từ Goong (luồng ㉕, Bảng 4.4). Các yêu cầu tìm địa chỉ, chỉ đường và ma trận khoảng cách đều đi qua backend (luồng ㉓). Tại backend, mô-đun bản đồ có hai bộ điều hợp (adapter) cho Goong và Google Maps Platform; thực nghiệm dùng Goong.

Phần tích hợp bản đồ phục vụ bốn chức năng. Thứ nhất là tìm và chuẩn hóa địa chỉ. Thứ hai là lấy lộ trình và tình trạng giao thông khi tạo chuyến; mức độ chậm được lưu cùng chuyến để công cụ get_trip_traffic đọc lại (FR-T07). Thứ ba là sắp xếp thứ tự ghé các điểm dừng dựa trên ma trận khoảng cách đường bộ. Thuật toán lần lượt đi tới điểm gần nhất chưa ghé (heuristic láng giềng gần nhất), rồi thử đảo ngược từng đoạn lộ trình và giữ thay đổi nếu quãng đường ngắn hơn (cải tiến 2-opt), với ràng buộc điểm đón luôn đứng trước điểm trả của cùng chuyến. Kết quả được lưu đệm và cập nhật theo GPS, nhờ đó thẻ điểm dừng, tab Chuyến và câu trả lời của trợ lý dùng chung một số liệu (get_optimal_route, suggest_next_stop, UC16). Thứ tư là hiển thị bản đồ và chỉ đường trong ứng dụng (Hình 5.1c); trợ lý không đọc chỉ dẫn rẽ (mục 3.5).

Lỗi của dịch vụ bản đồ không làm dừng nghiệp vụ (suy giảm có kiểm soát, NFR-04). Khi không lấy được ma trận, thứ tự ghé được tính theo khoảng cách đường chim bay với tốc độ giả định 25 km/h và gắn nhãn ước lượng. Khi không lấy được chỉ đường, API điều hướng trả mã 502 nhưng chuyến vẫn được tạo. Chất lượng thứ tự ghé được đánh giá ở Bảng 6.15; thời gian đến dự kiến trên đường thật chưa được đo.

## 5.5. Hiện thực ứng dụng tài xế

Ứng dụng tài xế hiện thực thiết kế tính khả dụng ở mục 4.8 dưới thương hiệu Czen, dùng bộ 57 biểu tượng SVG riêng; cả năm mục điều hướng đều có nhãn chữ. Màn hình chào có hai lối vào là đăng nhập và đăng ký (Hình 5.1a). Tài xế đăng nhập bằng số điện thoại và mật khẩu (Hình 5.1b). Màn hình chính hiển thị bản đồ, vị trí xe, lộ trình tối ưu và thẻ điểm dừng kế tiếp kèm nút chỉ đường và nút gọi (Hình 5.1c).

![Hình 5.1|row=4.6](thesis_screenshots/landing.jpg;thesis_screenshots/login.jpg;thesis_screenshots/map.jpg)

**Hình 5.1.** Ứng dụng tài xế: (a) màn hình chào, (b) đăng nhập, (c) bản đồ sau khi bật trạng thái hoạt động

Khi có chuyến mới, ứng dụng hiện bảng mời nhận chuyến toàn màn hình, gồm cước ước tính, vòng đếm ngược 30 giây và hai nút Từ chối, Nhận chuyến (Hình C.2). Thời hạn được nâng từ 20 lên 30 giây vì trợ lý chỉ đọc chuyến mới khi điện thoại đã vào phòng thoại, mà bước này có lúc mất 10–16 giây. Khung trò chuyện có một thanh nhập duy nhất, với nút micro bên trái và nút Czen bên phải. Chạm nút Czen để kết nối; khi đang nói, nút chuyển thành sóng âm, và chạm lần nữa để kết thúc. Các câu gợi ý nhanh hiển thị dưới lời chào cho tới lượt nói đầu tiên (Hình 5.2a); bản ghi hội thoại hiển thị đồng bộ với lời nói (Hình 5.2b).

![Hình 5.2|row=4.6](thesis_screenshots/trolyczen1.jpg;thesis_screenshots/trolyaidangketnoi.jpg)

**Hình 5.2.** Phiên trợ lý giọng nói: (a) tài xế chọn câu gợi ý nhanh, trợ lý đang xử lý; (b) hội thoại tra cứu lịch trình trong ngày

Trang giám sát hệ thống có trang "Báo cáo ngày" hiển thị các nhóm chỉ số (Hình 5.3), trong đó có các câu trả lời bị bộ chấm LLM đánh giá sai và xu hướng 7 ngày (Hình 5.4). Ảnh chụp dùng dữ liệu thật ngày 18/10/2026 của một tài khoản thử nghiệm; các câu bị chấm sai đã giúp phát hiện hai lỗi thật, và cả hai đã được sửa. Số liệu của một ngày chỉ nhằm minh họa cách đọc báo cáo, không được dùng để đánh giá ở Chương 6.

![Hình 5.3|h=11](thesis_screenshots/superadmin/baocaongay.png)

**Hình 5.3.** Trang báo cáo vận hành ngày: các chỉ số tổng hợp (dữ liệu ngày 18/10/2026)

![Hình 5.4](thesis_screenshots/superadmin/baocaongay_xuhuong.png)

**Hình 5.4.** Trang báo cáo vận hành ngày: câu trả lời bị chấm sai và xu hướng 7 ngày (dữ liệu ngày 18/10/2026)

Trang cài đặt trợ lý cho phép chọn ngôn ngữ, chế độ gọi khách mặc định và bán kính nhắc khách. Từ khóa đánh thức được nhận dạng trên thiết bị bằng thư viện Vosk; khi nhận ra từ khóa, ứng dụng mở phiên giống như khi tài xế bấm nút. Các ảnh giao diện khác được đặt ở Phụ lục C.

## 5.6. Triển khai trên AWS

### 5.6.1. Hạ tầng dạng mã

Mỗi dịch vụ có một stack hạ tầng dạng mã riêng trong thư mục infra và được triển khai độc lập; tài nguyên được gắn thẻ layer trùng với tên lớp trên Hình 4.1 (Bảng 5.5). API Gateway chuyển mọi đường dẫn tới ứng dụng Express, nên khi thêm API không cần sửa template. Các tham số bí mật được nạp từ tệp môi trường nằm ngoài kho mã (NFR-05).

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

**Trạng thái triển khai tại thời điểm đánh giá.** Mã hạ tầng đã hoàn chỉnh, nhưng nguyên mẫu dùng trong thực nghiệm chưa chạy trên kiến trúc AWS đầy đủ. Lần kiểm tra tài khoản AWS ngày 13/10/2026 chỉ ghi nhận các bảng DynamoDB của môi trường phát triển (774 bản ghi nhật ký cuộc gọi) và hai stack Lambda phiên bản cũ; chưa có cụm ECS nào. Các dịch vụ và tác nhân chạy trên máy phát triển, nên kết quả ở Chương 6 phản ánh kiến trúc và mã nguồn chứ chưa phản ánh hành vi của Lambda, API Gateway và Fargate (mục 6.13).

### 5.6.2. Môi trường phát triển và thử nghiệm

Trong giai đoạn phát triển và thực nghiệm, các dịch vụ Node.js chạy cục bộ bằng Express và dùng các bảng DynamoDB của môi trường phát triển trên AWS; tác nhân cũng chạy cục bộ và kết nối tới LiveKit Cloud. Các khóa bí mật nằm trong tệp .env ngoài kho mã; kho có kèm tệp mẫu để tái lập môi trường (Phụ lục D). Để chạy đầu cuối ở mức tối thiểu, cần Dịch vụ Định danh, Dịch vụ Chuyến đi và Điều phối, tác nhân và ứng dụng tài xế. SIP trunk Twilio chỉ cần khi gọi điện, còn Dịch vụ Liên lạc bằng tin nhắn và Dịch vụ Nhật ký cuộc gọi có thể tắt mà không ảnh hưởng tới hội thoại.

## 5.7. Đối chiếu thiết kế và hiện thực

Bảng 5.6 đối chiếu các quyết định thiết kế ở Chương 4 với vị trí hiện thực trong mã nguồn, làm căn cứ để khoanh vùng lỗi ở Chương 6.

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

Chương 5 đã trình bày công nghệ sử dụng, tổ chức mã nguồn, tác nhân hội thoại cùng cơ chế dự phòng nhà cung cấp AI, các dịch vụ backend kèm tích hợp bản đồ, ứng dụng tài xế, hạ tầng AWS và trạng thái triển khai thực tế. Chương 6 sẽ đánh giá nguyên mẫu theo từng yêu cầu đã nêu ở Chương 3.
