# Kế hoạch sửa luận văn: Yêu cầu → Yêu cầu phi chức năng → Kiến trúc microservices → Thiết kế trên AWS → Đánh giá

- **Ngày lập:** 2026-09-27 · **Phiên bản:** v4 (thêm bảng tên tiếng Việt cho thành phần — mục 8.4; cơ chế dự phòng nhà cung cấp AI; phân vai: agent sửa tài liệu, AI khác sửa mã — mục 16)
- **Đối tượng sửa:** `docs/thesis/LUAN_VAN_THAC_SI_FINAL.docx` (build ngày 24/9). Nguồn sửa là `docs/thesis/Chuong*_DRAFT.md` và `build_thesis_final.py`.
- **Căn cứ:** comment của GVHD (Duc M.L, Google Doc ngày 10/9); yêu cầu của học viên; hiện trạng `infra/*` (SAM/CloudFormation) và route thật của các service trong `src/backend/*`.
- **Trạng thái:** CHỜ REVIEW. Chưa sửa nội dung luận văn.

## Thay đổi so với v1 (sau review lần 1)

| # | Thay đổi | Lý do |
|---|---|---|
| 1 | **Chốt Hình 4.1 là sơ đồ kiến trúc AWS** (AWS Architecture Diagram, dùng bộ icon chính thức), không còn phương án "sơ đồ logic" | Học viên yêu cầu hình bám theo AWS architecture |
| 2 | Bổ sung chi tiết AWS đã kiểm trong `infra/`: Region `ap-southeast-1`; Lambda **không** nằm trong VPC; ECS Fargate chạy trong public subnet của VPC; API Gateway **không** có authorizer (JWT được xác minh trong mã của từng Lambda) | Để hình không vẽ sai hoặc vẽ thừa |
| 3 | Thêm **mục 3: Củng cố cơ sở khoa học** (Chương 1–2 và tài liệu tham khảo) | TLTK hiện chỉ có 8 nguồn, **không có nguồn nào về kiến trúc phần mềm, mô hình chất lượng hay microservices**, trong khi Chương 3–4 lập luận dựa trên các khái niệm này |
| 4 | Mở rộng **mục 8: Chuẩn hóa thuật ngữ** thành bảng đầy đủ, có số lần xuất hiện đo trên bản FINAL | Học viên nhận xét câu chữ chưa chuẩn chuyên ngành CNTT |
| 5 | Câu hỏi nghiên cứu (RQ) được nối với NFR, trong đó RQ1 được đánh giá bằng thực nghiệm Scalability và Resilience | Để "thiết kế" cũng có bằng chứng đo, không chỉ minh họa |
| 6 | Chính văn bản kế hoạch dùng thuật ngữ chuẩn (bỏ "scale", "tự scale"… dùng "mở rộng theo chiều ngang", "tự động mở rộng") | Nhất quán với quy tắc ở mục 8 |

---

## 0. Hiện trạng và các lỗ hổng đã kiểm

| # | Vấn đề | Bằng chứng trong bản FINAL hoặc mã nguồn |
|---|---|---|
| 1 | NFR trộn thuộc tính chất lượng với tính chất kiến trúc | Bảng 3.9 có khoảng 13 mã; nhóm "Độc lập & biên rõ" là tính chất của microservices, không phải thuộc tính chất lượng |
| 2 | Chương 4 không mở đầu bằng lập luận "NFR dẫn đến lựa chọn microservices" | §4.1 là "Nguyên tắc thiết kế (nói bằng việc cần đạt)" |
| 3 | **Chương 6 không đánh giá Scalability và Resilience** dù Chương 3 có khai báo | Đúng câu GVHD hỏi: "NFR nào triển khai thì đánh giá đúng yêu cầu đó" |
| 4 | Số liệu độ trễ là đợt A/B cũ, khi còn nhánh rút gọn theo ý định | Bảng 6.3 và Hình 6.1 không phản ánh thiết kế hiện hành |
| 5 | Sót nội dung giao hàng | "đang giao" ở §3.1; mã FR-**D**02/D03; câu "công cụ liên quan đơn giao hàng lịch sử" ở §3.4; ảnh `giaohang*.jpg`, `chupanhdonhang*.jpg` trong `thesis_screenshots/` |
| 6 | Cơ sở lý thuyết thiếu mảng kỹ nghệ phần mềm | Chương 2 chỉ có STT/LLM/TTS, gọi công cụ, WebRTC/SIP, an toàn lái xe, chỉ số đo; TLTK 8 nguồn, không có ISO/IEC 25010, microservices, serverless, kịch bản thuộc tính chất lượng |
| 7 | Văn phong khẩu ngữ, thuật ngữ không chuẩn | Xem bảng đo ở mục 8.1 (ví dụ "bịa" 31 lần, "đường tắt" 39 lần, "bot" 36 lần) |
| 8 | Tiêu đề dạng câu hỏi hoặc khẩu ngữ | 8 tiêu đề, liệt kê ở mục 8.2 |
| 9 | Đánh số không chuẩn | 4.2b, Bảng 4.2a, 4.2b, 4.4b, 4.5a, 4.5b, 5.1b, 5.1c; dấu `---` trong thân bài |
| 10 | Hình 4.1 không khớp hạ tầng thật | Layer đặt tên tự do; không có API Gateway, Lambda, DynamoDB, ECS; caption đặt trên hình; chữ nhỏ |
| 11 | Chưa có sequence diagram cho từng service, chưa đối chiếu với mã nguồn | Comment GVHD ở §4.2b |
| 12 | Hạ tầng lệch tên | Logical ID trong SAM còn tên cũ (`TripServiceFunction`, `CallLoggerApi`, `CallCenterApi`); ops-service chưa có stack AWS |

---

## 1. Mạch lập luận xuyên suốt

```
Bối cảnh và khoảng trống (Ch.1–2)
  → Câu hỏi nghiên cứu RQ1–RQ4 (Ch.1)
  → Cơ sở lý thuyết: trợ lý giọng nói + mô hình chất lượng + microservices + điện toán đám mây (Ch.2)
  → Yêu cầu chức năng FR, yêu cầu phi chức năng NFR theo ISO/IEC 25010 (Ch.3)
  → Ánh xạ NFR sang tính chất microservices (Ch.3, cuối chương)
  → Quyết định kiến trúc (ADR): chọn microservices theo NFR (Ch.4)
  → Hình 4.1 kiến trúc AWS + sequence diagram từng service (Ch.4)
  → Hiện thực và cấu hình triển khai trên AWS (Ch.5)
  → Đánh giá từng FR/NFR: kịch bản, chỉ số, ngưỡng, kết quả (Ch.6)
  → Kết luận: trả lời RQ, yêu cầu nào đạt/chưa đạt, hạn chế
```

**Ma trận truy vết yêu cầu (Requirements Traceability Matrix, Phụ lục E, mới):**

| Mã yêu cầu | RQ liên quan | Service phụ trách | Sequence (S1–S6) | Tệp mã nguồn | Kịch bản Ch.6 | Kết quả |
|---|---|---|---|---|---|---|

Mọi mã FR và NFR bắt buộc có một dòng; có script kiểm tự động (mục 9).

---

## 2. Chương 1: Nối câu hỏi nghiên cứu với yêu cầu

| RQ | Nội dung (đề xuất hiệu chỉnh) | NFR/FR được đánh giá |
|---|---|---|
| RQ1 | Kiến trúc microservices triển khai trên AWS có đáp ứng yêu cầu mở rộng và khả năng chịu lỗi của một trợ lý giọng nói thời gian thực không? | NFR-03 Scalability, NFR-04 Resilience |
| RQ2 | Độ trễ phản hồi đầu cuối có đạt P95 ≤ 2 giây trên các nghiệp vụ cốt lõi không? | NFR-02 Performance |
| RQ3 | Tỷ lệ lỗi từ (WER) thay đổi thế nào giữa điều kiện yên tĩnh và nhiễu khoang xe mô phỏng? | NFR-01 Usability (gián tiếp), FR |
| RQ4 | Tỷ lệ chọn đúng công cụ và hoàn thành nghiệp vụ đạt bao nhiêu? | FR-T, FR-C, FR-W/I/E/F/L; NFR-01 |

Hiện tại RQ1 "được trả lời chủ yếu qua thiết kế và hiện thực", tức là không có số đo. Sửa như trên để RQ1 có bằng chứng thực nghiệm ở Chương 6. Cập nhật tương ứng ở §1.3, §1.4, §1.6 và phần Kết luận.

---

## 3. Củng cố cơ sở khoa học (Chương 2 và tài liệu tham khảo)

### 3.1 Bổ sung mục lý thuyết vào Chương 2

| Mục mới | Nội dung | Được dùng ở |
|---|---|---|
| 2.x Yêu cầu phi chức năng và mô hình chất lượng phần mềm | Mô hình chất lượng sản phẩm ISO/IEC 25010; kịch bản thuộc tính chất lượng (quality attribute scenario: nguồn kích thích, kích thích, môi trường, thành phần, phản ứng, thước đo phản ứng) | Bảng NFR Ch.3 |
| 2.x Kiến trúc microservices | Định nghĩa; các tính chất cơ bản (tổ chức theo năng lực nghiệp vụ, triển khai độc lập, quản lý dữ liệu phi tập trung, thiết kế cho lỗi, mở rộng độc lập, dị biệt công nghệ, tự động hóa hạ tầng); so sánh với kiến trúc nguyên khối (monolith); chi phí phải trả (độ phức tạp phân tán, nhất quán dữ liệu, độ trễ mạng) | Ánh xạ NFR → tính chất, ADR Ch.4 |
| 2.x Điện toán đám mây: serverless và container | Mô hình FaaS (AWS Lambda), container được quản lý (ECS Fargate), cơ sở dữ liệu NoSQL tính phí theo yêu cầu (DynamoDB); khởi động nguội (cold start); vì sao tác vụ thời gian thực chạy dài hạn không phù hợp với FaaS | Lựa chọn Lambda cho API, Fargate cho tác tử hội thoại |
| 2.x (bổ sung vào 2.6) Cơ sở cho ngưỡng độ trễ | Khoảng lặng chuyển lượt trong hội thoại tự nhiên của con người; lý giải ngưỡng P95 ≤ 2 giây và câu đệm | NFR-02 |
| 2.x (bổ sung vào 2.5) Hướng dẫn giảm xao nhãng khi lái | Nguyên tắc giới hạn thao tác nhìn/tay khi lái | NFR-01 |

### 3.2 Nguồn tham khảo đề xuất bổ sung

> **Bắt buộc:** mỗi nguồn phải được mở và đối chiếu (tác giả, năm, nhà xuất bản, DOI/URL) trước khi đưa vào TLTK. Không trích nguồn chưa kiểm.

