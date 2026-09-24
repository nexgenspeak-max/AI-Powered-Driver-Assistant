# Chương 4. Thiết kế hệ thống

Chương này giải thích *vì sao hệ thống được bố trí như hiện tại* và *một câu nói của tài xế đi qua những bước nào* trước khi có âm thanh trả lời hoặc một hành động trên chuyến đi. Thiết kế bám yêu cầu Chương 3 và hiện trạng kho mã nguồn dùng chung; chi tiết cài đặt để Chương 5.

## 4.1. Nguyên tắc thiết kế (nói bằng việc cần đạt)

1. **Bot nói chuyện; máy chủ giữ sổ sách.** llm-orchestrator chỉ hội thoại và gọi API. Mọi chuyến, trạng thái, thu nhập lấy từ external-api-service. Tránh để AI “nhớ bừa” dữ liệu chuyến trong lời nhắc hệ thống.
2. **Một đường xử lý; cảm giác phản hồi bằng câu giữ chỗ và nạp trước.** Mọi câu tài xế đi **STT → LLM kèm công cụ → TTS**. Câu quen (“xem lịch”, “nhận chuyến”) cũng trả chi phí thời gian sinh token đầu của mô hình; khi phản hồi chưa kịp phát âm khoảng từ hai giây, hệ thống xen **câu giữ chỗ** ngắn (không chứa sự kiện chuyến). Nạp ngữ cảnh trước giúp rút ngắn phần thân công cụ.
3. **An toàn khi lái:** câu trả lời ngắn; hủy chuyến hoặc gọi số lạ phải hỏi lại; không bịa số liệu.
4. **Một nghiệp vụ, nhiều cửa vào:** kênh trong ứng dụng (WebRTC) và kênh gọi điện (SIP) tái sử dụng cùng logic nhận hoặc từ chối chuyến, gọi khách; chỉ khác nhau ở cấu hình phòng và tập công cụ cho đúng ngữ cảnh.
5. **Đổi ngôn ngữ không đổi việc:** gói tiếng Việt và tiếng Anh cùng bộ năng lực.
6. **Lỗi lần được theo từng cuộc nói:** mọi phiên gắn mã phòng trên nhật ký.

## 4.2. Kiến trúc tổng thể: ai phụ trách việc gì?

Hệ thống là một kho mã nguồn dùng chung gồm nhiều dịch vụ nhỏ chạy riêng, trao đổi với nhau qua mạng.

**Bảng 4.1.** Vai trò từng phần (nhìn theo việc)

| Phần | Việc người dùng cảm nhận | Việc kỹ thuật chính |
|---|---|---|
| Ứng dụng tài xế | Bấm trợ lý, nói, thấy chữ hội thoại, từ khóa đánh thức | Lấy token, vào phòng LiveKit, giao diện |
| LiveKit Cloud | Nghe–nói mượt trong ứng dụng; gọi điện khi cần | Phòng thời gian thực, cầu SIP |
| llm-orchestrator | Bot trả lời và làm hộ việc | Nhận dạng, quyết định, tổng hợp giọng nói; gọi HTTP tới công cụ |
| external-api-service | Chuyến đúng, gọi khách được, ngữ cảnh đủ | API chuyến, ngữ cảnh, token thoại, điều phối |
| identity-service | Đăng nhập, nhớ cấu hình gọi khách | JWT, cài đặt tài xế |
| external-channel-service và call-records-service | Điện thoại reo; có tóm tắt cuộc gọi | Quay số, lưu vết |
| admin và ops | Tạo chuyến thử, xem hệ thống còn hoạt động không | Không nằm trên đường nóng hội thoại |

**Hình 4.1.** Sơ đồ kiến trúc tổng thể (ứng dụng – LiveKit – llm-orchestrator – external-api-service / external-channel-service và dịch vụ liên quan)

![Hình 4.1](thesis_screenshots/H4_1_architecture.png)

