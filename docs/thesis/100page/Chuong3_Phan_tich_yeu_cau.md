# Chương 3. Phân tích yêu cầu

Chương này xác định hệ thống phải làm gì và phải làm tốt đến mức nào.

## 3.1. Phương pháp xác định yêu cầu

Yêu cầu được xác định theo năm bước:

1. **Lớp người dùng và chân dung** (mục 3.2): chia lớp người dùng, chọn lớp ưu tiên (Wiegers & Beatty, 2013) và mô tả mỗi lớp bằng một chân dung (Cooper et al., 2014).
2. **Yêu cầu chức năng theo chân dung** (mục 3.3.1 đến 3.3.4): mỗi việc người dùng cần làm là một yêu cầu có mã riêng (Sommerville, 2016).
3. **Use case** (mục 3.3.5): vì nghiệp vụ gọi xe đã rõ, use case mô hình hóa các yêu cầu đã biết, mỗi use case là một việc người dùng muốn hoàn thành trọn vẹn (Cockburn, 2001).
4. **Yêu cầu phi chức năng** (mục 3.4): ràng buộc của chân dung và đặc điểm của use case được đặc tả thành kịch bản thuộc tính chất lượng theo ISO/IEC 25010 và Bass et al. (2021).
5. **Tiêu chí chấp nhận** (Bảng 3.8, mục 3.4.4): các yêu cầu chức năng chính, năm yêu cầu phi chức năng và khâu nhận dạng giọng nói (RQ3) có tiêu chí dạng Given – When – Then (mục 2.4.4), làm căn cứ để Chương 6 kết luận đạt hay không đạt.

Yêu cầu được rút ra từ ba nguồn: nghiên cứu về tài xế gọi xe, theo đó người lái qua nền tảng số có khả năng thường xuyên dùng ứng dụng điện thoại khi lái cao gần gấp bốn lần người lái khác (Insurance Institute for Highway Safety, 2022) và thường thao tác điện thoại để nhận chuyến khi đang lái (Song et al., 2023); tài liệu nội bộ của dự án (tài liệu yêu cầu, sổ tay, kịch bản hội thoại ở Phụ lục B); và ràng buộc an toàn khi lái (mục 2.8). Các mã FR, UC, NFR và AC được dùng lại ở Chương 4 đến 6.

## 3.2. Đối tượng sử dụng

Hệ thống có bốn lớp người dùng (mục 2.4.1, Bảng 3.1), trong đó tài xế là lớp ưu tiên vì là nhóm duy nhất thao tác trong lúc lái xe.

**Bảng 3.1.** Chân dung người sử dụng

| Chân dung | Mục tiêu chính | Bối cảnh | Kênh tương tác |
|---|---|---|---|
| Tài xế | Hoàn thành chuyến, liên lạc khách, xem thu nhập không cần nhìn hay chạm màn hình | Mắt nhìn đường, tay giữ vô-lăng, xe ồn | Giọng nói trong ứng dụng (WebRTC); cuộc gọi mời (SIP) |
| Khách hàng | Đặt xe, liên lạc với tài xế | Không cài ứng dụng; đặt qua điện thoại hoặc Zalo | Cuộc gọi điện thoại (PSTN), SMS |
| Điều phối viên | Điều phối chuyến; quản lý tài xế, khách, cuộc gọi | Nhân viên vận hành | Trang quản trị điều hành |
| Quản trị viên hệ thống | Giữ hệ thống ổn định; theo dõi chất lượng trợ lý | Người vận hành kỹ thuật | Trang giám sát hệ thống |

Tài xế là đối tượng đánh giá trọng tâm; yêu cầu của ba chân dung còn lại chỉ được kiểm chứng ở mức kiểm thử, một phần chưa được đánh giá (mục 3.4.4).

## 3.3. Yêu cầu chức năng

Yêu cầu chức năng được viết theo góc nhìn người dùng (việc phân bổ cho từng dịch vụ ở Chương 4) và tuân theo ba quy tắc chung: trợ lý không đưa ra dữ liệu nào không lấy từ hệ thống; chỉ xác nhận bằng lời sau khi hệ thống đã lưu; thao tác khó hoàn tác (hủy chuyến, báo khách vắng mặt, gọi hoặc nhắn tin tới số ngoài chuyến) phải được tài xế xác nhận.