| Nhóm | Nguồn (cần kiểm) | Dùng cho |
|---|---|---|
| Mô hình chất lượng | ISO/IEC 25010:2023 *Systems and software engineering — Product quality model* | Phân loại NFR; tên nhóm Interaction capability, Flexibility (Scalability), Reliability, Safety |
| Kiến trúc phần mềm | Bass, Clements, Kazman, *Software Architecture in Practice*, 4th ed. (2021) | Kịch bản thuộc tính chất lượng; động lực kiến trúc |
| Microservices | Lewis & Fowler (2014), "Microservices" (martinfowler.com) | Các tính chất cơ bản |
| Microservices | Newman, *Building Microservices*, 2nd ed. (2021) | Triển khai độc lập, cô lập lỗi |
| Microservices | Richardson, *Microservices Patterns* (2018) | Mỗi service một cơ sở dữ liệu, API Gateway, scale cube |
| Microservices | Dragoni et al. (2017), "Microservices: Yesterday, Today, and Tomorrow" | Định nghĩa học thuật |
| Microservices | Soldani, Tamburri, Van Den Heuvel (2018), "The pains and gains of microservices", *JSS* | Chi phí phải trả của microservices |
| Serverless | Jonas et al. (2019), "Cloud Programming Simplified: A Berkeley View on Serverless Computing" | Ưu/nhược FaaS |
| Đám mây | AWS Well-Architected Framework (các trụ Reliability, Performance Efficiency, Security) | Thiết kế trên AWS; kiểm Resilience |
| Độ trễ hội thoại | Stivers et al. (2009), "Universals and cultural variation in turn-taking in conversation", *PNAS* | Cơ sở ngưỡng độ trễ |
| An toàn lái xe | NHTSA (2013), *Visual-Manual Driver Distraction Guidelines for In-Vehicle Electronic Devices* | NFR-01 |

Sau khi bổ sung, TLTK dự kiến khoảng 19–20 nguồn; các chương 3–4 phải trích dẫn khi dùng khái niệm (không chỉ Ch.1–2). Sửa câu mở đầu mục TLTK ("các chương sau chủ yếu đối chiếu hiện trạng…") và bỏ câu "Click các trích dẫn…" (khẩu ngữ, không phù hợp văn bản in).

---

## 4. Chương 3: Phân tích yêu cầu

### 4.1 Yêu cầu chức năng (FR)

- Xóa mọi nội dung giao hàng (mục 0, dòng 5). Mục "Ngoài phạm vi" chỉ giữ một dòng ngắn.
- Đổi FR-D02/D03 thành **FR-A01/A02**, nhóm "Kích hoạt và kết thúc phiên".
- Mỗi bảng FR thêm cột **"Service phụ trách"**, trả lời các comment:
  - "Trợ lý sử dụng?": trợ lý giọng nói là tác tử hội thoại **llm-orchestrator**.
  - "Chức năng riêng → service riêng?": lý giải vì sao nhận dạng từ khóa đánh thức chạy trên thiết bị (độ trễ, quyền riêng tư, không gửi âm thanh lên máy chủ), không tách thành service.
- Tiêu chí "không tạo dữ liệu không có nguồn" là **điều kiện chấp nhận của FR** (functional correctness), không để thành NFR.
- Đa ngôn ngữ giữ ở nhóm **FR-L**.
- Use case (Bảng 3.8) viết lại theo mẫu chuẩn: tác nhân, tiền điều kiện, luồng chính, luồng thay thế/ngoại lệ, hậu điều kiện (có thể rút gọn trong bảng, bản đầy đủ đưa vào phụ lục).

### 4.2 Yêu cầu phi chức năng (NFR)

Bảng NFR mới:

| Mã | Phân loại chuẩn (ISO/IEC 25010) | Kịch bản thuộc tính chất lượng (kích thích → phản ứng → thước đo) | Tính chất microservices hỗ trợ | Cơ chế / service đáp ứng | Phương pháp đánh giá (Ch.6) |
|---|---|---|---|---|---|

| Mã | Phân loại | Phát biểu đo được |
|---|---|---|
| NFR-01 | **Usability** (Interaction capability) | Mỗi lượt phản hồi chứa một ý chính; thao tác có rủi ro (hủy chuyến, báo khách không có mặt, gọi số ngoài chuyến) phải được xác nhận; nghiệp vụ cốt lõi hoàn thành hoàn toàn bằng giọng nói |
| NFR-02 | **Performance efficiency** (time behaviour) | P95 thời gian từ khi tài xế kết thúc phát ngôn đến khi hệ thống bắt đầu phát âm thanh ≤ 2 giây; vượt 2 giây thì phát câu đệm |
| NFR-03 | **Scalability** (thuộc nhóm Flexibility) | Khi số phiên hội thoại đồng thời tăng từ 1 lên N, P95 tăng không quá X% sau khi mở rộng theo chiều ngang tác tử hội thoại; API nghiệp vụ tự động mở rộng mà không cần thay đổi mã |
| NFR-04 | **Resilience** (Reliability: availability, fault tolerance, recoverability) | Khi một service phụ trợ gặp lỗi, phiên hội thoại vẫn duy trì; khi API nghiệp vụ lỗi, hệ thống thông báo rõ và không kết thúc phiên bất thường; tác vụ ECS bị dừng được thay thế trong T giây |
| NFR-05 *(tùy chọn)* | **Security** | JWT chỉ do identity-service phát hành, các service khác chỉ xác minh; tham số bí mật được ẩn (`NoEcho`), không nằm trong mã nguồn; nhật ký không chứa số điện thoại đầy đủ hay token |
| NFR-06 *(tùy chọn)* | **Maintainability** (modifiability, analysability) | Thay nhà cung cấp STT/LLM/TTS chỉ bằng cấu hình; mọi lỗi truy vết được theo mã phòng (`room=`) |

N, X, T chốt khi thiết kế thử nghiệm (mục 7).

### 4.3 Mục mới cuối Chương 3: "Từ yêu cầu phi chức năng đến tính chất của kiến trúc microservices"

| NFR | Tính chất microservices (trích dẫn Ch.2) | Hiện thực trong hệ thống |
|---|---|---|
| Performance | Dị biệt công nghệ theo service; tách xử lý thời gian thực khỏi xử lý giao dịch | Tác tử hội thoại Python chạy dài hạn trên ECS Fargate, duy trì kết nối với LiveKit; API giao dịch Node.js trên Lambda; tải trước ngữ cảnh |
| Scalability | Mở rộng độc lập từng service (scale cube: trục X nhân bản, trục Y phân rã theo chức năng) | Tham số `DesiredCount` của ECS; Lambda tự động mở rộng theo số yêu cầu; DynamoDB chế độ `PAY_PER_REQUEST` |
| Resilience | Cô lập lỗi; thiết kế cho lỗi; service phi trạng thái; mỗi service một cơ sở dữ liệu | Mỗi service sở hữu bảng DynamoDB riêng; thời gian chờ (timeout) và suy giảm chức năng có kiểm soát trong `backend_api`; ECS tự thay thế tác vụ lỗi |
| Security | Xác thực tập trung, xác minh phân tán; đặc quyền tối thiểu | identity-service phát hành JWT; các service xác minh bằng khóa bí mật dùng chung; IAM role riêng từng stack |
| Maintainability | Triển khai độc lập; tự chủ; giao tiếp qua giao thức nhẹ (HTTP, WebSocket) | 5 stack SAM/CloudFormation riêng, `infra/deploy-all.sh`; thay nhà cung cấp AI bằng biến cấu hình |
| Usability | Gián tiếp: ngữ cảnh giới hạn (bounded context) theo kênh | Phiên trong ứng dụng và phiên SIP đề nghị chuyến có tập công cụ khác nhau |

Câu chốt Chương 3: *"Các yêu cầu phi chức năng trên là động lực kiến trúc (architectural drivers) cho quyết định ở Chương 4."*

---

## 5. Chương 4: Thiết kế hệ thống (dựng lại khung)

| Mục mới | Nội dung | Thay cho |
|---|---|---|
| 4.1 Động lực kiến trúc | FR chính, NFR ưu tiên, ràng buộc (nhà cung cấp AI bên ngoài, LiveKit, mạng điện thoại công cộng) | §4.1 "Nguyên tắc thiết kế (nói bằng việc cần đạt)" |
| 4.2 Quyết định kiến trúc (ADR) | Bối cảnh; các phương án: kiến trúc nguyên khối, nguyên khối phân mô-đun, microservices, thuần serverless; đánh giá từng phương án theo NFR; quyết định; hệ quả và biện pháp giảm thiểu | §4.2.1, Bảng 4.2a |
| 4.3 Kiến trúc tổng thể trên AWS | **Hình 4.1** (mục 6) và đoạn diễn giải theo số bước | Hình 4.1 cũ, Bảng 4.1, 4.2 |
| 4.4 Phân rã service | Mỗi service: trách nhiệm, giao diện API, dữ liệu sở hữu, NFR đáp ứng, ranh giới (không được làm gì) | Bảng 4.1 |
| 4.5 Sequence diagram từng service | S1–S6 (mục 5.1) | §4.2b, §4.4.1 |
| 4.6 Thiết kế xử lý một lượt hội thoại | Chuỗi STT → LLM kèm gọi công cụ → TTS; câu đệm khoảng 2 giây; tải trước ngữ cảnh | §4.3 |
| 4.7 Thiết kế cho Resilience, Security, Observability | Thời gian chờ, suy giảm có kiểm soát, xử lý im lặng, JWT, nhật ký theo mã phòng | §4.6 |
| 4.8 Truy vết yêu cầu và thiết kế | NFR → quyết định → thành phần trên Hình 4.1 / sequence | §4.8 |

Đánh số lại liên tục, bỏ kiểu "a/b".

### 5.1 Sequence diagram từng service (khớp route thật)

| # | Service | Luồng chính | Các bước và route (đã tra trong `src/backend/*`) |
|---|---|---|---|
| S1 | identity-service | Đăng nhập và phát hành JWT | Ứng dụng gọi `POST /login` qua API Gateway → Lambda → DynamoDB `accounts` → trả access token và refresh token; `POST /refresh`; `GET /me` |
| S2 | external-api-service | Khởi tạo phiên trợ lý trong ứng dụng | `POST /api/v1/voice/token` → tạo phòng `driver-{phone}-{id}` trên LiveKit → ứng dụng tham gia phòng qua WebRTC → LiveKit điều phối tác tử → llm-orchestrator gọi `GET /api/v1/drivers/me/context` |
| S3 | llm-orchestrator | Xử lý một lượt hội thoại | STT kết thúc phát ngôn → khởi động bộ đếm câu đệm 2 giây → LLM chọn công cụ → HTTP tới external-api-service (ví dụ `PATCH /api/v1/trips/{tripId}`) → TTS |
| S4 | external-api-service (điều phối) | Đề nghị chuyến qua cuộc gọi điện thoại | `POST /trips/{tripId}/dispatch` → LiveKit SIP gọi tài xế (`sip_identity`) → công cụ chấp nhận/từ chối → cập nhật chuyến → thông báo qua API Gateway WebSocket (bảng `ws-connections`) |
| S5 | external-channel-service | Gọi khách hàng (tác tử gọi hộ / nói trực tiếp / gọi nền) | `POST /api/v1/calls/start` → `/outbound/dial` → Twilio → webhook `/outbound/status`; gọi nền dùng phòng `custcall-…` |
| S6 | call-records-service | Lưu vết và tóm tắt cuộc gọi | `POST /` ghi lượt hội thoại → DynamoDB `call-records` → `POST /api/v1/calls/{callId}/summary` → `GET /:callId` |

