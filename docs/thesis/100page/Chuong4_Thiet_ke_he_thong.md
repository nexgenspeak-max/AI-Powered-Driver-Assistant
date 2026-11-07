# Chương 4. Thiết kế hệ thống

Chương này đi từ động lực kiến trúc tới quyết định chọn microservices, kiến trúc trên AWS, các luồng chính và cơ chế bảo đảm yêu cầu phi chức năng.

## 4.1. Động lực kiến trúc

Động lực kiến trúc là tập yêu cầu và ràng buộc có ảnh hưởng quyết định đến cấu trúc hệ thống (Bass et al., 2021). Bảng 4.1 tổng hợp các động lực rút ra từ Chương 3; chiến thuật tương ứng của từng NFR (Bảng 3.8) ghi trong ngoặc.

**Bảng 4.1.** Động lực kiến trúc

| Loại | Mã | Nội dung | Ảnh hưởng đến kiến trúc |
|---|---|---|---|
| Chức năng | FR-T, FR-C, FR-K | Nghiệp vụ qua gọi công cụ trên WebRTC và SIP | Tách nghiệp vụ khỏi tác nhân, dùng chung mọi kênh |
| Chức năng | FR-Q, FR-S, FR-O | Quản trị, giám sát, báo cáo ngày | Dịch vụ giám sát riêng, chỉ đọc qua API |
| Phi chức năng | NFR-02 | P95 độ trễ ≤ 2 giây | Tác nhân chạy dài hạn; tải trước ngữ cảnh (giảm chi phí phụ trội) |
| Phi chức năng | NFR-03 | Mở rộng theo số phiên | Tác nhân và API mở rộng độc lập (nhiều bản sao tính toán) |
| Phi chức năng | NFR-04 | Phiên không dừng khi phụ trợ hoặc AI lỗi | Cô lập lỗi; dự phòng nhà cung cấp (suy giảm có kiểm soát) |
| Phi chức năng | NFR-05 | Định danh tập trung, bảo vệ bí mật | Một dịch vụ định danh; quyền riêng từng dịch vụ (xác thực đối tượng truy cập) |
| Phi chức năng | NFR-01 | Xác nhận thao tác rủi ro; công cụ theo loại phiên | Phân loại và trạng thái phiên (mô hình tác vụ, mô hình hệ thống) |
| Ràng buộc | CON-01 đến CON-04 | Tác nhân chỉ gọi API; dữ liệu riêng; JWT do Định danh phát hành; nhật ký gắn mã phòng | Ranh giới dịch vụ bắt buộc |
| Môi trường | Bối cảnh dự án | STT, LLM, TTS, truyền thông là dịch vụ ngoài; nhóm nhỏ, chi phí thấp | Dịch vụ đám mây được quản lý, trả theo mức dùng |

## 4.2. Quyết định kiến trúc

### 4.2.1. Lựa chọn kiểu kiến trúc (ADR-01)

**Bối cảnh.** Hệ thống có hai loại tải: tác nhân hội thoại chạy dài hạn, giữ kết nối âm thanh và dùng thư viện AI của Python; các API nghiệp vụ xử lý nhanh, không nhớ trạng thái, được gọi bởi ứng dụng, trang quản trị lẫn tác nhân.

**Các phương án.** (A) nguyên khối; (B) nguyên khối phân mô-đun; (C) microservices, tác nhân và từng năng lực nghiệp vụ là dịch vụ độc lập; (D) thuần serverless trên FaaS. Bảng 4.2 đánh giá bốn phương án theo yêu cầu phi chức năng.

**Bảng 4.2.** Đánh giá các phương án kiến trúc theo yêu cầu phi chức năng

| Yêu cầu | (A) Nguyên khối | (B) Phân mô-đun | (C) Microservices | (D) Thuần serverless |
|---|---|---|---|---|
| NFR-02 Hiệu năng | Một phần: tranh tài nguyên | Một phần | Đáp ứng: tác nhân trên container, API riêng | Không: giới hạn thời gian chạy, khởi động nguội |
| NFR-03 Mở rộng | Không: nhân bản cả ứng dụng | Không | Đáp ứng: nhân bản độc lập | Một phần: tác nhân không chạy được |
| NFR-04 Phục hồi | Không: một lỗi dừng cả tiến trình | Một phần: cô lập mức mã | Đáp ứng: lỗi phụ trợ không lan | Một phần |
| NFR-05 Bảo mật | Một phần: quyền chung | Một phần | Đáp ứng: định danh tập trung, quyền riêng | Đáp ứng |
| Độ phức tạp vận hành | Thấp | Thấp | Cao | Trung bình |