### 3.3.1. Yêu cầu chức năng của tài xế

Tài xế mở trợ lý bằng nút bấm hoặc từ khóa đánh thức; cuộc gọi mời nhận chuyến mở một phiên chỉ cho phép nhận hoặc từ chối. Bảng 3.2 chia yêu cầu thành bốn nhóm: chuyến đi (FR-T), liên lạc khách (FR-C, FR-A02), chờ đón – sự cố – thu nhập – hỗ trợ (FR-W, FR-I, FR-E, FR-F) và phiên hội thoại (FR-A01, FR-L). Gọi khách có ba chế độ: *tác nhân gọi thay* (tác nhân hội thoại trao đổi với khách, tài xế nghe và có thể can thiệp), *nói trực tiếp* (tài xế nói với khách, kết thúc bằng cụm từ quy định) và *gọi nền* (tác nhân hội thoại gọi trong phòng riêng, tài xế nghe tóm tắt sau).

**Bảng 3.2.** Yêu cầu chức năng của tài xế

| Mã | Yêu cầu |
|---|---|
| FR-T01 | Hỏi chuyến sắp tới trong ngày |
| FR-T02 | Hỏi thông tin chuyến hiện tại |
| FR-T03 | Cập nhật trạng thái chuyến |
| FR-T04 | Nhận/từ chối chuyến mới |
| FR-T05 | Hủy chuyến đang hoạt động (hai bước) |
| FR-T06 | Tạo chuyến khách vãng lai |
| FR-T07 | Hỏi điểm dừng tiếp theo, thứ tự ghé, tình hình giao thông |
| FR-C01 | Gọi khách của chuyến (ba chế độ) |
| FR-C02 | Gọi số khác, người trong danh bạ (có xác nhận) |
| FR-C03 | Gửi SMS cho khách, số khác |
| FR-C04 | Hỏi vị trí đón; gửi xác nhận chuyến |
| FR-C05 | Nghe tóm tắt cuộc gọi gần nhất |
| FR-A02 | Kết thúc nói trực tiếp bằng cụm từ quy định |
| FR-W01 | Nhắc việc trước giờ đón |
| FR-W02 | Gia hạn thời gian chờ khách |
| FR-I01 | Báo khách vắng mặt (có xác nhận) |
| FR-I02 | Báo sự cố trong chuyến |
| FR-E01 | Hỏi thu nhập, lịch sử chuyến, chỉ số cá nhân |
| FR-E02 | Bật/tắt nhận chuyến |
| FR-F01 | Hỏi cách dùng theo sổ tay |
| FR-A01 | Mở trợ lý bằng từ khóa đánh thức |
| FR-L01 | Hội thoại tiếng Việt hoặc tiếng Anh |
| FR-L02 | Kết thúc phiên bằng lời hoặc khi im lặng |
| FR-L03 | Giới hạn chức năng theo loại phiên |

### 3.3.2. Yêu cầu chức năng của khách hàng

Khách đặt xe qua điện thoại hoặc Zalo, điều phối viên tạo chuyến (FR-Q02); sau đó khách tương tác qua điện thoại thường (Bảng 3.3). Trợ lý chỉ trả lời khách dựa trên dữ liệu chuyến và sổ tay, và tóm tắt yêu cầu của khách gửi về tài xế.

**Bảng 3.3.** Yêu cầu chức năng của khách hàng

| Mã | Yêu cầu |
|---|---|
| FR-K01 | Nhận cuộc gọi của trợ lý, để lại yêu cầu |
| FR-K02 | Nói chuyện trực tiếp với tài xế |
| FR-K03 | Nhận SMS xác nhận hoặc lời nhắn |
| FR-K04 | Hỏi thông tin chuyến, dịch vụ |

### 3.3.3. Yêu cầu chức năng của điều phối viên

Điều phối viên dùng trang quản trị điều hành (Bảng 3.4). Lời mời nhận chuyến đến tài xế qua cuộc gọi mời (FR-T04) hoặc thông báo vào phiên đang mở. Tài khoản bị khóa không đăng nhập được; nhật ký cuộc gọi chỉ cho phép xem.

**Bảng 3.4.** Yêu cầu chức năng của điều phối viên