Tên tham gia (participant) trong sequence dùng **đúng tên dịch vụ AWS và tên service** như trên Hình 4.1 (ví dụ "Amazon API Gateway", "identity-service (AWS Lambda)", "Amazon DynamoDB: accounts").

**Bảng kiểm đối chiếu mã nguồn cho mỗi sequence** (Phụ lục F):

| Bước | Thành phần | Method + path | Tham số / body chính | Nhánh lỗi | Tệp:dòng | Khớp |
|---|---|---|---|---|---|---|

---

## 6. Hình 4.1: Sơ đồ kiến trúc AWS (đã chốt)

### 6.1 Dịch vụ AWS có thật trong `infra/`

| Dịch vụ AWS | Dùng cho | Nguồn |
|---|---|---|
| Amazon API Gateway (REST API) | 4 API: identity, external-api, external-channel, call-records; **không có authorizer**, JWT xác minh trong mã Lambda | `infra/*/sam.yaml` (`AWS::Serverless::Api`) |
| Amazon API Gateway (WebSocket API) | Kênh thông báo điều phối thời gian thực | `external-api-service/sam.yaml` (`DispatchWebSocketApi`) |
| AWS Lambda (`nodejs20.x`, 256 MB) | 4 function nghiệp vụ + 2 function `$connect`/`$disconnect`; **không** gắn VPC | `sam.yaml` |
| Amazon DynamoDB (`PAY_PER_REQUEST`) | `accounts`, `driver-settings` (identity); `trips`, `ws-connections` (external-api); `call-records` (call-records) | `sam.yaml` |
| Amazon ECS trên AWS Fargate (1 vCPU / 2 GB) | llm-orchestrator; chạy trong **public subnet** của VPC, security group chỉ mở chiều ra | `llm-orchestrator/cfn.yaml` |
| Amazon ECR | Lưu image container của llm-orchestrator | `cfn.yaml` |
| Amazon CloudWatch Logs | Log group cho từng function và task | `sam.yaml`, `cfn.yaml` |
| AWS IAM | Execution role và task role | `cfn.yaml` |
| AWS CloudFormation / AWS SAM | Triển khai hạ tầng dạng mã | `deploy.sh`, `deploy-all.sh` |
| Amazon S3 | Lưu gói triển khai; host web tĩnh (admin, customer-web) | `frontend/deploy.sh` |
| Region | `ap-southeast-1` (Singapore), mặc định trong `infra/lib/common.sh` | `common.sh` |

**Không có, KHÔNG vẽ:** Amazon Cognito, Elastic Load Balancing, Amazon SQS/SNS/EventBridge, AWS Secrets Manager, Amazon ElastiCache, API Gateway authorizer. Amazon CloudFront mới là ghi chú trong script, chưa triển khai.

**Hệ thống bên ngoài (vẽ ngoài khung AWS Cloud):**
- LiveKit Cloud (WebRTC SFU và SIP trunk).
- Twilio (PSTN/SMS; webhook về external-channel-service).
- Nhà cung cấp mô hình AI: OpenAI (LLM), Google Cloud (STT chirp_3, TTS Chirp3-HD); Deepgram, ElevenLabs tùy cấu hình.
- Dịch vụ bản đồ: Goong, Google Maps Platform.
- Redis được quản lý bên ngoài (Upstash), không bắt buộc.
- ops-service: sẽ được **bổ sung stack AWS** (mục 12.3) và vẽ trong Microservices Layer như các service khác.
- Tên tài nguyên trên hình dùng quy ước mới ở mục 12.1 (không dùng logical ID cũ).

### 6.2 Quy ước vẽ theo chuẩn AWS Architecture Diagram

- Dùng **AWS Architecture Icons** chính thức (bản mới nhất), thư viện "AWS 2024/2025" có sẵn trong draw.io.
- Nhóm lồng theo chuẩn AWS: **AWS Cloud** → **Region ap-southeast-1** → **VPC** → **Public subnet** (chỉ chứa ECS Fargate). Lambda, API Gateway, DynamoDB, S3, ECR, CloudWatch là dịch vụ cấp Region, vẽ **ngoài VPC** (đúng với cấu hình hiện tại).
- Mỗi service là một nhóm (group) viền nét đứt chứa: API Gateway → Lambda → bảng DynamoDB riêng, thể hiện trực quan "mỗi service một cơ sở dữ liệu".
- Mũi tên có hướng, đánh số ①…⑱; số trùng số bước trong S1–S6; chú thích giao thức trên cạnh (HTTPS, WSS, WebRTC, SIP).
- Nhãn thành phần: **tên chức năng tiếng Việt chữ lớn**, dòng dưới **tên kỹ thuật chữ nhỏ**. Ví dụ: "Dịch vụ Chuyến đi & Điều phối" / *external-api-service · AWS Lambda*.

### 6.3 Bố cục layer (theo comment GVHD), đặt thành các dải ngang trên hình

| Layer | Tên chuẩn | Thành phần |
|---|---|---|
| 1 | **Client Layer** (Presentation) | Ứng dụng tài xế / *driver-app · React Native*; Ứng dụng khách hàng / *customer-app*; Trang quản trị / *admin-panel, super-admin-panel · Amazon S3* |
| 2 | **Real-time Communication & Conversational AI Layer** (gộp layer 2 và 3 cũ) | Nền tảng truyền thông thời gian thực / *LiveKit Cloud · WebRTC, SIP*; Tác tử hội thoại / *llm-orchestrator · Amazon ECS on Fargate*; Nhà cung cấp mô hình AI / *STT · LLM · TTS* |
| 3 | **API Gateway Layer** | Cổng API / *Amazon API Gateway REST*; Kênh thông báo thời gian thực / *Amazon API Gateway WebSocket* |
| 4 | **Microservices Layer** (Business Services) | Dịch vụ Định danh / *identity-service*; Dịch vụ Chuyến đi & Điều phối / *external-api-service*; Dịch vụ Kênh liên lạc / *external-channel-service*; Dịch vụ Lưu vết cuộc gọi / *call-records-service*; tất cả chạy trên *AWS Lambda* |
| 5 | **Data Layer** (Database per Service) | Các bảng Amazon DynamoDB theo service sở hữu; Redis (bên ngoài) |
| — | **Cross-cutting Concerns** (dải dọc) | Observability / *Amazon CloudWatch Logs*; Security / *JWT, AWS IAM*; Deployment / *AWS CloudFormation, AWS SAM, Amazon ECR* |
| — | **External Systems** | Twilio (PSTN/SMS), dịch vụ bản đồ |

### 6.4 Quy cách trình bày trong luận văn

- Caption đặt **dưới** hình, cỡ 12 đậm. Ví dụ: *"Hình 4.1. Kiến trúc hệ thống trên nền tảng AWS theo mô hình microservices"*.
- Hình rộng hết khổ in; chữ trên hình ≥ 9 pt sau khi co; nếu quá chi tiết thì đặt hình ở trang ngang (landscape).
- Câu dẫn trước hình; sau hình một đoạn diễn giải theo thứ tự số bước ①…⑱.
- Xuất PNG 300 dpi (hoặc SVG/EMF) từ draw.io; lưu tệp nguồn `.drawio` trong `docs/thesis/thesis_screenshots/`.

---

## 7. Chương 5 và Chương 6

### 7.1 Chương 5: Triển khai

- Mục mới **"Triển khai trên AWS"**: bảng stack → tài nguyên AWS → cấu hình chính → NFR đáp ứng (ví dụ: Lambda tự động mở rộng và DynamoDB `PAY_PER_REQUEST` cho Scalability; log group cho Maintainability; `NoEcho` và IAM role cho Security).
- Thêm bảng ánh xạ tên: logical ID cũ trong SAM → tên service mới.
- Đường dẫn API chỉ xuất hiện ở Chương 5 và phụ lục, không trong thân Chương 3–4.
- Đánh số lại Bảng 5.1b, 5.1c.

### 7.2 Chương 6: Tổ chức theo từng yêu cầu

Mỗi mục dùng chung một bảng:

| Mã yêu cầu | Kịch bản | Chỉ số | Ngưỡng | Kết quả | Đạt / Không đạt |
|---|---|---|---|---|---|

| Mục | Yêu cầu | Việc cần làm |
|---|---|---|
| Performance | NFR-02, RQ2 | **Đo lại** trên thiết kế hiện hành (một luồng xử lý + câu đệm). Đợt A/B cũ chỉ giữ làm số liệu tham chiếu lịch sử |
| Scalability **(mới)** | NFR-03, RQ1 | Chạy trên **môi trường cục bộ mô phỏng** (mục 13): 1, 5, 10, 20 phiên đồng thời; so sánh 1 và 2 bản sao tác tử (tương ứng `DesiredCount` của ECS); đo P95 và tỷ lệ lỗi. Kiểm thử tải API nghiệp vụ bằng k6 |
| Resilience **(mới)** | NFR-04, RQ1 | Tiêm lỗi trên môi trường cục bộ (mục 13): (a) dừng call-records-service, phiên hội thoại phải duy trì; (b) external-api-service trả 5xx hoặc quá thời gian chờ, tác tử thông báo lỗi và không kết thúc phiên bất thường; (c) dừng tiến trình tác tử, đo thời gian phục hồi; (d) mô phỏng Twilio lỗi, tác tử thông báo không thực hiện được cuộc gọi |
| Usability | NFR-01 | Giữ Bảng 6.8 (danh mục kiểm tra hành vi khi lái), gắn mã mới |
| Tính đúng chức năng | FR-*, RQ4 | Giữ Bảng 6.6 và 6.7 |
| Security | NFR-05 | Giữ Bảng 6.10 |
| Thảo luận | RQ1–RQ4 | Trả lời từng RQ; yêu cầu nào đạt/chưa đạt; mối đe dọa đối với tính hợp lệ (threats to validity) |

⚠️ Thử nghiệm Scalability và Resilience **phải chạy thật**. Script và kịch bản do agent viết; số liệu chỉ điền sau khi đo, không điền ước lượng.