Luồng tư duy đọc Hình 4.1 từ trái sang phải: tài xế thao tác trên ứng dụng; ứng dụng lấy phiên đăng nhập và token thoại; âm thanh đi qua LiveKit tới llm-orchestrator; mọi dữ liệu chuyến, thu nhập và gọi điện đi xuống external-api-service, cùng external-channel-service khi cần mạng điện thoại công cộng. Python **không** đọc cơ sở dữ liệu trực tiếp.

**Bảng 4.2.** Các đường gọi chính

| Từ → Đến | Để làm gì |
|---|---|
| Ứng dụng → identity-service | Đăng nhập |
| Ứng dụng → external-api-service | Token thoại, chuyến, thông báo WebSocket |
| Ứng dụng → LiveKit | Âm thanh trợ lý |
| llm-orchestrator → external-api-service | Đọc ngữ cảnh, đổi trạng thái chuyến, bắt đầu cuộc gọi |
| llm-orchestrator → LiveKit | Vào phòng, phát TTS, nhận mic |
| external-api-service → external-channel-service / SIP | Quay số tài xế hoặc khách |

### 4.2.1. Phương án thiết kế đã cân nhắc

Trước khi chốt kiến trúc trên, có vài hướng thay thế thường gặp; Bảng 4.2a nêu ưu điểm bề ngoài và lý do không chọn làm lõi luận văn.

**Bảng 4.2a.** So sánh các phương án kiến trúc đã cân nhắc

| Phương án | Ưu điểm bề ngoài | Vì sao không chọn làm lõi luận văn |
|---|---|---|
| A. Mọi câu đều qua LLM + toàn bộ công cụ, không có câu giữ chỗ | Đơn giản về mặt “một đường ống” | Dễ cảm nhận im lặng trên câu quen khi TTFT cao; khó giữ cảm giác P95 ≤ 2 giây |
| B. llm-orchestrator đọc cơ sở dữ liệu trực tiếp | Ít bước gọi HTTP | Phá biên dịch vụ; khó vận hành và bảo mật; không tái dùng external-api-service cho ứng dụng |
| C. Chỉ WebRTC, không SIP | Đỡ phức tạp thoại mạng điện thoại công cộng | Không phủ được đề nghị chuyến bằng cuộc gọi điện thoại và một phần gọi khách |
| D. Đường tắt khớp ý định nói + LLM khi cần (thử nghiệm A/B trước đây) | P95 đường tắt bám ngưỡng ≈ 2 giây trên mẫu đo cũ | Dễ chọn sai việc từ câu mơ hồ; khó bảo trì mẫu; đã **tắt** tự gọi công cụ theo ý định (`SPOKEN_INTENT_AUTO_TOOL=False`) |
| E. Kết hợp (đã chọn hiện tại): một đường STT → LLM kèm công cụ → TTS; câu giữ chỗ ≈ 2 giây; chỉ gọi HTTP; dùng cả WebRTC và SIP | Khớp NFR độ trễ cảm nhận và FR đa kênh; không bịa trạng thái chuyến để nói cho nhanh | Đổi lại là độ phức tạp khi phân loại phòng và chế độ gọi; được chấp nhận và thiết kế rõ ở các mục sau |

---

## 4.2b. Chuỗi bước mở phiên trợ lý trong ứng dụng

Trước khi tài xế nói câu nghiệp vụ đầu tiên, hệ thống phải “vào chỗ” đúng thứ tự. Chuỗi thiết kế như sau (khớp hiện thực nguyên mẫu):

**Bảng 4.2b.** Chuỗi bước mở phiên trong ứng dụng (rút gọn)

