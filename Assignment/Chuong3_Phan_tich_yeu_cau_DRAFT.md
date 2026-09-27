# Chương 3. Phân tích yêu cầu

Chương này xác định hệ thống phải làm gì (yêu cầu chức năng) và phải làm tốt đến mức nào (yêu cầu phi chức năng). Yêu cầu chức năng được gắn với thành phần phụ trách và điều kiện chấp nhận quan sát được; yêu cầu phi chức năng được phân loại theo mô hình chất lượng ISO/IEC 25010 và đặc tả dưới dạng kịch bản thuộc tính chất lượng (mục 2.4). Cuối chương, các yêu cầu phi chức năng được đối chiếu với tính chất của kiến trúc microservices, làm căn cứ cho quyết định kiến trúc ở Chương 4.

## 3.1. Phương pháp xác định yêu cầu

Yêu cầu được xác định từ ba nguồn:

- **Nghiệp vụ hằng ngày của tài xế:** các thao tác tài xế thường làm trên ứng dụng khi đang hoặc chuẩn bị lái xe.
- **Tài liệu nội bộ của dự án:** tài liệu yêu cầu và bộ kịch bản hội thoại mẫu.
- **Ràng buộc an toàn khi lái:** các tiêu chí đã phân tích ở mục 2.7.

Các nghiệp vụ thường xuyên của tài xế gồm:

- Xem các chuyến trong ngày và tình trạng chuyến đang thực hiện.
- Nhận hoặc từ chối chuyến mới, đặc biệt khi hệ thống gọi điện mời nhận chuyến.
- Cập nhật tiến độ chuyến: đã đến điểm đón, đã đón khách, hoàn thành.
- Gọi hoặc nhắn tin cho khách khi đến điểm đón, khi khách đến muộn hoặc khi cần xác nhận địa chỉ.
- Hỏi cách sử dụng ứng dụng mà không phải dừng xe đọc hướng dẫn.
- Theo dõi thu nhập trong ngày hoặc trong một khoảng thời gian.
- Mở trợ lý bằng từ khóa đánh thức khi không thể dùng tay, và kết thúc phiên khi xong việc.

Mỗi nghiệp vụ được chuyển thành một hoặc nhiều yêu cầu chức năng có mã định danh. Mã định danh được dùng xuyên suốt các chương sau và trong ma trận đối chiếu yêu cầu (Phụ lục E).

## 3.2. Đối tượng sử dụng và kênh tương tác

### 3.2.1. Đối tượng sử dụng

**Tài xế** là người dùng chính và là đối tượng đánh giá trọng tâm. Tài xế tương tác với trợ lý qua hai kênh: kênh trong ứng dụng (WebRTC) khi chủ động mở trợ lý, và kênh điện thoại (SIP) khi hệ thống gọi điện mời nhận chuyến. Hai kênh khác nhau về trải nghiệm nhưng dùng chung logic nghiệp vụ.

Hành vi của tài xế khi đang lái là cơ sở để xác định yêu cầu:

- Mắt nhìn đường, tay giữ vô-lăng, nên không thể đọc hay chạm màn hình.
- Không muốn nghe danh sách dài hoặc địa chỉ đọc từng ký tự.
- Câu hỏi thường ngắn và gắn với việc đang làm: "còn mấy chuyến", "đến nơi rồi", "gọi khách", "thu nhập hôm nay".
- Thao tác có rủi ro (hủy chuyến, báo khách không có mặt) cần được xác nhận trước khi ghi nhận.

**Khách hàng** có luồng hội thoại riêng: đặt chuyến, theo dõi chuyến, hỏi thời gian tài xế đến, hoặc nghe cuộc gọi do tác nhân thực hiện thay tài xế. Luận văn không khảo sát trải nghiệm của khách hàng thật; luồng khách hàng được đánh giá qua bộ trường hợp kiểm thử (test case) với tiêu chí đạt hoặc không đạt theo điều kiện nghiệp vụ.

**Người điều phối và quản trị viên** tạo chuyến thử nghiệm và theo dõi cuộc gọi trên trang quản trị điều hành; **người vận hành kỹ thuật** giám sát tình trạng hệ thống và xem báo cáo vận hành hằng ngày trên trang giám sát hệ thống. Các đối tượng này không nằm trên luồng xử lý chính của hội thoại nhưng cần thiết để nguyên mẫu vận hành đầy đủ.

### 3.2.2. Thành phần hệ thống

Hệ thống gồm các thành phần sau; tên tiếng Việt được dùng trong toàn bộ luận văn, tên kỹ thuật tương ứng trong mã nguồn nêu trong ngoặc và tổng hợp ở Phụ lục G. Bảng 3.1 mô tả trách nhiệm và ranh giới của từng thành phần.

