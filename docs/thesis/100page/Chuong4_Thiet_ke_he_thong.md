# Chương 4. Thiết kế hệ thống

## 4.1. Động lực kiến trúc

Động lực kiến trúc là tập yêu cầu và ràng buộc ảnh hưởng quyết định đến cấu trúc hệ thống (Bass et al., 2021). Bảng 4.1 tổng hợp các động lực rút ra từ Chương 3; chiến thuật tương ứng với từng NFR (Bảng 3.8) ghi trong ngoặc đơn.

**Bảng 4.1.** Động lực kiến trúc

| Loại | Mã | Nội dung | Ảnh hưởng đến kiến trúc |
|---|---|---|---|
| Chức năng | FR-T, FR-C, FR-K | Nghiệp vụ bằng gọi công cụ qua WebRTC và SIP | Tách nghiệp vụ khỏi tác nhân; mọi kênh dùng chung |
| Chức năng | FR-Q, FR-S, FR-O | Điều phối; giám sát, báo cáo ngày | Trang quản trị dùng chung API; dịch vụ giám sát riêng, chỉ đọc |
| Phi chức năng | NFR-02 | P95 độ trễ ≤ 2 giây | Tác nhân dài hạn; tải trước ngữ cảnh (kiểm soát nhu cầu) |
| Phi chức năng | NFR-03 | Mở rộng theo số phiên | Tác nhân và API mở rộng độc lập (tăng tài nguyên, nhiều bản sao) |
| Phi chức năng | NFR-04 | Phiên không dừng khi phụ trợ hoặc AI lỗi | Cô lập lỗi (suy giảm có kiểm soát); dự phòng nhà cung cấp (dự phòng thay thế) |
| Phi chức năng | NFR-05 | Định danh tập trung, bảo vệ bí mật | Một dịch vụ định danh; quyền riêng từng dịch vụ (xác thực đối tượng truy cập) |
| Phi chức năng | NFR-01 | Xác nhận thao tác rủi ro; công cụ theo loại phiên | Phân loại và trạng thái phiên (mô hình tác vụ, mô hình hệ thống) |
| Ràng buộc | CON-01 đến CON-04 | Tác nhân chỉ gọi API; dữ liệu riêng; JWT do Định danh phát hành; nhật ký gắn mã phòng | Ranh giới dịch vụ bắt buộc |
| Môi trường | Bối cảnh dự án | STT, LLM, TTS, truyền thông bên ngoài; nhóm nhỏ, chi phí thấp | Dịch vụ đám mây quản lý, trả theo mức dùng |

## 4.2. Quyết định kiến trúc

### 4.2.1. Lựa chọn kiểu kiến trúc (ADR-01)

**Bối cảnh.** Hệ thống có hai loại tải: tác nhân hội thoại chạy dài hạn, giữ kết nối âm thanh, dùng thư viện AI của Python; và các API nghiệp vụ nhanh, không trạng thái, do ứng dụng, trang quản trị và tác nhân cùng gọi.

**Các phương án.** (A) nguyên khối; (B) nguyên khối phân mô-đun; (C) microservices, tác nhân và từng năng lực nghiệp vụ là một dịch vụ; (D) thuần serverless trên FaaS. Bảng 4.2 đánh giá bốn phương án; NFR-01 không được đưa vào vì chiến thuật của nó nằm trong tác nhân, không phụ thuộc kiểu kiến trúc (mục 3.4.3).

**Bảng 4.2.** Đánh giá các phương án kiến trúc theo yêu cầu phi chức năng

| Yêu cầu | (A) Nguyên khối | (B) Phân mô-đun | (C) Microservices | (D) Thuần serverless |
|---|---|---|---|---|
| NFR-02 Hiệu năng | Một phần: tranh chấp | Một phần | Đáp ứng: tác nhân container, API riêng | Không: giới hạn thời gian chạy, khởi động nguội |
| NFR-03 Mở rộng | Không: nhân bản cả ứng dụng | Không | Đáp ứng: nhân bản độc lập | Một phần: tác nhân dài hạn không hợp FaaS |
| NFR-04 Phục hồi | Không: một lỗi dừng tất cả | Một phần: cô lập mức mã | Đáp ứng: lỗi phụ trợ không lan | Một phần |
| NFR-05 Bảo mật | Một phần: dùng chung quyền | Một phần | Đáp ứng: quyền riêng | Đáp ứng |
| Độ phức tạp vận hành | Thấp | Thấp | Cao | Trung bình |

**Quyết định.** Chọn (C): API nghiệp vụ chạy trên AWS Lambda sau Amazon API Gateway; tác nhân chạy trong container trên Amazon ECS với AWS Fargate; mỗi dịch vụ có bảng riêng trên Amazon DynamoDB.