---

## 8. Chuẩn hóa thuật ngữ chuyên ngành và văn phong học thuật (toàn bài)

### 8.1 Bảng thay thế thuật ngữ

Số lần xuất hiện đo trên bản FINAL (24/9). Nguyên tắc: dùng thuật ngữ tiếng Việt chuẩn; lần đầu kèm thuật ngữ tiếng Anh và viết tắt trong ngoặc; các lần sau dùng thống nhất.

| Hiện tại (khẩu ngữ / không chuẩn) | Số lần | Thay bằng |
|---|---|---|
| bịa (số liệu, chuyến) | 31 | tạo ra thông tin không có nguồn / sinh thông tin sai lệch (hallucination) |
| đường tắt | 39 | nhánh xử lý rút gọn dựa trên nhận dạng ý định (intent-based shortcut) |
| câu giữ chỗ | 39 | câu đệm (filler utterance) |
| đường đủ | 12 | luồng xử lý đầy đủ qua LLM |
| bot | 36 | tác tử hội thoại (conversational agent) / trợ lý giọng nói |
| worker | 17 | tiến trình tác tử (agent worker) |
| rảnh tay | 12 | không dùng tay (hands-free) |
| nạp / nạp trước | 21 | tải trước (prefetch) |
| làm nóng | 5 | khởi động trước (warm-up) |
| "lạnh" (phiên lạnh, lần đầu lạnh) | 4 | khởi động nguội (cold start) |
| đường nóng | 4 | luồng xử lý chính (critical path) |
| sổ sách | 2 | nguồn dữ liệu chuẩn (single source of truth) |
| vào chỗ | 1 | khởi tạo phiên |
| nhớ bừa | 1 | lưu dữ liệu nghiệp vụ trong lời nhắc hệ thống (system prompt) |
| cho có chuyện nói | 3 | (bỏ; diễn đạt lại bằng thuật ngữ trên) |
| đường ống | 3 | chuỗi xử lý (pipeline) |
| đường hạnh phúc | 1 | luồng thành công chính (happy path) |
| đẩy (thông báo) | 6 | gửi thông báo đẩy (push notification) |
| đổ vào | 1 | ghi vào |
| việc đang chờ | 5 | hành động chờ xác nhận (pending action) |
| hỏi lại | 13 | xác nhận lại (confirmation) |
| nói đè | 2 | phát âm chồng lấn (barge-in / overlap) |
| cửa vào | 2 | kênh truy cập |
| hộp thoại (nghĩa "khối gọi điện") | 1 | thành phần thoại |
| mượt, đỡ, oan, sập, treo | ~5 | diễn đạt định lượng hoặc thuật ngữ: "độ trễ thấp", "giảm", "gián đoạn phiên", "phiên không được giải phóng" |
| chữ hội thoại | 2 | bản ghi hội thoại (transcript) |
| chấm tay | 3 | đánh giá thủ công (manual annotation) |
| test case | 18 | ca kiểm thử (test case) |
| kho mã nguồn dùng chung | 4 | kho mã nguồn đơn (monorepo) |
| dịch vụ nhỏ | 3 | microservice |
| scale | 3 | mở rộng (theo chiều ngang / chiều dọc) |
| phòng | 56 | phòng hội thoại (room) LiveKit (lần đầu định nghĩa, sau đó giữ "phòng") |
| token | 44 | mã truy cập (token) lần đầu; sau giữ "token" |
| agent | 39 | tác tử (agent) lần đầu; sau giữ "tác tử" |
| mơ hồ (câu) | 10 | phát ngôn không rõ ý định |

### 8.2 Tiêu đề cần viết lại (bỏ dạng câu hỏi, khẩu ngữ)

| Hiện tại | Đề xuất |
|---|---|
| 2.1. Trợ lý giọng nói hoạt động như thế nào? | 2.1. Kiến trúc chuỗi xử lý trợ lý giọng nói STT–LLM–TTS |
| 2.2. Vì sao trợ lý phải "làm được việc", không chỉ trò chuyện? | 2.2. Mô hình ngôn ngữ lớn có khả năng gọi công cụ |
| 2.6. Đo thế nào thì biết trợ lý "đủ dùng"? | 2.6. Chỉ số đánh giá trợ lý giọng nói |
| 3.1. Cách tiếp cận: từ việc tài xế làm hàng ngày | 3.1. Phương pháp xác định yêu cầu |
| 3.2. Ai dùng hệ thống và họ gặp trợ lý ở đâu? | 3.2. Tác nhân và kênh tương tác |
| 3.3. Bối cảnh vận hành: một phiên trợ lý diễn ra thế nào? | 3.3. Kịch bản vận hành của phiên trợ lý |
| 4.1. Nguyên tắc thiết kế (nói bằng việc cần đạt) | 4.1. Động lực kiến trúc |
| 4.2. Kiến trúc tổng thể: ai phụ trách việc gì? | 4.3. Kiến trúc tổng thể trên AWS |
| 4.3.2. Vì sao một đường + câu giữ chỗ (và đường tắt đã được thay thế)? | 4.6.x. Cơ sở lựa chọn luồng xử lý đơn và câu đệm |

### 8.3 Quy tắc văn phong

- Văn phong khách quan, ngôi thứ ba ("luận văn", "hệ thống", "tác giả"); không dùng "mình", "em", "bạn" ngoài trích dẫn lời thoại.
- Mỗi khẳng định định lượng phải có nguồn (trích dẫn) hoặc số đo (Chương 6); bỏ các từ cảm tính ("khá rõ", "mượt", "chậm oan").
- Dấu ngoặc kép chỉ dùng cho trích dẫn nguyên văn hoặc lời thoại; không dùng để "làm mềm" khẩu ngữ (ví dụ "đủ dùng", "vào chỗ", "làm được việc").
- Không dùng ký hiệu `→`, `+`, `/` thay từ nối trong câu văn và tiêu đề (chỉ dùng trong bảng hoặc sơ đồ).
- Đánh số hình và bảng liên tục theo chương; bảng: caption ở trên; hình: caption ở dưới; mỗi bảng và hình có câu dẫn.
- Bỏ `---`; giữ stylesheet đã khóa (Times New Roman 13, H1 15, lề 3,5/2, giãn dòng 1,5); sau khi build cập nhật mục lục (Update Field).
- Danh mục từ viết tắt: bổ sung ADR, AWS, ECS, FaaS, IAM, NFR, FR, RTM, SAM, SFU…

### 8.4 Tên tiếng Việt cho thành phần hệ thống

Mục đích: câu văn tiếng Việt trôi chảy, không chèn tên kỹ thuật kiểu `external-api-service` giữa câu. Tên kỹ thuật chỉ dùng ở: lần nhắc đầu tiên trong mỗi chương (trong ngoặc), chữ nhỏ trên hình, bảng đối chiếu mã nguồn (Chương 5, Phụ lục F) và **Phụ lục G — Bảng ánh xạ tên thành phần** (mới).

| Tên tiếng Việt (dùng trong thân bài) | Tên kỹ thuật (thư mục mã nguồn) | Tài nguyên AWS chính (logical ID mới, mục 12.1) | Layer trên Hình 4.1 |
|---|---|---|---|
| Dịch vụ Định danh | `identity-service` | `IdentityRestApi`, `IdentityFunction`, `IdentityAccountsTable`, `IdentityDriverSettingsTable` | Microservices / Data |
| Dịch vụ Chuyến đi và Điều phối | `external-api-service` | `ExternalApiRestApi`, `ExternalApiFunction`, `ExternalApiTripsTable`, `ExternalApiDispatchWebSocketApi`, `ExternalApiWsConnectionsTable` | Microservices / API Gateway / Data |
| Dịch vụ Kênh liên lạc | `external-channel-service` | `ExternalChannelRestApi`, `ExternalChannelFunction` | Microservices |
| Dịch vụ Lưu vết cuộc gọi | `call-records-service` | `CallRecordsRestApi`, `CallRecordsFunction`, `CallRecordsTable` | Microservices / Data |
| Dịch vụ Giám sát vận hành | `ops-service` | `OpsRestApi`, `OpsFunction` | Microservices |
| Tác tử hội thoại giọng nói | `llm-orchestrator` | `LlmOrchestratorCluster`, `LlmOrchestratorService`, `LlmOrchestratorRepository` | Real-time Communication & Conversational AI |
| Nền tảng truyền thông thời gian thực | LiveKit Cloud | (bên ngoài AWS) | Real-time Communication & Conversational AI |
| Ứng dụng tài xế | `driver-app` | — | Client |
| Ứng dụng khách hàng | `customer-app`, `customer-web` | S3 (bản web) | Client |
| Trang quản trị điều hành | `admin-panel` | S3 | Client |
| Trang giám sát hệ thống | `super-admin-panel` | S3 | Client |
| Nhà cung cấp dịch vụ thoại | Twilio | (bên ngoài AWS) | External Systems |

Quy tắc viết:
- Lần đầu trong mỗi chương: "Dịch vụ Chuyến đi và Điều phối (external-api-service)"; các lần sau chỉ dùng tên tiếng Việt.
- Không viết tắt tên tiếng Việt thành ký hiệu tự chế (ví dụ "DV-CĐ").
- Tên tính năng mã nguồn (hàm, tệp, biến) chỉ xuất hiện ở Chương 5 và phụ lục, định dạng chữ đơn cách.
- Script kiểm (mục 9) đếm tên kỹ thuật trong thân Chương 1–4 và 6: chỉ được xuất hiện ở lần nhắc đầu của mỗi chương.

---

## 9. Kiểm tra sau khi sửa

1. Rebuild: `docs/thesis/.venv-docx/bin/python docs/thesis/build_thesis_final.py`. **Đóng Word trước** (đang có file khóa `~$AN_VAN_THAC_SI_FINAL.docx`).
2. Script grep từ cấm trên FINAL: toàn bộ cột "Hiện tại" ở mục 8.1 (trừ các thuật ngữ được giữ sau lần định nghĩa đầu), giao hàng, đang giao, FR-D, `---`, tên service cũ (trip-service, auth-service, call-center, call-logger, voice-agent). Mục tiêu: 0 lần.
3. Script kiểm tiêu đề: không tiêu đề nào kết thúc bằng dấu "?".
4. Script kiểm tham chiếu chéo: mọi "Bảng x.y", "Hình x.y" được nhắc đều tồn tại; đánh số không nhảy, không có hậu tố a/b.
5. Script kiểm truy vết: mọi mã FR/NFR ở Ch.3 có dòng trong Phụ lục E và có kết quả (hoặc ghi rõ "chưa đo") ở Ch.6.
6. Kiểm trích dẫn: mọi nguồn trong TLTK được trích ít nhất một lần; mọi trích dẫn có trong TLTK.
7. Đối chiếu Hình 4.1 với `infra/`: mỗi icon AWS trên hình tương ứng một tài nguyên trong SAM/CFN; không có icon thừa.
8. Đối chiếu từng bước S1–S6 với mã nguồn (tệp:dòng), ghi vào Phụ lục F.
9. Rà theo checklist tự review luận văn trước khi gửi GVHD.