**Bảng 3.1.** Thành phần hệ thống, trách nhiệm và ranh giới

| Thành phần | Trách nhiệm | Ranh giới (không thực hiện) |
|---|---|---|
| Ứng dụng tài xế (driver-app) | Đăng nhập, xin token thoại, tham gia phòng hội thoại, thu và phát âm thanh, nhận dạng từ khóa đánh thức, hiển thị giao diện | Không tự tạo dữ liệu chuyến; không phát hành JWT |
| Dịch vụ Định danh (identity-service) | Quản lý tài khoản, đăng nhập, phát hành JWT, lưu cài đặt tài xế | Không ghi dữ liệu chuyến |
| Dịch vụ Chuyến đi và Điều phối (external-api-service) | Nguồn dữ liệu chuẩn về chuyến đi; cung cấp ngữ cảnh tài xế; cấp token thoại; gửi lời mời nhận chuyến; khởi tạo cuộc gọi thoại qua nền tảng truyền thông thời gian thực (SIP) | Không phát hành JWT đăng nhập; không gửi SMS trực tiếp |
| Tác nhân hội thoại giọng nói (llm-orchestrator) | Xử lý hội thoại STT – LLM kèm gọi công cụ – TTS; gọi API nghiệp vụ qua HTTP | Không truy cập cơ sở dữ liệu; không lưu dữ liệu nghiệp vụ |
| Nền tảng truyền thông thời gian thực (LiveKit Cloud) | Truyền âm thanh qua WebRTC; quay số ra mạng điện thoại qua SIP trunk; phân công tác nhân vào phòng | Không chứa logic nghiệp vụ |
| Dịch vụ Kênh liên lạc (external-channel-service) | Gửi tin nhắn SMS; nhận và lưu sự kiện do nhà cung cấp dịch vụ thoại (Twilio) gửi về (trạng thái cuộc gọi, tin nhắn đến, kết quả gửi SMS) | Không phải nguồn dữ liệu chuyến; không tham gia cuộc gọi thoại qua SIP |
| Dịch vụ Nhật ký cuộc gọi (call-records-service) | Lưu bản ghi hội thoại, tóm tắt và chỉ số chất lượng của phiên do tác nhân gửi khi kết thúc phiên; cung cấp bản ghi để tra cứu theo người gọi hoặc theo ngày | Không điều khiển nghiệp vụ chuyến |
| Dịch vụ Giám sát vận hành (ops-service) | Tổng hợp tình trạng các dịch vụ, nhật ký và cấu hình tác nhân; lập và lưu báo cáo vận hành hằng ngày | Không nằm trên luồng xử lý chính của hội thoại; chỉ đọc dữ liệu của dịch vụ khác qua API |

## 3.3. Kịch bản vận hành của phiên trợ lý

### 3.3.1. Tài xế chủ động mở trợ lý trong ứng dụng

Khi tài xế bấm nút trợ lý hoặc nói từ khóa đánh thức, ứng dụng dùng JWT đã được Dịch vụ Định danh phát hành để xin token thoại từ Dịch vụ Chuyến đi và Điều phối, sau đó tham gia phòng hội thoại trên nền tảng truyền thông thời gian thực; tác nhân hội thoại được phân công vào phòng và kết nối âm thanh. Nếu phòng của phiên trước vẫn còn tác nhân, hệ thống tái sử dụng phòng đó. Tác nhân phát lời chào ngắn ngay khi vào phòng, đồng thời tải trước ngữ cảnh tài xế (danh sách chuyến, chuyến hiện tại, thu nhập trong ngày, chế độ gọi khách mặc định), sau đó hỏi tài xế cần hỗ trợ gì. Chuỗi bước chi tiết trình bày ở sequence S2 (mục 4.5).

Ngữ cảnh được giữ trong trạng thái phiên để các câu hỏi như "hôm nay còn mấy chuyến?" được trả lời từ dữ liệu đã tải hoặc làm mới qua API, giảm số lần gọi mạng lặp lại. Khi ngữ cảnh trống hoặc API lỗi, tác nhân phải thông báo chưa có dữ liệu thay vì tạo ra thông tin không có nguồn.

Mỗi phát ngôn của tài xế được xử lý theo một luồng duy nhất: STT, LLM kèm gọi công cụ, rồi TTS. Khi phản hồi chưa sẵn sàng sau khoảng hai giây, hệ thống phát một câu đệm ngắn (ví dụ "Đợi mình một chút") không chứa dữ liệu nghiệp vụ.