**Hệ quả và giảm thiểu.** Microservices tăng độ phức tạp vận hành, độ trễ mạng và khó nhất quán dữ liệu (Soldani et al., 2018). Giảm thiểu: mỗi dịch vụ có hạ tầng dạng mã riêng (AWS SAM, CloudFormation) và kịch bản triển khai tự động; tải trước ngữ cảnh phiên, dùng lại kết nối HTTP; chỉ một dịch vụ giữ bản chính thức của dữ liệu chuyến đi; mọi dòng nhật ký gắn mã phòng.

### 4.2.2. Lựa chọn luồng xử lý lượt hội thoại (ADR-02)

**Bối cảnh.** Thời gian sinh token đầu của LLM là thành phần lớn nhất trong độ trễ một lượt (Bảng 6.4). Bảng 4.3 so sánh các phương án.

**Bảng 4.3.** Các phương án luồng xử lý lượt hội thoại

| Phương án | Ưu điểm | Nhược điểm | Kết luận |
|---|---|---|---|
| Mọi câu qua LLM, không câu đệm | Một luồng duy nhất | Khoảng lặng chờ token đầu | Không chọn |
| Nhánh rút gọn theo ý định, kết hợp LLM | Nhanh với câu khớp mẫu (Bảng 6.3, đợt đo 05–06/09/2026) | Dễ chọn sai công cụ; khó bảo trì mẫu câu | Không chọn; đã loại bỏ (mục 5.3.2) |
| Mọi câu qua LLM gọi công cụ; câu đệm sau 2 giây; tải trước ngữ cảnh | Một luồng; chỉ trả lời khi có kết quả thật | Độ trễ vẫn phụ thuộc token đầu | **Chọn** |

**Quyết định và hệ quả.** Chọn phương án thứ ba để trợ lý chỉ xác nhận khi có kết quả thật; đổi lại, độ trễ phụ thuộc token đầu, chỉ được bù một phần bằng câu đệm (TP-1, mục 4.10).

## 4.3. Kiến trúc tổng thể trên AWS

Theo cách Bass et al. (2021) phân biệt cấu trúc tĩnh với hành vi động, kiến trúc được trình bày bằng mô hình cấu trúc (Hình 4.1) và mô hình luồng hành vi (Hình 4.2 đến Hình 4.5). Đây là kiến trúc đích; trạng thái triển khai thực tế nêu ở mục 5.6.1.

### 4.3.1. Kiến trúc tổng thể

Hình 4.1 theo quy ước sơ đồ kiến trúc AWS: năm lớp xếp thành năm cột theo đường đi của yêu cầu, thành phần dùng chung ở dải Cross-cutting Concerns; nét đứt là kết nối phụ trợ, hộp xám viền nét đứt là hệ thống ngoài AWS.

![Hình 4.1](../diagrams/H4_1_aws_architecture.png)

**Hình 4.1.** Kiến trúc tổng thể của hệ thống trên AWS theo microservices

**Lớp máy khách** gồm ứng dụng tài xế, trang quản trị và trang giám sát (tệp tĩnh trên Amazon S3); khách hàng dùng điện thoại thường. Ở **lớp truyền thông thời gian thực và hội thoại AI**, LiveKit Cloud truyền âm thanh (WebRTC) và quay số (SIP); Dịch vụ Liên lạc hội thoại thời gian thực chạy trên ECS Fargate và gọi STT, LLM, TTS, mỗi khâu có nhà cung cấp chính và dự phòng. Ở **lớp cổng API**, API Gateway là cửa vào duy nhất, kèm cổng WebSocket để đẩy thông báo. **Lớp microservices** gồm năm dịch vụ nghiệp vụ chạy trên Lambda; cùng dịch vụ hội thoại, hệ thống có sáu dịch vụ (Bảng 4.5). **Lớp dữ liệu** gồm bảng DynamoDB riêng của từng dịch vụ và Redis (tùy chọn) làm bộ nhớ đệm ngắn hạn của Dịch vụ Chuyến đi và Điều phối giữa các lần chạy Lambda (phiên đang mở, thông báo chờ phát, ngữ cảnh); trạng thái phiên của tác nhân (mục 4.6.2) không nằm ở Redis. Dải xuyên suốt gồm CloudWatch Logs, IAM và JWT, EventBridge Scheduler và CloudFormation.

