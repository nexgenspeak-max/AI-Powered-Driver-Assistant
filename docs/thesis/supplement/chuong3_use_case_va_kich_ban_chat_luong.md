# Tài liệu bổ sung cho Chương 3: đặc tả use case và kịch bản thuộc tính chất lượng

Luận văn (mục 3.3.5 và 3.4.1) chỉ tóm tắt năm use case tiêu biểu và nêu một ví dụ kịch bản chất lượng.
Tệp này chứa bản đầy đủ. Mã yêu cầu (FR, NFR), use case (UC) và tiêu chí chấp nhận (AC) theo đúng Chương 3.

# Phần 1. Đặc tả năm use case tiêu biểu

Mẫu đặc tả theo Cockburn (2001): tác nhân chính, tiền điều kiện, điều kiện kích hoạt, kịch bản chính,
kịch bản mở rộng và hậu điều kiện.

## UC14 – Tạo chuyến và mời tài xế

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Điều phối viên |
| Tác nhân hỗ trợ | Hệ thống thoại (gọi điện mời tài xế) |
| Mục tiêu | Chuyển yêu cầu đặt xe của khách thành một chuyến có tài xế nhận |
| Tiền điều kiện | Điều phối viên đã đăng nhập trang quản trị điều hành; khách đã gửi yêu cầu đặt xe qua tổng đài của hãng |
| Kích hoạt | Điều phối viên nhận được một yêu cầu đặt xe mới |
| Kịch bản chính | 1. Điều phối viên mở bảng điều phối và chọn tạo chuyến. 2. Điều phối viên nhập điểm đón, điểm trả, thời gian và số điện thoại của khách. 3. Hệ thống lưu chuyến ở trạng thái chờ. 4. Điều phối viên chọn tài xế và gửi lời mời. 5. Hệ thống gọi điện mời tài xế nhận chuyến (UC02). 6. Tài xế nhận chuyến; bảng điều phối cập nhật trạng thái đã xác nhận. |
| Kịch bản mở rộng | 5a. Tài xế đang mở trợ lý trong ứng dụng: hệ thống gửi lời mời vào phiên đang mở thay vì gọi điện. 5b. Tài xế ngoại tuyến hoặc không nghe máy: chuyến giữ trạng thái chờ, điều phối viên gán tài xế khác. 6a. Tài xế từ chối: chuyến chuyển trạng thái từ chối, điều phối viên gán lại. |
| Hậu điều kiện | Chuyến có trạng thái phản ánh đúng quyết định của tài xế; mọi thay đổi được ghi nhận |
| Yêu cầu liên quan | FR-Q01, FR-Q02; FR-T04 |

## UC02 – Nhận hoặc từ chối chuyến khi được gọi mời

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Tài xế |
| Tác nhân hỗ trợ | Hệ thống thoại |
| Mục tiêu | Quyết định nhận hay từ chối chuyến mới mà không cầm điện thoại |
| Tiền điều kiện | Có chuyến ở trạng thái chờ được gán cho tài xế (UC14); tài xế không mở trợ lý trong ứng dụng |
| Kích hoạt | Hệ thống gọi điện tới số của tài xế |
| Kịch bản chính | 1. Tài xế nghe máy. 2. Trợ lý chào, đọc điểm đón và hỏi tài xế có nhận chuyến không. 3. Tài xế trả lời nhận. 4. Hệ thống ghi chuyến sang trạng thái đã xác nhận. 5. Trợ lý xác nhận bằng lời sau khi trạng thái đã được ghi nhận và kết thúc cuộc gọi. |
| Kịch bản mở rộng | 3a. Tài xế trả lời không nhận: chuyến chuyển sang từ chối, trợ lý xác nhận. 3b. Trợ lý không nghe rõ: hỏi lại. 3c. Tài xế yêu cầu việc khác ngoài nhận hoặc từ chối: trợ lý từ chối vì phiên mời nhận chuyến chỉ có hai thao tác. 4a. Hệ thống không ghi nhận được: trợ lý báo không cập nhật được, không xác nhận sai. |
| Hậu điều kiện | Trạng thái chuyến khớp quyết định của tài xế |
| Yêu cầu liên quan | FR-T04, FR-L03 |