**Quyết định.** Chọn phương án (C): API nghiệp vụ chạy trên AWS Lambda sau Amazon API Gateway, tác nhân chạy trên container Amazon ECS với AWS Fargate, mỗi dịch vụ sở hữu bảng riêng trên Amazon DynamoDB.

**Hệ quả và giảm thiểu.** Microservices tăng độ phức tạp vận hành, độ trễ mạng và khó nhất quán dữ liệu (Soldani et al., 2018). Biện pháp: hạ tầng dạng mã cho từng dịch vụ (AWS SAM, CloudFormation) kèm kịch bản triển khai tự động; tải trước ngữ cảnh phiên và dùng lại kết nối HTTP; chỉ một dịch vụ giữ bản chính thức của dữ liệu chuyến đi; mọi dòng nhật ký gắn mã phòng.

### 4.2.2. Lựa chọn luồng xử lý lượt hội thoại (ADR-02)

**Bối cảnh.** Thời gian sinh token đầu của mô hình ngôn ngữ chiếm phần lớn độ trễ một lượt (Bảng 6.4). Bảng 4.3 so sánh các phương án.

**Bảng 4.3.** Các phương án luồng xử lý lượt hội thoại

| Phương án | Ưu điểm | Nhược điểm | Kết luận |
|---|---|---|---|
| Mọi câu qua LLM, không câu đệm | Một luồng duy nhất | Khoảng lặng khi token đầu chậm | Không chọn |
| Nhánh rút gọn theo ý định kết hợp LLM | Độ trễ thấp với câu quen thuộc (đợt đo 05–06/09/2026) | Dễ chọn sai công cụ; khó bảo trì mẫu câu | Không chọn; đã tắt trong mã nguồn |
| Mọi câu qua LLM kèm gọi công cụ; câu đệm sau 2 giây; tải trước ngữ cảnh | Một luồng thống nhất; không trả lời trước khi có kết quả thật | Độ trễ vẫn phụ thuộc token đầu | **Chọn** |

## 4.3. Kiến trúc tổng thể trên AWS

Kiến trúc được trình bày bằng mô hình cấu trúc (Hình 4.1) và mô hình luồng hành vi (Hình 4.2 đến Hình 4.5), theo cách phân biệt cấu trúc tĩnh và hành vi động của Bass et al. (2021).

### 4.3.1. Kiến trúc tổng thể

Hình 4.1 vẽ theo quy ước sơ đồ kiến trúc AWS: năm lớp xếp thành năm cột theo đường đi của một yêu cầu, thành phần dùng chung ở dải Cross-cutting Concerns; nét đứt là kết nối phụ trợ, hộp xám nét đứt là hệ thống bên ngoài AWS.

![Hình 4.1](../diagrams/H4_1_aws_architecture.png)

**Hình 4.1.** Kiến trúc tổng thể của hệ thống trên AWS theo microservices

**Lớp máy khách** gồm ứng dụng tài xế, trang quản trị và trang giám sát (tệp tĩnh trên Amazon S3); khách hàng dùng điện thoại thường. **Lớp truyền thông thời gian thực và hội thoại AI**: LiveKit Cloud truyền âm thanh (WebRTC) và quay số (SIP); Dịch vụ Liên lạc hội thoại thời gian thực gọi STT, LLM, TTS (mỗi khâu có nhà cung cấp chính và dự phòng), chạy trên Amazon ECS với AWS Fargate. **Lớp cổng API**: Amazon API Gateway là cửa vào duy nhất, kèm cổng WebSocket để đẩy thông báo. **Lớp microservices**: năm dịch vụ Định danh, Chuyến đi và Điều phối, Liên lạc bằng tin nhắn, Nhật ký cuộc gọi, Giám sát vận hành trên AWS Lambda. **Lớp dữ liệu**: mỗi dịch vụ có bảng riêng trên Amazon DynamoDB (Bảng 4.5); Redis (tùy chọn) lưu trạng thái phiên ngắn hạn. **Mối quan tâm xuyên suốt**: CloudWatch Logs, IAM và JWT, EventBridge Scheduler, CloudFormation.

**Giao thức kết nối.** Lời gọi giữa các dịch vụ đi qua API Gateway kèm JWT dịch vụ, cùng cửa vào và cùng bước xác thực như lời gọi từ người dùng. Tài nguyên nằm trong vùng ap-southeast-1; tác nhân chạy với nhóm bảo mật chỉ cho chiều ra; JWT được xác minh bằng khóa bí mật dùng chung. Bảng ws-connections lưu cặp mã kết nối WebSocket và định danh người dùng vì Lambda không nhớ gì giữa các lần gọi.

### 4.3.2. Mô hình luồng hành vi theo nhóm người sử dụng