---

## 10. Thứ tự thực hiện

| Bước | Việc | Người thực hiện | Phụ thuộc |
|---|---|---|---|
| 1 | Chốt các quyết định còn mở (mục 11) | Học viên | — |
| 2 | Kiểm và bổ sung nguồn tham khảo; viết thêm các mục lý thuyết Chương 2 | Agent (học viên duyệt nguồn) | 1 |
| 3 | Hiệu chỉnh RQ Chương 1 | Agent | 1 |
| 4 | Sửa Chương 3 (FR, NFR, ánh xạ NFR → tính chất microservices); xóa sót giao hàng | Agent | 2 |
| 5 | Sửa Chương 4 (động lực kiến trúc, ADR, phân rã service, đặc tả Hình 4.1 và S1–S6) | Agent | 4 |
| 6 | Vẽ Hình 4.1 (AWS) và S1–S6 trên draw.io; review | Theo quyết định 3 ở mục 11; cùng review | 5 |
| 7 | Sửa Chương 5 (triển khai trên AWS) | Agent | 5 |
| 8 | Viết script, chạy thử nghiệm Scalability, Resilience; đo lại Performance | Agent viết script; chạy trên môi trường đã chốt | 1, 7 |
| 9 | Viết lại Chương 6 theo từng yêu cầu với số liệu thật; cập nhật Kết luận | Agent | 8 |
| 10 | Chuẩn hóa thuật ngữ và văn phong toàn bài (mục 8); Phụ lục E, F | Agent | 2–9 |
| 11 | Rebuild và chạy các bước kiểm ở mục 9 | Agent | 10 |
| 12 | Chụp ảnh giao diện còn thiếu; Update Field mục lục trong Word | Học viên | 11 |

---

## 11. Quyết định cần học viên chốt

| # | Quyết định | Trạng thái |
|---|---|---|
| — | Hình 4.1 theo chuẩn AWS Architecture Diagram | **Đã chốt** |
| 1 | Bộ NFR = Usability, Performance, Scalability, Resilience + **Security** | **Đã chốt** |
| 2 | Thử nghiệm Scalability và Resilience chạy **cục bộ**, mô phỏng môi trường stress test | **Đã chốt** → mục 13 |
| 3 | Agent sinh tệp `.drawio` có cấu trúc, đúng chuẩn | **Đã chốt** → mục 14 |
| 4 | Chưa triển khai AWS nên **đổi tên toàn bộ tài nguyên hạ tầng** theo quy ước có cấu trúc, dễ truy vết | **Đã chốt** → mục 12 |
| 5 | **Bổ sung ops-service vào `infra/`** (đồng bộ hạ tầng với mã nguồn) | **Đã chốt** → mục 12.3 |

**Còn chờ học viên xác nhận trước khi bắt đầu mục 12:** A) quy ước đặt tên ở mục 12.1; B) đổi luôn tên biến môi trường cũ (mục 12.2) và cập nhật cả tệp `.env` cục bộ; C) phạm vi ops-service trên AWS (mục 12.3).

---

## 12. Đồng bộ hạ tầng `infra/` với mã nguồn (Track A — thay đổi mã)

Thực hiện theo skill `dev-workflow`. Làm **trước** khi vẽ hình, vì Hình 4.1 phải khớp hạ tầng.

### 12.1 Quy ước đặt tên (đề xuất)

| Đối tượng | Quy ước | Ví dụ (identity-service) |
|---|---|---|
| Mã service (kebab-case) | Trùng tên thư mục `src/backend/<service>` | `identity-service` |
| Tên stack CloudFormation | `${env}-${app}-${service}` | `dev-driver-assistant-identity-service` |
| Logical ID (PascalCase) | `<ServicePrefix><Role>` | `IdentityRestApi`, `IdentityFunction`, `IdentityFunctionLogGroup`, `IdentityAccountsTable`, `IdentityDriverSettingsTable` |
| Tên vật lý tài nguyên | `${env}-${app}-${service}-<role>` | `dev-driver-assistant-identity-service-api`, `…-identity-service-fn`, bảng `…-identity-service-accounts` |
| Log group | `/aws/lambda/<tên function>` hoặc `/ecs/<tên service>` | `/aws/lambda/dev-driver-assistant-identity-service-fn` |
| Tag trên mọi tài nguyên | `app`, `env`, `service`, `layer`, `component` | `layer=microservices`, `component=rest-api` |
| Output của stack | `<ServicePrefix>ApiUrl`, `<ServicePrefix><Table>TableName` | `IdentityApiUrl` |

Giá trị tag `layer` trùng tên layer trên Hình 4.1 (`client`, `realtime-ai`, `api-gateway`, `microservices`, `data`, `cross-cutting`), nên từ hình có thể truy ngược sang tài nguyên và ngược lại.

Bảng đổi logical ID (đầy đủ sẽ nằm trong Chương 5):

| Stack | Tên cũ | Tên mới |
|---|---|---|
| identity-service | `AuthServiceApi`, `AuthServiceFunction`, `AccountsTable`, `DriverSettingsTable` | `IdentityRestApi`, `IdentityFunction`, `IdentityAccountsTable`, `IdentityDriverSettingsTable` |
| external-api-service | `TripServiceApi`, `TripServiceFunction`, `TripsTable`, `ConnectionsTable`, `DispatchWebSocketApi`, `ConnectFunction`, `DisconnectFunction` | `ExternalApiRestApi`, `ExternalApiFunction`, `ExternalApiTripsTable`, `ExternalApiWsConnectionsTable`, `ExternalApiDispatchWebSocketApi`, `ExternalApiWsConnectFunction`, `ExternalApiWsDisconnectFunction` |
| external-channel-service | `CallCenterApi`, `CallsFunction` | `ExternalChannelRestApi`, `ExternalChannelFunction` |
| call-records-service | `CallLoggerApi`, `CallLoggerFunction`, `CallRecordsTable` | `CallRecordsRestApi`, `CallRecordsFunction`, `CallRecordsTable` |
| llm-orchestrator | `ECSCluster`, `ECSService`, `TaskDefinition`, `ECRRepository`, … | `LlmOrchestratorCluster`, `LlmOrchestratorService`, `LlmOrchestratorTaskDefinition`, `LlmOrchestratorRepository`, … |
| ops-service (mới) | — | `OpsRestApi`, `OpsFunction`, `OpsFunctionLogGroup` |

### 12.2 Biến môi trường và tệp mẫu

Tên cũ còn nằm trong mã, script và tài liệu (đã đếm: `infra/` có 41 dòng tên cũ). Đề xuất đổi hẳn, **không giữ alias**, vì chưa triển khai:

| Cũ | Mới |
|---|---|
| `AUTH_SERVICE_URL` | `IDENTITY_SERVICE_URL` |
| `TRIP_SERVICE_URL` | `EXTERNAL_API_SERVICE_URL` |
| `CALL_CENTER_URL` | `EXTERNAL_CHANNEL_SERVICE_URL` |
| `CALL_LOGGER_URL` | `CALL_RECORDS_SERVICE_URL` |
| `AUTH_/TRIP_/CALL_CENTER_/CALL_LOGGER_HEALTH_URL` (ops-service) | `IDENTITY_/EXTERNAL_API_/EXTERNAL_CHANNEL_/CALL_RECORDS_HEALTH_URL` |
| `VOICE_AGENT_ROOT`, `VOICE_AGENT_LOG_DIR` | `LLM_ORCHESTRATOR_ROOT`, `LLM_ORCHESTRATOR_LOG_DIR` |
| `infra/templates/auth-service.env.dev`, `call-center.env.dev`, `call-logger.env.dev` | `identity-service.env.dev`, `external-channel-service.env.dev`, `call-records-service.env.dev` |

Phạm vi sửa: `infra/*`, `src/backend/*/src/config.*`, `envs/.env.example`, `src/e2e/scripts`, frontend (`EXPO_PUBLIC_*`, Vite env nếu có), `README.md`, `infra/README.md`. Tệp `.env` cục bộ (không nằm trong git) cần cập nhật theo — sẽ làm kèm nếu học viên đồng ý, để các service chạy local không bị hỏng.

### 12.3 Bổ sung ops-service vào `infra/`

**Nên bổ sung.** Lý do: Hình 4.1 và Chương 5 phải phản ánh đủ các service; hiện ops-service là service duy nhất không có stack. Tuy nhiên ops-service đang **phụ thuộc hệ thống tệp cục bộ**, nên không thể chỉ thêm một tệp SAM:

| Chức năng ops-service | Hiện tại | Khi chạy trên Lambda |
|---|---|---|
| `/api/v1/status` (thăm dò health các service) | Gọi HTTP | Chạy được ngay |
| `/api/v1/records` (proxy call-records) | Gọi HTTP | Chạy được ngay |
| `/api/v1/logs` và `/logs/stream` | Đọc tệp log cục bộ (`fileTail`, `sources`); stream SSE | Cần **nguồn log CloudWatch** (`FilterLogEvents` trên các log group ở 12.1); SSE qua API Gateway REST bị giới hạn 29 giây, chuyển sang truy vấn định kỳ (polling) trên cloud |
| `/api/v1/agent` (xem prompt, tool, manifest) | Đọc mã nguồn llm-orchestrator trên đĩa | Cần **đóng gói ảnh chụp cấu hình** (manifest, prompt, tool schema) vào gói Lambda lúc build |

Đề xuất thiết kế: thêm lớp nguồn log theo cổng (port/adapter): `FileLogSource` (local) và `CloudWatchLogSource` (AWS), chọn theo biến `LOG_SOURCE`; thêm bước build đóng gói snapshot cấu hình tác tử. Stack mới `infra/ops-service/sam.yaml` + `deploy.sh`, IAM chỉ cấp `logs:FilterLogEvents` trên các log group của app; cập nhật `deploy-all.sh`, `status.sh`, `teardown-all.sh`.

### 12.4 Kiểm tra (không deploy)

- `sam validate --lint` cho mọi template; `cfn-lint`.
- `sam build` từng stack (kiểm esbuild bundle).
- `bash infra/deploy-all.sh dev --dry-run`.
- `npm run build` + các selfcheck của từng service bị sửa (`verify:ops`, …); pytest cho llm-orchestrator nếu đổi biến môi trường.
- Grep tên cũ trong `infra/` và `src/`: mục tiêu 0 (trừ ghi chú lịch sử có chủ đích).
- Chạy local toàn bộ service và `src/e2e/scripts/verify_services.sh`.

