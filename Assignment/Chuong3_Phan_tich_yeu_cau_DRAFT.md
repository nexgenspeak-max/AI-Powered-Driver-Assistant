# Chương 3. Phân tích yêu cầu

Chương này trả lời câu hỏi thực tiễn: *tài xế cần trợ lý làm những gì, trong tình huống nào, và hệ thống phải ứng xử ra sao khi thành công hoặc khi lỗi*. Phân tích dựa trên phạm vi Chương 1, khoảng trống Chương 2, tài liệu yêu cầu nội bộ và **cách nguyên mẫu đang vận hành trong kho mã nguồn dùng chung** (không mô tả trừu tượng tách rời mã nguồn).

## 3.1. Cách tiếp cận: từ việc tài xế làm hàng ngày

Thay vì liệt kê chức năng theo kiểu “hệ thống phải có thành phần X”, luận văn xuất phát từ các việc tài xế thường xuyên làm trên ứng dụng khi đang hoặc chuẩn bị lái xe:

- Xem hôm nay còn những chuyến nào / chuyến đang chạy thế nào.
- Nhận hoặc từ chối chuyến mới (đặc biệt khi điện thoại reo đề nghị chuyến).
- Cập nhật đã đón / đang giao / hoàn thành.
- Gọi hoặc nhắn khách khi đến điểm đón, khách chậm, cần xác nhận địa chỉ.
- Hỏi cách dùng ứng dụng (câu hỏi thường gặp – FAQ) mà không phải dừng xe đọc hướng dẫn dài.
- Theo dõi thu nhập trong ngày / khoảng thời gian gần đây.
- Kết thúc trợ lý khi xong việc; hoặc mở trợ lý bằng giọng nói (từ khóa đánh thức – wake-word) khi tay bận.

Mỗi việc trên được chuyển thành yêu cầu chức năng (FR), kèm điều kiện chấp nhận quan sát được. Song song, các yêu cầu phi chức năng (NFR) nêu rõ “nhanh thế nào”, “sai thì nói ra sao”, “không được bịa dữ liệu”.

## 3.2. Ai dùng hệ thống và họ gặp trợ lý ở đâu?

**Tài xế** là người dùng chính và là đối tượng tham gia đánh giá trọng tâm. Họ mở trợ lý trên **ứng dụng tài xế** (micro trong ứng dụng qua WebRTC) hoặc nhận **cuộc gọi điện thoại** khi hệ thống đề nghị chuyến (SIP). Hai cửa vào này khác trải nghiệm nhưng cùng cần nghiệp vụ đúng.

**Hành vi thực tế khi đang chạy xe (cơ sở viết yêu cầu):** tài xế mắt nhìn đường, tay giữ vô-lăng; không muốn nghe danh sách dài hay địa chỉ đọc từng ký tự; câu hỏi thường ngắn và theo việc đang làm (“mấy chuyến”, “đến nơi rồi”, “gọi khách”, “thu nhập hôm nay”); thao tác rủi ro (hủy chuyến, báo khách không ra) cần hỏi lại một lần trước khi ghi nhận; khi im lâu hoặc API lỗi, bot không được “bịa chuyến” cho có chuyện nói. Phân loại câu hỏi nội bộ của dự án cũng cho thấy nhóm **chuyến đi** và **thu nhập** là lõi; chỉ đường rẽ từng bước, xăng/sạc, pháp lý… nằm ngoài phạm vi trợ lý này.

**Khách hàng** có trợ lý / luồng thoại riêng (đặt–theo dõi–thời gian đến dự kiến, hoặc bot gọi thay tài xế trong chế độ agent / gọi nền). Luận văn **không** tổ chức khảo sát trải nghiệm sử dụng với khách thật trên đường. Tính “khách có thể dùng” được chấp nhận qua **bộ test case** (kiểm thử tự động + kịch bản hội thoại đã thiết kế) — đạt/không đạt theo điều kiện nghiệp vụ, không suy ra mức hài lòng của toàn bộ khách hàng.