### 3.3.2. Hệ thống chủ động gọi điện mời tài xế nhận chuyến

Khi có chuyến mới cần tài xế xác nhận, Dịch vụ Chuyến đi và Điều phối khởi tạo cuộc gọi SIP tới tài xế thông qua nền tảng truyền thông thời gian thực, tạo phòng hội thoại gắn thông tin chuyến. Trong phiên này, tác nhân chỉ được phép thực hiện hai thao tác: nhận chuyến hoặc từ chối chuyến. Lời chào nêu điểm đón và hỏi tài xế có nhận chuyến không. Việc giới hạn tập công cụ phù hợp với thực tế: khi điện thoại đổ chuông, tài xế không nên được đưa vào toàn bộ chức năng như khi chủ động mở trợ lý. Nếu tài xế đang có phiên trợ lý trong ứng dụng, hệ thống gửi thông báo vào phòng hiện có thay vì tạo cuộc gọi mới.

### 3.3.3. Ba chế độ gọi khách hàng

Khi tài xế yêu cầu gọi khách, hệ thống hỗ trợ ba chế độ tương ứng ba hoàn cảnh sử dụng (Bảng 3.2).

**Bảng 3.2.** Ba chế độ gọi khách hàng

| Chế độ | Hành vi | Hoàn cảnh phù hợp |
|---|---|---|
| Tác nhân gọi thay | Tác nhân trao đổi với khách; tài xế nghe và có thể can thiệp | Tài xế muốn tác nhân hỏi thay nhưng vẫn theo dõi |
| Nói trực tiếp (bridge) | Kết nối để tài xế nói trực tiếp với khách; tác nhân không phát âm chồng lấn | Cần trao đổi nhanh, mang tính cá nhân |
| Gọi nền | Tác nhân gọi trong phòng riêng; tài xế tiếp tục sử dụng trợ lý cho việc khác | Tài xế đang bận, chỉ cần kết quả sau cuộc gọi |

Chế độ mặc định lấy từ cài đặt của tài xế (lưu ở Dịch vụ Định danh và đưa vào ngữ cảnh phiên), trừ khi tài xế nêu rõ chế độ khác trong câu nói. Gọi số điện thoại không thuộc chuyến hiện tại bắt buộc có bước xác nhận trước khi quay số.

## 3.4. Yêu cầu chức năng

Yêu cầu chức năng được nhóm theo nghiệp vụ. Mỗi yêu cầu nêu hành vi hệ thống phải thực hiện, thành phần phụ trách chính và điều kiện chấp nhận. Điều kiện chấp nhận chung cho mọi yêu cầu: tác nhân không được tạo ra dữ liệu chuyến, thu nhập, vị trí hoặc kết quả cuộc gọi không có nguồn từ API nghiệp vụ. Tập công cụ tiếng Việt hiện thực các yêu cầu này gồm 45 công cụ: 39 công cụ cho phiên tài xế trong ứng dụng, 2 công cụ cho phiên mời nhận chuyến (dùng chung với phiên trong ứng dụng) và 7 công cụ cho phiên khách hàng (1 công cụ hỏi đáp dùng chung); danh mục ở Phụ lục A. Gói tiếng Anh có cùng 39 công cụ cho tài xế; phía khách hàng, gói tiếng Anh hiện có 4 công cụ.

### 3.4.1. Nhóm nghiệp vụ chuyến đi

Nhóm này gồm các yêu cầu trong vòng đời một chuyến, từ xem lịch, nhận chuyến, cập nhật tiến độ đến hủy chuyến (Bảng 3.3).

**Bảng 3.3.** Yêu cầu chức năng nhóm chuyến đi (FR-T)