---

## 13. Môi trường stress test cục bộ (Track B)

Mục tiêu: mô phỏng kiến trúc AWS trên máy cục bộ đủ để đo Scalability và Resilience một cách có kiểm soát và tái lập được.

### 13.1 Ánh xạ AWS → môi trường cục bộ

| Trên AWS | Mô phỏng cục bộ |
|---|---|
| API Gateway + Lambda (mỗi service) | Tiến trình Node.js của từng service (`local.ts`), mỗi service một cổng |
| DynamoDB | DynamoDB Local (container) hoặc chế độ lưu trữ cục bộ hiện có của service (kiểm khi thực hiện) |
| ECS Fargate `DesiredCount = N` | N tiến trình tác tử llm-orchestrator cùng đăng ký vào một máy chủ LiveKit |
| LiveKit Cloud | `livekit-server --dev` (đã cài qua Homebrew) |
| Nhà cung cấp STT/LLM/TTS | **Bộ giả lập (mock) có độ trễ cấu hình được**, để kết quả đo phản ánh kiến trúc, không phụ thuộc biến động của nhà cung cấp; một đợt nhỏ chạy với nhà cung cấp thật để đối chiếu |
| Twilio | Mock HTTP có thể cấu hình trả lỗi |
| Lỗi mạng / độ trễ giữa service | `toxiproxy` (đã cài) chèn độ trễ, timeout, ngắt kết nối |

### 13.2 Công cụ

- `k6` (cần cài `brew install k6`): kiểm thử tải API nghiệp vụ.
- `lk` (LiveKit CLI, cần cài `brew install livekit-cli`): lệnh `lk load-test` tạo nhiều người tham gia giả phát âm thanh vào phòng.
- Script điều phối: `src/e2e/stress/` (mới) — khởi động môi trường, chạy kịch bản, thu log `turn_metrics`, xuất CSV cho Chương 6.

### 13.3 Kịch bản

| Mã | Loại | Kịch bản | Chỉ số | Ngưỡng (đề xuất, chốt khi chạy thử) |
|---|---|---|---|---|
| SC-01 | Scalability | 1, 5, 10, 20 phiên đồng thời, 1 bản sao tác tử | P50/P95 độ trễ lượt; tỷ lệ phiên lỗi | Xác định điểm bão hòa |
| SC-02 | Scalability | Như SC-01 với 2 và 4 bản sao tác tử | P95; thông lượng | P95 ở 20 phiên với 4 bản sao không vượt P95 ở 5 phiên với 1 bản sao quá X% |
| SC-03 | Scalability | k6 tăng dần 10 → 200 VU trên `GET /drivers/me/context`, `PATCH /trips/{id}` | P95 thời gian phản hồi; tỷ lệ lỗi HTTP | Tỷ lệ lỗi < 1% |
| RS-01 | Resilience | Dừng call-records-service giữa phiên | Tỷ lệ phiên vẫn hoạt động | 100% |
| RS-02 | Resilience | toxiproxy: external-api-service trả 5xx / trễ vượt timeout | Phiên không kết thúc bất thường; tác tử thông báo lỗi | 100% ca đạt |
| RS-03 | Resilience | Dừng một tiến trình tác tử khi có phiên | Thời gian đến khi phiên mới được phục vụ; phiên đang chạy chuyển sang tác tử khác hay không | Ghi nhận T (giây) |
| RS-04 | Resilience | Mock Twilio trả lỗi | Tác tử thông báo không gọi được | 100% ca đạt |
| RS-05 | Resilience | Nhà cung cấp STT, LLM hoặc TTS chính lỗi / quá thời gian chờ (mock), có cấu hình dự phòng (`STT_FALLBACK`, `LLM_FALLBACK`, `TTS_FALLBACK`) | Tỷ lệ lượt vẫn được phản hồi; độ trễ tăng thêm của lượt chuyển sang dự phòng; sự kiện `provider_fallback` trong nhật ký | 100% lượt được phản hồi; ghi nhận độ trễ tăng thêm |

### 13.4 Tính hợp lệ

Chương 6 phải nêu rõ đây là **môi trường mô phỏng cục bộ**: chạy trên một máy, không có độ trễ mạng thật giữa các vùng, AI được giả lập. Kết quả chứng minh tính chất kiến trúc (mở rộng theo chiều ngang, cô lập lỗi), không phải năng lực tải trên AWS thực tế. Đưa vào mục "Mối đe dọa đối với tính hợp lệ".

---

## 14. Tệp draw.io (Track C)

### 14.1 Tổ chức tệp

Lưu trong `docs/diagrams/` (mới):

| Tệp | Nội dung | Trang (page) |
|---|---|---|
| `H4_1_aws_architecture.drawio` | Hình 4.1 kiến trúc AWS | 1 trang |
| `H4_sequences.drawio` | Sequence S1–S6 | Mỗi sequence một trang, tên trang `S1-identity-login`, `S2-voice-session`, … |
| `H4_2_turn_pipeline.drawio` | Chuỗi xử lý một lượt hội thoại (thay H4_2 cũ còn vẽ ba nhánh) | 1 trang |
| `README.md` | Quy ước vẽ, bảng màu, danh sách số bước ①…⑱ ↔ bước sequence ↔ tài nguyên `infra/` | — |

### 14.2 Quy chuẩn kỹ thuật của tệp

- Dùng stencil AWS chính thức của draw.io (`mxgraph.aws4.*`), nhóm chuẩn: `AWS Cloud`, `Region`, `VPC`, `Public subnet`.
- **Layer của draw.io** (không chỉ là khung vẽ): mỗi layer của kiến trúc là một layer riêng trong tệp để bật/tắt khi review.
- Mỗi hình khối có ID cố định, dễ đọc (ví dụ `svc-identity-fn`, `db-identity-accounts`) và thuộc tính (custom data) `service`, `aws_resource` (logical ID ở 12.1), `source` (đường dẫn tệp trong repo) → truy vết từ hình sang mã.
- Mũi tên có nhãn số bước và giao thức; ID `flow-01` … `flow-18`.
- Kiểu chữ, cỡ chữ, bảng màu thống nhất (màu theo nhóm dịch vụ AWS chuẩn); lưới căn thẳng hàng.
- Sequence dùng dạng UML chuẩn (lifeline, activation, thông điệp đồng bộ/trả về, khối `alt` cho nhánh lỗi, `opt` cho câu đệm).

### 14.3 Kiểm tra

- Script kiểm XML: mọi `aws_resource` trên hình tồn tại trong template `infra/` sau mục 12; không có tài nguyên nào trong `infra/` bị thiếu trên hình (trừ IAM role, log group gom chung).
- Mọi bước trong sequence có dòng trong bảng kiểm Phụ lục F (tệp:dòng).
- Mở tệp trên app.diagrams.net để học viên review. Agent **không** xuất PNG cho đến khi học viên duyệt; sau khi duyệt mới export 300 dpi chèn vào luận văn.

---

## 16. Phân vai và cập nhật theo mã nguồn mới (v4)

### 16.1 Phân vai

| Hạng mục | Người/agent thực hiện | Agent tài liệu làm gì |
|---|---|---|
| Sửa luận văn (mục 2–9), Phụ lục E, F, G | **Agent tài liệu** | Thực hiện |
| Tệp draw.io (mục 14) | **Agent tài liệu** | Thực hiện (là tài liệu, không phải mã) |
| Đổi tên hạ tầng, biến môi trường, ops-service lên AWS (mục 12) | AI khác | Review; lấy tên cuối cùng trong `infra/` làm căn cứ cho hình và văn bản |
| Tệp `.env` | Học viên | Review |
| Script và môi trường stress test (mục 13) | AI khác | Viết đặc tả kịch bản (mục 13.3); nhận số liệu, viết Chương 6 |
| Cơ chế dự phòng nhà cung cấp STT/LLM/TTS | AI khác (đang làm) | Đưa vào luận văn (mục 16.2) |

Nguyên tắc: văn bản và hình chỉ mô tả những gì **đã có trong mã**; hạng mục AI khác chưa xong thì chờ, không viết trước.

### 16.2 Cơ chế dự phòng nhà cung cấp AI (failover) — đưa vào luận văn

Hiện trạng mã (chưa commit): `app/providers/fallback.py`, `app/providers/__init__.py` bọc STT/LLM/TTS bằng `FallbackAdapter` của LiveKit Agents khi cấu hình `STT_FALLBACK`, `LLM_FALLBACK`, `TTS_FALLBACK`; thời gian chờ mỗi lần thử 5 giây (STT, LLM), không thử lại trên cùng nhà cung cấp; ghi sự kiện `provider_fallback` khi một nhà cung cấp bị đánh dấu không khả dụng hoặc phục hồi.

| Vị trí trong luận văn | Nội dung bổ sung |
|---|---|
| Ch.2 (mục microservices / thiết kế cho lỗi) | Mẫu dự phòng (failover) và suy giảm có kiểm soát |
| Ch.3 NFR-04 Resilience | Thêm kịch bản: nhà cung cấp AI chính lỗi → hệ thống chuyển sang dự phòng, phiên không gián đoạn |
| Ch.4 §4.7 | Thiết kế chuỗi nhà cung cấp chính → dự phòng cho từng khâu STT, LLM, TTS |
| Sequence S3 | Khối `alt`: nhà cung cấp chính lỗi → chuyển sang dự phòng |
| Hình 4.1 | Nhóm "Nhà cung cấp mô hình AI" ghi rõ chính / dự phòng |
| Ch.5 | Cấu hình và tệp hiện thực |
| Ch.6 | Kịch bản RS-05 (mục 13.3) |
| Ch.4 §4.2 (ADR) | Nêu là biện pháp giảm rủi ro phụ thuộc nhà cung cấp bên ngoài |

### 16.3 Kết quả review biến môi trường (2026-09-27)

