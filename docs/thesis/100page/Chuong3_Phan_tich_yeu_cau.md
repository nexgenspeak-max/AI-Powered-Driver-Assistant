# Chương 3. Phân tích yêu cầu

Chương này xác định hệ thống phải làm gì và phải làm tốt đến mức nào. Nội dung gồm chân dung người sử dụng (mục 3.2), yêu cầu chức năng (mục 3.3), yêu cầu phi chức năng cùng chiến thuật kiến trúc và tiêu chí chấp nhận (mục 3.4), và phạm vi yêu cầu (mục 3.5).

## 3.1. Phương pháp xác định yêu cầu

Yêu cầu được xác định theo năm bước:

1. **Lớp người dùng và chân dung.** Người dùng được chia thành các lớp, trong đó một lớp được chọn làm lớp ưu tiên (Wiegers & Beatty, 2013). Mỗi lớp được mô tả bằng một chân dung gồm mục tiêu và bối cảnh (Cooper et al., 2014). Kết quả trình bày ở mục 3.2.
2. **Yêu cầu chức năng theo chân dung.** Mỗi việc người dùng cần làm được viết thành một yêu cầu có mã riêng (Sommerville, 2016). Kết quả trình bày ở mục 3.3.1 đến 3.3.4.
3. **Use case.** Vì nghiệp vụ gọi xe đã rõ, luận văn dùng use case để mô hình hóa các yêu cầu đã biết (Cockburn, 2001). Mỗi use case là một việc mà người dùng muốn hoàn thành trọn vẹn. Kết quả trình bày ở mục 3.3.5.
4. **Yêu cầu phi chức năng.** Ràng buộc của chân dung và đặc điểm của use case được đặc tả thành các kịch bản thuộc tính chất lượng theo ISO/IEC 25010 và Bass et al. (2021). Kết quả trình bày ở mục 3.4.
5. **Tiêu chí chấp nhận.** Mỗi nhóm yêu cầu có tiêu chí chấp nhận dạng Given – When – Then (mục 2.4.4), làm căn cứ để Chương 6 kết luận đạt hay không đạt.

Yêu cầu được xác định từ ba nguồn thông tin. Nguồn thứ nhất là các nghiên cứu về tài xế gọi xe: nhóm này có khả năng dùng điện thoại khi lái cao gấp gần bốn lần người lái khác (Insurance Institute for Highway Safety, 2022) và thường thao tác điện thoại để nhận chuyến ngay khi đang lái (Song et al., 2023). Nguồn thứ hai là tài liệu nội bộ của dự án, gồm tài liệu yêu cầu, sổ tay hướng dẫn và kịch bản hội thoại ở Phụ lục B. Nguồn thứ ba là các ràng buộc an toàn khi lái (mục 2.8). Các mã FR, UC, NFR và AC được dùng lại ở Chương 4, 5 và 6.

## 3.2. Đối tượng sử dụng

Hệ thống có bốn lớp người dùng (Wiegers & Beatty, 2013; mục 2.4.1): tài xế, khách hàng, điều phối viên và quản trị viên hệ thống. Tài xế là lớp ưu tiên vì đây là nhóm duy nhất thao tác trong lúc điều khiển phương tiện. Bảng 3.1 mô tả mỗi lớp bằng một chân dung (Cooper et al., 2014).

**Bảng 3.1.** Chân dung người sử dụng

| Chân dung | Mục tiêu chính | Bối cảnh | Kênh tương tác |
|---|---|---|---|
| Tài xế | Hoàn thành chuyến, liên lạc với khách, theo dõi thu nhập mà không nhìn hay chạm màn hình | Mắt nhìn đường, tay giữ vô-lăng, khoang xe ồn | Giọng nói trong ứng dụng (WebRTC); cuộc gọi mời nhận chuyến (SIP) |
| Khách hàng | Đặt được xe, liên lạc được với tài xế | Không cài ứng dụng; đặt xe qua điện thoại hoặc Zalo | Cuộc gọi qua mạng điện thoại công cộng (PSTN), SMS |
| Điều phối viên | Điều phối chuyến; quản lý tài xế, khách, cuộc gọi | Nhân viên vận hành, làm việc trên máy tính | Trang quản trị điều hành |
| Quản trị viên hệ thống | Giữ hệ thống ổn định; theo dõi chất lượng trợ lý theo ngày | Người vận hành kỹ thuật | Trang giám sát hệ thống |