| Mã | Yêu cầu | Thành phần phụ trách | Điều kiện chấp nhận |
|---|---|---|---|
| FR-T01 | Liệt kê các chuyến sắp tới trong ngày | Tác nhân hội thoại; Dịch vụ Chuyến đi và Điều phối | Số chuyến và thông tin khớp dữ liệu API |
| FR-T02 | Cung cấp thông tin chuyến hiện tại (điểm đón, điểm trả, trạng thái) | Tác nhân hội thoại; Dịch vụ Chuyến đi và Điều phối | Thiếu dữ liệu thì thông báo thiếu |
| FR-T03 | Cập nhật trạng thái chuyến (đã đến, đã đón, hoàn thành) | Dịch vụ Chuyến đi và Điều phối | Chỉ xác nhận bằng lời sau khi API trả về thành công |
| FR-T04 | Nhận hoặc từ chối chuyến mới, cả trong ứng dụng và trong cuộc gọi mời nhận chuyến | Dịch vụ Chuyến đi và Điều phối; nền tảng truyền thông thời gian thực (SIP) | Chọn đúng thao tác nhận/từ chối, không nhầm với hủy chuyến |
| FR-T05 | Hủy chuyến theo hai bước: đề nghị rồi xác nhận | Tác nhân hội thoại; Dịch vụ Chuyến đi và Điều phối | Chỉ hủy sau khi tài xế xác nhận |
| FR-T06 | Tài xế tạo chuyến cho khách vãng lai | Dịch vụ Chuyến đi và Điều phối | Chuyến được tạo với trạng thái đã xác nhận |
| FR-T07 | Gợi ý điểm dừng tiếp theo, lộ trình tối ưu và tình trạng giao thông | Dịch vụ Chuyến đi và Điều phối (dịch vụ bản đồ) | Thông tin lấy từ API bản đồ; không đọc hướng dẫn rẽ từng bước |

### 3.4.2. Nhóm nghiệp vụ liên lạc khách hàng

Nhóm này gồm các yêu cầu gọi điện, nhắn tin và theo dõi kết quả liên lạc với khách hàng (Bảng 3.4).

**Bảng 3.4.** Yêu cầu chức năng nhóm liên lạc khách hàng (FR-C)

| Mã | Yêu cầu | Thành phần phụ trách | Điều kiện chấp nhận |
|---|---|---|---|
| FR-C01 | Gọi khách của chuyến theo một trong ba chế độ (Bảng 3.2) | Tác nhân hội thoại; Dịch vụ Chuyến đi và Điều phối; nền tảng truyền thông thời gian thực (SIP) | Gọi đúng khách; áp dụng chế độ mặc định trừ khi tài xế nêu khác |
| FR-C02 | Gọi số điện thoại khác hoặc liên hệ trong danh bạ | Tác nhân hội thoại; Dịch vụ Chuyến đi và Điều phối; nền tảng truyền thông thời gian thực (SIP) | Có bước xác nhận trước khi quay số |
| FR-C03 | Gửi tin nhắn SMS cho khách hoặc số khác | Dịch vụ Chuyến đi và Điều phối; Dịch vụ Kênh liên lạc | Thông báo ngắn kết quả thành công hoặc thất bại |
| FR-C04 | Cung cấp vị trí khách và xác nhận chuyến với khách | Dịch vụ Chuyến đi và Điều phối | Không đưa ra vị trí không có trong dữ liệu |
| FR-C05 | Thông báo trạng thái và tóm tắt cuộc gọi gần nhất | Dịch vụ Chuyến đi và Điều phối; Dịch vụ Nhật ký cuộc gọi | Chưa có dữ liệu thì thông báo chưa có |

### 3.4.3. Nhóm nghiệp vụ chờ đón, sự cố, thu nhập, hỗ trợ và ngôn ngữ

Nhóm này gồm các yêu cầu còn lại của luồng tài xế (Bảng 3.5).

**Bảng 3.5.** Yêu cầu chức năng nhóm chờ đón, sự cố, thu nhập, hỗ trợ và ngôn ngữ

| Mã | Yêu cầu | Thành phần phụ trách | Điều kiện chấp nhận |
|---|---|---|---|
| FR-W01 | Tạo nhắc việc và đọc lại thời điểm nhắc | Tác nhân hội thoại | Thời điểm đọc lại khớp yêu cầu |
| FR-W02 | Gia hạn thời gian chờ khách | Dịch vụ Chuyến đi và Điều phối | Gia hạn được ghi nhận qua API |
| FR-I01 | Báo khách không có mặt sau khi xác nhận | Dịch vụ Chuyến đi và Điều phối | Chỉ ghi nhận sau khi tài xế xác nhận |
| FR-I02 | Báo sự cố trong chuyến | Dịch vụ Chuyến đi và Điều phối | Hỏi loại sự cố; không xử lý tranh chấp thanh toán hoặc pháp lý |
| FR-E01 | Tra cứu thu nhập trong ngày và theo kỳ, lịch sử chuyến và chỉ số tài xế | Dịch vụ Chuyến đi và Điều phối | Số liệu lấy từ API; thiếu thì thông báo chưa có |
| FR-E02 | Bật hoặc tắt trạng thái sẵn sàng nhận chuyến | Dịch vụ Chuyến đi và Điều phối | Trạng thái mới được xác nhận qua API |
| FR-F01 | Trả lời câu hỏi về cách sử dụng ứng dụng | Tác nhân hội thoại (truy xuất tri thức) | Trả lời theo tài liệu hướng dẫn; câu hỏi ngoài phạm vi được từ chối và hướng dẫn kênh phù hợp |
| FR-L01 | Hỗ trợ tiếng Việt và tiếng Anh cho luồng tài xế | Tác nhân hội thoại | Cùng tập công cụ tài xế ở hai ngôn ngữ |
| FR-L02 | Kết thúc phiên theo yêu cầu hoặc sau khi tài xế im lặng kéo dài | Tác nhân hội thoại; Dịch vụ Chuyến đi và Điều phối | Nhắc tối đa hai lần (khoảng 15 giây mỗi lần) rồi kết thúc lịch sự |
| FR-L03 | Giới hạn tập công cụ theo loại phiên (trong ứng dụng, mời nhận chuyến, khách hàng) | Tác nhân hội thoại | Phiên mời nhận chuyến chỉ có nhận/từ chối |