**Điều phối / quản trị** tạo chuyến thử, theo dõi cuộc gọi trên bảng quản trị; **vận hành kỹ thuật** xem tổng quan qua lớp ops. Các vai trò này không đứng trên đường nóng “tài xế đang nói với bot”, nhưng cần có để nguyên mẫu chạy được từ đầu đến cuối.

Về phía phần mềm, “bộ não” hội thoại là **voice-agent** (tiến trình worker Python trên LiveKit). “Sổ sách chuyến đi” là **trip-service**. Đăng nhập do **auth-service**. Gọi điện ra ngoài và lưu dấu vết cuộc gọi liên quan **call-center** / **call-logger**. Ứng dụng tài xế lo giao diện, lấy token thoại, từ khóa đánh thức và tham gia phòng LiveKit.

## 3.3. Bối cảnh vận hành: một phiên trợ lý diễn ra thế nào?

### 3.3.1. Tài xế chủ động mở trợ lý trong ứng dụng

Luồng thực tế khi tài xế bấm trợ lý (hoặc từ khóa đánh thức kích hoạt kết nối):

1. Ứng dụng gọi trip-service **`POST /api/v1/voice/token`** (kèm số điện thoại tài xế và ngôn ngữ).
2. Nhận token LiveKit và tên phòng dạng **`driver-{sốđiệnthoại}-{mã}`**. Nếu phiên cũ vẫn còn agent trong phòng, hệ thống có thể **tái sử dụng** cùng phòng thay vì tạo mới.
3. Ứng dụng tham gia phòng; voice-agent nhận việc, kết nối âm thanh.
4. Bot chào nhanh trước (*“Chào bạn, tôi là Czen…”*), đồng thời nạp ngữ cảnh tài xế từ **`GET /api/v1/drivers/me/context`** (danh sách chuyến, chuyến hiện tại, thu nhập hôm nay, cấu hình gọi khách mặc định…).
5. Sau khi có ngữ cảnh, bot hỏi *“Tôi có thể giúp gì cho bạn?”* và sẵn sàng nhận lệnh.

Ngữ cảnh được giữ trong bộ nhớ phiên để các câu hỏi kiểu “hôm nay còn mấy chuyến?” có thể trả lời từ dữ liệu đã tải, giảm chờ gọi mạng lặp lại.

### 3.3.2. Hệ thống gọi tài xế đề nghị chuyến

Khi có chuyến mới cần hỏi nhận/từ chối, trip-service điều phối cuộc gọi SIP tới tài xế, tạo phòng hội thoại gắn metadata chuyến, và agent chỉ mở **hai việc chính**: nhận chuyến hoặc từ chối. Lời chào nêu điểm đón và hỏi có nhận không. Cách làm này khớp thực tiễn: lúc điện thoại reo, tài xế không cần (và không nên) bị đưa vào menu công cụ đầy đủ như lúc chủ động mở trợ lý trong ứng dụng.

Nếu tài xế **đang** mở phiên trợ lý trong ứng dụng, hệ thống có thể đẩy thông báo vào phòng hiện có thay vì luôn gọi SIP mới — tránh “hai nơi hỏi cùng một chuyến” một cách lẫn lộn.

### 3.3.3. Ba cách gọi khách — nhu cầu khác nhau

Khi tài xế nói “gọi khách”, thực tế có ba cách làm việc, phản ánh đúng hoàn cảnh trên xe:

**Bảng 3.1.** Ba chế độ gọi khách (yêu cầu hành vi)

| Chế độ | Tài xế trải nghiệm thế nào | Khi nào hợp |
|---|---|---|
| Agent gọi hộ | Bot nói chuyện với khách; tài xế có thể nghe / chen khi cần | Muốn bot hỏi hộ, mình vẫn theo dõi |
| Nói trực tiếp (bridge) | Kết nối để tài xế nói thẳng với khách; bot không “nói đè” | Cần trao đổi nhanh, cá nhân |
| Gọi nền | Bot gọi trong phòng riêng; tài xế tiếp tục hỏi việc khác trên trợ lý | Đang bận lái / làm việc khác, chỉ cần kết quả sau |