Bốn chân dung tham gia cùng một quy trình: khách đặt xe, điều phối viên tạo chuyến và mời tài xế, tài xế thực hiện chuyến bằng giọng nói, quản trị viên hệ thống theo dõi vận hành. Tài xế là đối tượng đánh giá trọng tâm, còn ba chân dung kia được kiểm chứng chủ yếu bằng kiểm thử.

## 3.3. Yêu cầu chức năng

Yêu cầu chức năng được viết theo góc nhìn người dùng; cách phân bổ yêu cầu cho từng dịch vụ được trình bày ở Chương 4. Mọi yêu cầu tuân theo ba quy tắc chung. Thứ nhất, trợ lý không đưa ra dữ liệu nào không lấy từ hệ thống. Thứ hai, trợ lý chỉ xác nhận bằng lời sau khi hệ thống đã lưu. Thứ ba, thao tác khó hoàn tác (hủy chuyến, báo khách vắng mặt, gọi số ngoài chuyến) phải qua bước xác nhận của tài xế.

### 3.3.1. Yêu cầu chức năng của tài xế

Tài xế mở trợ lý bằng nút bấm hoặc từ khóa đánh thức. Phiên cũng được mở khi tài xế nhận cuộc gọi mời nhận chuyến; phiên này chỉ cho phép nhận hoặc từ chối chuyến. Yêu cầu gồm bốn nhóm (Bảng 3.2): nghiệp vụ chuyến đi (FR-T), liên lạc khách hàng (FR-C, FR-A02), chờ đón – sự cố – thu nhập – hỗ trợ (FR-W, FR-I, FR-E, FR-F) và phiên hội thoại (FR-A01, FR-L). Gọi khách có ba chế độ: *tác nhân gọi thay* (tác nhân trao đổi với khách, tài xế nghe và có thể can thiệp), *nói trực tiếp* (tài xế nói với khách, kết thúc bằng cụm từ quy định) và *gọi nền* (tác nhân gọi trong phòng riêng, tài xế nghe tóm tắt sau).

**Bảng 3.2.** Yêu cầu chức năng của tài xế

| Mã | Yêu cầu |
|---|---|
| FR-T01 | Hỏi danh sách chuyến sắp tới trong ngày |
| FR-T02 | Hỏi thông tin chuyến hiện tại |
| FR-T03 | Cập nhật trạng thái chuyến bằng giọng nói |
| FR-T04 | Nhận hoặc từ chối chuyến mới |
| FR-T05 | Hủy chuyến đang hoạt động (hai bước) |
| FR-T06 | Tạo chuyến cho khách vãng lai |
| FR-T07 | Hỏi điểm dừng tiếp theo, thứ tự ghé và tình hình giao thông |
| FR-C01 | Gọi khách của chuyến theo ba chế độ |
| FR-C02 | Gọi số khác hoặc người trong danh bạ, có xác nhận trước |
| FR-C03 | Gửi SMS cho khách hoặc số khác |
| FR-C04 | Hỏi vị trí đón; gửi xác nhận chuyến |
| FR-C05 | Nghe tóm tắt cuộc gọi gần nhất |
| FR-A02 | Kết thúc nói trực tiếp bằng cụm từ quy định |
| FR-W01 | Đặt nhắc việc trước giờ đón |
| FR-W02 | Gia hạn thời gian chờ khách |
| FR-I01 | Báo khách không có mặt (có xác nhận) |
| FR-I02 | Báo sự cố trong chuyến |
| FR-E01 | Hỏi thu nhập, lịch sử chuyến và chỉ số cá nhân |
| FR-E02 | Bật hoặc tắt trạng thái nhận chuyến |
| FR-F01 | Hỏi cách sử dụng theo sổ tay |
| FR-A01 | Mở trợ lý bằng từ khóa đánh thức |
| FR-L01 | Hội thoại bằng tiếng Việt hoặc tiếng Anh |
| FR-L02 | Kết thúc phiên bằng lời nói hoặc khi tài xế im lặng |
| FR-L03 | Giới hạn tập chức năng theo loại phiên |

### 3.3.2. Yêu cầu chức năng của khách hàng