**Giao thức kết nối.** Lời gọi giữa các dịch vụ cũng đi qua API Gateway kèm JWT dịch vụ, cùng bước xác thực như lời gọi từ người dùng. Tài nguyên nằm trong vùng ap-southeast-1; tác nhân chỉ được kết nối chiều ra. Vì Lambda không giữ trạng thái, bảng ws-connections lưu cặp mã kết nối WebSocket và định danh người dùng.

### 4.3.2. Mô hình luồng hành vi theo nhóm người sử dụng

Các luồng trên Hình 4.2 đến Hình 4.5 được đánh số ① đến ㉙, khớp với số trên các biểu đồ tuần tự (mục 4.5); Bảng 4.4 liệt kê các luồng chính. Bảng đầy đủ 29 luồng nằm trong kho mã nguồn (tệp docs/thesis/Chuong4_Thiet_ke_he_thong_DRAFT.md).

**Bảng 4.4.** Các luồng hành vi trên Hình 4.2 đến Hình 4.5

| Nhóm người dùng | Hình | Các luồng chính |
|---|---|---|
| Tài xế | 4.2 | Đăng nhập (①②); mở phiên (③④⑤⑥); lượt (⑦⑧⑨); đẩy (⑩); gọi (⑪); tin nhắn (⑫⑬㉒); nhật ký cuộc gọi (⑭⑮⑯); bản đồ (㉓㉕); nhật ký (⑱) |
| Khách hàng | 4.3 | Cuộc gọi qua Twilio (④⑪); tác nhân (⑥⑦⑧⑨); tin nhắn (⑫⑬㉒); bản ghi (⑭⑯) |
| Điều phối viên | 4.4 | Trang quản trị (⑰) tới Định danh (②), Chuyến đi (⑨), Nhật ký cuộc gọi (⑯); mời tài xế (④⑪) |
| Quản trị viên hệ thống | 4.5 | Trang giám sát (⑰); báo cáo ngày (⑲⑳㉑); sức khỏe (㉗); chấm mẫu (㉘); nhật ký, số tác vụ (⑱㉙) |

**Luồng của tài xế.** Khi tài xế nói "nhận chuyến này", mô hình chọn công cụ (⑦), tác nhân gọi API (⑧), dịch vụ ghi trạng thái confirmed (⑨) và đẩy thông báo (⑩); chỉ khi API thành công tác nhân mới xác nhận.

![Hình 4.2](../diagrams/H4_1_aws_architecture_driver.png)

**Hình 4.2.** Mô hình luồng hành vi: nhóm chức năng của tài xế

**Luồng của khách hàng.** Khách đặt xe với điều phối viên ngoài hệ thống, sau đó chỉ tương tác qua điện thoại thường; ở chế độ tác nhân gọi thay hoặc gọi nền, tác nhân trao đổi với khách qua Twilio và lưu bản ghi.

![Hình 4.3](../diagrams/H4_1_aws_architecture_customer.png)

**Hình 4.3.** Mô hình luồng hành vi: nhóm chức năng của khách hàng

**Luồng của điều phối viên.** Mọi thao tác trên trang quản trị đi qua cổng API; mời tài xế nhận chuyến khởi tạo cuộc gọi hoặc gửi thông báo vào phiên đang mở (S4).

![Hình 4.4](../diagrams/H4_1_aws_architecture_dispatcher.png)

**Hình 4.4.** Mô hình luồng hành vi: nhóm chức năng của điều phối viên

**Luồng của quản trị viên hệ thống.** Trang giám sát đọc tình trạng dịch vụ, cấu hình tác nhân, nhật ký và báo cáo ngày qua Dịch vụ Giám sát vận hành. Quản trị viên không tham gia hội thoại và không đọc trực tiếp dữ liệu chuyến đi.

![Hình 4.5](../diagrams/H4_1_aws_architecture_sysadmin.png)

**Hình 4.5.** Mô hình luồng hành vi: nhóm chức năng của quản trị viên hệ thống

## 4.4. Phân chia hệ thống thành các dịch vụ

Ranh giới dịch vụ được xác định theo năng lực nghiệp vụ (Newman, 2021): mỗi dịch vụ sở hữu một năng lực cùng dữ liệu tương ứng, dịch vụ khác chỉ truy cập qua API (Bảng 4.5). Dịch vụ Giám sát vận hành chỉ lưu báo cáo tổng hợp; dữ liệu nguồn thuộc Dịch vụ Nhật ký cuộc gọi.

**Bảng 4.5.** Phân chia dịch vụ

