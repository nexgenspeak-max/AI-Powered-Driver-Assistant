# Chương 4. Thiết kế hệ thống

Chương này trình bày quyết định kiến trúc và thiết kế hệ thống dựa trên các yêu cầu ở Chương 3. Chương bắt đầu từ các động lực kiến trúc, lập luận lựa chọn kiến trúc microservices so với các phương án thay thế, sau đó mô tả kiến trúc tổng thể trên AWS, phân chia hệ thống thành các dịch vụ, luồng hoạt động chính của từng dịch vụ dưới dạng sequence diagram, thiết kế xử lý một lượt hội thoại và các cơ chế bảo đảm yêu cầu phi chức năng. Chi tiết hiện thực trình bày ở Chương 5.

## 4.1. Động lực kiến trúc

Động lực kiến trúc là tập yêu cầu và ràng buộc có ảnh hưởng quyết định đến cấu trúc hệ thống (Bass et al., 2021). Bảng 4.1 tổng hợp các động lực kiến trúc của hệ thống, rút ra từ Chương 3.

**Bảng 4.1.** Động lực kiến trúc

| Loại | Mã | Nội dung | Ảnh hưởng đến kiến trúc |
|---|---|---|---|
| Yêu cầu chức năng | FR-T, FR-C | Nghiệp vụ chuyến đi và liên lạc khách hàng thực hiện qua gọi công cụ, trên hai kênh WebRTC và SIP | Tách logic nghiệp vụ khỏi tác nhân để dùng chung cho mọi kênh |
| Yêu cầu phi chức năng | NFR-02 | P95 độ trễ phản hồi ≤ 2 giây | Tác nhân chạy dài hạn, duy trì kết nối âm thanh; tải trước ngữ cảnh |
| Yêu cầu phi chức năng | NFR-03 | Mở rộng theo số phiên đồng thời | Tác nhân và API mở rộng độc lập |
| Yêu cầu phi chức năng | NFR-04 | Phiên không bị kết thúc khi thành phần phụ trợ hoặc nhà cung cấp AI lỗi | Cô lập lỗi giữa các dịch vụ; dự phòng nhà cung cấp |
| Yêu cầu phi chức năng | NFR-05 | Định danh tập trung, bảo vệ bí mật và dữ liệu cá nhân | Một dịch vụ định danh riêng; quyền truy cập riêng từng dịch vụ |
| Yêu cầu phi chức năng | NFR-01 | Tập công cụ phù hợp từng loại phiên | Phân loại phiên trong tác nhân |
| Ràng buộc | CON-01 đến CON-04 | Tác nhân chỉ gọi API; mỗi dịch vụ sở hữu dữ liệu; JWT chỉ do Dịch vụ Định danh phát hành; nhật ký gắn mã phòng | Ranh giới dịch vụ bắt buộc |
| Ràng buộc môi trường | — | STT, LLM, TTS và truyền thông thời gian thực là dịch vụ bên ngoài (LiveKit Cloud, Twilio, OpenAI, Google); nhóm phát triển nhỏ; chi phí vận hành thấp | Ưu tiên dịch vụ đám mây được quản lý, tính phí theo mức sử dụng |

## 4.2. Quyết định kiến trúc

### 4.2.1. Lựa chọn kiểu kiến trúc (ADR-01)

**Bối cảnh.** Hệ thống gồm hai loại tải có đặc điểm khác nhau. Tác nhân hội thoại là tác vụ chạy dài hạn, giữ kết nối âm thanh liên tục trong suốt phiên, sử dụng các thư viện AI và âm thanh trong hệ sinh thái Python. Các API nghiệp vụ (chuyến đi, định danh, tin nhắn, nhật ký cuộc gọi) là giao dịch ngắn, phi trạng thái, được gọi bởi nhiều bên (ứng dụng tài xế, ứng dụng khách hàng, trang quản trị và tác nhân).

**Các phương án.** Bốn phương án được xem xét:

- **(A) Nguyên khối:** một tiến trình gồm cả API nghiệp vụ và tác nhân.
- **(B) Nguyên khối phân mô-đun:** một đơn vị triển khai, bên trong chia mô-đun.
- **(C) Microservices:** tác nhân và từng năng lực nghiệp vụ là dịch vụ triển khai độc lập.
- **(D) Thuần serverless:** mọi thành phần, kể cả tác nhân, chạy trên FaaS.

Bảng 4.2 đánh giá bốn phương án theo các yêu cầu phi chức năng.

**Bảng 4.2.** Đánh giá các phương án kiến trúc theo yêu cầu phi chức năng

| Yêu cầu | (A) Nguyên khối | (B) Nguyên khối phân mô-đun | (C) Microservices | (D) Thuần serverless |
|---|---|---|---|---|
| NFR-02 Performance | Đáp ứng một phần: tác nhân và API tranh chấp tài nguyên trong cùng tiến trình | Đáp ứng một phần: như (A) | Đáp ứng: tác nhân chạy riêng trên container, API chạy riêng | Không đáp ứng: FaaS giới hạn thời gian thực thi, khởi động nguội, không giữ được kết nối âm thanh dài |
| NFR-03 Scalability | Không đáp ứng: phải nhân bản toàn bộ ứng dụng | Không đáp ứng: như (A) | Đáp ứng: tăng số bản sao tác nhân độc lập; API tự mở rộng | Đáp ứng một phần: API tự mở rộng, tác nhân không chạy được |
| NFR-04 Resilience | Không đáp ứng: lỗi một mô-đun làm dừng cả tiến trình | Đáp ứng một phần: cô lập ở mức mã, không cô lập ở mức tiến trình | Đáp ứng: lỗi dịch vụ phụ trợ không lan sang luồng chính | Đáp ứng một phần |
| NFR-05 Security | Đáp ứng một phần: một tập quyền chung cho toàn bộ ứng dụng | Đáp ứng một phần | Đáp ứng: định danh tập trung, quyền riêng từng dịch vụ | Đáp ứng |
| Độ phức tạp vận hành | Thấp | Thấp | Cao | Trung bình |

**Quyết định.** Chọn phương án (C) microservices, trong đó các API nghiệp vụ triển khai trên FaaS (AWS Lambda) sau cổng API (Amazon API Gateway), tác nhân hội thoại triển khai trên container được quản lý (Amazon ECS trên AWS Fargate), mỗi dịch vụ sở hữu bảng dữ liệu riêng trên Amazon DynamoDB.