### 3.4.4. Nhóm kích hoạt và kết thúc chế độ nói trực tiếp

Hai yêu cầu trong nhóm này không đi qua lượt gọi công cụ như các nhóm trên (Bảng 3.6). Từ khóa đánh thức được nhận dạng ngay trên điện thoại thay vì tách thành một dịch vụ riêng trên máy chủ, vì ba lý do:

- Phải phản hồi tức thì khi tài xế nói từ khóa.
- Không nên gửi âm thanh liên tục lên máy chủ khi trợ lý chưa được kích hoạt.
- Sau khi kích hoạt, chỉ cần dùng lại luồng mở phiên đã có.

**Bảng 3.6.** Yêu cầu chức năng nhóm kích hoạt (FR-A)

| Mã | Yêu cầu | Thành phần phụ trách | Điều kiện chấp nhận |
|---|---|---|---|
| FR-A01 | Mở trợ lý bằng từ khóa đánh thức | Ứng dụng tài xế (nhận dạng trên thiết bị) | Mở phiên theo cùng luồng như khi bấm nút; nếu không nhận được từ khóa, tài xế vẫn mở được bằng nút |
| FR-A02 | Kết thúc chế độ nói trực tiếp bằng cụm từ quy định | Tác nhân hội thoại | Tác nhân trở lại hội thoại với tài xế sau khi nghe cụm từ kết thúc |

### 3.4.5. Nhóm giám sát vận hành

Người vận hành cần đánh giá hệ thống theo từng ngày mà không phải đọc từng bản ghi hội thoại. Yêu cầu này làm Dịch vụ Giám sát vận hành sở hữu một loại dữ liệu của riêng nó là báo cáo đã tổng hợp (Bảng 3.7).

**Bảng 3.7.** Yêu cầu chức năng nhóm giám sát vận hành (FR-O)

| Mã | Yêu cầu | Thành phần phụ trách | Điều kiện chấp nhận |
|---|---|---|---|
| FR-O01 | Lập báo cáo vận hành cho từng ngày (giờ Việt Nam): số phiên và số tài xế được phục vụ; tỷ lệ công cụ thành công, tỷ lệ API lỗi và tỷ lệ trả lời đúng trên mẫu có chấm; lỗi theo loại; độ trễ phản hồi trung bình, P50, P95 | Dịch vụ Giám sát vận hành; Dịch vụ Nhật ký cuộc gọi (dữ liệu nguồn); tác nhân hội thoại (chỉ số phiên) | Báo cáo tự lập sau nửa đêm cho ngày trước, lập lại được theo yêu cầu, ghi rõ cỡ mẫu và phương pháp chấm |
| FR-O02 | Xem báo cáo theo ngày và xu hướng 7 ngày trên trang giám sát hệ thống | Dịch vụ Giám sát vận hành; trang giám sát hệ thống | Chỉ tài khoản quản trị hệ thống truy cập được |

## 3.5. Trường hợp sử dụng chính

Bảng 3.8 tóm tắt mười một trường hợp sử dụng (use case) cốt lõi cùng luồng thành công và luồng ngoại lệ; lời thoại mẫu đặt ở Phụ lục B.

**Bảng 3.8.** Trường hợp sử dụng cốt lõi