| Bước | Ai | Việc |
|---|---|---|
| 1 | Ứng dụng | Gọi API cấp token thoại, kèm số điện thoại và ngôn ngữ |
| 2 | external-api-service | Cấp token LiveKit và tên phòng dạng `driver-{số}-{mã}`; tái sử dụng phòng nếu phiên cũ còn agent |
| 3 | Ứng dụng | Tham gia phòng LiveKit qua WebRTC |
| 4 | llm-orchestrator | Nhận việc, kết nối phòng, gắn nhật ký theo mã phòng |
| 5 | llm-orchestrator | Chào nhanh ("Chào bạn, tôi là Czen…"), không chờ tải xong toàn bộ số liệu |
| 6 | llm-orchestrator | Ngay sau đó gọi API ngữ cảnh, đổ dữ liệu vào bộ nhớ phiên |
| 7 | llm-orchestrator | Hỏi "Tôi có thể giúp gì cho bạn?" và sẵn sàng nhận lệnh |

Thiết kế “chào trước – tải ngữ cảnh sau/kèm” nhằm tránh cảm giác im lặng lúc mới bấm trợ lý (liên quan NFR-P01/P03).

---

## 4.3. Thiết kế một lượt nói: một đường xử lý và câu giữ chỗ

### 4.3.1. Đường ống chung

Một lượt nói đi qua các khâu: âm thanh tài xế được nhận dạng thành chữ (**STT**), mô hình ngôn ngữ chọn công cụ hoặc trả lời kèm schema (**LLM + tools**), rồi tổng hợp thành giọng nói (**TTS**). Không có nhánh “bỏ qua LLM” cho câu quen thuộc trong thiết kế hiện hành. Mục tiêu cảm nhận vẫn hướng tới P95 ≤ 2 giây (NFR-P01): khi phản hồi thật chưa kịp phát âm khoảng từ hai giây, hệ thống xen **câu giữ chỗ** ngắn; nạp ngữ cảnh trước và làm nóng worker giúp rút ngắn phần thân công cụ và lần kết nối đầu.

**Hình 4.2.** Chuỗi xử lý hội thoại một đường: STT → LLM kèm công cụ → TTS, kèm câu giữ chỗ khoảng hai giây

![Hình 4.2](thesis_screenshots/H4_2_pipeline.png)

*(Ảnh minh họa cũ có thể còn vẽ điểm rẽ ba đường — sẽ vẽ lại; chú thích và nội dung chương lấy thiết kế một đường làm chuẩn.)*

### 4.3.2. Vì sao một đường + câu giữ chỗ (và đường tắt đã được thay thế)?

Nếu mọi câu đều chờ mô hình ngôn ngữ đọc hết danh sách công cụ rồi mới trả lời, độ trễ dễ đội lên — đặc biệt lúc tài xế chỉ cần “ok”, “xem lịch”, “nhận chuyến”. Nguyên mẫu từng thử **đường tắt** khớp ý định nói (`spoken_intent`) để gọi thẳng công cụ, bỏ qua vòng LLM; số liệu A/B ở Chương 6 cho thấy đường tắt khi đó bám ngưỡng P95 ≈ 2 giây, còn đường đủ chưa đạt. Thiết kế hiện tại **tắt** tự gọi công cụ theo ý định (`SPOKEN_INTENT_AUTO_TOOL=False`) để tránh chọn sai việc từ câu mơ hồ và thống nhất một đường ống:

**Bảng 4.3.** Một đường xử lý một câu nói (thiết kế hiện hành)

| Thành phần | Ví dụ câu tài xế | Hệ thống làm gì |
|---|---|---|
| STT → LLM kèm công cụ → TTS | “Chuyến sắp tới”, “Nhận chuyến”, câu mơ hồ, FAQ… | Mọi câu qua mô hình ngôn ngữ; công cụ gọi HTTP khi cần; TTS phát kết quả |
| Câu giữ chỗ (~2 giây) | Bất kỳ lượt nào phản hồi thật chưa kịp phát âm | Phát “Đợi mình một chút…” (hoặc bản tiếng Anh tương đương) — **không** chứa sự kiện chuyến, thu nhập hay kết quả cuộc gọi; hủy nếu câu trả lời thật đã bắt đầu |
| Nạp ngữ cảnh trước / FollowUpKnowledge | “Chuyến đầu đi đâu?”, “Đón mấy giờ?” | Đọc dữ liệu đã có trong phiên trước khi gọi mạng thêm; giảm vòng HTTP lặp |