Khách không cài ứng dụng. Khách đặt xe qua điện thoại hoặc Zalo, điều phối viên tạo chuyến (FR-Q02), sau đó khách tương tác hoàn toàn qua điện thoại thường (Bảng 3.3). Khi trao đổi với khách, trợ lý chỉ trả lời dựa trên dữ liệu chuyến và sổ tay; yêu cầu của khách được ghi nhận và tóm tắt gửi về tài xế.

**Bảng 3.3.** Yêu cầu chức năng của khách hàng

| Mã | Yêu cầu |
|---|---|
| FR-K01 | Nhận cuộc gọi của trợ lý và để lại yêu cầu |
| FR-K02 | Nói chuyện trực tiếp với tài xế |
| FR-K03 | Nhận SMS xác nhận chuyến hoặc lời nhắn |
| FR-K04 | Hỏi thông tin chuyến và dịch vụ trong cuộc gọi |

### 3.3.3. Yêu cầu chức năng của điều phối viên

Điều phối viên làm việc trên trang quản trị điều hành (Bảng 3.4). Khi điều phối viên gửi lời mời nhận chuyến, hệ thống gọi mời tài xế (FR-T04) hoặc gửi thông báo vào phiên đang mở. Tài khoản bị khóa không đăng nhập được, còn nhật ký cuộc gọi chỉ cho phép xem.

**Bảng 3.4.** Yêu cầu chức năng của điều phối viên

| Mã | Yêu cầu |
|---|---|
| FR-Q01 | Xem bảng điều phối, lọc theo trạng thái, gán tài xế |
| FR-Q02 | Tạo chuyến từ yêu cầu của khách và mời tài xế |
| FR-Q03 | Xem danh sách tài xế, trạng thái trực tuyến; khóa tài khoản |
| FR-Q04 | Xem danh sách khách hàng và trạng thái tài khoản |
| FR-Q05 | Xem nhật ký cuộc gọi kèm tóm tắt |

### 3.3.4. Yêu cầu chức năng của quản trị viên hệ thống

Quản trị viên hệ thống theo dõi tình trạng kỹ thuật và chất lượng trợ lý theo ngày (Bảng 3.5). Báo cáo ngày (tính theo giờ Việt Nam) gồm số phiên, số tài xế, tỷ lệ gọi công cụ thành công, tỷ lệ lỗi API, tỷ lệ trả lời đúng trên mẫu được chấm, lỗi phân theo loại, độ trễ trung bình, P50 và P95. Báo cáo được lập tự động sau nửa đêm, có thể lập lại và ghi rõ cỡ mẫu cùng phương pháp chấm. Cấu hình không làm lộ khóa bí mật, và nhật ký không chứa số điện thoại đầy đủ hay token.

**Bảng 3.5.** Yêu cầu chức năng của quản trị viên hệ thống

| Mã | Yêu cầu |
|---|---|
| FR-S01 | Xem tình trạng từng dịch vụ backend |
| FR-S02 | Xem cấu hình STT – LLM – TTS theo ngôn ngữ |
| FR-S03 | Xem nhật ký thời gian thực theo mã phòng |
| FR-O01 | Lập báo cáo vận hành cho từng ngày |
| FR-O02 | Xem báo cáo ngày và xu hướng 7 ngày |

### 3.3.5. Mô hình use case

Các yêu cầu trên được tổ chức thành 18 use case: tài xế có 12 use case (Hình 3.1), mỗi chân dung còn lại có hai (Hình 3.2). Bản đặc tả đầy đủ theo mẫu của Cockburn (2001) được lưu trong kho mã nguồn, thư mục docs/requirements. Trong mục này, "tác nhân" (actor) là người hoặc hệ thống bên ngoài, khác với "tác nhân hội thoại" ở các chương khác. Hai tác nhân hỗ trợ là hệ thống thoại và bộ hẹn giờ lập báo cáo ngày.

![Hình 3.1|h=11](../diagrams/H3_1_usecase_driver.png)

**Hình 3.1.** Sơ đồ use case của tài xế

![Hình 3.2|h=9](../diagrams/H3_2_usecase_others.png)

**Hình 3.2.** Sơ đồ use case của khách hàng, điều phối viên và quản trị viên hệ thống