Các luồng trên Hình 4.2 đến Hình 4.5 được đánh số ① đến ㉙ và tách theo chân dung; số luồng khớp với số trên các biểu đồ tuần tự (mục 4.5). Bảng 4.4 liệt kê các luồng chính của từng nhóm; bảng đầy đủ 29 luồng (điểm đầu – cuối, giao thức, mục đích) được giữ trong phụ lục trực tuyến của kho mã nguồn.

**Bảng 4.4.** Các luồng hành vi trên Hình 4.2 đến Hình 4.5

| Nhóm người dùng | Hình | Các luồng chính |
|---|---|---|
| Tài xế | 4.2 | Đăng nhập (①②); mở phiên trợ lý (③④⑤⑥); xử lý lượt, gọi công cụ (⑦⑧⑨); thông báo đẩy (⑩); cuộc gọi (⑪); tin nhắn (⑫⑬㉒); nhật ký cuộc gọi (⑭⑮⑯); bản đồ (㉓㉕); nhật ký (⑱) |
| Khách hàng | 4.3 | Nhận cuộc gọi qua Twilio (④⑪); tác nhân tham gia cuộc gọi (⑥⑦⑧⑨); tin nhắn xác nhận (⑫⑬㉒); bản ghi (⑭⑯) |
| Điều phối viên | 4.4 | Trang quản trị gọi API (⑰) tới Định danh (②), Chuyến đi và Điều phối (⑨), Nhật ký cuộc gọi (⑯); mời tài xế qua cuộc gọi (④⑪) |
| Quản trị viên hệ thống | 4.5 | Trang giám sát (⑰); báo cáo ngày theo lịch (⑲⑳㉑); thăm dò sức khỏe (㉗); chấm mẫu câu trả lời (㉘); nhật ký và số tác vụ (⑱㉙) |

**Luồng của tài xế.** Ví dụ "nhận chuyến này": mô hình chọn công cụ (⑦), tác nhân gọi API (⑧), dịch vụ ghi trạng thái confirmed (⑨) và đẩy thông báo (⑩); chỉ khi API thành công, tác nhân mới đọc câu xác nhận.

![Hình 4.2](../diagrams/H4_1_aws_architecture_driver.png)

**Hình 4.2.** Mô hình luồng hành vi: nhóm chức năng của tài xế

**Luồng của khách hàng.** Khách đặt xe với điều phối viên ngoài hệ thống, sau đó chỉ dùng điện thoại thường. Ở chế độ tác nhân gọi thay hoặc gọi nền, tác nhân trao đổi với khách qua Twilio và lưu bản ghi.

![Hình 4.3](../diagrams/H4_1_aws_architecture_customer.png)

**Hình 4.3.** Mô hình luồng hành vi: nhóm chức năng của khách hàng

**Luồng của điều phối viên.** Mọi thao tác trên trang quản trị đi qua cổng API tới Dịch vụ Định danh, Dịch vụ Chuyến đi và Điều phối, Dịch vụ Nhật ký cuộc gọi; mời tài xế nhận chuyến khởi tạo cuộc gọi rồi tiếp tục ở sequence S4.

![Hình 4.4](../diagrams/H4_1_aws_architecture_dispatcher.png)

**Hình 4.4.** Mô hình luồng hành vi: nhóm chức năng của điều phối viên

**Luồng của quản trị viên hệ thống.** Trang giám sát đọc tình trạng dịch vụ, cấu hình tác nhân, nhật ký và báo cáo ngày qua Dịch vụ Giám sát vận hành; EventBridge Scheduler kích hoạt báo cáo lúc 00:15. Quản trị viên hệ thống không đi qua luồng hội thoại và không đọc trực tiếp dữ liệu chuyến.

![Hình 4.5](../diagrams/H4_1_aws_architecture_sysadmin.png)

**Hình 4.5.** Mô hình luồng hành vi: nhóm chức năng của quản trị viên hệ thống

## 4.4. Phân chia hệ thống thành các dịch vụ

Ranh giới dịch vụ xác định theo năng lực nghiệp vụ (Newman, 2021): mỗi dịch vụ sở hữu một năng lực và dữ liệu tương ứng, dịch vụ khác chỉ truy cập qua API (Bảng 4.5). Dịch vụ Giám sát vận hành chỉ lưu báo cáo đã tổng hợp; dữ liệu nguồn vẫn thuộc Dịch vụ Nhật ký cuộc gọi.

**Bảng 4.5.** Phân chia dịch vụ

