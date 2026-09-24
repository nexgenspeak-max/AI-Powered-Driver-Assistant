# Chương 3. Phân tích yêu cầu

Chương này trả lời câu hỏi thực tiễn: tài xế cần trợ lý làm những gì, trong tình huống nào, và hệ thống phải ứng xử ra sao khi thành công hoặc khi lỗi. Phân tích dựa trên phạm vi Chương 1, khoảng trống Chương 2, tài liệu yêu cầu nội bộ và cách nguyên mẫu đang vận hành trong kho mã nguồn dùng chung. Các yêu cầu chức năng (FR) được gắn với dịch vụ chịu trách nhiệm theo kiến trúc microservices (Microservices Architecture – MSA); các yêu cầu phi chức năng (NFR) được nhóm theo lớp chuẩn và liên hệ với tính chất MSA (khả năng mở rộng, độc lập triển khai, biên dịch vụ rõ).

## 3.1. Cách tiếp cận: từ việc tài xế làm hàng ngày

Thay vì liệt kê chức năng theo kiểu “hệ thống phải có thành phần X”, luận văn xuất phát từ các việc tài xế thường xuyên làm trên ứng dụng khi đang hoặc chuẩn bị lái xe:

- Xem hôm nay còn những chuyến nào và chuyến đang chạy đến đâu.
- Nhận hoặc từ chối chuyến mới, đặc biệt khi điện thoại reo đề nghị chuyến.
- Cập nhật tiến độ chuyến: đã đón, đang giao, hoàn thành.
- Gọi hoặc nhắn khách khi đến điểm đón, khi khách chậm, hoặc khi cần xác nhận địa chỉ.
- Hỏi cách dùng ứng dụng (câu hỏi thường gặp – FAQ) mà không phải dừng xe đọc hướng dẫn dài.
- Theo dõi thu nhập trong ngày hoặc trong khoảng thời gian gần đây.
- Kết thúc trợ lý khi xong việc, hoặc mở trợ lý bằng giọng nói (từ khóa đánh thức – wake-word) khi tay bận.

Mỗi việc trên được chuyển thành FR, kèm điều kiện chấp nhận quan sát được. Song song, NFR nêu rõ “nhanh thế nào”, “sai thì nói ra sao”, “không được bịa dữ liệu”, và vì sao các ràng buộc đó dẫn tới tách dịch vụ theo MSA (làm rõ ở mục 3.6 và Chương 4).

## 3.2. Ai dùng hệ thống và họ gặp trợ lý ở đâu?

**Tài xế** là người dùng chính và là đối tượng tham gia đánh giá trọng tâm. Họ mở trợ lý trên **ứng dụng tài xế** (micro trong ứng dụng qua WebRTC) hoặc nhận **cuộc gọi điện thoại** khi hệ thống đề nghị chuyến (SIP). Hai cửa vào này khác trải nghiệm nhưng cùng cần nghiệp vụ đúng.

**Hành vi thực tế khi đang chạy xe (cơ sở viết yêu cầu):** tài xế mắt nhìn đường, tay giữ vô-lăng; không muốn nghe danh sách dài hay địa chỉ đọc từng ký tự; câu hỏi thường ngắn và theo việc đang làm (“mấy chuyến”, “đến nơi rồi”, “gọi khách”, “thu nhập hôm nay”); thao tác rủi ro (hủy chuyến, báo khách không ra) cần hỏi lại một lần trước khi ghi nhận; khi im lâu hoặc API lỗi, bot không được “bịa chuyến” cho có chuyện nói. Phân loại câu hỏi nội bộ của dự án cũng cho thấy nhóm **chuyến đi** và **thu nhập** là lõi; chỉ đường rẽ từng bước, xăng hoặc sạc, pháp lý, và **quét/tạo đơn giao hàng từ ảnh** nằm ngoài phạm vi trợ lý và luận văn này.