| Mã | Trường hợp sử dụng | Yêu cầu liên quan | Kết quả thành công | Ngoại lệ phải xử lý |
|---|---|---|---|---|
| UC01 | Xem lịch chuyến trong ứng dụng | FR-T01, FR-T02 | Danh sách đúng theo dữ liệu | Ngữ cảnh trống: thông báo chưa có chuyến hoặc làm mới |
| UC02 | Nhận hoặc từ chối chuyến qua cuộc gọi mời nhận chuyến | FR-T04, FR-L03 | Quyết định được cập nhật | Không nghe rõ: hỏi lại; API lỗi: thông báo không cập nhật được |
| UC03 | Cập nhật tiến độ chuyến | FR-T03 | Trạng thái mới được xác nhận | Không đủ điều kiện nghiệp vụ: giải thích ngắn |
| UC04 | Gọi khách hàng | FR-C01, FR-C02 | Cuộc gọi khởi tạo đúng chế độ | Đang có cuộc gọi: không mở thêm; lỗi quay số: thông báo rõ |
| UC05 | Hủy chuyến hai bước | FR-T05 | Chỉ hủy sau khi tài xế đồng ý | Tài xế không đồng ý: giữ nguyên chuyến |
| UC06 | Báo khách không có mặt hoặc báo sự cố | FR-I01, FR-I02 | Ghi nhận sau xác nhận | Không đưa ra quy định bồi thường |
| UC07 | Hỏi cách sử dụng ứng dụng | FR-F01 | Trả lời theo tài liệu hướng dẫn | Ngoài phạm vi: hướng dẫn kênh phù hợp |
| UC08 | Tra cứu thu nhập, bật/tắt nhận chuyến | FR-E01, FR-E02 | Số liệu hoặc trạng thái đúng | API không trả dữ liệu: thông báo chưa có |
| UC09 | Im lặng kéo dài hoặc lỗi API giữa phiên | FR-L02, NFR-04 | Nhắc tài xế hoặc thông báo lỗi ngắn; phiên không bị kết thúc bất thường | Không tạo thông tin thay thế cho dữ liệu lỗi |
| UC10 | Mở trợ lý bằng từ khóa đánh thức | FR-A01 | Vào phiên trong ứng dụng | Không nhận từ khóa: vẫn mở bằng nút |
| UC11 | Người vận hành xem báo cáo ngày | FR-O01, FR-O02 | Báo cáo hiển thị đủ các nhóm chỉ số | Chưa có báo cáo: cho phép lập lại từ bản ghi |

## 3.6. Yêu cầu phi chức năng

### 3.6.1. Đặc tả yêu cầu phi chức năng

Luận văn tập trung vào năm yêu cầu phi chức năng: khả năng sử dụng, hiệu năng, khả năng mở rộng, khả năng phục hồi và bảo mật. Mỗi yêu cầu được phân loại theo đặc tính của ISO/IEC 25010 (ISO/IEC, 2023) và đặc tả dưới dạng kịch bản thuộc tính chất lượng (Bass et al., 2021) như trình bày trong Bảng 3.9.

**Bảng 3.9.** Yêu cầu phi chức năng theo ISO/IEC 25010 và kịch bản thuộc tính chất lượng

| Mã | Phân loại (ISO/IEC 25010) | Kích thích và môi trường | Phản ứng mong đợi | Thước đo |
|---|---|---|---|---|
| NFR-01 | Usability (Interaction capability) | Tài xế thực hiện nghiệp vụ cốt lõi bằng giọng nói khi đang lái | Mỗi lượt phản hồi chứa một ý chính; thao tác có rủi ro được xác nhận trước khi thực thi | 100% thao tác rủi ro có bước xác nhận; tỷ lệ đạt danh mục kiểm tra hành vi khi lái (Chương 6) |
| NFR-02 | Performance efficiency (time behaviour) | Tài xế kết thúc phát ngôn trong phiên hội thoại bình thường | Hệ thống bắt đầu phát âm thanh trả lời; phát câu đệm nếu phản hồi chưa sẵn sàng sau khoảng 2 giây | P95 độ trễ phản hồi ≤ 2 giây trên luồng cốt lõi |
| NFR-03 | Scalability (thuộc Flexibility) | Số phiên hội thoại đồng thời tăng từ 1 lên 20 | Hệ thống mở rộng theo chiều ngang bằng cách tăng số bản sao tác nhân, không thay đổi mã hay các dịch vụ khác | P95 ở 20 phiên (với số bản sao tương ứng) tăng không quá 20% so với 1 phiên; tỷ lệ phiên lỗi < 1% |
| NFR-04 | Reliability: availability, fault tolerance, recoverability (khả năng phục hồi) | Một dịch vụ phụ trợ, API nghiệp vụ hoặc nhà cung cấp AI chính gặp lỗi trong phiên; hoặc một bản sao tác nhân bị dừng | Phiên hội thoại tiếp tục; tác nhân thông báo rõ thao tác không thực hiện được; nhà cung cấp AI dự phòng được sử dụng; bản sao tác nhân được thay thế | 100% phiên không bị kết thúc bất thường trong các kịch bản tiêm lỗi; thời gian khôi phục bản sao tác nhân được đo và báo cáo |
| NFR-05 | Security (confidentiality, authenticity) | Người dùng hoặc dịch vụ truy cập API; hệ thống ghi nhật ký | Chỉ Dịch vụ Định danh phát hành JWT, các dịch vụ khác xác minh; tham số bí mật không nằm trong mã nguồn; nhật ký không chứa số điện thoại đầy đủ hoặc token | 100% mục đạt trong danh mục kiểm tra bảo mật (Chương 6) |