Bảng 3.6 liệt kê các use case cùng yêu cầu chức năng tương ứng; FR-L01 (song ngữ) áp dụng cho mọi use case của tài xế. Mã use case được giữ nguyên theo tài liệu yêu cầu của dự án, nơi use case được đánh số theo thứ tự xác định. Vì bảng xếp theo chân dung nên mã trong mỗi nhóm không liên tục. Mọi use case có chung một ngoại lệ: khi thiếu dữ liệu hoặc dịch vụ lỗi, trợ lý báo rõ và không suy đoán.

**Bảng 3.6.** Danh mục use case theo chân dung người sử dụng

| Mã | Chân dung | Use case | Yêu cầu chức năng |
|---|---|---|---|
| UC01 | Tài xế | Xem lịch chuyến | FR-T01, FR-T02 |
| UC02 | Tài xế | Nhận hoặc từ chối chuyến khi được gọi mời | FR-T04, FR-L03 |
| UC03 | Tài xế | Cập nhật tiến độ chuyến | FR-T03 |
| UC04 | Tài xế | Liên lạc với khách hàng | FR-C01, FR-C02, FR-C03, FR-C05, FR-A02 |
| UC05 | Tài xế | Hủy chuyến hai bước | FR-T05 |
| UC06 | Tài xế | Báo khách vắng mặt hoặc sự cố | FR-I01, FR-I02 |
| UC07 | Tài xế | Hỏi cách sử dụng | FR-F01 |
| UC08 | Tài xế | Xem thu nhập, bật/tắt nhận chuyến | FR-E01, FR-E02 |
| UC09 | Tài xế | Kết thúc phiên trợ lý | FR-L02 |
| UC10 | Tài xế | Mở trợ lý bằng từ khóa đánh thức | FR-A01 |
| UC15 | Tài xế | Chờ đón khách | FR-W01, FR-W02, FR-C04 |
| UC16 | Tài xế | Tạo chuyến vãng lai, hỏi lộ trình | FR-T06, FR-T07 |
| UC12 | Khách hàng | Nhận cuộc gọi từ trợ lý hoặc tài xế | FR-K01, FR-K02, FR-K04 |
| UC13 | Khách hàng | Nhận tin nhắn xác nhận chuyến | FR-K03 |
| UC14 | Điều phối viên | Tạo chuyến và mời tài xế | FR-Q01, FR-Q02 |
| UC17 | Điều phối viên | Quản lý tài xế, khách hàng, cuộc gọi | FR-Q03, FR-Q04, FR-Q05 |
| UC18 | Quản trị viên hệ thống | Giám sát dịch vụ, cấu hình, nhật ký | FR-S01, FR-S02, FR-S03 |
| UC11 | Quản trị viên hệ thống | Xem báo cáo vận hành ngày | FR-O01, FR-O02 |

Năm use case tiêu biểu được mô tả dưới đây: bốn use case thuộc chuỗi nghiệp vụ chính của một chuyến (UC14, UC02, UC04, UC12) và một use case của quản trị viên hệ thống (UC11). Lời thoại mẫu được trình bày ở Phụ lục B.

**UC14 – Tạo chuyến và mời tài xế.** Điều phối viên nhập điểm đón, điểm trả, thời gian và số khách. Hệ thống lưu chuyến ở trạng thái chờ rồi gọi mời tài xế được chọn (UC02). Nếu tài xế nhận, chuyến chuyển sang trạng thái đã xác nhận. Nếu tài xế ngoại tuyến, không nghe máy hoặc từ chối, chuyến giữ trạng thái chờ để gán cho tài xế khác (FR-Q01, FR-Q02, FR-T04).

**UC02 – Nhận hoặc từ chối chuyến khi được gọi mời.** Hệ thống gọi tới tài xế; trợ lý đọc điểm đón và hỏi tài xế có nhận chuyến không. Nếu tài xế nhận, chuyến chuyển sang trạng thái đã xác nhận; trợ lý xác nhận bằng lời rồi kết thúc phiên. Nếu tài xế từ chối, chuyến chuyển sang trạng thái từ chối. Phiên này chỉ có hai thao tác trên (FR-T04, FR-L03).

**UC04 – Liên lạc với khách hàng.** Tài xế nói "gọi khách" hoặc "nhắn cho khách…". Trợ lý dùng chế độ mặc định, trừ khi tài xế chỉ định chế độ khác; hệ thống quay số (UC12) rồi báo kết quả, và với chế độ gọi nền thì đọc bản tóm tắt. Với số khác hoặc tên trong danh bạ, trợ lý đọc lại và chỉ quay số sau khi tài xế xác nhận (FR-C01, FR-C02, FR-C03, FR-C05, FR-A02).