| # | Phát hiện | Tệp | Đề xuất |
|---|---|---|---|
| 1 | Chú thích "old aliases still accepted"; `settings.py` vẫn nhận `CALL_LOGGER_URL`, `TRIP_SERVICE_URL` làm tên thay thế | `llm-orchestrator/envs/.env.example`, `app/config/settings.py` | Mâu thuẫn quyết định "không giữ tên cũ" (mục 12.2). Bỏ alias, hoặc học viên chốt giữ tạm và ghi rõ thời hạn gỡ |
| 2 | Còn tên cũ `VOICE_AGENT_LANG` | `.env.example` dòng 7, 8, 15 | Đổi thành `LLM_ORCHESTRATOR_LANG` (hoặc `AGENT_LANG`) đồng bộ mã đọc biến |
| 3 | Biến dự phòng chưa có trong hạ tầng: không có tham số `SttFallback`, `LlmFallback`, `TtsFallback`, cũng không có khóa của nhà cung cấp dự phòng Gemini (`GOOGLE_API_KEY`) | `infra/llm-orchestrator/cfn.yaml`, `infra/templates/llm-orchestrator.env.dev` | Bổ sung tham số (`NoEcho` cho khóa); nếu không, cơ chế dự phòng không bật được khi triển khai |
| 4 | Tham số CFN còn tên cũ `TripServiceUrl`, `CallLoggerUrl` | `infra/llm-orchestrator/cfn.yaml` | Đổi thành `ExternalApiServiceUrl`, `CallRecordsServiceUrl` |
| 5 | Tệp mẫu còn tên cũ `auth-service.env.dev`, `call-center.env.dev`, `call-logger.env.dev` | `infra/templates/` | Đổi theo mục 12.2 |
| 6 | Chưa có `envs/.env.example` cho identity, external-api, external-channel, call-records, ops (thư mục `envs/` trống trong git) | `src/backend/*/envs/` | Bổ sung tệp mẫu không chứa bí mật để tái lập môi trường (phục vụ Phụ lục D) |

### 16.4 Xử lý theo quyết định của học viên (2026-09-27)

| # | Quyết định | Đã làm | Kiểm tra |
|---|---|---|---|
| 1 | Giữ tạm tên cũ (đọc song song) | Giữ nguyên cơ chế đọc song song; tệp mẫu chỉ ghi tên mới, chú thích tên cũ vẫn được chấp nhận | — |
| 2 | Agent tự xử lý `VOICE_AGENT_LANG` | Đổi thành `AGENT_LANG` (trường `agent_lang`), vẫn đọc `VOICE_AGENT_LANG`; ops-service đọc `LLM_ORCHESTRATOR_ROOT/LOG_DIR` và `AGENT_LANG`, vẫn nhận tên cũ; cập nhật `config.example.toml`, `manifest.yaml`, `capability-matrix.md`; thêm test cho tên cũ | pytest `test_session_lang.py` 6/6 đạt |
| 3 | Không thêm tham số dự phòng vào CFN | Không thay đổi | Xem lưu ý A bên dưới |
| 4 | Làm sạch `infra/llm-orchestrator/cfn.yaml` | Đổi logical ID, tên vật lý, tham số, output theo mục 12.1; thêm tag; sửa lỗi `OPENAI_MODEL` không được mã đọc → `LLM_MODEL`; cập nhật `deploy.sh`, `teardown.sh`, `scale-ecs.sh`, `status.sh`, `lib/common.sh`, `deploy-all.sh`, `setup-env.sh` | `cfn-lint` đạt; `bash -n` mọi script đạt |
| 5 | Làm sạch `infra/templates/` | Đổi tên 3 tệp mẫu theo tên service (trước đây `setup-env.sh` tìm `<service>.env.dev` nên **3 tệp này chưa từng được sao chép**); biến môi trường tên mới; thêm `JWT_SECRET` cho external-channel và call-records; `setup-env.sh` sinh JWT chung cho cả 5 service | `bash -n` đạt |
| 6 | Bổ sung `envs/.env.example` | **Đính chính:** 5 tệp đã tồn tại (lần review trước đọc sót tệp ẩn). Đã làm sạch: tên mới, thêm `PORT`, bỏ `AWS_PROFILE=david` (tên profile cá nhân) trong identity-service | ops-service `tsc` + `verify:ops` đạt |

Toàn bộ pytest llm-orchestrator: 465 đạt, 1 lỗi `test_inbound_prompt_is_compact` (lời nhắc 3825 > 3200 ký tự) — thuộc phần prompt AI khác đang sửa, không liên quan thay đổi trên.

**Lưu ý cần AI khác / học viên xử lý:**

| | Phát hiện | Ảnh hưởng |
|---|---|---|
| A | "Dự phòng luôn bật" nhưng mặc định `stt_fallback`, `llm_fallback`, `tts_fallback` đều rỗng (settings.py và config.example.toml) → hiện **tắt** nếu không cấu hình | Luận văn không được viết "luôn bật" cho tới khi đặt giá trị mặc định |
| B | `Dockerfile` chỉ sao chép `app/`: không có `envs/config.<env>.toml` và `requirements/knowledge` trong image | Trên AWS, cấu hình không bí mật từ toml và FAQ RAG không có dữ liệu |
| C | `infra/external-channel-service/sam.yaml`, `infra/call-records-service/sam.yaml` không truyền `JWT_SECRET` | Lambda sẽ lỗi khi khởi động với `ENV=dev` (mã bắt buộc JWT_SECRET khi không phải local) |
| D | Các `sam.yaml` và `lib/common.sh` (tên stack) còn tên cũ | Theo mục 12.1, AI khác xử lý |

## 15. Thứ tự thực hiện cập nhật (thay mục 10)

1. Học viên xác nhận A, B, C ở mục 11.
2. Track A: đổi tên hạ tầng, biến môi trường; bổ sung ops-service (mục 12) → kiểm tra 12.4.
3. Track C: sinh tệp draw.io từ hạ tầng đã chuẩn hóa (mục 14) → học viên review.
4. Track B: dựng môi trường và chạy stress test (mục 13) → số liệu Chương 6.
5. Viết lại luận văn theo mục 2–8 → kiểm tra mục 9 → rebuild FINAL.

---

## Phụ lục: Đối chiếu comment GVHD và cách xử lý

| Comment GVHD | Vị trí | Cách xử lý trong kế hoạch |
|---|---|---|
| "Trợ lý sử dụng?" / "Chapter 4: → dịch vụ?" | §3.4.3 | Cột "Service phụ trách" trong bảng FR (mục 4.1) |
| "Chức năng riêng → Chapter 4: service riêng?" | §3.4.4 | Lý giải từ khóa đánh thức chạy trên thiết bị; mã FR-A (mục 4.1) |
| "Giao hàng? Có cần thiết không?" | §3.4.4 | Xóa hoàn toàn (mục 0 dòng 5; mục 4.1) |
| "Cần nhắc tới các NFRs để dẫn dắt đến lựa chọn MSA" | §4.1 | Mục 3.1 (lý thuyết), 4.3 (ánh xạ), 5 (ADR) |
| "Nêu rõ chức năng và NFRs nào em triển khai và đánh giá đúng các yc đó" / "NFRs: Usability, Scalability, Resilience, Performance" | Chương 6 | Mục 2 (RQ), 4.2 (NFR), 7.2 (đánh giá) |
| "Với mỗi service vẽ sequence diagram mô tả luồng hoạt động chính" / "Verify từng luồng phải match code…" | §4.2b | Mục 5.1 và Phụ lục F |
| "Label hình đặt dưới hình; hình nhỏ khó nhìn" | Hình 4.1 | Mục 6.4 |
| "Đặt lại tên layer theo tên chuẩn; tên thành phần theo chức năng (tên kỹ thuật chữ nhỏ); gộp layer 2 và 3; làm rõ kiến trúc MSA ở layer 4" / "Vẽ lại Hình 4.1 theo MSA tiêu chuẩn" | Hình 4.1 | Mục 6.2, 6.3 |

---

## 17. Tiến độ thực hiện (cập nhật 2026-09-27)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Kiểm nguồn tham khảo | Xong | 11 nguồn mới đã đối chiếu (ISO/IEC 25010:2023, Bass 2021, Lewis & Fowler 2014, Dragoni 2017, Newman 2021, Richardson 2018, Soldani 2018, Jonas 2019, AWS WAF 2024, Stivers 2009, NHTSA 2013); TLTK 8 → 19 nguồn, xếp ABC |
| Chương 1 | Xong | RQ1 = khả năng mở rộng + phục hồi; bỏ nhắc giao hàng |
| Chương 2 | Xong | Thêm 2.4 NFR/ISO 25010, 2.5 microservices (Bảng 2.1 tính chất), 2.6 serverless/container, 2.7 cơ sở ngưỡng độ trễ |
| Chương 3 | Xong | FR có cột thành phần phụ trách; FR-A thay FR-D; NFR-01..05 dạng kịch bản; CON-01..04; Bảng 3.10 NFR → tính chất MSA. **Sửa theo code:** gọi khách đi qua LiveKit SIP do Dịch vụ Chuyến đi khởi tạo; Dịch vụ Kênh liên lạc chỉ SMS + webhook |
| Chương 4 | Xong (chờ hình) | Động lực kiến trúc, ADR-01, ADR-02, kiến trúc AWS + 18 luồng, phân rã dịch vụ, S1–S6 dạng bảng bước đã đối chiếu code |
| Chương 5 | Xong | Bỏ `SPOKEN_INTENT_AUTO_TOOL` (không còn trong code); thêm dự phòng nhà cung cấp; mục triển khai AWS |
| Chương 6 | Xong khung | Tổ chức theo yêu cầu; giữ số liệu cũ; Bảng 6.6, 6.11, 6.12 chờ số liệu 「—」 |
| Phụ lục E, F, G | Xong | RTM, đối chiếu sequence (tệp:dòng), ánh xạ tên |
| Build script | Xong | Danh sách hình/bảng tự sinh từ caption; caption hình đặt dưới; `THESIS_OUT` để build bản xem trước |
| Kiểm tra tự động | Đạt | 0 từ cấm (trừ "chatbot" hợp lệ), 0 tiêu đề dạng câu hỏi, đánh số liên tục, không tham chiếu treo, 19/19 trích dẫn khớp TLTK |
| Tệp draw.io (8 hình) | Xong, chờ duyệt | `docs/diagrams/` sinh từ `gen_drawio.py`; XML hợp lệ; cần mở trên app.diagrams.net duyệt bố cục rồi xuất PNG 300% |
| Ghi FINAL.docx | Xong (2026-09-27 15:33) | 8 hình còn là dòng "Thiếu file hình" cho tới khi có PNG |
| Số liệu stress test, đo lại độ trễ | Chờ AI khác | Điền Bảng 6.6, 6.11, 6.12, RQ1 |
| ops-service trên AWS | Chờ AI khác | Chương 4 mô tả là Lambda; cập nhật Chương 5 khi stack có thật |

**Phát hiện khi đối chiếu code (đã phản ánh trong văn bản):**
- NFR-05 mục 4 "nhật ký không chứa số điện thoại đầy đủ": chưa đạt chắc chắn — `session.py` ghi `phone=` khi đăng ký phiên lỗi. Đề xuất AI khác che số trong log.
- Dịch vụ Kênh liên lạc: route `/calls/outbound/*` không có nơi nào gọi tới (chỉ SMS và webhook đang dùng) — cân nhắc gỡ hoặc ghi rõ là mã cũ.

---

## 18. Thiết kế: báo cáo vận hành hằng ngày của Dịch vụ Giám sát vận hành (đề xuất, chờ duyệt)