Ngoài ra còn cơ chế **việc đang chờ**: bot vừa hứa “em gọi hộ” nhưng chưa kịp gọi; tài xế nói “ok, gọi đi” thì hệ thống thực thi việc đã hứa thay vì chỉ đáp “vâng”.

### 4.3.3. Làm nóng trước khi tài xế nói câu đầu

Để câu đầu không bị chậm oan:

- Worker nạp sẵn bộ tiếng Việt/Anh và thành phần nhận diện giọng nói khi khởi động (tránh lần đầu “lạnh”).
- Với phiên trong ứng dụng, áp dụng chào hai pha (mục 4.2b) để lời chào không phải chờ tải xong ngữ cảnh.
- Công cụ ưu tiên đọc ngữ cảnh đã tải (ví dụ danh sách chuyến, địa chỉ đón đã có trong phiên) trước khi gọi mạng thêm.
- Câu giữ chỗ theo lượt (`turn_filler`) che khoảng chờ TTFT + công cụ khi vượt mốc khoảng hai giây.

## 4.4. Phân loại theo loại phòng hội thoại

Cùng một worker, nhưng **loại phòng** quyết định bot được phép làm gì:

**Bảng 4.4.** Loại phiên và tập việc mở

| Loại | Cách mở | Việc bot được làm |
|---|---|---|
| Tài xế chủ động (trong ứng dụng) | Bấm trong ứng dụng hoặc từ khóa đánh thức, vào phòng `driver-…` | Gần đủ nhóm: lịch, cập nhật, gọi khách, FAQ, thu nhập |
| Đề nghị chuyến (SIP) | Hệ thống gọi điện, gắn metadata chuyến | Chủ yếu nhận hoặc từ chối |
| Gọi khách nền | Phòng riêng `custcall-…` | Bot nói với khách; xong thì báo lại phòng tài xế |
| Nói trực tiếp (bridge) | Trong phiên tài xế | Tài xế nói thẳng với khách; cụm từ kết thúc chế độ nói trực tiếp |

Thiết kế này trực tiếp đáp ứng yêu cầu “đúng kiểu phiên” (FR-L03) và giảm rủi ro: lúc đang nghe đề nghị chuyến qua điện thoại, bot không mở nhầm menu “hủy chuyến đang chạy” như lúc làm việc trong ứng dụng.

### 4.4.1. Chuỗi bước gọi khách (ba chế độ)

Khi tài xế nói “gọi khách”, ba chế độ ở Bảng 3.1 được hiện thực thành ba chuỗi bước:

**Bảng 4.4b.** Chuỗi bước gọi khách theo chế độ

| Chế độ | Các bước chính (rút gọn) | Điểm thiết kế |
|---|---|---|
| Agent gọi hộ | Xác định chuyến và khách; lấy chế độ (mặc định trong cài đặt, hoặc lời nói ghi rõ khác mặc định); gọi API bắt đầu cuộc gọi; bàn giao agent nói với khách **trong cùng phòng** tài xế; kết thúc và tóm tắt lại | Tài xế vẫn theo dõi được cuộc gọi |
| Nói trực tiếp | Khởi tạo tương tự, sau đó cầu nối để **tài xế nói thẳng** với khách; bot không nói đè; kết thúc bằng cụm từ kích hoạt (ví dụ "Trợ lý kết thúc") | Phù hợp trao đổi nhanh, cá nhân |
| Gọi nền | Tạo phòng riêng `custcall-…` với agent cô lập; bot gọi khách trong khi tài xế **tiếp tục** hỏi việc khác trên trợ lý; xong thì đẩy tóm tắt về phòng tài xế | Không chiếm mic phiên chính |

Với số không thuộc chuyến hiện tại, hệ thống lưu "số đang chờ", hỏi tài xế xác nhận, rồi mới quay số; mỗi phiên giới hạn số lần gọi.

---

## 4.5. Gắn công cụ với API nghiệp vụ

### 4.5.1. Quy ước chung