| Dịch vụ | Năng lực nghiệp vụ | Dữ liệu sở hữu | Nền tảng | Yêu cầu |
|---|---|---|---|---|
| Định danh | Tài khoản, đăng nhập, cài đặt, khóa tài khoản | accounts, driver-settings | Lambda | FR-Q03; NFR-05; CON-03 |
| Chuyến đi và Điều phối | Chuyến, ngữ cảnh, phiên, mời chuyến, cuộc gọi, nhắc việc, đẩy thông báo | trips, ws-connections; Redis | Lambda; API Gateway WebSocket | FR-T, FR-C, FR-W, FR-I, FR-E, FR-K, FR-Q01, FR-Q02, FR-Q04; NFR-02, NFR-03 |
| Liên lạc bằng tin nhắn | SMS; sự kiện nhà cung cấp thoại | channel-events | Lambda | FR-C03, FR-K03; NFR-04 |
| Nhật ký cuộc gọi | Bản ghi, tóm tắt, chỉ số phiên | call-records | Lambda | FR-C05, FR-Q05, FR-O01; NFR-04 |
| Giám sát vận hành | Tình trạng dịch vụ, cấu hình tác nhân, nhật ký, báo cáo ngày | daily-reports | Lambda; EventBridge Scheduler | FR-S01 đến FR-S03, FR-O01, FR-O02; CON-04 |
| Liên lạc hội thoại thời gian thực | STT – LLM gọi công cụ – TTS | Chỉ trạng thái phiên | ECS Fargate | FR-T, FR-C, FR-W, FR-I, FR-E, FR-F, FR-L, FR-K, FR-A02; NFR-01 đến NFR-04; CON-01 |

FR-A01 (từ khóa đánh thức) không thuộc dịch vụ nào: ứng dụng nhận dạng từ khóa trên thiết bị rồi mở phiên như khi bấm nút (mục 5.5).

## 4.5. Biểu đồ tuần tự cho các luồng chính

Mỗi biểu đồ tuần tự (sequence diagram) thể hiện thông điệp, mã lỗi và thời gian chờ; vị trí hiện thực từng luồng nêu ở Bảng 5.6.

### 4.5.1. S1 — Đăng nhập (Dịch vụ Định danh)

![Hình 4.6](../diagrams/H4_S1_identity_login.png)

**Hình 4.6.** Sequence S1: đăng nhập tài xế và phát hành JWT

Ứng dụng gửi vai trò, số điện thoại và mật khẩu; dịch vụ so khớp mật khẩu với giá trị băm bcrypt, ký access token (hạn 15 phút) và refresh token (hạn 30 ngày), lưu giá trị băm của refresh token để có thể thu hồi. Sai thông tin và tài khoản không tồn tại trả cùng một lỗi để không tiết lộ tài khoản có tồn tại hay không.

### 4.5.2. S2 — Khởi tạo phiên trợ lý trong ứng dụng (Dịch vụ Chuyến đi và Điều phối)

![Hình 4.7](../diagrams/H4_S2_voice_session.png)

**Hình 4.7.** Sequence S2: khởi tạo phiên trợ lý trong ứng dụng

Khi ứng dụng xin token thoại, dịch vụ dùng lại phiên đang mở hoặc tạo phòng mới trên LiveKit Cloud, phân công tác nhân rồi ký token LiveKit. Tác nhân phân loại phiên (mục 4.6.3), chào tài xế ngay rồi tải chuyến đi, thu nhập và cài đặt vào trạng thái phiên; nếu tải lỗi, tác nhân vẫn trả lời và tải lại khi cần.

### 4.5.3. S3 — Xử lý một lượt hội thoại (Dịch vụ Liên lạc hội thoại thời gian thực)

![Hình 4.8](../diagrams/H4_S3_voice_turn.png)

**Hình 4.8.** Sequence S3: một lượt hội thoại có gọi công cụ, câu đệm và dự phòng

Khi tài xế báo đã đón khách, tác nhân gửi lịch sử hội thoại và danh sách công cụ tới LLM (quá 2 giây thì phát câu đệm, mục 4.6.1); mô hình chọn công cụ update_trip_status; dịch vụ kiểm tra vị trí GPS cách điểm cần đến không quá 200 m rồi ghi vào bảng trips, và tác nhân chỉ xác nhận khi có kết quả thật. Nếu STT hoặc LLM lỗi, tác nhân chuyển sang nhà cung cấp dự phòng; nếu API lỗi, tác nhân báo không cập nhật được và phiên tiếp tục.

### 4.5.4. S4 — Mời nhận chuyến qua cuộc gọi điện thoại (Dịch vụ Chuyến đi và Điều phối)

![Hình 4.9](../diagrams/H4_S4_trip_offer.png)

**Hình 4.9.** Sequence S4: mời tài xế nhận chuyến qua cuộc gọi điện thoại