| Dịch vụ | Năng lực nghiệp vụ | Dữ liệu sở hữu | Nền tảng | Yêu cầu |
|---|---|---|---|---|
| Định danh | Tài khoản, đăng nhập, cài đặt, khóa tài khoản | accounts, driver-settings | Lambda | FR-Q03; NFR-05; CON-03 |
| Chuyến đi và Điều phối | Chuyến, ngữ cảnh, phiên thoại, mời chuyến, cuộc gọi, nhắc việc, thông báo đẩy | trips, ws-connections; Redis | Lambda; API Gateway WebSocket | FR-T, FR-C, FR-W, FR-I, FR-E, FR-K, FR-Q01, FR-Q02, FR-Q04; NFR-02, NFR-03 |
| Liên lạc bằng tin nhắn | Gửi SMS; sự kiện nhà cung cấp thoại | channel-events | Lambda | FR-C03; NFR-04 |
| Nhật ký cuộc gọi | Bản ghi, tóm tắt, chỉ số phiên | call-records | Lambda | FR-C05, FR-Q05, FR-O01; NFR-04 |
| Giám sát vận hành | Tình trạng, cấu hình tác nhân, nhật ký, báo cáo ngày | daily-reports | Lambda; EventBridge Scheduler | FR-S01 đến FR-S03, FR-O01, FR-O02; CON-04 |
| Liên lạc hội thoại thời gian thực | STT – LLM gọi công cụ – TTS | Chỉ trạng thái phiên | ECS Fargate | FR-T, FR-C, FR-F, FR-L, FR-K, FR-A02; NFR-01 đến NFR-04; CON-01 |

FR-A01 (từ khóa đánh thức) không thuộc dịch vụ nào: ứng dụng tài xế nhận dạng từ khóa ngay trên thiết bị rồi mở phiên như khi bấm nút (mục 5.5).

## 4.5. Biểu đồ tuần tự cho các luồng chính

Mỗi biểu đồ tuần tự (sequence diagram) ghi thông điệp, mã lỗi và thời gian chờ; đoạn văn dưới hình tóm tắt luồng chính và nhánh lỗi, vị trí hiện thực ở Bảng 5.6.

### 4.5.1. S1 — Đăng nhập (Dịch vụ Định danh)

![Hình 4.6](../diagrams/H4_S1_identity_login.png)

**Hình 4.6.** Sequence S1: đăng nhập tài xế và phát hành JWT

Ứng dụng gửi vai trò, số điện thoại, mật khẩu qua cổng API. Dịch vụ so khớp băm bcrypt, ký access token (15 phút) và refresh token (30 ngày), lưu băm của refresh token để có thể thu hồi. Sai thông tin hoặc không có tài khoản đều trả cùng một lỗi để không lộ việc tài khoản có tồn tại hay không; dịch vụ khác xác minh token bằng khóa dùng chung.

### 4.5.2. S2 — Khởi tạo phiên trợ lý trong ứng dụng (Dịch vụ Chuyến đi và Điều phối)

![Hình 4.7](../diagrams/H4_S2_voice_session.png)

**Hình 4.7.** Sequence S2: khởi tạo phiên trợ lý trong ứng dụng

Ứng dụng xin token thoại kèm JWT. Dịch vụ dùng lại phiên đang mở hoặc tạo phòng mới trên LiveKit Cloud, phân công tác nhân rồi ký token LiveKit. Tác nhân phân loại phiên theo tên phòng, chào ngay rồi tải chuyến, thu nhập, cài đặt vào trạng thái phiên; tải lỗi thì vẫn trả lời và tải lại khi cần.

### 4.5.3. S3 — Xử lý một lượt hội thoại (Dịch vụ Liên lạc hội thoại thời gian thực)

![Hình 4.8](../diagrams/H4_S3_voice_turn.png)

**Hình 4.8.** Sequence S3: một lượt hội thoại có gọi công cụ, câu đệm và dự phòng

Ví dụ tài xế báo đã đón khách. STT phát hiện kết thúc phát ngôn; tác nhân gửi lịch sử và danh sách công cụ tới LLM, sau 2 giây chưa có trả lời thì phát câu đệm. Mô hình chọn update_trip_status; dịch vụ kiểm tra vị trí GPS cách điểm cần đến không quá 200 m rồi ghi bảng trips. Chỉ khi có kết quả thật, tác nhân mới đọc câu xác nhận; STT hoặc LLM lỗi thì chuyển dự phòng, API lỗi thì báo không cập nhật được và phiên tiếp tục.

### 4.5.4. S4 — Mời nhận chuyến qua cuộc gọi điện thoại (Dịch vụ Chuyến đi và Điều phối)

![Hình 4.9](../diagrams/H4_S4_trip_offer.png)

**Hình 4.9.** Sequence S4: mời tài xế nhận chuyến qua cuộc gọi điện thoại