**Hệ quả và biện pháp giảm thiểu.** Microservices làm tăng độ phức tạp vận hành, thêm độ trễ mạng giữa các dịch vụ và gây khó khăn cho tính nhất quán dữ liệu (Soldani et al., 2018). Luận văn giảm thiểu các chi phí này bằng:

- **Độ phức tạp vận hành:** hạ tầng dạng mã cho từng dịch vụ (AWS SAM, AWS CloudFormation) và kịch bản triển khai tự động.
- **Độ trễ mạng:** tải trước ngữ cảnh phiên và dùng lại kết nối HTTP để giảm số lần gọi mạng trên luồng hội thoại.
- **Nhất quán dữ liệu:** chỉ một dịch vụ là nguồn dữ liệu chuẩn cho chuyến đi; tác nhân không lưu dữ liệu nghiệp vụ.
- **Khó giám sát xuyên dịch vụ:** mọi dòng nhật ký gắn mã phòng hội thoại để theo dõi một yêu cầu qua các dịch vụ.

### 4.2.2. Lựa chọn luồng xử lý lượt hội thoại (ADR-02)

**Bối cảnh.** Thời gian mô hình ngôn ngữ sinh token đầu tiên chiếm phần lớn độ trễ của một lượt (số liệu ở Chương 6). Nguyên mẫu từng thử nghiệm một nhánh xử lý rút gọn dựa trên nhận dạng ý định: với các câu quen thuộc, hệ thống gọi thẳng công cụ mà không qua mô hình ngôn ngữ.

**Các phương án và quyết định** được tóm tắt trong Bảng 4.3.

**Bảng 4.3.** Các phương án luồng xử lý lượt hội thoại

| Phương án | Ưu điểm | Nhược điểm | Kết luận |
|---|---|---|---|
| Mọi câu qua LLM, không có câu đệm | Một luồng xử lý duy nhất | Người dùng cảm nhận khoảng lặng khi thời gian sinh token đầu cao | Không chọn |
| Nhánh rút gọn theo ý định kết hợp LLM | Độ trễ thấp với câu quen thuộc (số liệu đợt đo 05–06/09/2026 ở Chương 6) | Dễ chọn sai công cụ với phát ngôn không rõ ý định; khó bảo trì tập mẫu | Không chọn; đã tắt trong mã nguồn |
| Mọi câu qua LLM kèm gọi công cụ; câu đệm sau khoảng 2 giây; tải trước ngữ cảnh | Một luồng thống nhất; không tạo phản hồi nghiệp vụ trước khi có kết quả thật; câu đệm báo hiệu hệ thống đang xử lý | Độ trễ thực của lượt vẫn phụ thuộc thời gian sinh token đầu | **Chọn** |

## 4.3. Kiến trúc tổng thể trên AWS

Hình 4.1 trình bày kiến trúc tổng thể của hệ thống theo quy ước sơ đồ kiến trúc AWS (in trên trang ngang). Năm lớp được xếp thành năm cột, đọc từ trái sang phải theo đường đi của một yêu cầu; các thành phần dùng chung cho mọi lớp nằm ở dải Cross-cutting Concerns phía dưới. Mỗi thành phần ghi tên chức năng (chữ đậm) và tên kỹ thuật (chữ nhỏ). Các luồng chính được đánh số ① đến ㉒, khớp Bảng 4.4 và các bước của sequence diagram ở mục 4.5; mũi tên nét đứt là luồng phụ trợ; hộp xám nét đứt là hệ thống bên ngoài AWS.

![Hình 4.1](diagrams/H4_1_aws_architecture.png)

**Hình 4.1.** Kiến trúc hệ thống trên nền tảng AWS theo mô hình microservices

Mỗi lớp dưới đây nêu vai trò, thành phần và dịch vụ AWS được dùng, kèm giải thích ngắn cho dịch vụ đó.

- **Lớp máy khách (Client Layer)** — nơi người dùng thao tác. Gồm ứng dụng tài xế, ứng dụng khách hàng, trang quản trị điều hành và trang giám sát hệ thống. Các trang web là tệp tĩnh (HTML, JavaScript) lưu trên Amazon S3, dịch vụ lưu trữ tệp của AWS, và được tải thẳng về trình duyệt.
- **Lớp truyền thông thời gian thực và hội thoại AI (Real-time Communication & Conversational AI Layer)** — nơi diễn ra cuộc nói chuyện. LiveKit Cloud truyền âm thanh giữa điện thoại tài xế và trợ lý (WebRTC), và quay số ra mạng điện thoại khi cần (SIP). Tác nhân hội thoại giọng nói nghe âm thanh, gọi các mô hình AI (STT, LLM, TTS; mỗi khâu có nhà cung cấp chính và dự phòng) và trả lời. Tác nhân chạy liên tục nên được đóng gói thành container và chạy trên Amazon ECS với AWS Fargate: ECS quản lý số bản sao đang chạy, còn Fargate cung cấp máy chủ, nhờ vậy nhóm phát triển không phải tự quản lý máy chủ.
- **Lớp cổng API (API Gateway Layer)** — cửa vào duy nhất của các dịch vụ nghiệp vụ. Amazon API Gateway nhận yêu cầu HTTPS từ ứng dụng hoặc từ tác nhân rồi chuyển tới đúng dịch vụ. Một cổng dạng WebSocket giữ kết nối mở với ứng dụng tài xế để máy chủ chủ động đẩy thông báo (ví dụ có chuyến mới).
- **Lớp microservices (Microservices Layer)** — nơi xử lý nghiệp vụ. Gồm năm dịch vụ: Định danh, Chuyến đi và Điều phối, Kênh liên lạc, Nhật ký cuộc gọi, Giám sát vận hành. Mỗi dịch vụ là một hàm AWS Lambda: đoạn mã chỉ chạy khi có yêu cầu, AWS tự tăng số bản chạy song song khi tải tăng và chỉ tính phí theo thời gian chạy thực tế.
- **Lớp dữ liệu (Data Layer)** — nơi lưu dữ liệu. Mỗi dịch vụ có bảng riêng trên Amazon DynamoDB, cơ sở dữ liệu NoSQL do AWS quản lý; dịch vụ khác muốn đọc phải gọi API của dịch vụ sở hữu, không đọc thẳng bảng. Danh sách bảng của từng dịch vụ ở Bảng 4.5. Riêng bộ nhớ đệm Redis (dịch vụ bên ngoài) lưu trạng thái phiên ngắn hạn của Dịch vụ Chuyến đi và Điều phối.
- **Các mối quan tâm xuyên suốt (Cross-cutting Concerns)** — các chức năng dùng chung cho mọi lớp: ghi nhật ký tập trung (Amazon CloudWatch Logs); phân quyền truy cập tài nguyên AWS cho từng dịch vụ (AWS IAM) và xác thực người dùng bằng JWT; hẹn giờ chạy báo cáo ngày (Amazon EventBridge Scheduler); mô tả hạ tầng bằng mã để triển khai tự động (AWS CloudFormation, AWS SAM).