Khi điều phối viên điều phối chuyến mà tài xế đang có phiên mở, chuyến mới được báo vào phòng hiện có. Nếu không, dịch vụ tạo phòng mang metadata chuyến, phân công tác nhân và tạo người tham gia SIP để LiveKit quay số qua Twilio. Tác nhân đọc điểm đón và hỏi tài xế có nhận không; phiên chỉ có confirm_trip và reject_trip, kết quả được ghi vào chuyến và đẩy tới ứng dụng.

### 4.5.5. S5 — Gọi khách hàng và gửi tin nhắn (Dịch vụ Chuyến đi và Điều phối, Dịch vụ Liên lạc bằng tin nhắn)

![Hình 4.10](../diagrams/H4_S5_customer_call.png)

**Hình 4.10.** Sequence S5: gọi khách hàng theo ba chế độ và gửi tin nhắn SMS

Ở chế độ tác nhân gọi thay và nói trực tiếp, khách được nối vào phòng của tài xế; ở chế độ gọi nền, cuộc gọi dùng phòng riêng và tóm tắt được gửi về khi kết thúc. Tin nhắn đi qua Dịch vụ Liên lạc bằng tin nhắn tới Twilio, trạng thái giao tin trả về qua webhook; số ngoài chuyến phải được xác nhận trước. Khi gửi SMS lỗi, dịch vụ trả lỗi kèm mã Twilio (nếu có) và tác nhân báo không gửi được (Bảng 5.2 minh họa một lần trả 503).

### 4.5.6. S6 — Ghi nhật ký và tóm tắt cuộc gọi (Dịch vụ Nhật ký cuộc gọi)

![Hình 4.11](../diagrams/H4_S6_call_records.png)

**Hình 4.11.** Sequence S6: lưu bản ghi hội thoại và tra cứu tóm tắt cuộc gọi

Khi phiên kết thúc, tác nhân gửi bản ghi, tóm tắt do LLM sinh và chỉ số phiên (mục 5.3.6) tới Dịch vụ Nhật ký cuộc gọi để lưu vào bảng call-records theo giờ Việt Nam. Truy vấn tóm tắt chỉ lấy bản ghi mới nhất của chính tài xế. Nếu dịch vụ lỗi, bản ghi được ghi vào nhật ký của tác nhân và phiên không bị ảnh hưởng.

### 4.5.7. S7 — Lập báo cáo vận hành ngày (Dịch vụ Giám sát vận hành)

![Hình 4.12](../diagrams/H4_S7_daily_report.png)

**Hình 4.12.** Sequence S7: lập báo cáo vận hành ngày từ bản ghi và chỉ số phiên

EventBridge Scheduler kích hoạt dịch vụ lúc 00:15 giờ Việt Nam (quản trị viên cũng có thể yêu cầu lập lại). Dịch vụ tổng hợp số phiên, độ trễ trung bình, P50, P95, tỷ lệ gọi công cụ thành công và lỗi theo loại; một mẫu cặp câu hỏi – trả lời được mô hình chấm gán nhãn correct, incorrect hoặc unclear. Báo cáo lưu theo khóa report_date; trang giám sát hiển thị báo cáo và xu hướng 7 ngày (Hình 5.3, Hình 5.4). Thiếu khóa API của mô hình chấm thì phần chấm được bỏ qua và ghi chú trong báo cáo.

## 4.6. Thiết kế Dịch vụ Liên lạc hội thoại thời gian thực

### 4.6.1. Chuỗi xử lý và câu đệm

Mỗi phát ngôn đi qua chuỗi STT, LLM kèm gọi công cụ và TTS (Hình 4.13). Nếu sau 2 giây phản hồi chưa bắt đầu phát, tác nhân phát câu đệm ngắn như "Đợi mình một chút"; câu đệm không chứa dữ liệu nghiệp vụ và bị hủy khi câu trả lời thật bắt đầu. Ngữ cảnh phiên và gói ngôn ngữ được nạp sẵn để lượt đầu không bị chậm.

![Hình 4.13](../diagrams/H4_2_turn_pipeline.png)

**Hình 4.13.** Chuỗi xử lý một lượt: STT, LLM gọi công cụ, TTS, câu đệm, dự phòng

### 4.6.2. Trạng thái phiên hội thoại

Trạng thái phiên (session state) là dữ liệu tác nhân giữ trong bộ nhớ suốt phiên và xóa khi phiên kết thúc (Bảng 4.6); dữ liệu gốc nằm ở các dịch vụ nghiệp vụ. Công cụ tra cứu đọc trạng thái phiên trước, thiếu mới gọi API; công cụ ghi luôn gọi API. Tác nhân không tự tạo dữ liệu nghiệp vụ.