Điều phối viên bấm điều phối chuyến. Dịch vụ tạo phòng mang metadata chuyến, phân công tác nhân và tạo người tham gia SIP; LiveKit quay số qua Twilio tới tài xế. Tác nhân đọc điểm đón và hỏi có nhận không; phiên chỉ có confirm_trip và reject_trip, kết quả ghi vào chuyến và đẩy tới ứng dụng. Tài xế đang có phiên mở trong ứng dụng thì chuyến mới được báo vào phòng hiện có; không nghe rõ thì hỏi lại.

### 4.5.5. S5 — Gọi khách hàng và gửi tin nhắn (Dịch vụ Chuyến đi và Điều phối, Dịch vụ Liên lạc bằng tin nhắn)

![Hình 4.10](../diagrams/H4_S5_customer_call.png)

**Hình 4.10.** Sequence S5: gọi khách hàng theo ba chế độ và gửi tin nhắn SMS

Tác nhân gọi API khởi tạo cuộc gọi với chế độ đã chọn. Chế độ tác nhân gọi thay và nói trực tiếp nối khách vào phòng của tài xế; chế độ gọi nền dùng phòng riêng và gửi tóm tắt về khi kết thúc; LiveKit quay số qua Twilio. Tin nhắn đi qua Dịch vụ Liên lạc bằng tin nhắn tới Twilio, trạng thái giao tin về qua webhook. Số ngoài chuyến phải xác nhận trước; lỗi SMS trả kèm mã Twilio và tác nhân báo thất bại (Bảng 5.2).

### 4.5.6. S6 — Ghi nhật ký và tóm tắt cuộc gọi (Dịch vụ Nhật ký cuộc gọi)

![Hình 4.11](../diagrams/H4_S6_call_records.png)

**Hình 4.11.** Sequence S6: lưu bản ghi hội thoại và tra cứu tóm tắt cuộc gọi

Khi phiên kết thúc, tác nhân gửi bản ghi, tóm tắt do mô hình ngôn ngữ sinh và chỉ số phiên (mục 5.3.6) tới Dịch vụ Nhật ký cuộc gọi, lưu vào bảng call-records theo ngày giờ Việt Nam. Khi tài xế hỏi tóm tắt cuộc gọi gần nhất, dịch vụ lấy đúng một bản ghi mới nhất của chính tài xế đó. Dịch vụ Nhật ký cuộc gọi lỗi thì bản ghi ghi vào nhật ký tác nhân, phiên không bị ảnh hưởng.

### 4.5.7. S7 — Lập báo cáo vận hành ngày (Dịch vụ Giám sát vận hành)

![Hình 4.12](../diagrams/H4_S7_daily_report.png)

**Hình 4.12.** Sequence S7: lập báo cáo vận hành ngày từ bản ghi và chỉ số phiên

EventBridge Scheduler kích hoạt dịch vụ lúc 00:15 giờ Việt Nam; người vận hành có thể lập lại. Dịch vụ đọc bản ghi của ngày, tổng hợp số phiên, độ trễ trung bình, P50, P95, tỷ lệ công cụ thành công và lỗi theo loại; một mẫu cặp câu hỏi – trả lời được gửi cho mô hình chấm (correct, incorrect, unclear). Báo cáo lưu theo khóa report_date; trang giám sát đọc báo cáo và xu hướng 7 ngày (Hình 5.3). Thiếu khóa API của mô hình chấm thì phần chấm được ghi chú bỏ qua.

## 4.6. Thiết kế Dịch vụ Liên lạc hội thoại thời gian thực

### 4.6.1. Chuỗi xử lý và câu đệm

Mỗi phát ngôn đi qua cùng một chuỗi STT, LLM kèm gọi công cụ và TTS (Hình 4.13). Khi phản hồi chưa bắt đầu phát sau 2 giây, tác nhân phát một câu đệm ngắn như "Đợi mình một chút"; câu đệm không chứa dữ liệu nghiệp vụ và bị hủy nếu câu trả lời thật đã bắt đầu. Ngữ cảnh phiên và gói ngôn ngữ được nạp sẵn để lượt đầu không chậm.

![Hình 4.13](../diagrams/H4_2_turn_pipeline.png)

**Hình 4.13.** Chuỗi xử lý một lượt: STT, LLM gọi công cụ, TTS, câu đệm, dự phòng

### 4.6.2. Trạng thái phiên hội thoại

Trạng thái phiên (session state) là dữ liệu tác nhân giữ trong bộ nhớ suốt một phiên và xóa khi phiên kết thúc; dữ liệu gốc vẫn ở các dịch vụ nghiệp vụ (Bảng 4.6). Công cụ đọc trạng thái phiên trước, thiếu thì gọi API; tác nhân không tự tạo dữ liệu nghiệp vụ.