**UC12 – Nhận cuộc gọi từ trợ lý hoặc tài xế.** Điện thoại của khách đổ chuông. Trợ lý tự giới thiệu là trợ lý của tài xế và nêu mục đích cuộc gọi; khách trao đổi hoặc để lại yêu cầu; trợ lý xác nhận lại và tài xế nhận bản tóm tắt. Nếu khách không nghe máy, tài xế được thông báo. Nếu khách hỏi giá hoặc giờ đến mà hệ thống thiếu dữ liệu, trợ lý không tự đưa ra con số (FR-K01, FR-K02, FR-K04).

**UC11 – Xem báo cáo vận hành ngày.** Lúc 00:15 giờ Việt Nam, bộ hẹn giờ lập báo cáo cho ngày hôm trước với các chỉ số nêu ở mục 3.3.4 và chấm một mẫu câu trả lời. Quản trị viên hệ thống chọn ngày để xem báo cáo và xu hướng 7 ngày. Nếu không có khóa truy cập mô hình chấm, báo cáo ghi là chưa chấm mẫu; nếu chưa có báo cáo, hệ thống lập lại từ bản ghi (FR-O01, FR-O02).

Use case mô tả hệ thống làm gì nhưng chưa nói hệ thống phải làm tốt đến mức nào. UC02 và UC04 cần phản hồi đủ nhanh; mọi use case phải tiếp tục được khi một dịch vụ phụ trợ lỗi; dữ liệu khách ở UC12 và UC14 phải được bảo vệ. Các yêu cầu này được đặc tả ở mục 3.4.

## 3.4. Yêu cầu phi chức năng

### 3.4.1. Đặc tả yêu cầu phi chức năng

Từ chân dung và use case, luận văn rút ra năm yêu cầu phi chức năng, phân loại theo ISO/IEC 25010 (ISO/IEC, 2023) và đặc tả thành kịch bản thuộc tính chất lượng (Bass et al., 2021) ở Bảng 3.8 (AC-14 đến AC-18). **NFR-01 Tính khả dụng** (interaction capability): mọi use case của tài xế đều hoàn thành được bằng giọng nói, và thao tác khó hoàn tác có bước xác nhận. **NFR-02 Hiệu năng** (time behaviour): hội thoại và cuộc gọi phải diễn ra theo thời gian thực, vì nếu phải chờ lâu, người nói sẽ tưởng hệ thống không nghe (mục 2.8). **NFR-03 Khả năng mở rộng** (scalability): hệ thống phải phục vụ được nhiều phiên đồng thời trong giờ cao điểm. **NFR-04 Khả năng phục hồi** (availability, fault tolerance, recoverability): một lỗi đơn lẻ ở dịch vụ bên ngoài hoặc dịch vụ phụ trợ không làm hỏng hội thoại. **NFR-05 Bảo mật** (confidentiality, authenticity): chỉ vai trò phù hợp mới truy cập được số điện thoại và thông tin chuyến; dữ liệu cá nhân không bị lộ ra nhật ký.

### 3.4.2. Ràng buộc kiến trúc

Bốn ràng buộc kiến trúc (Bảng 3.7) là các quy tắc thiết kế bắt buộc rút ra từ yêu cầu. Chúng được dùng để kiểm tra mã nguồn có tuân thủ thiết kế hay không.

**Bảng 3.7.** Ràng buộc kiến trúc

| Mã | Ràng buộc | Yêu cầu nguồn |
|---|---|---|
| CON-01 | Tác nhân hội thoại chỉ truy cập dữ liệu nghiệp vụ qua API HTTP | Quy tắc chung FR; NFR-03; NFR-04 |
| CON-02 | Mỗi dịch vụ sở hữu dữ liệu của mình; dịch vụ khác truy cập qua API | NFR-03; NFR-04 |
| CON-03 | JWT đăng nhập chỉ do dịch vụ định danh phát hành | NFR-05 |
| CON-04 | Mọi phiên hội thoại được gắn mã phòng trong nhật ký | NFR-04 |

### 3.4.3. Từ yêu cầu phi chức năng đến chiến thuật kiến trúc