**Khách hàng** có trợ lý và luồng thoại riêng: đặt chuyến, theo dõi, xem thời gian đến dự kiến, hoặc để bot gọi thay tài xế trong chế độ agent hoặc gọi nền. Luận văn **không** tổ chức khảo sát trải nghiệm sử dụng với khách thật trên đường. Tính “khách có thể dùng” được chấp nhận qua **bộ test case** (kiểm thử tự động và kịch bản hội thoại đã thiết kế), chấm đạt hoặc không đạt theo điều kiện nghiệp vụ, không suy ra mức hài lòng của toàn bộ khách hàng.

**Điều phối và quản trị** tạo chuyến thử, theo dõi cuộc gọi trên bảng quản trị; **vận hành kỹ thuật** xem tổng quan qua **ops-service**. Các vai trò này không đứng trên đường nóng “tài xế đang nói với bot”, nhưng cần có để nguyên mẫu chạy được từ đầu đến cuối.

Về phía phần mềm, hệ thống được tổ chức thành các dịch vụ độc lập theo chức năng (chi tiết ràng buộc ở Bảng 3.2; ánh xạ FR ở Bảng 3.7):

| Dịch vụ | Vai trò ngắn |
|---|---|
| **identity-service** | Tài khoản, đăng nhập, cấp và xác minh JWT, cài đặt tài xế (ví dụ chế độ gọi khách mặc định) |
| **external-api-service** | Nguồn sự thật nghiệp vụ: chuyến, ngữ cảnh tài xế, token thoại LiveKit, điều phối đề nghị chuyến |
| **llm-orchestrator** | Worker hội thoại trên LiveKit: STT → LLM kèm công cụ → TTS; gọi HTTP, không mở cơ sở dữ liệu |
| **external-channel-service** | Kênh ra thế giới ngoài (PSTN/SMS qua nhà cung cấp thoại, ví dụ Twilio) |
| **call-records-service** | Lưu vết / tóm tắt cuộc gọi phục vụ đối soát |
| **ops-service** | Tổng quan vận hành, proxy nhật ký và sức khỏe dịch vụ cho Super Admin |

Ứng dụng tài xế lo giao diện, lấy JWT từ identity-service, lấy token thoại từ external-api-service, từ khóa đánh thức trên máy và tham gia phòng LiveKit. LiveKit là nền tảng truyền âm thanh thời gian thực (WebRTC trong ứng dụng; SIP khi cần mạng điện thoại công cộng), không thay thế lớp nghiệp vụ.

## 3.3. Bối cảnh vận hành: một phiên trợ lý diễn ra thế nào?

### 3.3.1. Tài xế chủ động mở trợ lý trong ứng dụng

Khi tài xế bấm trợ lý (hoặc từ khóa đánh thức kích hoạt kết nối), ứng dụng dùng phiên đã đăng nhập (JWT từ **identity-service**) để xin token thoại từ **external-api-service**, rồi tham gia phòng hội thoại LiveKit; **llm-orchestrator** nhận việc và kết nối âm thanh. Nếu phiên trước vẫn còn agent trong phòng, hệ thống tái sử dụng phòng đó thay vì tạo mới. Bot chào nhanh trước (“Chào bạn, tôi là Czen…”) trong khi nạp ngữ cảnh tài xế — danh sách chuyến, chuyến hiện tại, thu nhập hôm nay, cấu hình gọi khách mặc định — rồi hỏi tài xế cần gì. Chuỗi bước chi tiết trình bày ở mục 4.2b; đường dẫn API cụ thể ở Chương 5.

Ngữ cảnh được giữ trong bộ nhớ phiên để các câu hỏi kiểu “hôm nay còn mấy chuyến?” có thể trả lời từ dữ liệu đã tải (hoặc làm mới qua API), giảm chờ gọi mạng lặp lại — vẫn **không** được bịa số liệu khi ngữ cảnh trống hoặc API lỗi.

**Một đường xử lý lượt nói (yêu cầu hành vi):** mỗi câu tài xế đi theo chuỗi **STT → LLM kèm công cụ → TTS**. Khi phản hồi chậm khoảng từ hai giây trở lên, hệ thống có thể phát **câu giữ chỗ** ngắn (ví dụ “Đợi mình một chút…”) — câu này **không** chứa sự kiện chuyến, thu nhập hay kết quả cuộc gọi. Không có “đường tắt” tự bịa trạng thái chuyến để nói cho nhanh. Chi tiết thiết kế ở Chương 4; ngưỡng cảm nhận gắn NFR-P01.