**Bảng 4.6.** Nội dung trạng thái phiên hội thoại

| Nhóm | Nội dung | Mục đích |
|---|---|---|
| Hồ sơ và cài đặt | Chế độ gọi khách mặc định, nhắc khách gần điểm đón | Chọn chế độ gọi; cá nhân hóa |
| Chuyến đi | Chuyến sắp tới, hiện tại, lịch sử gần | Trả lời về chuyến; cập nhật tiến độ |
| Thu nhập | Trong ngày, theo kỳ | Trả lời về thu nhập |
| Cuộc gọi | Đang gọi, cuộc gọi gần nhất | Tránh gọi chồng; tóm tắt |
| Hành động chờ xác nhận | Hủy chuyến, số chờ xác nhận | Xác nhận hai bước |

### 4.6.3. Phân loại phiên và tập công cụ

Tác nhân xác định loại phiên từ tên phòng và metadata; mỗi loại có tập công cụ riêng (Bảng 4.7), hiện thực FR-L03 và giảm rủi ro chọn nhầm công cụ, ví dụ phiên mời nhận chuyến không có công cụ hủy chuyến.

**Bảng 4.7.** Loại phiên và tập công cụ

| Loại phiên | Nhận biết | Tập công cụ |
|---|---|---|
| Tài xế trong ứng dụng | Phòng driver-… không có metadata chuyến | 42 công cụ của tài xế (Phụ lục A) |
| Mời nhận chuyến | Phòng driver-… có metadata chuyến và sip_identity | confirm_trip, reject_trip |
| Gọi khách nền | Phòng custcall-… | Tác nhân riêng trao đổi với khách |
| Khách hàng qua ứng dụng (ngoài phạm vi) | Phòng customer-… | 7 công cụ; ngoài mô hình nghiệp vụ |

Ba chế độ gọi khách (mục 3.3.1): tác nhân gọi thay, khách được nối vào phòng của tài xế và tác nhân trao đổi với khách; nói trực tiếp, tác nhân im lặng cho tới khi tài xế nói cụm từ kết thúc; gọi nền, cuộc gọi diễn ra trong phòng riêng và tóm tắt gửi về phòng của tài xế (sequence S5).

## 4.7. Thiết kế cho khả năng phục hồi, bảo mật và khả năng quan sát

Bảng 4.8 tổng hợp cơ chế đáp ứng NFR-04, NFR-05, CON-04, FR-O01 và chiến thuật tương ứng (Bảng 3.8).

**Bảng 4.8.** Cơ chế thiết kế cho khả năng phục hồi, bảo mật và khả năng quan sát

| Cơ chế | Mô tả | Chiến thuật | Yêu cầu |
|---|---|---|---|
| Thời gian chờ khi gọi API | 8 giây với API chuyến, 25 giây với khởi tạo cuộc gọi; lỗi thành câu báo ngắn | Giới hạn thời gian thực thi | NFR-04 |
| Dự phòng nhà cung cấp AI | STT, LLM, TTS có chuỗi chính và dự phòng; lỗi thì chuyển, có ghi nhật ký | Dự phòng thay thế | NFR-04 |
| Cô lập dịch vụ phụ trợ | Lỗi ghi bản ghi, gửi tin nhắn, phân công tác nhân không dừng hội thoại | Suy giảm có kiểm soát | NFR-04 |
| Tự khôi phục bản sao tác nhân | ECS giữ số bản sao mong muốn; phòng mất tác nhân được phân công lại | Nhịp tim; dự phòng | NFR-04 |
| Xử lý im lặng | Sau 15 giây im lặng hỏi tài xế còn đó không; tối đa hai lần rồi kết thúc | Giám sát phiên | FR-L02, NFR-04 |
| Định danh tập trung | Chỉ Dịch vụ Định danh phát hành JWT; xác minh bằng khóa dùng chung; tác nhân dùng token dịch vụ | Xác thực, phân quyền đối tượng truy cập | NFR-05, CON-03 |
| Bảo vệ bí mật | Tham số bí mật trong hạ tầng dạng mã được ẩn; vai trò IAM riêng từng dịch vụ | Giới hạn truy cập, phơi lộ | NFR-05 |
| Nhật ký gắn mã phòng | Mọi dòng nhật ký gắn mã phòng; mức che dữ liệu cá nhân kiểm tra ở Chương 6 | Lưu vết để kiểm tra lại | CON-04, NFR-05 |
| Chỉ số phiên và báo cáo ngày | Tác nhân gửi chỉ số phiên kèm bản ghi; tổng hợp theo ngày | Giám sát | NFR-04, FR-O01 |