Các **hệ thống bên ngoài** không chạy trên AWS: LiveKit Cloud, Twilio (kết nối mạng điện thoại công cộng và gửi SMS) và các nhà cung cấp mô hình AI nằm trong cột Real-time Communication & Conversational AI; dịch vụ bản đồ và bộ nhớ đệm Redis (cả hai được Dịch vụ Chuyến đi và Điều phối sử dụng) nằm trong khung External Systems. Trong cùng cột đó, Amazon ECS chạy tác vụ Fargate của tác nhân, còn Amazon ECR lưu image container mà ECS kéo về khi khởi chạy tác vụ (hai mũi tên nét đứt không đánh số). Amazon S3 lưu các trang web tĩnh (trang quản trị, trang giám sát) nên được đặt ở cột Data Layer.

**Ví dụ một yêu cầu đi qua các lớp.** Tài xế đang có một chuyến chờ xác nhận và nói "nhận chuyến này":

1. Âm thanh đi từ ứng dụng tài xế qua LiveKit Cloud tới tác nhân (luồng ⑤, ⑥).
2. Tác nhân chuyển âm thanh thành chữ; mô hình ngôn ngữ chọn công cụ nhận chuyến (⑦).
3. Tác nhân gọi API qua API Gateway tới Dịch vụ Chuyến đi và Điều phối (⑧); hàm Lambda của dịch vụ ghi trạng thái `confirmed` vào bảng `trips` trên DynamoDB (⑨).
4. Dịch vụ tra bảng `ws-connections` rồi đẩy thông báo `trip_confirmed` qua API Gateway WebSocket tới ứng dụng tài xế (⑩) và ứng dụng khách hàng, để cả hai màn hình cập nhật ngay.
5. Sau khi API trả về thành công, tác nhân mới đọc câu xác nhận cho tài xế. Mỗi bước đều ghi nhật ký lên CloudWatch Logs (⑱).

Bảng `ws-connections` cần thiết vì API Gateway WebSocket cấp cho mỗi ứng dụng đang kết nối một mã kết nối (connectionId), trong khi hàm Lambda không nhớ gì giữa các lần gọi. Khi ứng dụng kết nối, hàm Lambda lưu cặp mã kết nối và định danh người dùng (ví dụ `driver#<số điện thoại>`); khi cần đẩy thông báo, Dịch vụ Chuyến đi và Điều phối tra bảng này để biết gửi tới kết nối nào; khi ứng dụng ngắt kết nối, bản ghi bị xóa. Bảng này không chứa nội dung hội thoại; lời thoại giữa tài xế và trợ lý được lưu ở bảng `call-records` của Dịch vụ Nhật ký cuộc gọi.

Toàn bộ tài nguyên AWS nằm trong vùng ap-southeast-1 (Singapore). Lambda, API Gateway và DynamoDB là dịch vụ cấp vùng, không cần đặt trong mạng riêng ảo (VPC). Tác nhân hội thoại chạy trong subnet công khai của một VPC; nhóm bảo mật (security group) chỉ cho phép kết nối chiều ra, vì tác nhân chủ động kết nối tới LiveKit Cloud, các API nghiệp vụ và nhà cung cấp AI, không nhận kết nối từ ngoài vào. API Gateway không tự kiểm tra đăng nhập (không dùng authorizer); JWT được xác minh trong mã của từng dịch vụ bằng khóa bí mật dùng chung với Dịch vụ Định danh.

Bảng 4.4 mô tả các luồng được đánh số trên Hình 4.1.

**Bảng 4.4.** Các luồng chính trên Hình 4.1

| Số | Từ → Đến | Giao thức | Mục đích | Sequence |
|---|---|---|---|---|
| ① | Ứng dụng tài xế → API Gateway → Dịch vụ Định danh | HTTPS | Đăng nhập, làm mới token | S1 |
| ② | Dịch vụ Định danh → DynamoDB (accounts, driver-settings) | AWS SDK | Đọc tài khoản, lưu băm refresh token | S1 |
| ③ | Ứng dụng tài xế → API Gateway → Dịch vụ Chuyến đi và Điều phối | HTTPS | Xin token thoại, tra cứu chuyến | S2 |
| ④ | Dịch vụ Chuyến đi và Điều phối → LiveKit Cloud | HTTPS | Tạo phòng hội thoại, phân công tác nhân, quay số SIP | S2, S4, S5 |
| ⑤ | Ứng dụng tài xế ↔ LiveKit Cloud | WebRTC | Truyền âm thanh hai chiều | S2, S3 |
| ⑥ | LiveKit Cloud ↔ Tác nhân hội thoại | WebRTC / WebSocket | Giao việc cho tác nhân; truyền âm thanh | S2, S3 |
| ⑦ | Tác nhân hội thoại → Nhà cung cấp AI (chính, dự phòng) | HTTPS / gRPC | Nhận dạng giọng nói, sinh phản hồi, tổng hợp giọng nói | S3 |
| ⑧ | Tác nhân hội thoại → API Gateway → Dịch vụ Chuyến đi và Điều phối | HTTPS | Đăng ký phiên, tải ngữ cảnh, gọi công cụ nghiệp vụ | S2, S3, S4, S5 |
| ⑨ | Dịch vụ Chuyến đi và Điều phối → DynamoDB (trips, ws-connections) | AWS SDK | Đọc, ghi chuyến và kết nối WebSocket | S3, S4 |
| ⑩ | Dịch vụ Chuyến đi và Điều phối → API Gateway WebSocket → Ứng dụng tài xế (và ứng dụng khách hàng) | WSS | Thông báo đẩy khi chuyến thay đổi | S4 |
| ⑪ | LiveKit Cloud → Twilio (SIP trunk) → điện thoại | SIP / PSTN | Gọi điện mời tài xế nhận chuyến; gọi khách hàng | S4, S5 |
| ⑫ | Dịch vụ Chuyến đi và Điều phối → API Gateway → Dịch vụ Kênh liên lạc → Twilio | HTTPS | Gửi SMS | S5 |
| ⑬ | Twilio → API Gateway → Dịch vụ Kênh liên lạc | HTTPS (webhook) | Trạng thái cuộc gọi, tin nhắn đến | S5 |
| ⑭ | Tác nhân hội thoại → API Gateway → Dịch vụ Nhật ký cuộc gọi | HTTPS | Ghi bản ghi và tóm tắt hội thoại khi kết thúc phiên | S6 |
| ⑮ | Dịch vụ Chuyến đi và Điều phối → API Gateway → Dịch vụ Nhật ký cuộc gọi | HTTPS | Đọc tóm tắt cuộc gọi gần nhất | S6 |
| ⑯ | Dịch vụ Nhật ký cuộc gọi → DynamoDB (call-records) | AWS SDK | Lưu bản ghi cuộc gọi | S6 |
| ⑰ | Trang quản trị, trang giám sát → API Gateway → các dịch vụ | HTTPS | Quản trị chuyến; giám sát tình trạng, nhật ký | — |
| ⑱ | Mọi dịch vụ và tác nhân → CloudWatch Logs | AWS SDK | Ghi nhật ký gắn mã phòng | — |
| ⑲ | EventBridge Scheduler → Dịch vụ Giám sát vận hành | AWS (Lambda invoke) | Kích hoạt lập báo cáo ngày lúc 00:15 giờ Việt Nam | S7 |
| ⑳ | Dịch vụ Giám sát vận hành → API Gateway → Dịch vụ Nhật ký cuộc gọi | HTTPS | Đọc bản ghi hội thoại của một ngày | S7 |
| ㉑ | Dịch vụ Giám sát vận hành → DynamoDB (daily-reports) | AWS SDK | Lưu báo cáo ngày | S7 |
| ㉒ | Dịch vụ Kênh liên lạc → DynamoDB (channel-events) | AWS SDK | Lưu sự kiện Twilio và kết quả gửi SMS | S5 |