### 3.3.2. Hệ thống gọi tài xế đề nghị chuyến

Khi có chuyến mới cần hỏi nhận/từ chối, **external-api-service** điều phối cuộc gọi SIP tới tài xế (qua LiveKit SIP / kênh thoại), tạo phòng hội thoại gắn metadata chuyến, và agent chỉ mở **hai việc chính**: nhận chuyến hoặc từ chối. Lời chào nêu điểm đón và hỏi có nhận không. Cách làm này khớp thực tiễn: lúc điện thoại reo, tài xế không cần (và không nên) bị đưa vào menu công cụ đầy đủ như lúc chủ động mở trợ lý trong ứng dụng.

Nếu tài xế **đang** mở phiên trợ lý trong ứng dụng, hệ thống có thể đẩy thông báo vào phòng hiện có thay vì luôn gọi SIP mới — tránh “hai nơi hỏi cùng một chuyến” một cách lẫn lộn.

### 3.3.3. Ba cách gọi khách — nhu cầu khác nhau

Khi tài xế nói “gọi khách”, thực tế có ba cách làm việc, phản ánh đúng hoàn cảnh trên xe:

**Bảng 3.1.** Ba chế độ gọi khách (yêu cầu hành vi)

| Chế độ | Tài xế trải nghiệm thế nào | Khi nào hợp |
|---|---|---|
| Agent gọi hộ | Bot nói chuyện với khách; tài xế có thể nghe / chen khi cần | Muốn bot hỏi hộ, mình vẫn theo dõi |
| Nói trực tiếp (bridge) | Kết nối để tài xế nói thẳng với khách; bot không “nói đè” | Cần trao đổi nhanh, cá nhân |
| Gọi nền | Bot gọi trong phòng riêng; tài xế tiếp tục hỏi việc khác trên trợ lý | Đang bận lái / làm việc khác, chỉ cần kết quả sau |

Mặc định lấy từ **cài đặt tài xế** (lưu qua **identity-service**, đưa vào ngữ cảnh phiên qua **external-api-service**), để bot không hỏi lại “chọn chế độ nào?” mỗi lần — trừ khi tài xế nói rõ (“nói trực tiếp”, “gọi nền”). Gọi số không thuộc chuyến hiện tại bắt buộc có bước xác nhận trước khi quay số. Quay số và SMS ra ngoài đi qua **external-channel-service**; tóm tắt/lưu vết cuộc gọi thuộc **call-records-service**.

**Bảng 3.2.** Thành phần hệ thống và ràng buộc tích hợp

| Thành phần | Việc phải làm cho trợ lý | Ràng buộc quan trọng |
|---|---|---|
| Ứng dụng tài xế | Đăng nhập, lấy token thoại, vào phòng, mic/loa, từ khóa đánh thức, giao diện | Không tự bịa dữ liệu chuyến; JWT chỉ nhận từ identity-service |
| identity-service | Đăng nhập, JWT, cài đặt (ví dụ chế độ gọi mặc định) | **Duy nhất** nơi cấp/xác minh JWT đăng nhập; không ghi sổ chuyến |
| external-api-service | Ngữ cảnh, chuyến, token thoại, điều phối đề nghị chuyến | Nguồn sự thật nghiệp vụ chuyến; không thay identity cấp JWT đăng nhập |
| llm-orchestrator | STT–LLM+công cụ–TTS; chọn công cụ; gọi HTTP | Không truy cập cơ sở dữ liệu trực tiếp; không bịa sự kiện chuyến |
| LiveKit | Truyền âm thanh thời gian thực; SIP khi cần | Phân biệt trong ứng dụng và cuộc gọi điện thoại |
| external-channel-service | Quay số / SMS ra mạng công cộng | Không phải nguồn sự thật chuyến |
| call-records-service | Lưu vết / tóm tắt cuộc gọi | Phục vụ đối soát, không điều khiển nghiệp vụ chuyến |
| ops-service | Tổng quan sức khỏe, nhật ký vận hành | Không nằm trên đường nóng lượt thoại tài xế |