## UC04 – Liên lạc với khách hàng

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Tài xế |
| Tác nhân hỗ trợ | Hệ thống thoại; khách hàng (UC12) |
| Mục tiêu | Gọi hoặc nhắn tin cho khách của chuyến mà không thao tác màn hình |
| Tiền điều kiện | Tài xế đang mở trợ lý trong ứng dụng; có chuyến đang hoạt động với số điện thoại của khách |
| Kích hoạt | Tài xế nói "gọi khách" hoặc "nhắn cho khách…" |
| Kịch bản chính | 1. Trợ lý xác định chuyến và khách của chuyến. 2. Trợ lý chọn chế độ gọi mặc định trong cài đặt của tài xế (ba chế độ gọi khách, mục 3.3.1 của luận văn), trừ khi tài xế nêu chế độ khác. 3. Hệ thống quay số tới điện thoại của khách. 4. Cuộc gọi diễn ra theo chế độ đã chọn (UC12). 5. Khi cuộc gọi kết thúc, trợ lý báo kết quả cho tài xế; ở chế độ gọi nền, trợ lý đọc tóm tắt cuộc gọi. |
| Kịch bản mở rộng | 1a. Tài xế đọc một số khác hoặc tên trong danh bạ: trợ lý đọc lại và chỉ quay số sau khi tài xế xác nhận. 1b. Tài xế muốn nhắn tin: hệ thống gửi SMS và trợ lý báo kết quả gửi. 3a. Đang có một cuộc gọi khác: không mở thêm. 3b. Quay số thất bại: trợ lý báo không gọi được. 4a. Ở chế độ nói trực tiếp, tài xế nói cụm từ kết thúc: trợ lý trở lại hội thoại với tài xế. |
| Hậu điều kiện | Cuộc gọi hoặc tin nhắn tới đúng người; bản ghi và tóm tắt cuộc gọi được lưu |
| Yêu cầu liên quan | FR-C01, FR-C02, FR-C03, FR-C05, FR-A02 |

## UC12 – Nhận cuộc gọi từ trợ lý hoặc tài xế

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Khách hàng |
| Tác nhân hỗ trợ | Hệ thống thoại |
| Mục tiêu | Trao đổi với tài xế hoặc để lại lời nhắn về chuyến của mình |
| Tiền điều kiện | Khách có chuyến đã được tạo (UC14); tài xế yêu cầu gọi khách (UC04) |
| Kích hoạt | Điện thoại của khách đổ chuông |
| Kịch bản chính | 1. Khách nghe máy. 2. Trợ lý giới thiệu là trợ lý của tài xế và nêu mục đích cuộc gọi. 3. Khách trao đổi hoặc để lại yêu cầu (ví dụ xin chờ thêm vài phút). 4. Trợ lý ghi nhận yêu cầu và xác nhận lại với khách. 5. Cuộc gọi kết thúc; tài xế nhận được tóm tắt. |
| Kịch bản mở rộng | 1a. Khách không nghe máy: hệ thống báo cho tài xế. 2a. Tài xế chọn chế độ nói trực tiếp: khách nói chuyện trực tiếp với tài xế, trợ lý không phát âm chồng lấn. 3a. Khách hỏi giá hoặc thời gian đến mà dữ liệu chuyến không có: trợ lý không tự đưa ra con số. 3b. Khách hỏi thông tin chung về dịch vụ: trợ lý trả lời theo sổ tay hướng dẫn. |
| Hậu điều kiện | Yêu cầu của khách được ghi nhận và tóm tắt gửi về cho tài xế |
| Yêu cầu liên quan | FR-K01, FR-K02, FR-K04 |