## 4.4. Phân chia hệ thống thành các dịch vụ

Bảng 4.5 mô tả năng lực nghiệp vụ, nhóm API, bảng dữ liệu sở hữu, nền tảng chạy và yêu cầu được đáp ứng của từng dịch vụ (cột Dịch vụ ghi tên rút gọn, bỏ chữ "Dịch vụ"). Dữ liệu nguồn của báo cáo ngày vẫn thuộc Dịch vụ Nhật ký cuộc gọi; Dịch vụ Giám sát vận hành chỉ lưu báo cáo đã tổng hợp. Ranh giới dịch vụ được xác định theo năng lực nghiệp vụ (Newman, 2021): mỗi dịch vụ sở hữu một năng lực và dữ liệu tương ứng, dịch vụ khác chỉ truy cập qua API.

**Bảng 4.5.** Phân chia dịch vụ

| Dịch vụ | Năng lực nghiệp vụ | Nhóm API | Dữ liệu sở hữu | Nền tảng | Yêu cầu |
|---|---|---|---|---|---|
| Định danh | Tài khoản, đăng nhập, cài đặt tài xế | auth, accounts, settings | accounts, driver-settings | Lambda | NFR-05; CON-03 |
| Chuyến đi và Điều phối | Chuyến đi, ngữ cảnh tài xế, phiên thoại, mời nhận chuyến, cuộc gọi, nhắc việc | trips, drivers, voice, calls, sms, reminders, customers, places | trips, ws-connections; bộ nhớ đệm Redis | Lambda; API Gateway WebSocket | FR-T, FR-C, FR-W, FR-I, FR-E; NFR-02, NFR-03 |
| Kênh liên lạc | SMS, sự kiện của nhà cung cấp thoại | sms, calls (webhook) | channel-events | Lambda | FR-C03; NFR-04 |
| Nhật ký cuộc gọi | Bản ghi hội thoại, tóm tắt, chỉ số phiên | records | call-records | Lambda | FR-C05, FR-O01; NFR-04 |
| Giám sát vận hành | Tình trạng dịch vụ, nhật ký, báo cáo ngày | status, logs, records, agent, reports | daily-reports (chỉ báo cáo đã tổng hợp) | Lambda; EventBridge Scheduler | FR-O01, FR-O02; CON-04 |
| Tác nhân hội thoại giọng nói | Hội thoại STT – LLM kèm gọi công cụ – TTS | Không có; nhận việc từ LiveKit | Không lưu bền vững (chỉ trạng thái phiên) | ECS Fargate | FR-T, FR-C, FR-F, FR-L; NFR-01 đến NFR-04; CON-01 |

## 4.5. Sequence diagram cho các luồng chính

Mục này mô tả luồng hoạt động chính của từng dịch vụ bằng sequence diagram. Mỗi bước ghi thành phần tham gia, thông điệp (phương thức và đường dẫn API) và tham số chính; các bước đã được đối chiếu với mã nguồn, bảng đối chiếu chi tiết (tệp và dòng mã) ở Phụ lục F. Số trong ngoặc tròn tương ứng với luồng trên Hình 4.1.

### 4.5.1. S1 — Đăng nhập (Dịch vụ Định danh)

![Hình 4.2](diagrams/H4_S1_identity_login.png)

**Hình 4.2.** Sequence S1: đăng nhập tài xế và phát hành JWT

**Bảng 4.6.** Các bước của sequence S1

| Bước | Từ → Đến | Thông điệp | Ghi chú |
|---|---|---|---|
| 1 ① | Ứng dụng tài xế → Cổng API REST | POST /api/v1/auth/login, thân gồm role = driver, phone, password | Thiếu trường bắt buộc: 400 |
| 2 ① | Cổng API REST → Dịch vụ Định danh | Chuyển tiếp yêu cầu | — |
| 3 ② | Dịch vụ Định danh → DynamoDB accounts | Tìm tài khoản theo số điện thoại và vai trò | — |
| 4 | DynamoDB accounts → Dịch vụ Định danh | Bản ghi tài khoản | — |
| 5 | Dịch vụ Định danh | So khớp mật khẩu với giá trị băm bcrypt | Sai thông tin: 401; tài khoản bị khóa: 403 |
| 6 | Dịch vụ Định danh | Ký access token và refresh token | Access token 15 phút, refresh token 30 ngày (mặc định) |
| 7 ② | Dịch vụ Định danh → DynamoDB accounts | Lưu giá trị băm và hạn của refresh token | Cho phép thu hồi token |
| 8 | Dịch vụ Định danh → Ứng dụng tài xế | 200: access_token, refresh_token | Ứng dụng lưu token cho các lời gọi sau |
| 9 ① | Ứng dụng tài xế → Cổng API REST | POST /api/v1/auth/refresh, thân gồm refresh_token | — |
| 10 | Cổng API REST → Ứng dụng tài xế | 200: cặp token mới | Token bị thu hồi hoặc hết hạn: 401 |