**Bảng 4.6.** Nội dung trạng thái phiên hội thoại

| Nhóm | Nội dung | Mục đích |
|---|---|---|
| Hồ sơ và cài đặt | Chế độ gọi mặc định, nhắc khách gần điểm đón | Cá nhân hóa |
| Chuyến đi | Chuyến sắp tới, hiện tại, lịch sử gần đây | Trả lời, cập nhật chuyến |
| Thu nhập | Trong ngày, theo kỳ | Trả lời về thu nhập |
| Cuộc gọi | Đang diễn ra, gần nhất | Tránh gọi chồng; tóm tắt |
| Hành động chờ xác nhận | Hủy chuyến, số điện thoại chờ xác nhận | Xác nhận hai bước |

### 4.6.3. Phân loại phiên và tập công cụ

Tác nhân xác định loại phiên từ tên phòng và metadata; mỗi loại có tập công cụ riêng (Bảng 4.7). Cách làm này hiện thực FR-L03 và giảm rủi ro chọn nhầm công cụ, chẳng hạn phiên mời nhận chuyến không có công cụ hủy chuyến.

**Bảng 4.7.** Loại phiên và tập công cụ

| Loại phiên | Nhận biết | Tập công cụ |
|---|---|---|
| Tài xế trong ứng dụng | Phòng driver-… không có metadata chuyến | 42 công cụ của tài xế (Phụ lục A) |
| Mời nhận chuyến | Phòng driver-… có metadata chuyến (qua SIP kèm sip_identity) | confirm_trip, reject_trip |
| Gọi khách nền | Phòng custcall-… | Tác nhân riêng trao đổi với khách |
| Khách hàng qua ứng dụng (ngoài phạm vi) | Phòng customer-… | 7 công cụ; ngoài mô hình nghiệp vụ |

Trong ba chế độ gọi khách (mục 3.3.1, S5), chế độ nói trực tiếp khác ở chỗ tác nhân im lặng cho tới khi tài xế nói cụm từ kết thúc.

## 4.7. Thiết kế cho khả năng phục hồi, bảo mật và khả năng quan sát

Bảng 4.8 tổng hợp các cơ chế đáp ứng NFR-04, NFR-05, CON-03, CON-04, FR-L02, FR-O01 cùng chiến thuật tương ứng (Bảng 3.8).

**Bảng 4.8.** Cơ chế thiết kế cho khả năng phục hồi, bảo mật và khả năng quan sát

| Cơ chế | Mô tả | Chiến thuật | Yêu cầu |
|---|---|---|---|
| Thời gian chờ khi gọi API | 8 giây với phần lớn API chuyến đi, 25 giây với API khởi tạo cuộc gọi; lỗi thành câu báo ngắn | Giới hạn thời gian thực thi | NFR-04 |
| Dự phòng nhà cung cấp AI | STT, LLM, TTS có chuỗi dự phòng; lỗi thì chuyển, ghi nhật ký | Dự phòng thay thế | NFR-04 |
| Cô lập dịch vụ phụ trợ | Lỗi bản ghi, tin nhắn, phân công tác nhân không dừng hội thoại | Suy giảm có kiểm soát | NFR-04 |
| Tự khôi phục bản sao tác nhân | ECS duy trì số bản sao; phòng mất tác nhân được phân công lại khi xin lại token (S2); chưa đo đầu cuối (mục 6.9) | Nhịp tim; dự phòng | NFR-04 |
| Xử lý im lặng | Sau 15 giây im lặng thì hỏi lại; tối đa hai lần rồi kết thúc phiên | Giám sát phiên | FR-L02, NFR-04 |
| Định danh tập trung | Chỉ Định danh phát hành JWT đăng nhập; xác minh bằng khóa dùng chung; gọi nội bộ bằng token dịch vụ ngắn hạn | Xác thực, phân quyền đối tượng truy cập | NFR-05, CON-03 |
| Bảo vệ bí mật | Ẩn tham số bí mật trong hạ tầng dạng mã; IAM riêng từng dịch vụ | Giới hạn truy cập, giới hạn phơi lộ | NFR-05 |
| Nhật ký gắn mã phòng | Mọi dòng gắn mã phòng; che dữ liệu cá nhân (mục 6.10) | Lưu vết để kiểm tra lại | CON-04, NFR-05 |
| Chỉ số phiên và báo cáo ngày | Chỉ số phiên gửi kèm bản ghi, tổng hợp theo ngày | Giám sát | NFR-04, FR-O01 |

## 4.8. Thiết kế cho tính khả dụng