## UC11 – Xem báo cáo vận hành ngày

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Quản trị viên hệ thống |
| Tác nhân hỗ trợ | Bộ hẹn giờ (lập báo cáo tự động) |
| Mục tiêu | Đánh giá chất lượng của trợ lý trong một ngày mà không đọc từng bản ghi hội thoại |
| Tiền điều kiện | Có bản ghi hội thoại của ngày cần xem; quản trị viên hệ thống đã đăng nhập trang giám sát |
| Kích hoạt | Đầu ngày làm việc, quản trị viên hệ thống mở trang báo cáo |
| Kịch bản chính | 1. Lúc 00:15 giờ Việt Nam, bộ hẹn giờ kích hoạt việc lập báo cáo cho ngày trước. 2. Hệ thống tổng hợp số phiên, số tài xế, độ trễ, tỷ lệ công cụ thành công, tỷ lệ API lỗi, lỗi theo loại và chấm một mẫu câu trả lời. 3. Quản trị viên hệ thống chọn ngày. 4. Trang giám sát hiển thị báo cáo và xu hướng 7 ngày. |
| Kịch bản mở rộng | 2a. Không có khóa của mô hình chấm: báo cáo ghi chú chưa chấm mẫu. 3a. Chưa có báo cáo cho ngày được chọn: quản trị viên hệ thống yêu cầu lập lại từ bản ghi. |
| Hậu điều kiện | Báo cáo của ngày được lưu, ghi rõ cỡ mẫu và phương pháp chấm |
| Yêu cầu liên quan | FR-O01, FR-O02 |

# Phần 2. Kịch bản thuộc tính chất lượng của năm yêu cầu phi chức năng

Mỗi dòng là một kịch bản theo Bass et al. (2021). Cột "Chân dung và use case liên quan" ứng với nguồn kích thích;
thành phần chịu tác động là Dịch vụ Liên lạc hội thoại thời gian thực và các dịch vụ nghiệp vụ.
Ngưỡng ở cột "Thước đo" là ngưỡng của tiêu chí chấp nhận AC-14 đến AC-18 (Bảng 3.8 của luận văn).

| Mã | Phân loại (ISO/IEC 25010) | Chân dung và use case liên quan | Kích thích và môi trường | Phản ứng mong đợi | Thước đo |
|---|---|---|---|---|---|
| NFR-01 | Tính khả dụng (interaction capability) | Tài xế; UC01–UC10, UC15, UC16 | Tài xế thực hiện nghiệp vụ cốt lõi bằng giọng nói khi đang lái | Mỗi lượt phản hồi chứa một ý chính; thao tác có rủi ro được xác nhận trước khi thực thi | 100% thao tác rủi ro có bước xác nhận; tỷ lệ đạt danh mục kiểm tra hành vi khi lái (Chương 6) |
| NFR-02 | Hiệu năng (time behaviour) | Tài xế, khách hàng; UC01, UC02, UC03, UC04, UC07, UC12 | Tài xế kết thúc phát ngôn trong phiên hội thoại bình thường | Hệ thống bắt đầu phát âm thanh trả lời; phát câu đệm nếu sau 2 giây chưa có câu trả lời | P95 độ trễ phản hồi ≤ 2 giây trên luồng cốt lõi |
| NFR-03 | Khả năng mở rộng (scalability, thuộc đặc tính linh hoạt) | Tài xế, khách hàng; mọi use case có hội thoại | Số phiên hội thoại đồng thời tăng từ 1 lên 20 | Hệ thống mở rộng theo chiều ngang bằng cách tăng số bản sao tác nhân, không thay đổi mã hay các dịch vụ khác | P95 ở 20 phiên (với số bản sao tương ứng) tăng không quá 20% so với 1 phiên; tỷ lệ phiên lỗi < 1% |
| NFR-04 | Khả năng phục hồi (độ tin cậy: availability, fault tolerance, recoverability) | Cả bốn chân dung; mọi use case | Một dịch vụ phụ trợ, API nghiệp vụ hoặc nhà cung cấp AI chính gặp lỗi trong phiên; hoặc một bản sao tác nhân bị dừng | Phiên hội thoại tiếp tục; tác nhân thông báo rõ thao tác không thực hiện được; nhà cung cấp AI dự phòng được sử dụng; bản sao tác nhân được thay thế | 100% phiên không bị kết thúc bất thường trong các kịch bản tiêm lỗi; thời gian khôi phục bản sao tác nhân được đo và báo cáo |
| NFR-05 | Bảo mật (confidentiality, authenticity) | Cả bốn chân dung; đặc biệt UC12, UC14, UC17, UC18 | Người dùng hoặc dịch vụ truy cập API; hệ thống ghi nhật ký | Chỉ một dịch vụ định danh phát hành JWT, các dịch vụ khác xác minh; tham số bí mật không nằm trong mã nguồn; nhật ký không chứa số điện thoại đầy đủ hoặc token | 100% mục đạt trong danh mục kiểm tra bảo mật (Chương 6) |