Các dịch vụ khác xác minh access token bằng khóa bí mật dùng chung, không gọi lại Dịch vụ Định danh cho mỗi yêu cầu.

### 4.5.2. S2 — Khởi tạo phiên trợ lý trong ứng dụng (Dịch vụ Chuyến đi và Điều phối)

![Hình 4.3](diagrams/H4_S2_voice_session.png)

**Hình 4.3.** Sequence S2: khởi tạo phiên trợ lý trong ứng dụng

**Bảng 4.7.** Các bước của sequence S2

| Bước | Từ → Đến | Thông điệp | Ghi chú |
|---|---|---|---|
| 1 ③ | Ứng dụng tài xế → Dịch vụ Chuyến đi và Điều phối | POST /api/v1/voice/token với tham số driver_phone, lang; tiêu đề Authorization mang JWT | JWT không hợp lệ: 401 |
| 2 | Dịch vụ Chuyến đi và Điều phối → Redis | Đọc phiên đang mở của tài xế | — |
| 3 | Redis → Dịch vụ Chuyến đi và Điều phối | Tên phòng đang mở, hoặc không có | Có phòng: kiểm tra tác nhân còn trong phòng |
| 4 ④ | Dịch vụ Chuyến đi và Điều phối → LiveKit Cloud | Chỉ khi chưa có phòng: tạo phòng driver-{số điện thoại}-{UUID} với metadata ngôn ngữ | Phòng còn nhưng mất tác nhân: phân công lại |
| 5 | Dịch vụ Chuyến đi và Điều phối | Ký token LiveKit (thời hạn 3600 giây) | — |
| 6 ④ | Dịch vụ Chuyến đi và Điều phối → LiveKit Cloud | Yêu cầu phân công tác nhân (agent dispatch) cho phòng | Lỗi phân công chỉ ghi nhật ký |
| 7 | Dịch vụ Chuyến đi và Điều phối → Ứng dụng tài xế | 200: token, room_name, livekit_url | — |
| 8 ⑤ | Ứng dụng tài xế → LiveKit Cloud | Tham gia phòng qua WebRTC | — |
| 9 ⑥ | LiveKit Cloud → Tác nhân hội thoại | Giao việc cho một bản sao tác nhân đang rảnh | Tác nhân phân loại phiên theo tên phòng và metadata |
| 10 ⑧ | Tác nhân hội thoại → Dịch vụ Chuyến đi và Điều phối | PUT /api/v1/drivers/me/session, thân room_name | Chạy song song; lỗi chỉ ghi nhật ký |
| 11 ⑤ | Tác nhân hội thoại → Ứng dụng tài xế | Phát lời chào ngắn cố định | Không chờ tải xong ngữ cảnh |
| 12 ⑧ | Tác nhân hội thoại → Dịch vụ Chuyến đi và Điều phối | GET /api/v1/drivers/me/context | — |
| 13 | Dịch vụ Chuyến đi và Điều phối → Tác nhân hội thoại | Ngữ cảnh: chuyến, thu nhập, cài đặt | Lưu vào trạng thái phiên |
| 14 ⑤ | Tác nhân hội thoại → Ứng dụng tài xế | Hỏi tài xế cần hỗ trợ gì | Sẵn sàng nhận phát ngôn |

### 4.5.3. S3 — Xử lý một lượt hội thoại (Tác nhân hội thoại giọng nói)

![Hình 4.4](diagrams/H4_S3_voice_turn.png)

**Hình 4.4.** Sequence S3: xử lý một lượt hội thoại có gọi công cụ, câu đệm và dự phòng nhà cung cấp

**Bảng 4.8.** Các bước của sequence S3 (ví dụ tài xế yêu cầu cập nhật trạng thái đã đón khách)

| Bước | Từ → Đến | Thông điệp | Ghi chú |
|---|---|---|---|
| 1 ⑤⑥ | Ứng dụng tài xế → Tác nhân hội thoại | Luồng âm thanh phát ngôn của tài xế | — |
| 2 ⑦ | Tác nhân hội thoại → Nhà cung cấp STT | Nhận dạng giọng nói; phát hiện kết thúc phát ngôn | Nhà cung cấp chính lỗi hoặc quá 5 giây: chuyển sang nhà cung cấp dự phòng |
| 3 | Tác nhân hội thoại | Bắt đầu đếm thời gian cho câu đệm | — |
| 4 ⑦ | Tác nhân hội thoại → Nhà cung cấp LLM | Gửi lịch sử hội thoại, lời nhắc hệ thống và lược đồ công cụ của loại phiên | Cơ chế dự phòng như bước 2 |
| 5 | Tác nhân hội thoại → Ứng dụng tài xế | Tùy chọn: sau 2 giây chưa có âm thanh trả lời thì phát câu đệm một lần | Hủy nếu câu trả lời thật đã bắt đầu |
| 6 | Nhà cung cấp LLM → Tác nhân hội thoại | Yêu cầu gọi công cụ update_trip_status với tham số trạng thái | — |
| 7 ⑧ | Tác nhân hội thoại → Dịch vụ Chuyến đi và Điều phối | PATCH /api/v1/trips/{tripId}, thân status; thời gian chờ 8 giây | API lỗi: tác nhân thông báo không cập nhật được, phiên tiếp tục |
| 8 ⑨ | Dịch vụ Chuyến đi và Điều phối → DynamoDB trips | Ghi trạng thái mới | Trước khi ghi: kiểm tra trạng thái hợp lệ và tài xế cách điểm đón không quá 1 000 m (mặc định); sai: 409 |
| 9 | Dịch vụ Chuyến đi và Điều phối → Tác nhân hội thoại | 200: chuyến sau cập nhật | — |
| 10 ⑦ | Tác nhân hội thoại → Nhà cung cấp LLM, TTS | Sinh câu xác nhận ngắn và tổng hợp giọng nói | Chỉ xác nhận sau khi API thành công |
| 11 ⑤ | Tác nhân hội thoại → Ứng dụng tài xế | Phát âm thanh trả lời | Độ trễ phản hồi đo từ bước 2 đến bước này |

### 4.5.4. S4 — Mời nhận chuyến qua cuộc gọi điện thoại (Dịch vụ Chuyến đi và Điều phối)

![Hình 4.5](diagrams/H4_S4_trip_offer.png)