## 3.4. Yêu cầu chức năng theo việc làm thật

Danh mục công cụ đầy đủ ở Phụ lục A (Bảng A.1): **46 công cụ** gói tiếng Việt, trong đó khoảng 40 phục vụ tài xế (kèm FAQ và kết thúc phiên), phần còn lại phục vụ luồng khách. Gói tiếng Anh có tập công cụ đối xứng. (Một số công cụ liên quan đơn giao hàng trong mã nguồn lịch sử **không** thuộc phạm vi đánh giá luận văn — xem mục 3.7.)

### 3.4.1. Việc liên quan chuyến đi

Nhóm này gồm các yêu cầu quanh vòng đời một chuyến: xem lịch, theo dõi chuyến đang chạy, cập nhật tiến độ, nhận hoặc từ chối chuyến mới và hủy chuyến. Mỗi dòng trong Bảng 3.3 nêu câu tài xế thường nói, việc hệ thống phải làm và điều kiện để coi là chấp nhận được.

**Bảng 3.3.** Yêu cầu chức năng nhóm chuyến đi (FR-T)

| Mã | Việc tài xế muốn | Hệ thống phải | Điều kiện chấp nhận |
|---|---|---|---|
| FR-T01 | “Hôm nay còn chuyến nào?” | Đọc lịch/chuyến sắp tới từ ngữ cảnh hoặc API | Nêu đúng dữ liệu; không bịa chuyến |
| FR-T02 | “Chuyến hiện tại thế nào?” | Nêu điểm đón/trả, trạng thái đang có | Thiếu dữ liệu thì nói thiếu, không đoán |
| FR-T03 | “Đã đón khách / cập nhật tiến độ” | Đổi trạng thái qua backend khi đủ điều kiện | Xác nhận lại bằng lời ngắn **sau** khi API thành công |
| FR-T04 | Nhận / từ chối chuyến mới | Đúng công cụ nhận hoặc từ chối (đặc biệt lúc hệ thống gọi đề nghị chuyến) | Không nhầm với hủy chuyến đang chạy |
| FR-T05 | “Hủy chuyến này” | Hai bước: hỏi chắc, rồi mới hủy | Không hủy chỉ vì một câu mơ hồ |

### 3.4.2. Việc liên lạc khách

Nhóm này gồm các yêu cầu quanh việc gọi và nhắn khách: gọi khách của chuyến theo chế độ đã chọn, gọi số khác có xác nhận, gửi tin nhắn, hỏi vị trí khách và đọc lại tóm tắt cuộc gọi. Bảng 3.4 liệt kê chi tiết.

**Bảng 3.4.** Yêu cầu chức năng nhóm liên lạc khách (FR-C)

| Mã | Việc tài xế muốn | Hệ thống phải | Điều kiện chấp nhận |
|---|---|---|---|
| FR-C01 | “Gọi khách giúp” | Gọi theo chế độ agent / nói trực tiếp / gọi nền | Đúng khách của chuyến; tôn trọng mặc định + lời nói rõ khác mặc định |
| FR-C02 | Gọi số khác / danh bạ | Hỏi xác nhận rồi mới quay | Có bước xác nhận rõ |
| FR-C03 | Nhắn SMS | Gửi qua backend khi được hỗ trợ | Báo thành công/thất bại ngắn |
| FR-C04 | “Khách đang ở đâu / xác nhận với khách” | Dùng API vị trí / xác nhận nếu có | Không bịa vị trí |
| FR-C05 | “Gọi xong chưa? Tóm tắt cuộc gọi” | Đọc trạng thái / tóm tắt từ nhật ký | Không có dữ liệu thì nói chưa có |

### 3.4.3. Chờ đón, sự cố, thu nhập, FAQ, ngôn ngữ

Nhóm này gộp các yêu cầu còn lại của luồng tài xế: đặt nhắc và gia hạn thời gian chờ, báo khách không ra hoặc báo sự cố, tra thu nhập và bật tắt nhận chuyến, hỏi cách dùng ứng dụng, và chuyển đổi ngôn ngữ phiên. Bảng 3.5 nêu yêu cầu cốt lõi cho từng việc.