Tính khả dụng (NFR-01) được thiết kế ở hai mức: mức kiến trúc dùng các chiến thuật khả dụng ở Bảng 3.8 (hủy bỏ, mô hình tác vụ, mô hình người dùng, mô hình hệ thống); mức tương tác đối chiếu với 10 nguyên tắc của Nielsen (1994), chủ yếu hiện thực bằng lời thoại (Bảng 4.9, Hình 4.14).

**Bảng 4.9.** Đối chiếu thiết kế trợ lý với 10 nguyên tắc khả dụng của Nielsen

| STT | Nguyên tắc | Thiết kế tương ứng |
|---|---|---|
| 1 | Hiển thị trạng thái hệ thống | Biểu tượng trạng thái (Hình 4.14a); câu đệm sau 2 giây |
| 2 | Tương thích với thế giới thực | Từ ngữ của tài xế; Việt hoặc Anh (Hình 4.14c) |
| 3 | Quyền kiểm soát và tự do | Từ chối khi xác nhận; kết thúc phiên bằng lời; thoát nói trực tiếp bằng cụm từ kết thúc |
| 4 | Nhất quán và tuân theo chuẩn | Cùng nghiệp vụ trên WebRTC, SIP và ở hai ngôn ngữ; cùng mẫu xác nhận |
| 5 | Ngăn ngừa lỗi | Xác nhận hai bước khi hủy chuyến, báo khách vắng, liên lạc số ngoài chuyến; công cụ theo loại phiên |
| 6 | Nhận biết thay vì phải nhớ | Trạng thái phiên giữ sẵn chuyến, khách; hiện lời thoại (Hình 4.14b) |
| 7 | Linh hoạt và hiệu quả | Từ khóa đánh thức (Hình 4.14d); chế độ gọi mặc định (Hình 4.14c) |
| 8 | Thẩm mỹ và tối giản | Mỗi lượt một ý; tra lịch chỉ nói số chuyến trước |
| 9 | Nhận biết, chẩn đoán, khôi phục lỗi | API lỗi thì báo ngắn; nghe không rõ thì hỏi lại |
| 10 | Trợ giúp và tài liệu | Hỏi cách dùng bằng lời; trả lời theo sổ tay |

![Hình 4.14|h=7](thesis_screenshots/H4_ux_usability.png)

**Hình 4.14.** Giao diện trợ lý: (a) trạng thái; (b) lời thoại; (c) cài đặt; (d) từ khóa đánh thức

## 4.9. Đối chiếu yêu cầu với thiết kế

Bảng 4.10 liên kết từng yêu cầu phi chức năng và FR-O01, FR-O02 với quyết định thiết kế và kịch bản đánh giá ở Chương 6.

**Bảng 4.10.** Đối chiếu yêu cầu phi chức năng với thiết kế

| Yêu cầu | Quyết định thiết kế | Thành phần / luồng | Kịch bản đánh giá |
|---|---|---|---|
| NFR-01 Tính khả dụng | Phân loại phiên; xác nhận hai bước; Nielsen (Bảng 4.9) | Tác nhân; ứng dụng | AC-14: danh mục kiểm tra khi lái (mục 6.7) |
| NFR-02 Hiệu năng | ADR-02; tải trước ngữ cảnh; tác nhân dài hạn trên Fargate | Luồng ⑤⑥⑦⑧ | AC-15: P50, P95 độ trễ (mục 6.4) |
| NFR-03 Khả năng mở rộng | ADR-01; nhân bản tác nhân; Lambda, DynamoDB tự mở rộng | ECS, Lambda | AC-16: SC-01 đến SC-03 (mục 6.8) |
| NFR-04 Khả năng phục hồi | Cô lập dịch vụ; dự phòng; thời gian chờ; tự khôi phục | Luồng ⑦⑧⑭ | AC-17: RS-01 đến RS-05 (mục 6.9) |
| NFR-05 Bảo mật | Định danh tập trung; ẩn bí mật; IAM riêng | Luồng ①②; Cross-cutting | AC-18: danh mục kiểm tra bảo mật (mục 6.10) |
| FR-O01, FR-O02 | Báo cáo ngày ở Giám sát vận hành; EventBridge | Luồng ⑲⑳㉑ | AC-13 (mục 6.11) |

## 4.10. Đánh giá kiến trúc theo ATAM rút gọn

Luận văn áp dụng ATAM (Architecture Tradeoff Analysis Method) ở dạng rút gọn (Kazman et al., 2000; Bass et al., 2021), cho ba sản phẩm: cây tiện ích (utility tree) xếp hạng kịch bản theo mức quan trọng và mức khó đạt (C – cao, T – trung bình, Th – thấp); các điểm nhạy (sensitivity point) và điểm đánh đổi (tradeoff point); các rủi ro (risk) và không rủi ro (non-risk). Vì lược bỏ các buổi làm việc với nhiều bên liên quan, kịch bản và xếp hạng phản ánh đánh giá của tác giả. Bảng 4.11 trình bày kết quả; kịch bản và ngưỡng lấy từ Bảng 3.8.