- Mỗi việc có tên công cụ và mô tả rõ (tiếng Việt / Anh đối xứng nhau).
- **Đọc:** ưu tiên ngữ cảnh đã nạp trước.
- **Ghi:** HTTP tới external-api-service; lỗi thì nói ngắn theo mã lỗi nghiệp vụ (không bịa “đã hủy” khi API thất bại).
- **Rủi ro:** dùng cặp bước "đề nghị rồi xác nhận" cho hủy chuyến, gọi số lạ và các thao tác khó hoàn tác.

### 4.5.2. Thiết kế nhóm công cụ, API và yêu cầu

**Bảng 4.5a.** Nhóm năng lực hội thoại theo thiết kế (chi tiết tên công cụ ở Phụ lục A, đường dẫn API cụ thể ở Bảng 5.2)

| Nhóm | Việc tiêu biểu | Nhóm API / nguồn dữ liệu | FR liên quan |
|---|---|---|---|
| Lịch và chuyến | Xem sắp tới / hiện tại; cập nhật trạng thái | API ngữ cảnh, danh sách chuyến, cập nhật trạng thái chuyến | FR-T01–T03 |
| Nhận / từ chối | Đề nghị chuyến hoặc trong ứng dụng | Công cụ xác nhận/từ chối → cập nhật chuyến | FR-T04 |
| Hủy hai bước | Đề nghị hủy → xác nhận | Việc chờ trong phiên + API hủy chuyến | FR-T05 |
| Gọi / SMS khách | Ba chế độ; SMS; tóm tắt | API bắt đầu cuộc gọi, gửi SMS, lấy tóm tắt | FR-C01–C05 |
| Chờ và sự cố | Gia hạn chờ; khách không ra; sự cố | API gia hạn chờ, báo khách không ra, báo sự cố | FR-W*, FR-I* |
| Thu nhập và online | Hôm nay / tóm tắt; bật–tắt nhận chuyến | API thu nhập, API bật–tắt nhận chuyến | FR-E* |
| FAQ | Cách dùng ứng dụng | Công cụ FAQ + playbook tri thức | FR-F* |
| Kết thúc phiên | Tắt trợ lý | API đóng phiên thoại | FR-L02 |

Token vào phòng do **ứng dụng** xin từ external-api-service — llm-orchestrator không tự cấp token cho tài xế.

### 4.5.3. Bộ nhớ ngữ cảnh phiên

Đây là thành phần thiết kế then chốt để vừa **đúng số liệu** vừa **giảm độ trễ**. Sau khi nạp trước, phiên giữ tối thiểu các nhóm thông tin sau (tên trường mang tính thiết kế, khớp nội dung ngữ cảnh thực tế):

**Bảng 4.5b.** Nội dung ngữ cảnh phiên (rút gọn)

| Nhóm | Ví dụ nội dung | Dùng để |
|---|---|---|
| Hồ sơ và cài đặt | Cấu hình gọi khách mặc định, tùy chọn rảnh tay | Chọn chế độ gọi; cá nhân hóa |
| Chuyến | Sắp tới, đang chạy, hiện tại, lịch sử gần | “Còn mấy chuyến?”, cập nhật tiến độ |
| Thu nhập / thưởng | Hôm nay, tóm tắt, thưởng đang mở | Câu hỏi thu nhập |
| Cuộc gọi | Cờ đang gọi / nói trực tiếp / gọi nền; cuộc gọi gần nhất | Không gọi chồng; tóm tắt |
| Việc dang dở | Hủy chuyến đang chờ; số tùy ý chờ xác nhận; việc bot vừa hứa | Hai bước an toàn; “ok gọi đi” |
| Gợi ý TTS | Gợi ý ngắn sau công cụ | Câu nối tự nhiên, không đọc mẫu dài |

**Quy tắc thiết kế:** công cụ đọc ưu tiên bảng trên; thiếu thì gọi API làm mới; **cấm** sinh chuyến/thu nhập không có trong ngữ cảnh hoặc API.

### 4.5.4. FAQ