| Mã | Yêu cầu |
|---|---|
| FR-Q01 | Xem bảng điều phối, lọc trạng thái, gán tài xế |
| FR-Q02 | Tạo chuyến từ yêu cầu khách, mời tài xế |
| FR-Q03 | Xem tài xế, trạng thái trực tuyến; khóa tài khoản |
| FR-Q04 | Xem khách hàng, trạng thái tài khoản |
| FR-Q05 | Xem nhật ký cuộc gọi kèm tóm tắt |

### 3.3.4. Yêu cầu chức năng của quản trị viên hệ thống

Quản trị viên hệ thống theo dõi tình trạng kỹ thuật và chất lượng trợ lý (Bảng 3.5). Báo cáo ngày (giờ Việt Nam) gồm số phiên, số tài xế, tỷ lệ gọi công cụ thành công, tỷ lệ lỗi API, tỷ lệ trả lời đúng trên mẫu được chấm, lỗi theo loại, độ trễ trung bình, P50 và P95; báo cáo được lập tự động sau nửa đêm, lập lại được và ghi cỡ mẫu cùng phương pháp chấm. Cấu hình không lộ khóa bí mật; nhật ký không chứa số điện thoại đầy đủ hay token.

**Bảng 3.5.** Yêu cầu chức năng của quản trị viên hệ thống

| Mã | Yêu cầu |
|---|---|
| FR-S01 | Xem tình trạng từng dịch vụ backend |
| FR-S02 | Xem cấu hình STT – LLM – TTS theo ngôn ngữ |
| FR-S03 | Xem nhật ký trực tiếp theo mã phòng |
| FR-O01 | Lập báo cáo vận hành ngày |
| FR-O02 | Xem báo cáo ngày và xu hướng 7 ngày |

### 3.3.5. Mô hình use case

Các yêu cầu được tổ chức thành 18 use case: 12 của tài xế (Hình 3.1) và hai của mỗi chân dung còn lại (Hình 3.2); đặc tả đầy đủ theo mẫu của Cockburn (2001) cho năm use case tiêu biểu nằm trong kho mã nguồn (tệp docs/thesis/Chuong3_Phan_tich_yeu_cau_DRAFT.md). Ở đây "tác nhân" (actor) là người hoặc hệ thống bên ngoài, khác với "tác nhân hội thoại"; hai tác nhân hỗ trợ là hệ thống thoại và bộ hẹn giờ lập báo cáo ngày.

![Hình 3.1|h=11](../diagrams/H3_1_usecase_driver.png)

**Hình 3.1.** Sơ đồ use case của tài xế

![Hình 3.2|h=9](../diagrams/H3_2_usecase_others.png)

**Hình 3.2.** Sơ đồ use case của khách hàng, điều phối viên và quản trị viên hệ thống

Trong Bảng 3.6, FR-L01 (song ngữ) áp dụng cho mọi use case của tài xế; mã use case giữ theo tài liệu yêu cầu của dự án nên không liên tục. Mọi use case có chung một ngoại lệ: khi thiếu dữ liệu hoặc dịch vụ lỗi, trợ lý báo rõ và không suy đoán.

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

Năm use case tiêu biểu gồm chuỗi nghiệp vụ chính của một chuyến (UC14, UC02, UC04, UC12) và UC11; lời thoại mẫu ở Phụ lục B.

**UC14 – Tạo chuyến và mời tài xế.** Điều phối viên nhập điểm đón, điểm trả, thời gian và số khách; hệ thống lưu chuyến ở trạng thái chờ rồi gọi mời tài xế được chọn (UC02). Tài xế nhận thì chuyến chuyển sang đã xác nhận; tài xế ngoại tuyến hoặc không nghe máy thì chuyến giữ trạng thái chờ. Chuyến còn chờ hoặc bị từ chối (UC02) có thể được gán cho tài xế khác (FR-Q01, FR-Q02, FR-T04).

**UC02 – Nhận hoặc từ chối chuyến khi được gọi mời.** Trợ lý đọc điểm đón và hỏi tài xế có nhận không. Nhận thì chuyến chuyển sang đã xác nhận, trợ lý xác nhận bằng lời rồi kết thúc phiên; từ chối thì chuyến chuyển sang từ chối. Phiên chỉ có hai thao tác này (FR-T04, FR-L03).