**Bảng 3.5.** Yêu cầu chức năng cho chờ đón, sự cố, thu nhập, FAQ và ngôn ngữ

| Mã | Việc tài xế muốn | Yêu cầu cốt lõi |
|---|---|---|
| FR-W01 | Đặt nhắc | Tạo nhắc và đọc lại thời điểm |
| FR-W02 | “Cho thêm vài phút chờ” | Gia hạn chờ qua backend |
| FR-I01 | “Khách không ra” | Gợi ý chờ/gọi nếu hợp lý; báo khách không ra sau xác nhận |
| FR-I02 | Báo sự cố | Hỏi loại sự cố; ghi nhận; không xử lý tranh chấp pháp lý/thanh toán |
| FR-E01–E03 | Thu nhập / thống kê / bật–tắt nhận chuyến | Lấy số từ API; thiếu thì nói chưa có |
| FR-F01–F02 | Hỏi cách dùng ứng dụng | Ưu tiên FAQ/tri thức; ngoài phạm vi thì từ chối đúng cách |
| FR-L01–L03 | Tiếng Việt / Anh; tắt trợ lý; đúng kiểu phiên | Hành vi công cụ tương đương; không trộn công cụ phiên trong ứng dụng với phiên đề nghị chuyến qua điện thoại |

### 3.4.4. Từ khóa đánh thức và kết thúc nói trực tiếp (ngoài lượt công cụ chuẩn)

Hai việc sau thuộc phạm vi sản phẩm nhưng **không** đi theo lượt thoại rồi gọi công cụ như “xem lịch”. Quét đơn giao hàng từ ảnh (**FR-D01** trong tài liệu cũ) **đã loại khỏi phạm vi** luận văn. Bảng 3.6 mô tả các việc còn giữ.

**Bảng 3.6.** Việc ngoài lượt thoại công cụ: từ khóa đánh thức và kết thúc bridge

| Mã | Việc | Cách vận hành thực tế |
|---|---|---|
| FR-D02 | Gọi trợ lý bằng từ khóa | Nhận dạng từ khóa trên máy (wake-word) → mở cùng luồng lấy token + vào phòng như bấm mic |
| FR-D03 | Kết thúc nói chuyện trực tiếp với khách | Trong chế độ nói trực tiếp, dùng cụm từ kết thúc (ví dụ “Trợ lý kết thúc”) |

### 3.4.5. Ánh xạ FR → dịch vụ (MSA)

Bảng 3.7 neo từng nhóm FR vào dịch vụ chịu trách nhiệm chính. Một FR có thể **xuyên** nhiều dịch vụ (ví dụ gọi khách: llm-orchestrator chọn công cụ → external-api-service khởi tạo → external-channel-service quay số), nhưng mỗi dịch vụ vẫn có biên “sở hữu / không sở hữu” rõ để độc lập triển khai.

**Bảng 3.7.** Ánh xạ nhóm yêu cầu chức năng sang dịch vụ

| Nhóm FR | Dịch vụ chính | Dịch vụ hỗ trợ / nền tảng |
|---|---|---|
| FR-T01–T05 (chuyến) | external-api-service (dữ liệu + đổi trạng thái); llm-orchestrator (hội thoại + công cụ) | LiveKit (âm thanh); identity-service (JWT khi app gọi API) |
| FR-C01–C05 (liên lạc khách) | llm-orchestrator; external-api-service; external-channel-service | call-records-service (tóm tắt); identity-service (mặc định chế độ gọi) |
| FR-W / FR-I / FR-E / FR-F / FR-L | llm-orchestrator + external-api-service (và FAQ trong orchestrator) | identity-service (cài đặt / ngôn ngữ phiên khi áp dụng) |
| FR-D02–D03 | Ứng dụng tài xế (wake-word; cụm kết thúc bridge) + cùng đường mở phiên | llm-orchestrator sau khi vào phòng |
| Đăng nhập / phiên người dùng | **identity-service** (JWT) | Ứng dụng lưu token; các API khác **xác minh** JWT, không tự cấp JWT đăng nhập |
| Đề nghị chuyến qua điện thoại | external-api-service (điều phối) + LiveKit SIP | llm-orchestrator (chỉ nhận/từ chối) |
| Quan sát vận hành | ops-service | call-records-service (đối soát cuộc gọi) |