Mặc định lấy từ **cài đặt tài xế** (lưu qua auth-service, đưa vào ngữ cảnh phiên), để bot không hỏi lại “chọn chế độ nào?” mỗi lần — trừ khi tài xế nói rõ (“nói trực tiếp”, “gọi nền”). Gọi số không thuộc chuyến hiện tại bắt buộc có bước xác nhận trước khi quay số.

**Bảng 3.2.** Thành phần hệ thống và ràng buộc tích hợp

| Thành phần | Việc phải làm cho trợ lý | Ràng buộc quan trọng |
|---|---|---|
| Ứng dụng tài xế | Lấy token, vào phòng, mic/loa, từ khóa đánh thức, giao diện | Không tự bịa dữ liệu chuyến |
| trip-service | Ngữ cảnh, chuyến, token thoại, gọi/SMS, đơn giao hàng | Nguồn sự thật nghiệp vụ |
| voice-agent | Nghe–hiểu–nói, chọn công cụ, gọi HTTP | Không truy cập cơ sở dữ liệu trực tiếp |
| LiveKit | Truyền âm thanh thời gian thực; SIP khi cần | Phân biệt trong ứng dụng và cuộc gọi điện thoại |
| call-center / call-logger | Quay số, lưu vết / tóm tắt cuộc gọi | Phục vụ gọi khách và đối soát |
| auth-service | Đăng nhập, cấu hình (vd. chế độ gọi mặc định) | JWT / phiên người dùng |

## 3.4. Yêu cầu chức năng theo việc làm thật

Danh mục công cụ đầy đủ để ở Phụ lục A. Tại thời điểm viết, phía tài xế có khoảng **39** schema công cụ (kèm FAQ và kết thúc phiên); số cụ thể chốt lại ở Chương 6 theo phiên bản mã nguồn.

### 3.4.1. Việc liên quan chuyến đi

| Mã | Việc tài xế muốn | Hệ thống phải | Điều kiện chấp nhận |
|---|---|---|---|
| FR-T01 | “Hôm nay còn chuyến nào?” | Đọc lịch/chuyến sắp tới từ ngữ cảnh hoặc API | Nêu đúng dữ liệu; không bịa chuyến |
| FR-T02 | “Chuyến hiện tại thế nào?” | Nêu điểm đón/trả, trạng thái đang có | Thiếu dữ liệu thì nói thiếu, không đoán |
| FR-T03 | “Đã đón khách / cập nhật tiến độ” | Đổi trạng thái qua backend khi đủ điều kiện | Xác nhận lại bằng lời ngắn |
| FR-T04 | Nhận / từ chối chuyến mới | Đúng công cụ nhận hoặc từ chối (đặc biệt lúc hệ thống gọi đề nghị chuyến) | Không nhầm với hủy chuyến đang chạy |
| FR-T05 | “Hủy chuyến này” | Hai bước: hỏi chắc → mới hủy | Không hủy chỉ vì một câu mơ hồ |

### 3.4.2. Việc liên lạc khách

| Mã | Việc tài xế muốn | Hệ thống phải | Điều kiện chấp nhận |
|---|---|---|---|
| FR-C01 | “Gọi khách giúp” | Gọi theo chế độ agent / nói trực tiếp / gọi nền | Đúng khách của chuyến; tôn trọng mặc định + lời nói rõ khác mặc định |
| FR-C02 | Gọi số khác / danh bạ | Hỏi xác nhận rồi mới quay | Có bước xác nhận rõ |
| FR-C03 | Nhắn SMS | Gửi qua backend khi được hỗ trợ | Báo thành công/thất bại ngắn |
| FR-C04 | “Khách đang ở đâu / xác nhận với khách” | Dùng API vị trí / xác nhận nếu có | Không bịa vị trí |
| FR-C05 | “Gọi xong chưa? Tóm tắt cuộc gọi” | Đọc trạng thái / tóm tắt từ nhật ký | Không có dữ liệu thì nói chưa có |