**Hình 4.5.** Sequence S4: mời tài xế nhận chuyến qua cuộc gọi điện thoại

**Bảng 4.9.** Các bước của sequence S4

| Bước | Từ → Đến | Thông điệp | Ghi chú |
|---|---|---|---|
| 1 ⑰ | Trang quản trị điều hành → Dịch vụ Chuyến đi và Điều phối | POST /api/v1/trips/{tripId}/dispatch | Trạng thái chuyến không hợp lệ: 409; thiếu số tài xế: 400 |
| 2 ④ | Dịch vụ Chuyến đi và Điều phối → LiveKit Cloud | Tạo phòng driver-{số}-{thời điểm} với metadata chuyến và sip_identity | — |
| 3 ④ | Dịch vụ Chuyến đi và Điều phối → LiveKit Cloud | Phân công tác nhân cho phòng | Lỗi phân công không làm dừng luồng |
| 4 ④ | Dịch vụ Chuyến đi và Điều phối → LiveKit Cloud | Tạo người tham gia SIP | Chỉ khi đã cấu hình SIP trunk |
| 5 ⑪ | LiveKit Cloud → Twilio | SIP INVITE tới điện thoại tài xế | Chỉ khi đã cấu hình SIP trunk |
| 6 ⑩ | Dịch vụ Chuyến đi và Điều phối → Ứng dụng tài xế (WebSocket) | Trạng thái calling, thông báo đẩy | — |
| 7 | Tác nhân hội thoại → điện thoại tài xế (qua Twilio) | Sau khi tài xế nhấc máy: đọc điểm đón, hỏi có nhận chuyến không | Phiên chỉ có confirm_trip, reject_trip |
| 8 ⑧ | Tác nhân hội thoại → Dịch vụ Chuyến đi và Điều phối | PATCH /api/v1/trips/{tripId}, status = confirmed hoặc rejected | Không nghe rõ: hỏi lại |
| 9 ⑩ | Dịch vụ Chuyến đi và Điều phối → Ứng dụng tài xế (WebSocket) | Thông báo trạng thái mới | — |

Khi tài xế đang có phiên trợ lý mở trong ứng dụng, chuyến mới được thông báo vào phòng hiện có thay vì tạo cuộc gọi điện thoại; nếu không có phiên, thông báo được lưu tạm và phát khi tài xế mở trợ lý lần sau.

### 4.5.5. S5 — Gọi khách hàng và gửi tin nhắn (Dịch vụ Chuyến đi và Điều phối, Dịch vụ Kênh liên lạc)

![Hình 4.6](diagrams/H4_S5_customer_call.png)

**Hình 4.6.** Sequence S5: gọi khách hàng theo ba chế độ và gửi tin nhắn SMS

**Bảng 4.10.** Các bước của sequence S5

| Bước | Từ → Đến | Thông điệp | Ghi chú |
|---|---|---|---|
| 1 ⑧ | Tác nhân hội thoại → Dịch vụ Chuyến đi và Điều phối | POST /api/v1/calls/start, thân gồm driverId, tripId, mode, roomName, lang; thời gian chờ 25 giây | Số ngoài chuyến: xác nhận trước; chuyến không có số khách: 400 |
| 2 ④ | Dịch vụ Chuyến đi và Điều phối → LiveKit Cloud | Chế độ agent, bridge: tạo người tham gia SIP trong chính phòng của tài xế | Tài xế nghe được cuộc gọi |
| 3 ④ | Dịch vụ Chuyến đi và Điều phối → LiveKit Cloud | Chế độ background: tạo phòng riêng custcall-…, quay số SIP, phân công tác nhân riêng | Không chiếm kênh âm thanh của tài xế |
| 4 ⑪ | LiveKit Cloud → Twilio | Quay số SIP tới điện thoại khách | — |
| 5 | Dịch vụ Chuyến đi và Điều phối → Tác nhân hội thoại | 200: call_id, trạng thái, chế độ | — |
| 6 ⑧ | Tác nhân hội thoại → Dịch vụ Chuyến đi và Điều phối | POST /api/v1/calls/complete (kết thúc cuộc gọi nền) | Tóm tắt gửi về phòng của tài xế |
| 7 ⑧ | Tác nhân hội thoại → Dịch vụ Chuyến đi và Điều phối | POST /api/v1/sms/send | Lỗi gửi: tác nhân thông báo thất bại (Bảng 5.3) |
| 8 ⑫ | Dịch vụ Chuyến đi và Điều phối → Dịch vụ Kênh liên lạc | POST /api/v1/sms/send | — |
| 9 ⑫ | Dịch vụ Kênh liên lạc → Twilio | Gửi SMS | — |
| 10 ⑬ | Twilio → Dịch vụ Kênh liên lạc | Webhook trạng thái | — |
| 11 ㉒ | Dịch vụ Kênh liên lạc → DynamoDB channel-events | Lưu sự kiện webhook và kết quả gửi SMS | Lỗi lưu chỉ ghi nhật ký, không làm hỏng webhook |

### 4.5.6. S6 — Ghi nhật ký và tóm tắt cuộc gọi (Dịch vụ Nhật ký cuộc gọi)

![Hình 4.7](diagrams/H4_S6_call_records.png)

**Hình 4.7.** Sequence S6: lưu bản ghi hội thoại và tra cứu tóm tắt cuộc gọi

**Bảng 4.11.** Các bước của sequence S6

| Bước | Từ → Đến | Thông điệp | Ghi chú |
|---|---|---|---|
| 1 | Tác nhân hội thoại | Khi phiên kết thúc: tổng hợp bản ghi hội thoại và tóm tắt | — |
| 2 ⑭ | Tác nhân hội thoại → Dịch vụ Nhật ký cuộc gọi | POST /api/v1/records; thời gian chờ 10 giây, thử lại có giới hạn | Dịch vụ lỗi hoặc chưa cấu hình: bản ghi ghi vào nhật ký tác nhân, phiên không bị ảnh hưởng |
| 3 ⑯ | Dịch vụ Nhật ký cuộc gọi → DynamoDB call-records | Lưu bản ghi | — |
| 4 | Dịch vụ Nhật ký cuộc gọi → Tác nhân hội thoại | 201 | — |
| 5 ⑧ | Tác nhân hội thoại → Dịch vụ Chuyến đi và Điều phối | Khi tài xế hỏi tóm tắt: GET /api/v1/calls/latest | — |
| 6 ⑮ | Dịch vụ Chuyến đi và Điều phối → Dịch vụ Nhật ký cuộc gọi | GET /api/v1/records?caller={số tài xế}&limit=1 | — |
| 7 | Dịch vụ Nhật ký cuộc gọi → Dịch vụ Chuyến đi và Điều phối | Bản ghi gần nhất | Chưa có bản ghi: thông báo chưa có |
| 8 | Dịch vụ Chuyến đi và Điều phối → Tác nhân hội thoại | Tóm tắt cuộc gọi | Tác nhân đọc tóm tắt ngắn cho tài xế |