## 3.5. Use case chính (kèm luồng thành công / thất bại)

**Bảng 3.8.** Use case cốt lõi

| Mã | Tình huống | Thành công khi | Thất bại / ngoại lệ phải xử lý |
|---|---|---|---|
| UC01 | Xem lịch chuyến trong ứng dụng | Nêu đúng danh sách từ ngữ cảnh/API | Ngữ cảnh trống → nói chưa có chuyến / nhờ làm mới |
| UC02 | Gọi điện đề nghị chuyến → nhận/từ chối | Cập nhật đúng quyết định | Không nghe rõ → hỏi lại; API lỗi → báo không cập nhật được |
| UC03 | Cập nhật tiến độ | Trạng thái mới được xác nhận | Không đủ điều kiện nghiệp vụ → giải thích ngắn |
| UC04 | Gọi khách (một trong ba chế độ) | Cuộc gọi khởi tạo đúng chế độ | Đang có cuộc gọi → không mở thêm; lỗi quay số → báo rõ |
| UC05 | Hủy chuyến hai bước | Chỉ hủy sau “đồng ý” | “Không” → hủy thao tác, giữ chuyến |
| UC06 | Báo khách không ra / sự cố | Ghi nhận sau xác nhận | Không bịa quy định bồi thường |
| UC07 | Hỏi FAQ | Trả lời theo playbook | Ngoài phạm vi → hướng dẫn kênh phù hợp |
| UC08 | Thu nhập / online–offline | Đúng số liệu hoặc trạng thái API | Thiếu API → nói chưa có dữ liệu |
| UC09 | Im lặng lâu / API lỗi giữa chừng | Hỏi còn đó không, hoặc báo lỗi ngắn, không làm sập phiên | Không bịa chuyến để “cho có chuyện nói” |
| UC10 | Từ khóa đánh thức mở trợ lý | Vào được phiên trong ứng dụng bình thường | Không nhận từ khóa → tài xế vẫn bấm mic được |

Chi tiết lời thoại mẫu từng lượt để ở Phụ lục B.

## 3.6. Yêu cầu phi chức năng: lớp chuẩn, trải nghiệm lái xe và tính chất MSA

Các NFR được phát biểu ở hai lớp gắn nhau: (1) **lớp chuẩn** dùng trong kỹ nghệ phần mềm và MSA; (2) **cách hiểu thực tiễn** khi tài xế vừa lái vừa nói. Mục này trả lời câu hỏi của hướng dẫn: *vì sao các NFR này dẫn tới kiến trúc microservices?* — vì hiệu năng cảm nhận, độ tin cậy nghiệp vụ, bảo mật JWT và khả năng mở rộng từng kênh (thoại, PSTN, sổ chuyến) đòi hỏi **tách biên**, **độc lập triển khai** và **không chia sẻ cơ sở dữ liệu** giữa worker hội thoại và dịch vụ nghiệp vụ.

### 3.6.1. Nhóm NFR theo lớp chuẩn và ánh xạ MSA

**Bảng 3.9.** Nhóm NFR chuẩn, mã chi tiết và tính chất MSA liên quan