### 3.4.3. Chờ đón, sự cố, thu nhập, FAQ, ngôn ngữ

| Mã | Việc tài xế muốn | Yêu cầu cốt lõi |
|---|---|---|
| FR-W01 | Đặt nhắc | Tạo nhắc và đọc lại thời điểm |
| FR-W02 | “Cho thêm vài phút chờ” | Gia hạn chờ qua backend |
| FR-I01 | “Khách không ra” | Gợi ý chờ/gọi nếu hợp lý; báo khách không ra sau xác nhận |
| FR-I02 | Báo sự cố | Hỏi loại sự cố; ghi nhận; không xử lý tranh chấp pháp lý/thanh toán |
| FR-E01–E03 | Thu nhập / thống kê / bật–tắt nhận chuyến | Lấy số từ API; thiếu thì nói chưa có |
| FR-F01–F02 | Hỏi cách dùng ứng dụng | Ưu tiên FAQ/tri thức; ngoài phạm vi thì từ chối đúng cách |
| FR-L01–L03 | Tiếng Việt / Anh; tắt trợ lý; đúng kiểu phiên | Hành vi công cụ tương đương; không trộn công cụ phiên trong ứng dụng với phiên đề nghị chuyến qua điện thoại |

### 3.4.4. Quét đơn giao hàng và từ khóa đánh thức (cùng trải nghiệm, khác đường xử lý)

Hai việc thuộc phạm vi sản phẩm nhưng **không** đi qua lượt thoại STT → gọi công cụ giống “xem lịch”:

| Mã | Việc | Cách vận hành thực tế |
|---|---|---|
| FR-D01 | Chụp/chọn ảnh đơn → lấy thông tin | Ứng dụng gọi API quét ảnh trên trip-service / dịch vụ vision; tài xế xem lại rồi mới lưu đơn |
| FR-D02 | Gọi trợ lý bằng từ khóa | Nhận dạng từ khóa trên máy (wake-word) → mở cùng luồng lấy token + vào phòng như bấm mic |
| FR-D03 | Kết thúc nói chuyện trực tiếp với khách | Trong chế độ nói trực tiếp, dùng cụm từ kết thúc (vd. “Trợ lý kết thúc”) |

## 3.5. Use case chính (kèm luồng thành công / thất bại)

**Bảng 3.3.** Use case cốt lõi

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

## 3.6. Yêu cầu phi chức năng (nhìn từ trải nghiệm)

| Mã | Yêu cầu | Cách hiểu thực tiễn |
|---|---|---|
| NFR-P01 | P95 độ trễ ≤ 2 giây trên việc cốt lõi | Tài xế dứt câu → nghe bot nói lại trong khoảng chấp nhận được khi đang lái |
| NFR-P02 | Việc quen thuộc nên nhanh hơn đường đầy đủ | Câu kiểu “xem lịch”, “nhận chuyến”, “ok/cảm ơn” không cần vòng suy luận dài mỗi lần |
| NFR-P03 | Nạp ngữ cảnh lúc vào phiên | Câu hỏi đầu về lịch/chuyến không phải chờ tải lại từ đầu nếu đã nạp trước |
| NFR-R01 | Không bịa dữ liệu chuyến / thu nhập / cuộc gọi | Sai thì nhận thiếu dữ liệu |
| NFR-R02 | Thao tác rủi ro phải hỏi lại | Hủy chuyến, khách không ra, gọi số lạ |
| NFR-R03 | Câu trả lời ngắn trên loa | Một ý chính mỗi lượt khi có thể |
| NFR-L01 | Việt / Anh cùng việc | Đổi ngôn ngữ phiên, không mất năng lực công cụ |
| NFR-O01 | Lỗi lần theo được theo phiên | Nhật ký gắn mã phòng để gỡ một cuộc hội thoại |
| NFR-S01–S02 | Hạn chế lộ số điện thoại/token trên loa và nhật ký; voice-agent chỉ gọi HTTP | Bảo vệ riêng tư và biên dịch vụ |
| NFR-S03 | Vị trí / điểm đón chỉ nói mức đủ dùng; không bịa tọa độ | Khớp FR vị trí khách; chia sẻ vị trí theo API chuyến, không “bịa đang ở đâu” |
| NFR-U01 | Trải nghiệm sử dụng theo ngữ cảnh lái xe | Trả lời ngắn; việc quen thuộc ít bước; xác nhận trước hành động phá hủy — đo ở Ch.6 bằng danh mục kiểm tra hành vi + hoàn thành nghiệp vụ, không bắt buộc thang SUS |