Câu hỏi “ứng dụng dùng thế nào” đi qua công cụ FAQ đọc playbook tri thức, thay vì để mô hình đoán quy trình. Ngoài phạm vi thì từ chối đúng yêu cầu Chương 3.

## 4.6. Xác thực, lỗi và quan sát — thiết kế cho tình huống xấu

**Đăng nhập:** identity-service cấp phiên; cấu hình như chế độ gọi khách mặc định đi theo tài xế vào ngữ cảnh.

**Khi im lặng:** sau khoảng **15 giây** tài xế không nói, bot hỏi còn đó không; nếu lần thứ hai vẫn im, bot chào kết thúc để tránh phiên treo. Đồng hồ đếm im lặng tạm dừng trong lúc bot đang nói.

**Khi API lỗi / không bắt máy:** nói được gì thì nói rõ (“không gọi được”, “chưa có dữ liệu”); không bịa chuyến cho có chuyện. Cuộc gọi không ai nghe có luồng dọn dẹp riêng (hết thời gian chờ không bắt máy).

**Nhật ký:** gắn mã phòng để lần lại một cuộc hội thoại khi đánh giá ở Chương 6; hạn chế ghi số điện thoại đầy đủ và token.

## 4.7. Trải nghiệm trên ứng dụng: thiết kế đủ để giọng nói thành công

Ở mức thiết kế (chi tiết màn hình ở Chương 5 / Phụ lục C), ứng dụng cần:

1. Chỗ vào trợ lý rõ (biểu tượng/nút), thể hiện đang chờ / đang nghe / đang nói.
2. Chữ hội thoại đồng bộ với lời nói — tiện đối chiếu khi dừng xe.
3. Từ khóa đánh thức chỉ **mở phiên**, không thay bộ hiểu lệnh của llm-orchestrator.
4. Cài đặt chế độ gọi khách mặc định — giảm hỏi lại trên đường.
Mục tiêu khớp Chương 3: các việc cốt lõi hoàn thành được bằng giọng nói trên đường hạnh phúc, không bắt buộc thao tác phức tạp lúc xe đang chạy.

## 4.8. Liên hệ yêu cầu và quyết định thiết kế

Tổng hợp lại, các quyết định thiết kế ở chương này bám sát yêu cầu Chương 3: một đường STT → LLM kèm công cụ → TTS cùng câu giữ chỗ khoảng hai giây và nạp ngữ cảnh trước / chào hai pha để giữ cảm giác phản hồi khi lái (bác bỏ vừa “mọi câu im lặng chờ LLM” vừa “đường tắt bịa/chọn sai việc”); bộ nhớ ngữ cảnh và lời nhắc hệ thống để không bịa dữ liệu; ba chế độ gọi khách với mặc định lưu sẵn; hủy chuyến hai bước; phiên đề nghị chuyến qua điện thoại chỉ mở hai việc nhận/từ chối; từ khóa đánh thức tách khỏi chuỗi xử lý công cụ; nhắc im lặng 15 giây tối đa hai lần. Đối chiếu chi tiết với vị trí mã nguồn ở Bảng 5.4.

## Kết luận chương

Chương 4 đã trình bày kiến trúc và các phương án đã cân nhắc, một đường xử lý một câu nói kèm câu giữ chỗ (Hình 4.1 và 4.2), phân loại phòng hội thoại, cách gắn công cụ với API, bộ nhớ ngữ cảnh phiên và xử lý tình huống xấu. Chương 5 trình bày hiện thực các quyết định này trong mã nguồn và môi trường chạy nguyên mẫu.

---

## Self-review (Chương 4 — rà từ ngữ đúng nghĩa)

| Hạng mục | Kết quả |
|---|---|
| Sequence → chuỗi bước; inbound → trong ứng dụng | Đạt |
| tool → công cụ; pipeline → chuỗi xử lý | Đạt |
| Hình 4.1 / 4.2 | PNG nền sáng — `gen_thesis_figures.py` |
| Không claim số đo | Đạt |