| Lớp NFR | Mã | Yêu cầu (tóm tắt) | Tính chất MSA được hỗ trợ |
|---|---|---|---|
| Hiệu năng (Performance) | NFR-P01 | P95 độ trễ cảm nhận (dứt câu → bot bắt đầu nói) ≤ 2 giây trên việc cốt lõi | Tách I/O: prefetch ngữ cảnh, filler giữ chỗ; scale worker llm-orchestrator độc lập app |
| Hiệu năng | NFR-P02 | Prefetch / cache ngữ cảnh giảm chờ API lặp trên câu đầu phiên | Biên rõ: orchestrator đọc qua HTTP, không nhúng logic DB |
| Hiệu năng | NFR-P03 | Filler ~2 giây không chứa sự kiện chuyến | Độc lập trải nghiệm thoại khỏi độ trễ LLM nhà cung cấp |
| Độ tin cậy / đúng đắn (Reliability) | NFR-R01 | Không bịa chuyến / thu nhập / cuộc gọi / vị trí | Nguồn sự thật chỉ ở external-api-service (+ call-records khi tóm tắt) |
| Độ tin cậy | NFR-R02 | Thao tác rủi ro phải hỏi lại (hủy, khách không ra, số lạ) | Hành vi an toàn không phụ thuộc “đường tắt” bịa trạng thái |
| Độ tin cậy | NFR-R03 | Câu trả lời ngắn trên loa (một ý chính mỗi lượt khi có thể) | Giảm tải nhận thức; không đòi hỏi dịch vụ UI riêng |
| Khả năng mở rộng (Scalability) | NFR-SC01 | Tăng tải thoại / PSTN / API chuyến có thể scale theo dịch vụ | MSA: scale llm-orchestrator, external-channel-service, external-api-service tách nhau |
| Độc lập & biên rõ (Independence / clear boundaries) | NFR-I01 | llm-orchestrator chỉ HTTP; không mở DB | Autonomy: đổi STT/LLM/TTS không đụng schema chuyến |
| Độc lập & biên rõ | NFR-I02 | JWT đăng nhập **chỉ** qua identity-service | Auth tập trung; dịch vụ khác chỉ verify |
| Độc lập & biên rõ | NFR-I03 | external-api (sổ chuyến) ≠ external-channel (PSTN/SMS) | Không gộp SIP LiveKit với Twilio thành một “hộp thoại” mơ hồ |
| Bảo mật & riêng tư (Security) | NFR-S01–S02 | Hạn chế lộ SĐT/token trên loa và nhật ký | Biên dịch vụ + chính sách log theo phòng |
| Bảo mật & riêng tư | NFR-S03 | Vị trí / điểm đón chỉ mức đủ dùng; không bịa tọa độ | Khớp FR-C04 |
| Quan sát được (Observability) | NFR-O01 | Lỗi lần theo được theo phiên (`room=`) | ops-service + log gắn phiên; gỡ một cuộc hội thoại |
| Đa ngôn ngữ | NFR-L01 | Việt / Anh cùng việc | Gói công cụ đối xứng trong orchestrator |
| Trải nghiệm sử dụng (Usability) | NFR-U01 | Ngắn, ít bước việc quen; xác nhận trước hành động phá hủy | Đo ở Chương 6 bằng danh mục kiểm tra hành vi, không bắt buộc thang SUS |

### 3.6.2. Cách hiểu thực tiễn trên xe

**Bảng 3.10.** NFR nhìn từ trải nghiệm lái xe (bổ sung diễn giải)

| Mã | Cách hiểu thực tiễn |
|---|---|
| NFR-P01 | Tài xế dứt câu → nghe bot nói lại trong khoảng chấp nhận được khi đang lái |
| NFR-P02–P03 | Câu đầu về lịch/chuyến tận dụng ngữ cảnh đã nạp; nếu LLM chậm thì nghe filler trung tính, không nghe “đã nhận chuyến” giả |
| NFR-R01 | Sai thì nhận thiếu dữ liệu — độ chính xác nghiệp vụ ưu tiên hơn sự trôi chảy giả tạo |
| NFR-R02 | Hủy chuyến, khách không ra, gọi số lạ: hỏi lại một lần |
| NFR-U01 | Trả lời ngắn; việc quen thuộc ít bước; đo hoàn thành nghiệp vụ ở Chương 6 |

Về hành vi im lặng: nguyên mẫu hiện nhắc tài xế khi im lâu (khoảng 15 giây, tối đa hai lần nhắc rồi kết thúc lịch sự). Đây là yêu cầu trải nghiệm cần giữ khi đánh giá UC09.

Các NFR trên là đầu vào thiết kế Chương 4: MSA được chọn không phải vì “chia nhỏ cho đẹp”, mà vì Performance + Reliability + Security + Scalability đòi hỏi tách **hội thoại**, **sổ chuyến**, **kênh PSTN**, **định danh** và **quan sát vận hành**.

## 3.7. Trong phạm vi và ngoài phạm vi