Theo mục 2.5, mỗi NFR được đáp ứng bằng các chiến thuật kiến trúc của Bass et al. (2021). Bảng 3.8 ghi các chiến thuật này ở cột thứ hai của AC-14 đến AC-18; cơ chế hiện thực được trình bày ở Chương 4. Chiến thuật của NFR-02 đến NFR-05 đòi hỏi ba quyết định cấu trúc: tách tác nhân hội thoại khỏi dịch vụ nghiệp vụ; tách chức năng phụ trợ (tin nhắn, nhật ký cuộc gọi) khỏi dữ liệu chuyến để lỗi không lan rộng; tập trung định danh vào một dịch vụ. Kiến trúc microservices bao hàm các chiến thuật này (Bảng 2.1). Riêng chiến thuật của NFR-01 nằm trong tác nhân hội thoại nên không phụ thuộc vào kiểu kiến trúc.

**Bảng 3.8.** Chiến thuật kiến trúc và tiêu chí chấp nhận theo yêu cầu

| Mã | Yêu cầu và chiến thuật kiến trúc | Given (cho trước) | When (khi) | Then (thì) |
|---|---|---|---|---|
| AC-01 | FR-T01, FR-T02 | Có chuyến trong ngày | Hỏi số chuyến hoặc chuyến hiện tại | Gọi đúng công cụ; dữ liệu khớp |
| AC-02 | FR-T03 | Có chuyến đã nhận | Nói "đã đón khách" | Trạng thái chuyển sang đã đón; xác nhận sau khi ghi |
| AC-03 | FR-T04, FR-L03 | Có cuộc gọi mời | Nói "nhận" / "không nhận" | Chuyến được cập nhật đúng; phiên không có chức năng khác |
| AC-04 | FR-T05, FR-I01 | Chuyến đang hoạt động | Hủy chuyến hoặc báo khách vắng | Hỏi xác nhận; chỉ ghi khi đồng ý |
| AC-05 | FR-C01, FR-C02 | Chuyến có số khách | "Gọi khách" hoặc đọc số khác | Gọi đúng khách theo chế độ mặc định; số khác chỉ được quay sau khi xác nhận |
| AC-06 | FR-E01, FR-E02 | Có dữ liệu thu nhập | Hỏi thu nhập; tắt nhận chuyến | Số liệu khớp; trạng thái được xác nhận sau khi ghi |
| AC-07 | FR-F01, FR-K04 | Sổ tay đã nạp | Hỏi cách dùng hoặc câu ngoài phạm vi | Trả lời đúng theo sổ tay; câu ngoài phạm vi bị từ chối kèm chỉ dẫn kênh phù hợp |
| AC-08 | FR-L02 | Phiên đang mở | Tài xế im lặng | Nhắc sau khoảng 15 giây, tối đa hai lần, rồi kết thúc |
| AC-09 | FR-A01 | Trợ lý chưa mở | Nói từ khóa đánh thức | Phiên mở như khi bấm nút |
| AC-10 | FR-K01 | Tác nhân đang gọi thay | Khách xin chờ thêm | Ghi nhận; tài xế nhận tóm tắt; không tự đưa ra giá hay giờ đến |
| AC-11 | FR-K03 | Chuyến có số khách | Yêu cầu xác nhận chuyến | Khách nhận SMS đúng; trợ lý báo kết quả |
| AC-12 | FR-Q02 | Tài xế được gán đang trực tuyến | Điều phối viên gửi lời mời | Tài xế nhận cuộc gọi mời hoặc thông báo vào phiên |
| AC-13 | FR-O01, FR-O02 | Có bản ghi một ngày | Đến 00:15 hoặc có yêu cầu lập lại | Báo cáo đủ chỉ số, ghi cỡ mẫu và được hiển thị |
| AC-14 | NFR-01. Hỗ trợ người dùng: hủy bỏ; duy trì mô hình tác vụ, người dùng, hệ thống | Tài xế đang lái, UC01–UC06, UC09 | Thao tác rủi ro | 100% có bước xác nhận; mọi mục kiểm tra hành vi khi lái đạt |
| AC-15 | NFR-02. Kiểm soát nhu cầu: tải trước ngữ cảnh, giới hạn thời gian thực thi. Quản lý tài nguyên: câu đệm, bộ nhớ đệm phiên, container riêng | UC01, UC03, UC04, UC07 | Kết thúc phát ngôn | P95 ≤ 2 giây; phát câu đệm sau khoảng 2 giây |
| AC-16 | NFR-03. Quản lý tài nguyên: tăng tài nguyên, nhiều bản sao tác nhân độc lập với API | Mô phỏng, SC-01 đến SC-03 | Số phiên 1 → 20 | P95 tăng ≤ 20%; phiên lỗi < 1% |
| AC-17 | NFR-04. Phát hiện lỗi: giám sát, nhịp tim, ngoại lệ. Khôi phục: dự phòng (nhà cung cấp AI, bản sao), thử lại, suy giảm có kiểm soát | Phiên đang diễn ra, RS-01 đến RS-05 | Tiêm lỗi API, dịch vụ phụ trợ, nhà cung cấp AI; dừng một bản sao | 100% phiên không kết thúc bất thường; báo rõ thao tác lỗi; thời gian khôi phục được ghi |
| AC-18 | NFR-05. Chống tấn công: nhận diện, xác thực, phân quyền đối tượng truy cập; giới hạn phơi lộ, mã hóa. Khôi phục: lưu vết để kiểm tra lại (audit) | Mã nguồn, cấu hình, nhật ký | Kiểm tra danh mục bảo mật | 100% mục đạt: chỉ dịch vụ định danh phát hành JWT; không có bí mật trong mã; nhật ký không chứa số điện thoại đầy đủ hay token |
| AC-19 | Nhận dạng giọng nói (RQ3) | Bộ câu tham chiếu cố định | Đọc trong điều kiện yên tĩnh và có nhiễu khoang xe | Tỷ lệ lỗi từ của hai điều kiện được đo và so sánh |