### 3.6.2. Ràng buộc kiến trúc

Bên cạnh các yêu cầu phi chức năng, hệ thống có bốn ràng buộc kiến trúc (Bảng 3.10). Đây là quy tắc thiết kế bắt buộc được rút ra từ yêu cầu, dùng để kiểm tra tính tuân thủ của hiện thực.

**Bảng 3.10.** Ràng buộc kiến trúc

| Mã | Ràng buộc | Yêu cầu nguồn |
|---|---|---|
| CON-01 | Tác nhân hội thoại chỉ truy cập dữ liệu nghiệp vụ qua API HTTP, không kết nối trực tiếp cơ sở dữ liệu | Điều kiện chấp nhận chung của FR; NFR-03; NFR-04 |
| CON-02 | Mỗi dịch vụ sở hữu dữ liệu của mình; dịch vụ khác truy cập qua API | NFR-03; NFR-04 |
| CON-03 | JWT đăng nhập chỉ do Dịch vụ Định danh phát hành | NFR-05 |
| CON-04 | Mọi phiên hội thoại được gắn mã phòng trên nhật ký để theo dõi và tìm nguyên nhân lỗi | NFR-04 |

## 3.7. Từ yêu cầu phi chức năng đến tính chất của kiến trúc microservices

Bảng 3.11 đối chiếu từng yêu cầu phi chức năng với tính chất của kiến trúc microservices có khả năng đáp ứng yêu cầu đó (mục 2.5), cùng cơ chế dự kiến trong hệ thống. Bảng này là đầu vào cho quyết định kiến trúc ở mục 4.2.

**Bảng 3.11.** Đối chiếu yêu cầu phi chức năng với tính chất của kiến trúc microservices

| Yêu cầu | Tính chất microservices | Cơ chế dự kiến trong hệ thống |
|---|---|---|
| NFR-02 Performance | Dị biệt công nghệ; tách xử lý thời gian thực khỏi xử lý giao dịch | Tác nhân hội thoại viết bằng Python, chạy dài hạn trên container, duy trì kết nối âm thanh; API giao dịch viết bằng Node.js chạy trên FaaS; tải trước ngữ cảnh phiên |
| NFR-03 Scalability | Mở rộng độc lập từng dịch vụ (trục X và trục Y của scale cube) | Tăng số bản sao tác nhân độc lập với API; API nghiệp vụ tự động mở rộng theo số yêu cầu; cơ sở dữ liệu tính phí theo yêu cầu |
| NFR-04 Resilience | Thiết kế cho lỗi; cô lập lỗi; dịch vụ phi trạng thái; mỗi dịch vụ một cơ sở dữ liệu | Thời gian chờ và suy giảm có kiểm soát khi gọi API; dự phòng nhà cung cấp STT, LLM, TTS; nền tảng container tự thay thế bản sao lỗi; chỉ số phiên và báo cáo ngày để phát hiện suy giảm |
| NFR-05 Security | Xác thực tập trung, xác minh phân tán; đặc quyền tối thiểu | Dịch vụ Định danh phát hành JWT, các dịch vụ khác xác minh bằng khóa bí mật dùng chung; vai trò IAM riêng cho từng dịch vụ |
| NFR-01 Usability | Ngữ cảnh giới hạn (bounded context) theo kênh | Phiên trong ứng dụng, phiên mời nhận chuyến và phiên khách hàng có tập công cụ riêng |

Từ Bảng 3.11 có thể thấy bốn trên năm yêu cầu phi chức năng (hiệu năng, khả năng mở rộng, khả năng phục hồi, bảo mật) đòi hỏi tách tác nhân hội thoại khỏi các dịch vụ nghiệp vụ, tách các chức năng phụ trợ (tin nhắn, nhật ký cuộc gọi) khỏi nguồn dữ liệu chuyến để lỗi của chúng không lan sang luồng chính, và tập trung định danh vào một dịch vụ. Đây là các tính chất đặc trưng của kiến trúc microservices; Chương 4 lập luận lựa chọn này so với các phương án thay thế.