## 4.8. Thiết kế cho tính khả dụng

Tính khả dụng (NFR-01) được thiết kế ở hai mức: mức kiến trúc dùng các chiến thuật khả dụng ở Bảng 3.8 (hủy bỏ, mô hình tác vụ, người dùng, hệ thống); mức tương tác đối chiếu với 10 nguyên tắc của Nielsen (1994), chủ yếu hiện thực bằng lời thoại (Bảng 4.9, Hình 4.14).

**Bảng 4.9.** Đối chiếu thiết kế trợ lý với 10 nguyên tắc khả dụng của Nielsen

| STT | Nguyên tắc | Thiết kế tương ứng |
|---|---|---|
| 1 | Hiển thị trạng thái hệ thống | Biểu tượng kết nối, nghe, xử lý, nói (Hình 4.14a); câu đệm sau 2 giây |
| 2 | Tương thích với thế giới thực | Từ ngữ nghiệp vụ tài xế; tiếng Việt hoặc Anh theo cài đặt (Hình 4.14c) |
| 3 | Quyền kiểm soát và tự do | Từ chối ở bước xác nhận; kết thúc phiên bằng lời; thoát nói trực tiếp bằng cụm từ |
| 4 | Nhất quán và tuân theo chuẩn | Cùng nghiệp vụ trên WebRTC và SIP; cùng chức năng hai ngôn ngữ; cùng mẫu xác nhận |
| 5 | Ngăn ngừa lỗi | Xác nhận hai bước khi hủy chuyến, báo khách vắng, gọi hoặc nhắn số ngoài chuyến; công cụ theo loại phiên |
| 6 | Nhận biết thay vì phải nhớ | Trạng thái phiên giữ chuyến và khách; lời thoại hiển thị lại (Hình 4.14b) |
| 7 | Linh hoạt và hiệu quả | Từ khóa đánh thức (Hình 4.14d); chế độ gọi mặc định (Hình 4.14c) |
| 8 | Thẩm mỹ và tối giản | Mỗi lượt một ý; tra lịch chỉ nói số chuyến rồi hỏi chi tiết |
| 9 | Nhận biết, chẩn đoán, khôi phục lỗi | API lỗi thì nói ngắn thao tác chưa thực hiện được; không rõ thì hỏi lại |
| 10 | Trợ giúp và tài liệu | Hỏi cách dùng bằng giọng nói; trả lời từ sổ tay hướng dẫn |

![Hình 4.14|h=7](thesis_screenshots/H4_ux_usability.png)

**Hình 4.14.** Giao diện trợ lý: (a) trạng thái; (b) lời thoại; (c) cài đặt; (d) từ khóa đánh thức

## 4.9. Đối chiếu yêu cầu với thiết kế

Bảng 4.10 nối từng yêu cầu phi chức năng và hai yêu cầu báo cáo vận hành (FR-O01, FR-O02) với quyết định thiết kế và kịch bản đánh giá ở Chương 6.

**Bảng 4.10.** Đối chiếu yêu cầu phi chức năng với thiết kế

| Yêu cầu | Quyết định thiết kế | Thành phần / luồng | Kịch bản đánh giá |
|---|---|---|---|
| NFR-01 Tính khả dụng | Phân loại phiên; xác nhận hai bước; phản hồi ngắn; Nielsen (Bảng 4.9) | Tác nhân; ứng dụng | Danh mục kiểm tra khi lái |
| NFR-02 Hiệu năng | ADR-02; tải trước ngữ cảnh; tác nhân dài hạn trên Fargate | Luồng ⑤⑥⑦⑧ | P50, P95 độ trễ |
| NFR-03 Khả năng mở rộng | ADR-01; nhân bản tác nhân; Lambda, DynamoDB tự mở rộng | Tác nhân (ECS), Lambda | SC-01 đến SC-03 |
| NFR-04 Khả năng phục hồi | Cô lập dịch vụ; dự phòng; thời gian chờ; tự khôi phục | Luồng ⑦⑧⑭ | RS-01 đến RS-05 |
| NFR-05 Bảo mật | Định danh tập trung; bí mật ẩn; IAM riêng | Luồng ①②; Cross-cutting | Danh mục kiểm tra bảo mật |
| FR-O01, FR-O02 | Báo cáo ngày thuộc Giám sát vận hành; lịch EventBridge | Luồng ⑲⑳㉑ | AC-13 (mục 6.11) |

## 4.10. Đánh giá kiến trúc theo ATAM rút gọn