### 4.5.7. S7 — Lập báo cáo vận hành ngày (Dịch vụ Giám sát vận hành)

![Hình 4.8](diagrams/H4_S7_daily_report.png)

**Hình 4.8.** Sequence S7: lập báo cáo vận hành ngày từ bản ghi hội thoại và chỉ số phiên

**Bảng 4.12.** Các bước của sequence S7

| Bước | Từ → Đến | Thông điệp | Ghi chú |
|---|---|---|---|
| 1 ⑲ | EventBridge Scheduler → Dịch vụ Giám sát vận hành | Sự kiện theo lịch lúc 00:15 giờ Việt Nam (source = ops.schedule) | Người vận hành cũng có thể gọi POST /api/v1/reports/daily/{date}/rebuild |
| 2 ⑳ | Dịch vụ Giám sát vận hành → Dịch vụ Nhật ký cuộc gọi | GET /api/v1/records?date={ngày}&limit=500, lặp theo con trỏ phân trang | Dùng chỉ mục record_date-started_at-index |
| 3 | Dịch vụ Nhật ký cuộc gọi → Dịch vụ Giám sát vận hành | Bản ghi: lời thoại, loại phiên, chỉ số phiên | — |
| 4 | Dịch vụ Giám sát vận hành | Tổng hợp: số phiên, số tài xế, độ trễ trung bình/P50/P95, tỷ lệ công cụ thành công, tỷ lệ API lỗi, lỗi theo loại | Phiên không có chỉ số chỉ tính vào phần hoạt động |
| 5 | Dịch vụ Giám sát vận hành → Mô hình chấm (LLM) | Chấm một mẫu cố định theo ngày các cặp (câu tài xế, câu trả lời) | Chỉ khi có khóa API; không có thì ghi chú trong báo cáo |
| 6 | Mô hình chấm → Dịch vụ Giám sát vận hành | Kết quả: correct, incorrect hoặc unclear | — |
| 7 ㉑ | Dịch vụ Giám sát vận hành → DynamoDB daily-reports | Lưu báo cáo theo khóa report_date | Lập lại thì ghi đè |
| 8 | Trang giám sát hệ thống → Dịch vụ Giám sát vận hành | GET /api/v1/reports/daily?date= hoặc ?from=&to= | Chỉ tài khoản quản trị hệ thống |
| 9 | Dịch vụ Giám sát vận hành → Trang giám sát hệ thống | Báo cáo ngày và xu hướng 7 ngày | Hình 5.6 |

## 4.6. Thiết kế xử lý một lượt hội thoại

### 4.6.1. Chuỗi xử lý và câu đệm

Mỗi phát ngôn của tài xế đi qua cùng một chuỗi xử lý: STT, LLM kèm gọi công cụ và TTS (Hình 4.9). Khi phản hồi chưa bắt đầu phát sau 2 giây kể từ lúc tài xế kết thúc phát ngôn, tác nhân phát một câu đệm ngắn như "Đợi mình một chút". Câu đệm không chứa dữ liệu nghiệp vụ và bị hủy nếu câu trả lời thật đã bắt đầu. Tác nhân tải trước ngữ cảnh phiên và khởi động trước các thành phần (gói ngôn ngữ, mô hình phát hiện giọng nói) khi tiến trình khởi động để giảm độ trễ của lượt đầu tiên.

![Hình 4.9](diagrams/H4_2_turn_pipeline.png)

**Hình 4.9.** Chuỗi xử lý một lượt hội thoại: STT, LLM kèm gọi công cụ, TTS, câu đệm và dự phòng nhà cung cấp

### 4.6.2. Trạng thái phiên hội thoại

Trạng thái phiên (session state) là dữ liệu tác nhân giữ trong bộ nhớ của mình suốt một phiên hội thoại và bị xóa khi phiên kết thúc; dữ liệu gốc vẫn nằm ở các dịch vụ nghiệp vụ. Sau bước tải trước, trạng thái phiên gồm các nhóm thông tin trong Bảng 4.13. Khi trả lời, công cụ đọc dữ liệu trong trạng thái phiên trước; nếu thiếu thì gọi API để làm mới. Tác nhân không được tự tạo dữ liệu nghiệp vụ không có trong trạng thái phiên hoặc trong kết quả API.

**Bảng 4.13.** Nội dung trạng thái phiên hội thoại

| Nhóm | Nội dung | Mục đích |
|---|---|---|
| Hồ sơ và cài đặt | Chế độ gọi khách mặc định, tùy chọn kích hoạt | Chọn chế độ gọi; cá nhân hóa |
| Chuyến đi | Chuyến sắp tới, chuyến hiện tại, lịch sử gần | Trả lời câu hỏi về chuyến; cập nhật tiến độ |
| Thu nhập | Thu nhập trong ngày, tóm tắt theo kỳ | Trả lời câu hỏi thu nhập |
| Cuộc gọi | Trạng thái đang gọi, cuộc gọi gần nhất | Tránh mở cuộc gọi chồng; tóm tắt cuộc gọi |
| Hành động chờ xác nhận | Hủy chuyến đang chờ xác nhận; số điện thoại chờ xác nhận; hành động tác nhân vừa đề xuất | Thực hiện xác nhận hai bước |

### 4.6.3. Phân loại phiên và tập công cụ

Tác nhân xác định loại phiên từ tên phòng và metadata, mỗi loại phiên có tập công cụ riêng (Bảng 4.14). Thiết kế này hiện thực FR-L03 và giảm rủi ro chọn nhầm công cụ, chẳng hạn trong phiên mời nhận chuyến qua điện thoại, tác nhân không có công cụ hủy chuyến đang chạy.

**Bảng 4.14.** Loại phiên và tập công cụ

| Loại phiên | Nhận biết | Tập công cụ |
|---|---|---|
| Tài xế trong ứng dụng | Phòng driver-… không có metadata chuyến | 39 công cụ của tài xế |
| Mời nhận chuyến | Phòng driver-… có metadata chuyến và sip_identity | confirm_trip, reject_trip |
| Gọi khách nền | Phòng custcall-… | Tác nhân riêng trao đổi với khách hàng |
| Khách hàng | Phòng customer-… | 7 công cụ của khách hàng |