**UC04 – Liên lạc với khách hàng.** Với cuộc gọi, trợ lý dùng chế độ mặc định trừ khi tài xế chỉ định khác, quay số (UC12), báo kết quả và đọc tóm tắt nếu gọi nền. Với tin nhắn, trợ lý báo gửi thành công hay thất bại. Với số khác hoặc tên trong danh bạ, trợ lý đọc lại và chỉ quay số khi tài xế xác nhận (FR-C01, FR-C02, FR-C03, FR-C05, FR-A02).

**UC12 – Nhận cuộc gọi từ trợ lý hoặc tài xế.** Trợ lý tự giới thiệu là trợ lý của tài xế, nêu mục đích cuộc gọi, ghi nhận và xác nhận lại yêu cầu của khách rồi gửi tóm tắt cho tài xế. Khách không nghe máy thì tài xế được báo. Khi thiếu dữ liệu về giá hoặc giờ đến, trợ lý không tự đưa ra con số (FR-K01, FR-K02, FR-K04).

**UC11 – Xem báo cáo vận hành ngày.** Lúc 00:15 giờ Việt Nam, bộ hẹn giờ lập báo cáo ngày hôm trước (chỉ số ở mục 3.3.4) và chấm một mẫu câu trả lời; quản trị viên chọn ngày để xem báo cáo và xu hướng 7 ngày. Không có khóa API của mô hình chấm thì báo cáo ghi chưa chấm mẫu; ngày chưa có báo cáo thì hệ thống lập từ bản ghi (FR-O01, FR-O02).

Use case chưa nói hệ thống phải làm tốt đến mức nào: UC02, UC04 cần phản hồi đủ nhanh; mọi use case phải tiếp tục được khi dịch vụ phụ trợ lỗi; dữ liệu khách ở UC12, UC14 phải được bảo vệ. Các yêu cầu chất lượng này được đặc tả ở mục 3.4.

## 3.4. Yêu cầu phi chức năng

### 3.4.1. Đặc tả yêu cầu phi chức năng

Năm yêu cầu phi chức năng được phân loại theo ISO/IEC 25010 (ISO/IEC, 2023) và đặc tả thành kịch bản thuộc tính chất lượng (Bass et al., 2021) ở Bảng 3.8 (AC-14 đến AC-18). **NFR-01 Tính khả dụng** (interaction capability): mọi use case của tài xế hoàn thành được bằng giọng nói; thao tác khó hoàn tác có bước xác nhận. **NFR-02 Hiệu năng** (time behaviour): hội thoại và cuộc gọi diễn ra theo thời gian thực, vì chờ lâu khiến người nói tưởng hệ thống không nghe (mục 2.8). **NFR-03 Khả năng mở rộng** (scalability): phục vụ nhiều phiên đồng thời trong giờ cao điểm. **NFR-04 Khả năng phục hồi** (availability, fault tolerance, recoverability): một lỗi đơn lẻ ở dịch vụ bên ngoài hoặc phụ trợ không làm hỏng hội thoại. **NFR-05 Bảo mật** (confidentiality, authenticity): chỉ vai trò phù hợp truy cập được số điện thoại và thông tin chuyến; dữ liệu cá nhân không lộ ra nhật ký.

### 3.4.2. Ràng buộc kiến trúc

Bảng 3.7 nêu bốn ràng buộc thiết kế bắt buộc rút ra từ yêu cầu, dùng để kiểm tra mã nguồn có tuân thủ thiết kế hay không.

**Bảng 3.7.** Ràng buộc kiến trúc

| Mã | Ràng buộc | Yêu cầu nguồn |
|---|---|---|
| CON-01 | Tác nhân hội thoại chỉ truy cập dữ liệu nghiệp vụ qua API HTTP | Quy tắc chung FR; NFR-03; NFR-04 |
| CON-02 | Mỗi dịch vụ sở hữu dữ liệu riêng; dịch vụ khác truy cập qua API | NFR-03; NFR-04 |
| CON-03 | JWT đăng nhập chỉ do dịch vụ định danh phát hành | NFR-05 |
| CON-04 | Mọi phiên hội thoại gắn mã phòng trong nhật ký | NFR-04 |

### 3.4.3. Từ yêu cầu phi chức năng đến chiến thuật kiến trúc