### 18.1 Yêu cầu (học viên nêu ngày 2026-09-27)

Mỗi ngày có một báo cáo tổng hợp: hệ thống hoạt động thế nào, phục vụ bao nhiêu tài xế, tỷ lệ trả lời chính xác, có lỗi gì, độ trễ phản hồi trung bình. Chức năng này làm Dịch vụ Giám sát vận hành **sở hữu dữ liệu của riêng nó** (báo cáo đã tổng hợp), nên cần bảng DynamoDB riêng.

Đề xuất mã yêu cầu mới: **FR-O01** — Báo cáo vận hành hằng ngày (thành phần phụ trách: Dịch vụ Giám sát vận hành).

### 18.2 Chỉ số trong báo cáo

| Nhóm | Chỉ số | Nguồn dữ liệu (đã có trong hệ thống) |
|---|---|---|
| Hoạt động | Số phiên hội thoại; **số tài xế phục vụ** (số điện thoại khác nhau); số lượt nói; tổng thời lượng; số phiên theo loại (trong ứng dụng, đề nghị chuyến, khách hàng, gọi nền); số cuộc gọi khách, số cuộc không bắt máy | Bản ghi cuộc gọi (caller, số lượt, thời lượng); sự kiện `session_start`, `call_no_answer` |
| Độ chính xác (tự động) | Tỷ lệ lời gọi công cụ thành công; tỷ lệ API nghiệp vụ lỗi (4xx/5xx); tỷ lệ phiên kết thúc bình thường | Sự kiện `event=tool`, `event=http` |
| Độ chính xác (đánh giá) | **Tỷ lệ trả lời đúng** trên mẫu lượt hội thoại trong ngày | Bản ghi hội thoại + mô hình ngôn ngữ chấm theo tiêu chí (LLM-as-judge), có thể kèm người duyệt |
| Lỗi | Tổng lỗi theo loại (công cụ, HTTP, nhà cung cấp AI, SIP); top 5 lỗi; số phiên bị ảnh hưởng; số lần chuyển nhà cung cấp dự phòng | Sự kiện `ok=false`, `provider_fallback` |
| Phản hồi | Độ trễ phản hồi **trung bình**, P50, P95; tỷ lệ lượt ≥ 2 giây; tỷ lệ lượt có câu đệm; thời gian LLM sinh token đầu trung bình | Nhật ký `turn_metrics` |

Lưu ý phương pháp: độ trễ trung bình bị kéo lệch bởi vài lượt rất chậm, nên báo cáo hiển thị trung bình cùng P95 (ngưỡng NFR-02). "Tỷ lệ trả lời chính xác" không đo được hoàn toàn tự động: phần tự động chỉ là chỉ số gián tiếp; tỷ lệ đúng thật cần chấm trên mẫu, ghi rõ cỡ mẫu và phương pháp chấm.

### 18.3 Kiến trúc đề xuất

| Thành phần | Thiết kế |
|---|---|
| Thu thập | Tác tử gửi **chỉ số của phiên** kèm bản ghi cuộc gọi khi phiên kết thúc (loại phiên, số lượt, danh sách độ trễ, số lời gọi công cụ thành công/lỗi, số lần dự phòng, lỗi). Dữ liệu có cấu trúc, không phải phân tích lại nhật ký văn bản |
| Truy vấn | Dịch vụ Lưu vết cuộc gọi bổ sung API lọc theo khoảng thời gian: `GET /api/v1/records?from=&to=` |
| Tổng hợp | Dịch vụ Giám sát vận hành chạy tác vụ tổng hợp lúc 00:15 hằng ngày (giờ Việt Nam) cho ngày trước đó, có thêm API chạy lại theo yêu cầu |
| Lịch chạy trên AWS | **Amazon EventBridge Scheduler** gọi hàm Lambda của Dịch vụ Giám sát vận hành; chạy cục bộ dùng lịch trong tiến trình |
| Lưu trữ | Bảng DynamoDB **`ops-daily-reports`** (khóa `report_date`), do Dịch vụ Giám sát vận hành sở hữu |
| Hiển thị | Trang giám sát hệ thống thêm trang "Báo cáo ngày": chọn ngày, xem các nhóm chỉ số, so sánh với ngày trước |
| API | `GET /api/v1/reports/daily?date=`, `GET /api/v1/reports/daily?from=&to=`, `POST /api/v1/reports/daily/{date}/rebuild` (chỉ quản trị hệ thống) |

### 18.4 Ảnh hưởng tới luận văn và hình vẽ

| Vị trí | Thay đổi |
|---|---|
| Chương 3 | Thêm FR-O01; Bảng 3.1 cập nhật trách nhiệm Dịch vụ Giám sát vận hành |
| Chương 4 | Bảng 4.5: dữ liệu sở hữu `ops-daily-reports`; thêm sequence S7 "Tổng hợp báo cáo ngày"; Hình 4.1 thêm bảng `ops-daily-reports` và icon EventBridge Scheduler (luồng ⑲) |
| Chương 5 | Hiện thực, tài nguyên AWS mới |
| Chương 6 | Báo cáo ngày là nguồn số liệu vận hành (độ trễ, lỗi) bổ sung cho đánh giá NFR-02, NFR-04 |
| Dịch vụ Kênh liên lạc | Bảng `channel-events` (mục trước) thay tệp `data/twilio_events.jsonl` không dùng được trên Lambda |

### 18.5 Cần học viên quyết định

1. Cách đo "tỷ lệ trả lời chính xác": (a) chỉ chỉ số tự động; (b) tự động + LLM chấm trên mẫu (ví dụ 50 lượt/ngày, có chi phí gọi mô hình); (c) như (b) + người duyệt một phần.
2. Nguồn dữ liệu: tác tử gửi chỉ số phiên có cấu trúc (đề xuất), hay đọc lại nhật ký CloudWatch.
3. Phân công: phần code và hạ tầng giao AI khác; tài liệu và hình do agent tài liệu cập nhật sau khi code xong.

---

## 19. Thực hiện với toàn quyền (học viên giao ngày 2026-09-27)

Quyết định agent tự chốt (theo tiêu chí đúng kiến trúc, bền lâu):
- Độ chính xác: chỉ số tự động + LLM chấm trên mẫu (cỡ mẫu cấu hình được, mặc định 30 lượt/ngày; tắt được khi không có khóa API), báo cáo ghi rõ phương pháp và cỡ mẫu.
- Nguồn dữ liệu báo cáo: tác tử gửi chỉ số phiên có cấu trúc kèm bản ghi hội thoại.
- Dịch vụ Kênh liên lạc: bảng `channel-events`; Dịch vụ Giám sát vận hành: bảng `ops-daily-reports` + EventBridge Scheduler.

| Giai đoạn | Nội dung | Kiểm tra |
|---|---|---|
| P1 | Dịch vụ Lưu vết cuộc gọi: trường `record_date`, GSI theo ngày, API lọc theo ngày, nhận `metrics`; Dịch vụ Kênh liên lạc: DynamoDB `channel-events` thay tệp jsonl; SAM: bảng, quyền, sửa thiếu `JWT_SECRET` | tsc, test, sam validate |
| P2 | Tác tử: bộ thu chỉ số phiên (loại phiên, số lượt, độ trễ, công cụ ok/lỗi, HTTP lỗi, dự phòng, câu đệm) gửi kèm bản ghi | pytest |
| P3 | Dịch vụ Giám sát vận hành: mô-đun báo cáo ngày (tổng hợp, LLM chấm mẫu, lưu DynamoDB, API, lịch chạy), handler Lambda, stack SAM mới | tsc, selfcheck, sam validate |
| P4 | Trang giám sát hệ thống: trang "Báo cáo ngày" | build |
| P5 | Đổi tên tài nguyên SAM theo quy ước 12.1 cho mọi stack + script triển khai | cfn-lint, bash -n, dry-run |
| P6 | Hình vẽ + luận văn: FR-O01, S7, bảng mới, EventBridge, đồng bộ số công cụ | check_layout, check_thesis, rebuild FINAL |

### 19.1 Kết quả (2026-09-27)

- P1–P6 xong; kiểm tra: tsc 5 dịch vụ, verify:records/events/ops, pytest 476/476, super-admin build, cfn-lint/sam validate, check_layout 0 lỗi / 9 trang, check_thesis 0 hình thiếu.
- Hình 5.6 chụp từ dữ liệu thật ngày 06/09/2026 (bảng `local-driver-assistant-call-records`, chạy ops-service + call-records-service cục bộ): 15 phiên, 4 tài xế, 133 lượt; LLM chấm 30 lượt: 16 đúng / 14 sai. Độ trễ để trống vì bản ghi có trước chỉ số phiên.
- Sửa phát sinh: bản ghi cũ không có `mode` → báo cáo đếm 0 tài xế; `modeOf()` (ops-service `reports/aggregate.ts`) suy ra loại phiên từ tiền tố `call_id` (`driver-`/`trip-`/`customer-`/`custcall-`), có selfcheck.
- Cấu hình cần học viên sửa: `call-records-service/envs/.env.local` thiếu `JWT_SECRET` (khác secret với identity/ops) → ops-service gọi bị 401.
- Còn chờ số đo: Bảng 6.6/6.11/6.12 (stress test cục bộ, đo lại độ trễ sau khi có chỉ số phiên).

### 19.2 Đợt sửa theo 17 góp ý của học viên (2026-09-27)

- Thuật ngữ: tác nhân hội thoại; đối tượng sử dụng (actor); Dịch vụ Nhật ký cuộc gọi; trường hợp sử dụng/kiểm thử; phân chia dịch vụ; đối chiếu yêu cầu; trạng thái phiên hội thoại; đặc tả yêu cầu; mời nhận chuyến; đợt đo 05–06/09/2026 (bỏ "A/B").
- Tóm tắt viết lại; Ch.1–4 liệt kê → gạch đầu dòng; 3.8 "Ngoài phạm vi" có lý do; 3.9 định nghĩa tiêu chí chấp nhận; 4.3 giải thích từng lớp AWS + ví dụ "nhận chuyến này".
- Ch.5–6 thêm bằng chứng thật: Bảng 5.3 (lượt gửi SMS lỗi 503, phiên vẫn tiếp tục), Bảng 5.5 (cấu trúc bản ghi call-records); Bảng 6.9 sửa E-API = 1.
- Bảng: độ rộng cột theo nội dung, canh lề; bảng bước 4.6–4.12 khớp 1:1 số bước trên hình; khung UML alt/opt sửa đúng ngữ nghĩa; Hình 6.1, 6.2 dùng dấu phẩy thập phân.
- Kiểm tra: check_thesis 0 hình thiếu; check_layout 0 lỗi; mọi tham chiếu Bảng/Hình hợp lệ; không còn thuật ngữ cũ trong FINAL.