Với ba chế độ gọi khách (Bảng 3.2): ở chế độ tác nhân gọi thay, khách được kết nối vào phòng của tài xế và tác nhân trao đổi với khách; ở chế độ nói trực tiếp, tác nhân ngừng phát âm cho tới khi tài xế nói cụm từ kết thúc; ở chế độ gọi nền, cuộc gọi diễn ra trong phòng riêng và tóm tắt được gửi về phòng của tài xế khi kết thúc (sequence S5).

## 4.7. Thiết kế cho khả năng phục hồi, bảo mật và khả năng quan sát

Bảng 4.15 tổng hợp các cơ chế thiết kế đáp ứng NFR-04, NFR-05, ràng buộc CON-04 và yêu cầu FR-O01.

**Bảng 4.15.** Cơ chế thiết kế cho khả năng phục hồi, bảo mật và khả năng quan sát

| Cơ chế | Mô tả | Yêu cầu |
|---|---|---|
| Thời gian chờ khi gọi API | Mọi lời gọi HTTP của tác nhân có thời gian chờ (8 giây với API chuyến, 25 giây với khởi tạo cuộc gọi); lỗi được chuyển thành câu thông báo ngắn | NFR-04 |
| Dự phòng nhà cung cấp AI | STT, LLM, TTS được cấu hình dưới dạng chuỗi nhà cung cấp chính và dự phòng; nhà cung cấp chính lỗi hoặc quá thời gian chờ thì chuyển sang dự phòng; sự kiện chuyển đổi được ghi nhật ký | NFR-04 |
| Cô lập dịch vụ phụ trợ | Lỗi ghi bản ghi cuộc gọi, lỗi gửi tin nhắn hoặc lỗi phân công tác nhân không làm dừng luồng hội thoại chính | NFR-04 |
| Tự khôi phục bản sao tác nhân | ECS duy trì số bản sao mong muốn, tự thay thế tác vụ bị dừng; phòng còn nhưng mất tác nhân thì được phân công lại khi tài xế kết nối | NFR-04 |
| Xử lý im lặng | Sau khoảng 15 giây im lặng, tác nhân hỏi tài xế còn đó không; tối đa hai lần rồi kết thúc lịch sự để giải phóng phiên | FR-L02, NFR-04 |
| Định danh tập trung | Chỉ Dịch vụ Định danh phát hành JWT; các dịch vụ xác minh bằng khóa bí mật dùng chung; tác nhân dùng token dịch vụ riêng | NFR-05, CON-03 |
| Bảo vệ bí mật | Tham số bí mật trong hạ tầng dạng mã được đánh dấu ẩn, không ghi vào mã nguồn; vai trò IAM riêng từng dịch vụ | NFR-05 |
| Nhật ký gắn mã phòng | Mọi dòng nhật ký gắn mã phòng và mã hội thoại để theo dõi một yêu cầu xuyên qua các dịch vụ; mức độ che dữ liệu cá nhân trong nhật ký được kiểm tra ở Chương 6 | CON-04, NFR-05 |
| Chỉ số phiên và báo cáo ngày | Tác nhân gửi chỉ số chất lượng của phiên kèm bản ghi hội thoại; Dịch vụ Giám sát vận hành tổng hợp theo ngày để phát hiện suy giảm độ trễ, lỗi và tỷ lệ trả lời đúng | NFR-04, FR-O01 |

## 4.8. Thiết kế trải nghiệm trên ứng dụng tài xế

Ở mức thiết kế, ứng dụng tài xế cần:

- Nút mở trợ lý dễ thấy, thể hiện rõ trạng thái đang kết nối, đang nghe, đang xử lý và đang nói.
- Lời thoại hiển thị đồng bộ với lời nói để tài xế xem lại khi dừng xe.
- Từ khóa đánh thức chỉ để mở phiên, không thay thế khâu hiểu ngôn ngữ của tác nhân.
- Cài đặt chế độ gọi khách mặc định để trợ lý không phải hỏi lại mỗi lần khi đang lái.

Các thiết kế này phục vụ NFR-01.

## 4.9. Đối chiếu yêu cầu với thiết kế

Bảng 4.16 liên kết từng yêu cầu phi chức năng (và yêu cầu giám sát vận hành) với quyết định thiết kế và vị trí trên Hình 4.1, làm căn cứ cho các kịch bản đánh giá ở Chương 6.

**Bảng 4.16.** Đối chiếu yêu cầu phi chức năng với thiết kế

| Yêu cầu | Quyết định thiết kế | Thành phần / luồng trên Hình 4.1 | Kịch bản đánh giá |
|---|---|---|---|
| NFR-01 Usability | Phân loại phiên; xác nhận hai bước; phản hồi ngắn | Tác nhân hội thoại | Danh mục kiểm tra hành vi khi lái |
| NFR-02 Performance | ADR-02; tải trước ngữ cảnh; tác nhân chạy dài hạn trên Fargate | Luồng ⑤⑥⑦⑧ | Đo P50, P95 độ trễ phản hồi |
| NFR-03 Scalability | ADR-01; nhân bản tác nhân; Lambda và DynamoDB tự mở rộng | Tác nhân hội thoại (ECS), các Lambda | SC-01 đến SC-03 |
| NFR-04 Resilience | Cô lập dịch vụ; dự phòng nhà cung cấp; thời gian chờ; tự khôi phục | Luồng ⑦⑧⑭ | RS-01 đến RS-05 |
| NFR-05 Security | Định danh tập trung; bí mật ẩn; IAM riêng | Luồng ①②; Cross-cutting | Danh mục kiểm tra bảo mật |
| FR-O01, FR-O02 | Báo cáo ngày do Dịch vụ Giám sát vận hành sở hữu; lịch chạy EventBridge | Luồng ⑲⑳㉑ | UC11 |

## Kết luận chương

Chương 4 đã lập luận lựa chọn kiến trúc microservices từ các yêu cầu phi chức năng, trình bày kiến trúc tổng thể trên AWS với các luồng được đánh số, phân chia hệ thống thành các dịch vụ theo năng lực nghiệp vụ, mô tả luồng hoạt động chính của từng dịch vụ bằng bảy sequence diagram, thiết kế xử lý một lượt hội thoại và các cơ chế bảo đảm khả năng phục hồi, bảo mật và khả năng quan sát. Chương 5 trình bày hiện thực các thiết kế này.