Chiến thuật kiến trúc (Bass et al., 2021; mục 2.5) cho từng NFR được ghi ở cột thứ hai của AC-14 đến AC-18 (Bảng 3.8); cơ chế hiện thực ở Chương 4. Chiến thuật của NFR-02 đến NFR-05 đòi hỏi ba quyết định cấu trúc: tách tác nhân hội thoại khỏi dịch vụ nghiệp vụ; tách chức năng phụ trợ (tin nhắn, nhật ký cuộc gọi) khỏi dữ liệu chuyến để lỗi không lan rộng; tập trung định danh vào một dịch vụ. Các tính chất của microservices hiện thực hóa các chiến thuật này (Bảng 2.1). Riêng chiến thuật của NFR-01 nằm trong tác nhân hội thoại nên không phụ thuộc kiểu kiến trúc.

**Bảng 3.8.** Chiến thuật kiến trúc và tiêu chí chấp nhận theo yêu cầu

| Mã | Yêu cầu và chiến thuật kiến trúc | Given (cho trước) | When (khi) | Then (thì) |
|---|---|---|---|---|
| AC-01 | FR-T01, FR-T02 | Có chuyến trong ngày | Hỏi số chuyến, chuyến hiện tại | Gọi đúng công cụ; dữ liệu khớp |
| AC-02 | FR-T03 | Có chuyến đã nhận | Nói "đã đón khách" | Chuyển sang đã đón; xác nhận sau khi ghi |
| AC-03 | FR-T04, FR-L03 | Có cuộc gọi mời | Nói "nhận" / "không nhận" | Chuyến cập nhật đúng; phiên không có chức năng khác |
| AC-04 | FR-T05, FR-I01 | Chuyến đang hoạt động | Hủy chuyến hoặc báo khách vắng | Hỏi xác nhận; chỉ ghi khi đồng ý |
| AC-05 | FR-C01, FR-C02 | Chuyến có số khách | "Gọi khách" hoặc đọc số khác | Gọi đúng khách, chế độ mặc định; số khác quay sau xác nhận |
| AC-06 | FR-E01, FR-E02 | Có dữ liệu thu nhập | Hỏi thu nhập; tắt nhận chuyến | Số liệu khớp; trạng thái xác nhận sau khi ghi |
| AC-07 | FR-F01, FR-K04 | Sổ tay đã nạp | Hỏi cách dùng hoặc câu ngoài phạm vi | Trả lời đúng sổ tay; từ chối câu ngoài phạm vi, chỉ kênh phù hợp |
| AC-08 | FR-L02 | Phiên đang mở | Tài xế im lặng | Nhắc sau khoảng 15 giây, tối đa hai lần, rồi kết thúc |
| AC-09 | FR-A01 | Trợ lý chưa mở | Nói từ khóa đánh thức | Phiên mở như bấm nút |
| AC-10 | FR-K01 | Tác nhân đang gọi thay | Khách xin chờ thêm | Ghi nhận, gửi tóm tắt cho tài xế; không tự đưa giá, giờ đến |
| AC-11 | FR-K03 | Chuyến có số khách | Yêu cầu xác nhận chuyến | Khách nhận đúng SMS; trợ lý báo kết quả |
| AC-12 | FR-Q02 | Tài xế được gán trực tuyến | Điều phối viên gửi lời mời | Tài xế nhận cuộc gọi mời hoặc thông báo |
| AC-13 | FR-O01, FR-O02 | Có bản ghi một ngày | Đến 00:15 hoặc yêu cầu lập lại | Báo cáo đủ chỉ số, ghi cỡ mẫu, hiển thị được |
| AC-14 | NFR-01. Hỗ trợ người dùng: hủy bỏ; duy trì mô hình tác vụ, người dùng, hệ thống | Tài xế đang lái, UC01–UC06, UC09 | Thao tác rủi ro | 100% có xác nhận; đạt mọi mục kiểm tra hành vi khi lái |
| AC-15 | NFR-02. Kiểm soát nhu cầu: giảm chi phí phụ trội (tải trước ngữ cảnh), giới hạn thời gian thực thi. Quản lý tài nguyên: xử lý đồng thời (câu đệm), nhiều bản sao dữ liệu (trạng thái phiên), tăng tài nguyên (container riêng) | UC01, UC03, UC04, UC07 | Kết thúc phát ngôn | P95 ≤ 2 giây; phát câu đệm sau khoảng 2 giây |
| AC-16 | NFR-03. Quản lý tài nguyên: tăng tài nguyên, nhiều bản sao tác nhân độc lập với API | Mô phỏng; SC-01, SC-02 (phiên); SC-03 (API, chỉ tham khảo) | Số phiên 1 → 20 | P95 tăng ≤ 20%; phiên lỗi < 1% |
| AC-17 | NFR-04. Phát hiện lỗi: giám sát, nhịp tim, ngoại lệ. Khôi phục: dự phòng (nhà cung cấp AI, bản sao), thử lại, suy giảm có kiểm soát | Phiên đang chạy; RS-01–RS-05 | Tiêm lỗi API, phụ trợ, nhà cung cấp AI; dừng một bản sao | 100% phiên không kết thúc bất thường; báo rõ thao tác lỗi; ghi thời gian khôi phục |
| AC-18 | NFR-05. Chống tấn công: nhận diện, xác thực, phân quyền; giới hạn phơi lộ, mã hóa. Khôi phục: lưu vết (audit) | Mã nguồn, cấu hình, nhật ký | Kiểm tra danh mục bảo mật | 100% mục đạt: chỉ dịch vụ định danh phát hành JWT đăng nhập; không có bí mật trong mã; nhật ký không có số điện thoại đầy đủ, token |
| AC-19 | Nhận dạng giọng nói (RQ3) | Bộ câu tham chiếu cố định | Đọc khi yên tĩnh và có nhiễu khoang xe | So sánh tỷ lệ lỗi từ giữa hai điều kiện |