## 3.8. Phạm vi yêu cầu

**Trong phạm vi:** các nhóm FR-T, FR-C, FR-W, FR-I, FR-E, FR-F, FR-L, FR-A, FR-O và năm yêu cầu phi chức năng NFR-01 đến NFR-05.

**Ngoài phạm vi:** các chức năng dưới đây không được xây dựng trong luận văn.

- **Nhắn tin nhóm giữa các tài xế:** không thuộc nghiệp vụ của một chuyến đi.
- **Dẫn đường từng ngã rẽ:** tài xế đã dùng ứng dụng bản đồ chuyên dụng; trợ lý chỉ gợi ý điểm dừng và tình trạng giao thông (FR-T07).
- **Thanh toán, hoàn tiền, bảo hiểm và tranh chấp:** cần quy trình pháp lý và con người xử lý, không phù hợp để tự động hóa bằng giọng nói.
- **Thay đổi hồ sơ, biển số xe, khôi phục mật khẩu:** là thao tác nhạy cảm về bảo mật, tài xế thực hiện trên màn hình khi xe đã dừng.
- **Thao tác trên ứng dụng của hãng gọi xe khác:** trợ lý chỉ làm việc với hệ thống chuyến đi của luận văn.
- **Huấn luyện lại mô hình nhận dạng hoặc tổng hợp giọng nói:** luận văn dùng mô hình có sẵn của nhà cung cấp (mục 1.5.3).

## 3.9. Tiêu chí chấp nhận

Tiêu chí chấp nhận là điều kiện đo được để kết luận một yêu cầu đã được đáp ứng. Bảng 3.12 nêu, cho từng nhóm yêu cầu, chỉ số cần đo, ngưỡng đạt và trường hợp sử dụng hoặc kịch bản dùng để đo. Chương 6 đánh giá hệ thống theo đúng các tiêu chí này.

**Bảng 3.12.** Tiêu chí chấp nhận theo yêu cầu

| Yêu cầu | Chỉ số | Ngưỡng | Trường hợp sử dụng / kịch bản |
|---|---|---|---|
| FR-T, FR-C, FR-W, FR-I, FR-E | Độ chính xác chọn công cụ; tỷ lệ hoàn thành nghiệp vụ | Báo cáo theo nhóm kịch bản | UC01–UC06, UC08 |
| FR-F01 | Tỷ lệ trả lời đúng theo tài liệu hướng dẫn | Không đưa ra chính sách không có trong tài liệu | UC07 |
| FR-L02, FR-A01 | Hành vi khi im lặng; mở phiên bằng từ khóa | Đạt / không đạt | UC09, UC10 |
| Luồng khách hàng | Tỷ lệ trường hợp kiểm thử đạt | Đạt / không đạt | Bộ trường hợp kiểm thử khách hàng |
| NFR-01 | Danh mục kiểm tra hành vi khi lái | 100% thao tác rủi ro có xác nhận | UC01–UC06 |
| NFR-02 | P50, P95 độ trễ phản hồi | P95 ≤ 2 giây | UC01, UC03, UC04, UC07 |
| NFR-03 | P95 và tỷ lệ phiên lỗi theo số phiên đồng thời | Tăng P95 ≤ 20%; lỗi < 1% | Kịch bản SC-01 đến SC-03 |
| NFR-04 | Tỷ lệ phiên duy trì khi tiêm lỗi; thời gian khôi phục | 100% phiên duy trì | Kịch bản RS-01 đến RS-05 |
| NFR-05 | Danh mục kiểm tra bảo mật | 100% mục đạt | Kiểm tra mã nguồn và cấu hình |
| FR-O01, FR-O02 | Báo cáo được lập đúng từ bản ghi mẫu; hiển thị trên trang giám sát | Đạt / không đạt | UC11 |
| Nhận dạng giọng nói | Tỷ lệ lỗi từ yên tĩnh so với nhiễu | So sánh tương đối | Bộ câu tham chiếu cố định |

## Kết luận chương

Chương 3 đã xác định các yêu cầu chức năng theo nhóm nghiệp vụ, gắn với thành phần phụ trách và điều kiện chấp nhận; đặc tả năm yêu cầu phi chức năng theo ISO/IEC 25010 dưới dạng kịch bản đo được; nêu bốn ràng buộc kiến trúc; và đối chiếu các yêu cầu phi chức năng với tính chất của kiến trúc microservices. Chương 4 dùng các yêu cầu này làm động lực kiến trúc để lựa chọn và thiết kế hệ thống.