Luận văn áp dụng phương pháp phân tích đánh đổi kiến trúc ATAM (Architecture Tradeoff Analysis Method) dạng rút gọn (Kazman et al., 2000; Bass et al., 2021) với ba sản phẩm: cây tiện ích (utility tree) xếp hạng kịch bản theo mức quan trọng và mức khó đạt (C – cao, T – trung bình, Th – thấp); điểm nhạy (sensitivity point) và điểm đánh đổi (tradeoff point); rủi ro (risk) và không rủi ro (non-risk). Các buổi làm việc nhiều bên liên quan được lược bỏ. Bảng 4.11 gộp cây tiện ích (kịch bản và ngưỡng từ Bảng 3.8) với kết quả phân tích.

**Bảng 4.11.** Cây tiện ích, điểm nhạy, điểm đánh đổi, rủi ro và không rủi ro

| Mã | Loại | Nội dung | Thuộc tính (quan trọng / khó) | Cách xử lý |
|---|---|---|---|---|
| U-1 | Kịch bản | NFR-02: P95 trả lời ≤ 2 giây | Hiệu năng (C / C) | Đo P50, P95 theo chặng (mục 6.4) |
| U-2 | Kịch bản | NFR-04: LLM chính lỗi, dự phòng trả lời | Phục hồi (C / T) | RS-05 |
| U-3 | Kịch bản | NFR-04: API chuyến lỗi, phiên tiếp tục | Phục hồi (C / Th) | RS-01, RS-02 |
| U-4 | Kịch bản | NFR-03: 1 lên 20 phiên, P95 tăng ≤ 20% | Mở rộng (T / T) | SC-01 đến SC-03 |
| U-5 | Kịch bản | NFR-05: chỉ Định danh phát hành JWT; nhật ký không chứa số đầy đủ | Bảo mật (C / Th) | Danh mục bảo mật (mục 6.10) |
| U-6 | Kịch bản | NFR-01: 100% thao tác rủi ro có xác nhận | Khả dụng (C / Th) | Danh mục khi lái (mục 6.7) |
| SP-1 | Điểm nhạy | Thời gian LLM sinh token đầu | Hiệu năng | Đo riêng chặng (Bảng 6.4) |
| SP-2 | Điểm nhạy | Ngưỡng phát hiện kết thúc phát ngôn | Hiệu năng, khả dụng | Giữ mặc định nền tảng |
| TP-1 | Đánh đổi | Mọi lượt qua LLM (ADR-02) | Đúng chức năng ↔ hiệu năng | Ưu tiên đúng nghiệp vụ; câu đệm |
| TP-2 | Đánh đổi | Thời gian chờ API (8, 25 giây) | Phục hồi ↔ hiệu năng | Giá trị hiện tại tránh lỗi giả |
| TP-3 | Đánh đổi | Nhà cung cấp AI dự phòng | Phục hồi ↔ chi phí | Chấp nhận chi phí; đo RS-05 |
| TP-4 | Đánh đổi | API nghiệp vụ trên FaaS | Mở rộng ↔ khởi động nguội | Tải trước ngữ cảnh khi mở phiên |
| R-1 | Rủi ro | Token đầu của LLM vượt 2 giây | Hiệu năng | Đã xảy ra đợt đo 05–06/09/2026 (mục 6.4) |
| R-2 | Rủi ro | Một khóa bí mật JWT dùng chung | Bảo mật | Hướng phát triển: khóa bất đối xứng |
| R-3 | Rủi ro | Một nhà cung cấp truyền thông | Phục hồi | Ngoài phạm vi nguyên mẫu |
| R-4 | Rủi ro | Tài nguyên trong một vùng AWS | Phục hồi | Chấp nhận ở quy mô nguyên mẫu |
| NR-1 | Không rủi ro | Dữ liệu riêng từng dịch vụ; tác nhân chỉ gọi API | Phục hồi, bảo trì | Lỗi phụ trợ không lan (RS-01, RS-02) |
| NR-2 | Không rủi ro | Nhóm bảo mật tác nhân chỉ cho chiều ra | Bảo mật | Không nhận kết nối từ ngoài |

Rủi ro lớn nhất (R-1) nằm ở thành phần bên ngoài, thời gian sinh token đầu của mô hình ngôn ngữ: microservices cho phép thay nhà cung cấp mà không ảnh hưởng dịch vụ khác, nhưng không tự rút ngắn thời gian này. Chương 6 kiểm chứng các điểm nhạy và rủi ro bằng số liệu đo.

## Kết luận chương

Microservices được chọn từ các yêu cầu phi chức năng; kiến trúc, luồng, cơ chế phục hồi, bảo mật, khả dụng và đánh giá ATAM đã được xác lập. Chương 5 trình bày hiện thực.