### 3.4.4. Tiêu chí chấp nhận

Theo mục 2.4.4, mỗi tiêu chí lấy use case làm bối cảnh (Given), hành động của chân dung làm kích thích (When) và yêu cầu làm kết quả quan sát được (Then). AC-01 đến AC-19 trong Bảng 3.8 được xếp theo tài xế (AC-01 đến AC-09), khách hàng (AC-10, AC-11), điều phối viên (AC-12), quản trị viên hệ thống (AC-13), năm NFR (AC-14 đến AC-18) và nhận dạng giọng nói (AC-19). Với AC-01, AC-02, AC-05 và AC-06, Chương 6 báo cáo thêm độ chính xác gọi công cụ và tỷ lệ hoàn thành nghiệp vụ (RQ4). Mười tám yêu cầu chức năng còn lại không có tiêu chí chấp nhận riêng: FR-T06, FR-T07, FR-C03 đến FR-C05, FR-W01, FR-W02, FR-I02, FR-K02, FR-L01, FR-A02, FR-Q01, FR-Q03 đến FR-Q05 và FR-S01 đến FR-S03. Chúng được hiện thực và kiểm thử tự động ở mức dịch vụ (mục 6.11) nhưng không được đánh giá định lượng; riêng FR-T07 được đo thêm, kết quả ở Bảng 6.15.

## 3.5. Phạm vi yêu cầu

**Trong phạm vi:** yêu cầu chức năng của tài xế (FR-T, FR-C, FR-W, FR-I, FR-E, FR-F, FR-A, FR-L), khách hàng (FR-K), điều phối viên (FR-Q), quản trị viên hệ thống (FR-S, FR-O) và năm yêu cầu phi chức năng NFR-01 đến NFR-05.

**Ngoài phạm vi,** bổ sung cho mục 1.5.3, gồm: dẫn đường từng ngã rẽ bằng giọng nói (khung chỉ dẫn ở mục 5.4.4 chỉ mang tính hỗ trợ); thanh toán, hoàn tiền, bảo hiểm, tranh chấp; thay đổi hồ sơ, biển số xe, khôi phục mật khẩu; nền tảng gọi xe khác; kênh đặt xe và ứng dụng khách hàng (có trong mã nguồn nhưng không được đánh giá).

## Kết luận chương

Chương 3 đã xác định bốn chân dung người sử dụng, trong đó tài xế là lớp ưu tiên; yêu cầu chức năng của từng chân dung; 18 use case; năm yêu cầu phi chức năng theo ISO/IEC 25010 gắn với chiến thuật kiến trúc; bốn ràng buộc kiến trúc và 19 tiêu chí chấp nhận. Chương 4 dùng các kết quả này làm động lực kiến trúc.