### 3.4.4. Tiêu chí chấp nhận

Mỗi tiêu chí lấy use case làm bối cảnh (Given), hành động của chân dung làm kích thích (When) và yêu cầu làm kết quả quan sát được (Then) (mục 2.4.4). Trong Bảng 3.8, AC-01 đến AC-09 thuộc tài xế (AC-07 gồm cả FR-K04 của khách hàng), AC-10 và AC-11 thuộc khách hàng, AC-12 thuộc điều phối viên, AC-13 thuộc quản trị viên hệ thống, AC-14 đến AC-18 ứng với năm NFR và AC-19 với nhận dạng giọng nói. Với AC-01 đến AC-08, Chương 6 báo cáo gộp độ chính xác gọi công cụ và tỷ lệ hoàn thành nghiệp vụ trên mẫu lượt được chấm (RQ4, mục 6.6) thay vì kết luận từng tiêu chí; AC-09 và AC-12 chưa được đánh giá riêng (Bảng 6.16). Mười tám yêu cầu chức năng không có tiêu chí riêng: FR-T06, FR-T07, FR-C03 đến FR-C05, FR-W01, FR-W02, FR-I02, FR-K02, FR-L01, FR-A02, FR-Q01, FR-Q03 đến FR-Q05 và FR-S01 đến FR-S03; chúng được hiện thực nhưng không được đánh giá định lượng, trừ FR-C03 được kiểm thử cùng AC-11 (Bảng 6.14) và FR-T07 được đo thêm (Bảng 6.15).

## 3.5. Phạm vi yêu cầu

**Trong phạm vi:** yêu cầu chức năng của tài xế (FR-T, FR-C, FR-W, FR-I, FR-E, FR-F, FR-A, FR-L), khách hàng (FR-K), điều phối viên (FR-Q), quản trị viên hệ thống (FR-S, FR-O) và năm yêu cầu phi chức năng NFR-01 đến NFR-05.

**Ngoài phạm vi** (bổ sung mục 1.5.3): dẫn đường từng ngã rẽ bằng giọng nói (khung chỉ dẫn ở mục 5.4.4 chỉ mang tính hỗ trợ); thanh toán, hoàn tiền, bảo hiểm, tranh chấp; thay đổi hồ sơ, biển số xe, khôi phục mật khẩu; nền tảng gọi xe khác; kênh đặt xe và ứng dụng khách hàng (có trong mã nguồn nhưng không được đánh giá).

## Kết luận chương

Chương 3 đã xác định bốn chân dung (tài xế là lớp ưu tiên), yêu cầu chức năng, 18 use case, năm yêu cầu phi chức năng gắn với chiến thuật kiến trúc, bốn ràng buộc kiến trúc và 19 tiêu chí chấp nhận; Chương 4 dùng các kết quả này làm động lực kiến trúc.