Về hành vi im lặng: nguyên mẫu hiện nhắc tài xế khi im lâu (khoảng 15 giây, tối đa hai lần nhắc rồi kết thúc lịch sự). Đây là yêu cầu trải nghiệm cần giữ khi đánh giá UC09.

## 3.7. Trong phạm vi và ngoài phạm vi

**Làm:** các FR/NFR trên; kênh trong ứng dụng và gọi điện khi cần; FAQ; quét đơn và từ khóa đánh thức như đã mô tả.

**Không làm trong luận văn:** nhắn tin nhóm tài xế; chỉ đường rẽ từng bước thay Google Maps/Waze; tranh chấp thanh toán–hoàn tiền–bảo hiểm; đổi hồ sơ/biển số bằng giọng nói; quên mật khẩu; thao tác ứng dụng hãng khác; huấn luyện lại mô hình nhận dạng/sinh giọng từ dữ liệu riêng quy mô lớn.

## 3.8. Tiêu chí chấp nhận đưa sang Chương 6

**Bảng 3.4.** Từ yêu cầu sang chỉ số

| Nhóm việc | Đo bằng gì | Use case ưu tiên |
|---|---|---|
| Chuyến + gọi khách (tài xế) | Đúng công cụ; xong việc; danh mục kiểm tra trải nghiệm khi lái | UC01–UC06 |
| FAQ | Đúng FAQ; không bịa chính sách | UC07 |
| Độ trễ (**ưu tiên cao nhất**) | P95 ≤ 2s | UC01, UC03, UC04, UC07 |
| Nghe trong ồn | WER yên vs nhiễu | Mẫu đọc cố định |
| Luồng khách (chấp nhận qua test case) | Đạt/không đạt test case (công cụ + chế độ gọi) | TC gọi khách / custcall / ghi nhận yêu cầu khách |
| Bảo mật & vị trí | Danh mục kiểm tra NFR-S (thông tin cá nhân, không bịa vị trí) | Gắn UC vị trí / gọi / nhật ký |
| Từ khóa đánh thức / quét đơn | Kiểm riêng | UC10; kịch bản ảnh đơn |
| Im lặng / lỗi API | Hành vi an toàn | UC09 |

## Kết luận chương

Chương 3 đã neo yêu cầu vào **hành vi tài xế khi chạy xe** (câu ngắn, rảnh tay, xác nhận rủi ro), vào luồng vận hành thật, và làm rõ phía khách được chấp nhận qua test case chứ không phải khảo sát trên đường. Chương 4 giải thích thiết kế bên trong để các yêu cầu này chạy được ổn định và đủ nhanh.

---

## Self-review (Chương 3 — rà từ ngữ đúng nghĩa)

| Hạng mục | Kết quả |
|---|---|
| Bỏ inbound/outbound thô; dùng “trong ứng dụng / đề nghị chuyến” | Đạt |
| tool → công cụ; usability → trải nghiệm sử dụng | Đạt |
| Không claim số đo | Đạt |
| Ảnh UI | Chưa — bổ sung sau |