**Trong phạm vi:** FR-T, FR-C, FR-W, FR-I, FR-E, FR-F, FR-L, FR-D02, FR-D03 và toàn bộ NFR mục 3.6 — kênh trong ứng dụng và gọi điện khi cần, FAQ, từ khóa đánh thức (tóm tắt khớp mục 1.5 sau khi loại quét đơn).

**Ngoài phạm vi luận văn:**

- Quét / tạo đơn giao hàng từ ảnh (**FR-D01** / delivery scan) và nghiệp vụ đơn giao hàng gắn ảnh;
- Nhắn tin nhóm tài xế; chỉ đường rẽ từng bước thay Google Maps/Waze;
- Tranh chấp thanh toán–hoàn tiền–bảo hiểm; đổi hồ sơ/biển số bằng giọng nói; quên mật khẩu;
- Thao tác ứng dụng hãng khác; huấn luyện lại mô hình nhận dạng/sinh giọng từ dữ liệu riêng quy mô lớn;
- Nhà cung cấp định danh đám mây kiểu Cognito nếu không hiện diện trong mã nguồn nguyên mẫu (nguyên mẫu dùng **identity-service**).

## 3.8. Tiêu chí chấp nhận đưa sang Chương 6

**Bảng 3.11.** Từ yêu cầu sang chỉ số

| Nhóm việc | Đo bằng gì | Use case ưu tiên |
|---|---|---|
| Chuyến + gọi khách (tài xế) | Đúng công cụ; xong việc; danh mục kiểm tra trải nghiệm khi lái | UC01–UC06 |
| FAQ | Đúng FAQ; không bịa chính sách | UC07 |
| Độ trễ (**ưu tiên cao nhất**) | P95 ≤ 2s (speech → first audio); có filler khi chậm | UC01, UC03, UC04, UC07 |
| Nghe trong ồn | WER yên vs nhiễu | Mẫu đọc cố định |
| Luồng khách (chấp nhận qua test case) | Đạt/không đạt test case (công cụ + chế độ gọi) | TC gọi khách / custcall / ghi nhận yêu cầu khách |
| Bảo mật, JWT và vị trí | Danh mục kiểm tra NFR-S / NFR-I02 | Gắn với UC vị trí, gọi, nhật ký, đăng nhập |
| Từ khóa đánh thức | Kiểm riêng | UC10 |
| Im lặng / lỗi API | Hành vi an toàn; không bịa chuyến | UC09 |
| Biên MSA | Orchestrator không mở DB; JWT chỉ identity-service | Kiểm mã / danh mục NFR-I |

## Kết luận chương

Chương 3 đã neo yêu cầu vào **hành vi tài xế khi chạy xe** (câu ngắn, rảnh tay, xác nhận rủi ro), vào luồng vận hành thật với **một đường thoại** STT → LLM+công cụ → TTS, và làm rõ phía khách được chấp nhận qua test case chứ không phải khảo sát trên đường. FR được ánh xạ sang bộ dịch vụ MSA (identity-service, external-api-service, llm-orchestrator, external-channel-service, call-records-service, ops-service); NFR được nhóm theo lớp chuẩn và gắn với khả năng mở rộng, độc lập và biên rõ — làm tiền đề thiết kế Chương 4. Quét đơn giao hàng (FR-D01) nằm ngoài phạm vi.

---

## Self-review (Chương 3 — rà NFR/MSA 2026-09-24)

| Hạng mục | Kết quả |
|---|---|
| Tên dịch vụ mới (glossary) | Đạt |
| FR-D01 / delivery out of scope | Đạt |
| FR → service map (Bảng 3.7) | Đạt |
| NFR lớp chuẩn + MSA (Bảng 3.9) | Đạt |
| Single voice path + filler không bịa | Đạt |
| JWT chỉ identity-service | Đạt |
| Không claim Cognito | Đạt |
| Ảnh UI / hình mới | Không tạo — Chinh vẽ sau |
| Đồng bộ Ch.4–6 / kết luận build (một đường + câu giữ chỗ) | Đã chỉnh — đường tắt chỉ còn như đợt A/B lịch sử ở Ch.6 |