**Bảng 4.11.** Cây tiện ích, điểm nhạy, điểm đánh đổi, rủi ro và không rủi ro

| Mã | Loại | Nội dung | Thuộc tính (quan trọng / khó) | Cách xử lý |
|---|---|---|---|---|
| U-1 | Kịch bản | NFR-02: P95 độ trễ ≤ 2 giây | Hiệu năng (C / C) | Đo P50, P95 theo chặng (mục 6.4) |
| U-2 | Kịch bản | NFR-04: LLM chính lỗi, dự phòng trả lời | Phục hồi (C / T) | RS-05 |
| U-3 | Kịch bản | NFR-04: API hoặc dịch vụ phụ trợ lỗi, phiên tiếp tục | Phục hồi (C / Th) | RS-01, RS-02, RS-04 |
| U-4 | Kịch bản | NFR-03: 1 lên 20 phiên, P95 tăng ≤ 20% | Mở rộng (T / T) | SC-01 đến SC-03 |
| U-5 | Kịch bản | NFR-05: chỉ Định danh phát hành JWT; nhật ký không có số điện thoại đầy đủ | Bảo mật (C / Th) | Kiểm tra bảo mật (mục 6.10) |
| U-6 | Kịch bản | NFR-01: 100% thao tác rủi ro có xác nhận | Khả dụng (C / Th) | Kiểm tra khi lái (mục 6.7) |
| SP-1 | Điểm nhạy | Thời gian LLM sinh token đầu | Hiệu năng | Đo riêng (Bảng 6.4) |
| SP-2 | Điểm nhạy | Ngưỡng phát hiện kết thúc phát ngôn | Hiệu năng, khả dụng | Giữ mặc định nền tảng |
| TP-1 | Đánh đổi | Mọi lượt qua LLM (ADR-02) | Đúng chức năng ↔ hiệu năng | Bù bằng câu đệm |
| TP-2 | Đánh đổi | Thời gian chờ API (8–25 giây) | Phục hồi ↔ hiệu năng | Tránh báo lỗi giả khi mạng chậm |
| TP-3 | Đánh đổi | AI dự phòng (STT, LLM chờ tối đa 5 giây/lần thử) | Phục hồi ↔ chi phí, hiệu năng | Chấp nhận chi phí; đo RS-05 |
| TP-4 | Đánh đổi | API nghiệp vụ trên FaaS | Mở rộng ↔ khởi động nguội | Tải trước ngữ cảnh khi mở phiên |
| R-1 | Rủi ro | Token đầu của LLM vượt 2 giây | Hiệu năng | Đã xảy ra, đợt đo 05–06/09/2026 (mục 6.4) |
| R-2 | Rủi ro | Một khóa bí mật JWT dùng chung | Bảo mật | Khóa bất đối xứng (hướng phát triển) |
| R-3 | Rủi ro | Một nhà cung cấp truyền thông | Phục hồi | Ngoài phạm vi nguyên mẫu |
| R-4 | Rủi ro | Chỉ một vùng AWS | Phục hồi | Chấp nhận ở nguyên mẫu |
| NR-1 | Không rủi ro | Dữ liệu riêng; tác nhân chỉ gọi API | Phục hồi, bảo trì | Lỗi không lan (RS-01, RS-02, RS-04) |
| NR-2 | Không rủi ro | Tác nhân chỉ kết nối chiều ra | Bảo mật | Không nhận kết nối vào |

Rủi ro lớn nhất (R-1) nằm ở thành phần bên ngoài: thời gian sinh token đầu của LLM. Lớp trừu tượng nhà cung cấp (mục 5.3.4) cho phép thay LLM mà không ảnh hưởng dịch vụ khác, nhưng kiến trúc không rút ngắn được thời gian này. Chương 6 kiểm chứng U-1 đến U-6, SP-1, TP-2, TP-3, R-1 và NR-1; các mục còn lại (SP-2, TP-1, TP-4, R-2 đến R-4, NR-2) chưa được kiểm chứng riêng.

## Kết luận chương

Kiến trúc microservices được chọn dựa trên các yêu cầu phi chức năng; đánh giá ATAM cho thấy rủi ro lớn nhất (R-1) là thời gian sinh token đầu của LLM, nằm ngoài hệ thống. Chương 5 trình bày phần hiện thực.
