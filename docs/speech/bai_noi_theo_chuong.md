# Bài nói theo chương — Luận văn Czen (Chương 1 đến Chương 6)

Dùng khi hội đồng yêu cầu trình bày theo cấu trúc luận văn, hoặc để ôn trước buổi bảo vệ. Bài nói theo
slide nằm ở `bai_noi_bao_ve.md`; file này đi theo từng chương của luận văn 100 trang
(`docs/thesis/100page`), mỗi chương gồm: một câu tóm tắt, lời nói, ví dụ cụ thể trong Czen, số liệu
cần nhớ và câu hỏi hay gặp.

Thời lượng gợi ý: tổng khoảng 15–18 phút — Chương 1: 2 phút · Chương 2: 2 phút · Chương 3: 3 phút ·
Chương 4: 3,5 phút · Chương 5: 2,5 phút · Chương 6: 4 phút · Kết luận: 1 phút.

Quy tắc chung khi nói: mỗi khái niệm lý thuyết phải đi kèm **một việc cụ thể Czen làm**. Hội đồng dễ
chấm thấp phần "lý thuyết đúng nhưng không thấy liên quan tới bài".

---

## Chương 1 — Giới thiệu

**Một câu:** tài xế phải thao tác điện thoại khi lái; luận văn xây và đánh giá một trợ lý giọng nói
làm được nghiệp vụ thật.

### Lời nói

> Thưa Hội đồng, tài xế xe công nghệ vẫn phải dùng điện thoại khi đang lái: xác nhận chuyến, báo đã
> đón khách, gọi khách, tra lộ trình. Nghiên cứu SHRP 2 trên hơn 900 vụ va chạm cho thấy yếu tố người
> lái có mặt trong gần 90% số vụ, và thao tác thiết bị cầm tay làm tăng đáng kể nguy cơ.
>
> Luận văn hướng tới các hãng xe nhận chuyến qua tổng đài, Zalo, Facebook — nơi điều phối viên tạo
> chuyến cho tài xế. Bài toán là: thiết kế, triển khai và đánh giá một trợ lý AI bằng giọng nói tiếng
> Việt, **nghe** yêu cầu, **hiểu** ý định, **thực hiện** nghiệp vụ qua gọi công cụ, và **trả lời** bằng
> giọng nói theo thời gian thực.
>
> Em đặt bốn câu hỏi nghiên cứu. RQ1: kiến trúc microservices lập luận từ yêu cầu phi chức năng có đáp
> ứng mở rộng và phục hồi không. RQ2: độ trễ đạt mức nào so với ngưỡng P95 ≤ 2 giây, và thành phần nào
> chi phối. RQ3: tỷ lệ lỗi từ thay đổi thế nào khi có nhiễu khoang xe. RQ4: trợ lý chọn đúng công cụ
> và hoàn thành nghiệp vụ ở mức nào.
>
> Phương pháp là nghiên cứu khoa học thiết kế (DSR): xây sản phẩm thiết kế rồi đánh giá. Theo khung
> FEDS, em đánh giá trong điều kiện nhân tạo trước, với người dùng thật sau — luận văn mới làm giai
> đoạn đầu.

### Ví dụ trong Czen

Tài xế nói "Nhận chuyến nhé" → Czen gọi công cụ `confirm_trip` → chuyến chuyển sang "Đã xác nhận" trên
trang điều phối trong khoảng một giây. Đây là khác biệt với trợ lý chỉ trò chuyện: **Czen làm thay đổi
dữ liệu thật**.

### Bốn đóng góp (mục 1.7) — nên thuộc

1. Kiến trúc tham chiếu microservices, lập luận từ năm yêu cầu phi chức năng.
2. Nguyên mẫu đầu cuối, mã nguồn công khai (STT – LLM gọi công cụ – TTS, câu đệm, dự phòng, WebRTC và SIP).
3. Khung đánh giá gắn 19 tiêu chí chấp nhận Given – When – Then, truy vết từ yêu cầu tới kết quả.
4. Bằng chứng thực nghiệm: độ trễ bị chi phối bởi token đầu của LLM, không phải bởi cách chia dịch vụ.

### Câu hỏi hay gặp

- **"Vì sao ngưỡng là 2 giây?"** Đây là lựa chọn thiết kế thực dụng (mục 2.8): NHTSA dùng mốc 2 giây
  cho mỗi lần rời mắt; khoảng lặng chuyển lượt tự nhiên chỉ 0–200 ms mà chuỗi STT – LLM – TTS qua mạng
  khó đạt. Luận văn nói rõ ngưỡng này không rút ra trực tiếp từ tài liệu.
- **"Giới hạn lớn nhất là gì?"** Chưa thử với tài xế thật; mở rộng và phục hồi đo trên môi trường mô
  phỏng, chưa phải AWS thật (mục 1.5.3).

**Chuyển:** "Để giải bài toán này, em dựa trên các nền tảng lý thuyết ở Chương 2."

---

## Chương 2 — Cơ sở lý thuyết và nghiên cứu liên quan

**Một câu:** các khối kỹ thuật (chuỗi STT – LLM – TTS, gọi công cụ, WebRTC/SIP), các khái niệm kỹ nghệ
phần mềm dùng để lập luận, và ba khoảng trống nghiên cứu.

### Lời nói

> Chương 2 có ba phần.
>
> **Phần kỹ thuật.** Một lượt hội thoại đi qua ba khâu: nhận dạng giọng nói, mô hình ngôn ngữ và tổng
> hợp giọng nói. Chuỗi theo tầng này cho phép thay từng khâu độc lập, nhưng **cộng dồn độ trễ** — và
> đây chính là gốc của kết quả độ trễ ở Chương 6. Gọi công cụ cho phép mô hình chọn hàm và điền tham
> số để hệ thống thực thi; khó khăn là công cụ gần nghĩa dễ bị chọn nhầm, như "hủy chuyến đang chạy"
> với "từ chối chuyến mới". WebRTC đưa âm thanh từ app, SIP đưa cuộc gọi điện thoại vào cùng một phòng
> hội thoại.
>
> **Phần kỹ nghệ phần mềm.** Em dùng ISO/IEC 25010:2023 để phân loại yêu cầu phi chức năng, kịch bản
> thuộc tính chất lượng của Bass để đặc tả, chiến thuật kiến trúc để nối yêu cầu với thiết kế, và tiêu
> chí Given – When – Then để kiểm thử. Microservices được trình bày cả lợi ích lẫn cái giá: vận hành
> phức tạp hơn — nên phải lập luận từ yêu cầu chứ không chọn theo xu hướng.
>
> **Nghiên cứu liên quan.** Em tìm ra ba khoảng trống: thiếu giải pháp kết hợp hội thoại thời gian
> thực, gọi công cụ và nghiệp vụ tài xế; nghiên cứu AI trong gọi xe nghiêng về nền tảng hoặc hành
> khách, chưa tập trung vào trợ lý cho tài xế; và các công trình trợ lý giọng nói ít lập luận kiến trúc
> từ yêu cầu phi chức năng, ít đánh giá mở rộng và phục hồi.

### Ví dụ trong Czen

- "Cộng dồn độ trễ": tài xế dứt lời → chờ chốt lượt → chờ LLM sinh token đầu → chờ TTS ra âm thanh
  đầu. Ba chặng cộng lại mới thành con số 3,75 giây ở Chương 6.
- Serverless và container (mục 2.7): API chuyến đi chỉ chạy vài trăm mili-giây nên đặt trên Lambda;
  tác nhân Czen phải giữ kết nối âm thanh cả cuốc xe nên **không thể** đặt trên Lambda — phải chạy
  container trên Fargate.

### Câu hỏi hay gặp

- **"Vì sao không dùng mô hình giọng nói đầu-cuối như Moshi?"** Moshi đạt khoảng 200 ms nhưng không
  gọi công cụ; Czen cần thực hiện nghiệp vụ qua API nên chọn chuỗi theo tầng và chấp nhận chậm hơn
  khoảng một bậc độ lớn (mục 2.9.3, Bảng 6.17).
- **"Giọng nói có thật sự an toàn hơn không?"** Giọng nói giảm rời mắt nhưng không loại bỏ tải nhận
  thức (mục 2.9.1) — luận văn không khẳng định an toàn giao thông.

**Chuyển:** "Từ nền tảng đó, Chương 3 xác định hệ thống phải làm gì và phải làm tốt đến mức nào."

---

## Chương 3 — Phân tích yêu cầu

**Một câu:** bốn chân dung người dùng → yêu cầu chức năng → 18 use case → năm yêu cầu phi chức năng →
19 tiêu chí chấp nhận.

### Lời nói

> Em xác định yêu cầu theo năm bước. Đầu tiên là **bốn chân dung**: tài xế, khách hàng, điều phối viên
> và quản trị viên hệ thống. Tài xế là lớp ưu tiên, vì là nhóm duy nhất thao tác trong lúc lái.
>
> **Yêu cầu chức năng** được viết theo góc nhìn người dùng, có mã riêng — ví dụ FR-T cho chuyến đi,
> FR-C cho liên lạc khách — và tuân ba quy tắc chung: trợ lý chỉ nói dữ liệu lấy từ hệ thống; chỉ xác
> nhận bằng lời sau khi hệ thống đã lưu; thao tác khó hoàn tác phải được tài xế xác nhận.
>
> Các yêu cầu được gom thành **18 use case**: 12 của tài xế và hai của mỗi chân dung còn lại.
>
> **Năm yêu cầu phi chức năng** theo ISO/IEC 25010: khả dụng, hiệu năng, mở rộng, phục hồi và bảo mật.
> Mỗi yêu cầu được viết thành kịch bản chất lượng và gắn với chiến thuật kiến trúc.
>
> Cuối cùng là **19 tiêu chí chấp nhận** dạng Given – When – Then — đây là căn cứ để Chương 6 kết luận
> đạt hay không đạt.

### Ví dụ trong Czen — mỗi yêu cầu phi chức năng là một tình huống

| NFR | Tình huống cụ thể | Tiêu chí |
|---|---|---|
| NFR-01 Khả dụng | Tài xế nói "hủy chuyến" → Czen hỏi lại trước khi hủy và chỉ hủy khi tài xế đồng ý | AC-14: 100% thao tác rủi ro có xác nhận |
| NFR-02 Hiệu năng | Tài xế hỏi "chuyến tiếp theo là gì" → Czen phải bắt đầu nói trong 2 giây; chậm hơn thì nói câu đệm | AC-15: P95 ≤ 2 s |
| NFR-03 Mở rộng | Giờ cao điểm, 20 tài xế cùng nói chuyện với Czen | AC-16: P95 tăng ≤ 20%, phiên lỗi < 1% |
| NFR-04 Phục hồi | Dịch vụ SMS lỗi giữa chuyến → Czen báo "không gửi được tin nhắn" và vẫn nói chuyện tiếp | AC-17: 100% phiên không kết thúc bất thường |
| NFR-05 Bảo mật | Nhật ký không được chứa số điện thoại đầy đủ của khách hay token | AC-18: 100% mục kiểm tra đạt |

### Usability (NFR-01) — nói thế nào

> Với tài xế, khả dụng nghĩa là **không phải nhìn màn hình**: nghiệp vụ cốt lõi làm bằng một câu nói;
> câu trả lời ngắn, mỗi câu một ý; không im lặng khó hiểu; việc nguy hiểm phải hỏi lại; báo lỗi bằng
> lời dễ hiểu. Phần này nằm trong tác nhân hội thoại nên không phụ thuộc kiểu kiến trúc.

### Câu hỏi hay gặp

- **"Yêu cầu lấy từ đâu?"** Ba nguồn: nghiên cứu về tài xế gọi xe (IIHS 2022, Song et al. 2023), tài
  liệu dự án (yêu cầu, sổ tay, kịch bản hội thoại ở Phụ lục B) và ràng buộc an toàn khi lái (mục 2.8).
- **"Vì sao 18 yêu cầu chức năng không có tiêu chí riêng?"** Tiêu chí tập trung vào nghiệp vụ cốt lõi
  của tài xế và năm yêu cầu phi chức năng; các yêu cầu còn lại được hiện thực nhưng không đánh giá định
  lượng — luận văn liệt kê rõ ở mục 3.4.4.
- **"Khả năng bảo trì — thay nhà cung cấp AI — sao không là yêu cầu phi chức năng?"** Đây là ràng buộc
  thiết kế và lợi ích phụ của kiến trúc (Bảng 2.1), không được đánh giá định lượng.

**Chuyển:** "Từ năm yêu cầu phi chức năng này, Chương 4 lập luận ra kiến trúc."

---

## Chương 4 — Thiết kế hệ thống

**Một câu:** chọn microservices bằng cách so sánh bốn phương án theo yêu cầu phi chức năng, chia sáu
dịch vụ theo năng lực nghiệp vụ, và tự đánh giá kiến trúc bằng ATAM rút gọn.

### Lời nói

> Hệ thống có hai loại tải rất khác nhau. Một là **tác nhân hội thoại**: chạy dài hạn, giữ kết nối âm
> thanh, mỗi phiên tốn khoảng 225 MB bộ nhớ. Hai là **API nghiệp vụ**: nhanh, không trạng thái, được
> app, trang điều phối và tác nhân cùng gọi.
>
> Em so sánh bốn phương án: nguyên khối, nguyên khối phân mô-đun, microservices và thuần serverless
> (Bảng 4.2). Microservices là phương án duy nhất đáp ứng cả hiệu năng, mở rộng, phục hồi và bảo mật;
> cái giá là độ phức tạp vận hành cao. Thuần serverless bị loại vì Lambda không giữ được kết nối âm
> thanh dài.
>
> Hệ thống chia thành **sáu dịch vụ** theo năng lực nghiệp vụ: Định danh; Chuyến đi và Điều phối; Liên
> lạc bằng tin nhắn; Nhật ký cuộc gọi; Giám sát vận hành — năm dịch vụ này chạy Lambda, mỗi dịch vụ có
> bảng DynamoDB riêng — và dịch vụ thứ sáu là tác nhân hội thoại chạy trên Fargate.
>
> Quyết định thứ hai (ADR-02) là cho **mọi câu qua LLM gọi công cụ**, kèm câu đệm sau 2 giây và tải
> trước ngữ cảnh. Em đã thử một nhánh rút gọn theo ý định cho nhanh, nhưng nó dễ chọn sai công cụ nên
> đã loại bỏ. Đổi lại, độ trễ phụ thuộc vào token đầu của LLM — đây là điểm đánh đổi TP-1.
>
> Cuối chương, em đánh giá kiến trúc bằng ATAM rút gọn. Rủi ro lớn nhất, R-1, là **token đầu của LLM
> vượt 2 giây** — và rủi ro này đã xảy ra thật trong đợt đo.

### Microservices gắn với yêu cầu như thế nào — kể bằng Czen

- **Phục hồi:** dịch vụ Tin nhắn trả lỗi 503 → vì là dịch vụ riêng, Czen chỉ báo "không gửi được tin
  nhắn" và nói chuyện tiếp. Đã xảy ra thật ngày 06/09/2026 (Bảng 5.2). *Tính chất: cô lập lỗi.*
- **Mở rộng:** giờ cao điểm chỉ cần thêm bản sao tác nhân (phần tốn RAM); API trên Lambda tự co giãn.
  Không phải nhân bản cả hệ thống. *Tính chất: mở rộng độc lập.*
- **Hiệu năng:** tác nhân trong container riêng không tranh tài nguyên với API mà trang điều phối gọi
  liên tục; ngữ cảnh chuyến được tải sẵn khi mở phiên. Microservices **không** làm từng câu nhanh hơn
  — nó chỉ không làm chậm thêm.
- **Bảo mật:** chỉ dịch vụ Định danh phát hành token đăng nhập; mỗi dịch vụ có bảng dữ liệu và quyền
  IAM riêng; tác nhân AI không đọc thẳng cơ sở dữ liệu mà phải gọi API (CON-01). *Tính chất: mỗi dịch
  vụ sở hữu dữ liệu riêng.*
- **Khả dụng:** không phụ thuộc kiến trúc — nằm trong tác nhân: phân loại phiên (phiên mời nhận chuyến
  chỉ có hai công cụ nhận và từ chối), xác nhận hai bước, đối chiếu 10 nguyên tắc Nielsen (Bảng 4.9).

### Câu hỏi hay gặp

- **"Một nhóm nhỏ dùng microservices có quá phức tạp không?"** Có — Bảng 4.2 ghi độ phức tạp vận hành
  "Cao". Em giảm bớt bằng dịch vụ đám mây được quản lý (Lambda, DynamoDB, Fargate) và hạ tầng dạng mã
  cho từng dịch vụ.
- **"Gọi qua mạng giữa các dịch vụ có làm chậm không?"** Có thêm chi phí mạng; em bù bằng tải trước
  ngữ cảnh khi mở phiên (đánh đổi TP-4). Số đo cho thấy nút thắt là LLM, không phải các lời gọi API.
- **"ATAM của em có các bên liên quan không?"** Không — đây là ATAM rút gọn, kịch bản và xếp hạng phản
  ánh đánh giá của tác giả; luận văn ghi rõ giới hạn này (mục 4.10).

**Chuyển:** "Thiết kế này được hiện thực như thế nào, em trình bày ở Chương 5."

---

## Chương 5 — Triển khai

**Một câu:** nguyên mẫu đầu cuối mã nguồn công khai — tác nhân Python trên LiveKit, năm dịch vụ
Node.js, app React Native — với lớp dự phòng nhà cung cấp AI và từ điển phát âm.

### Lời nói

> Mã nguồn tổ chức theo kho mã đơn trên GitHub, thẻ thesis-final. Tác nhân hội thoại viết bằng Python
> trên LiveKit Agents; năm dịch vụ nghiệp vụ viết bằng Node.js và TypeScript, chạy được cả cục bộ lẫn
> trên Lambda; app tài xế viết bằng React Native.
>
> Ba điểm hiện thực em muốn nhấn mạnh.
>
> **Một — dự phòng nhà cung cấp AI.** STT, LLM, TTS được khởi tạo theo cấu hình qua một hàm chung, và
> được bọc bằng FallbackAdapter: mỗi lần thử chờ tối đa 5 giây, lỗi thì tự chuyển sang nhà cung cấp kế
> tiếp và ghi nhật ký.
>
> **Hai — từ điển phát âm.** LLM viết "30A-123.45" hay "14:30"; trước khi đọc, câu được chuẩn hóa
> thành "ba mươi a, một hai ba, bốn năm" và "14 giờ 30". Bước này đặt trước mọi nhà cung cấp TTS nên
> giọng chính và giọng dự phòng đọc giống nhau.
>
> **Ba — chỉ số chất lượng mỗi phiên.** Mỗi phiên ghi độ trễ từng lượt, lời gọi công cụ, câu đệm, lần
> chuyển dự phòng; dữ liệu này nuôi báo cáo vận hành hằng ngày.
>
> Về hạ tầng, mỗi dịch vụ có stack AWS SAM riêng, triển khai độc lập. **Em xin nói rõ:** tại thời điểm
> đánh giá, mã hạ tầng đã viết hoàn chỉnh nhưng nguyên mẫu thực nghiệm chạy trên máy phát triển kết nối
> LiveKit Cloud, chưa chạy trên kiến trúc AWS đầy đủ. Vì vậy kết quả Chương 6 phản ánh kiến trúc và mã
> nguồn, chưa phản ánh hành vi của Lambda hay Fargate thật.

### Ví dụ trong Czen

- Sau đợt đo ở Chương 6 (dùng Google TTS), giọng mặc định chuyển sang ElevenLabs "Kiều Linh"; Google
  giữ làm dự phòng. Chỉ cần đổi cấu hình — không sửa kiến trúc.
- Im lặng 15 giây thì Czen nhắc; nếu tài xế tắt micro để gõ chữ, ngưỡng nâng lên 60 giây.

### Câu hỏi hay gặp

- **"Hệ thống đã chạy trên AWS chưa?"** Chưa đầy đủ (mục 5.6.1): lần kiểm tra ngày 13/10/2026 chỉ có
  bảng DynamoDB môi trường phát triển và hai stack Lambda cũ, chưa có cụm ECS. Đây là một hướng phát
  triển trong phần Kết luận.
- **"Thay nhà cung cấp AI mất bao lâu?"** Đổi khai báo trong cấu hình; ví dụ thực tế là việc chuyển TTS
  từ Google sang ElevenLabs sau đợt đo.

**Chuyển:** "Nguyên mẫu này được đánh giá theo các tiêu chí của Chương 3 ở Chương 6."

---

## Chương 6 — Thực nghiệm và đánh giá

**Một câu:** đo trên hệ thống thật theo 19 tiêu chí; đạt phục hồi và mở rộng (mô phỏng), chức năng ở
mức khá với mẫu nhỏ, **độ trễ chưa đạt**.

### Lời nói

> Em đánh giá theo từng câu hỏi nghiên cứu, quy tắc xử lý dữ liệu được cố định từ trước, tỷ lệ kèm
> khoảng tin cậy 95% Wilson.
>
> **RQ2 — độ trễ.** Trên 174 lượt qua LLM trong đợt đo 05–06/09/2026, P50 là 1,54 giây nhưng **P95 là
> 3,75 giây**, không đạt ngưỡng 2 giây. Phân tích theo chặng (Bảng 6.4) cho thấy chặng lớn nhất là LLM
> sinh token đầu, P95 khoảng 2,5 giây. Khi mô hình dùng qua API bên ngoài, việc đạt ngưỡng phụ thuộc
> chủ yếu vào nhà cung cấp mô hình, không phải cách chia dịch vụ.
>
> **RQ3 — nhận dạng giọng nói.** Tỷ lệ lỗi từ tăng từ 3,1% lên 7,3% khi có nhiễu khoang xe — với một
> người đọc và 22 câu, đây là xu hướng.
>
> **RQ4 — đúng chức năng.** Trên 43 lượt được chấm, chọn đúng công cụ 86,0%, hoàn thành ngay lần đầu
> 74,4%. Lỗi chính là sai tham số và "đáp lời nhưng chưa thực hiện" — củng cố quyết định xác nhận hai
> bước.
>
> **RQ1 — mở rộng và phục hồi.** 200/200 lượt tiêm lỗi không làm hỏng hội thoại; từ 1 lên 40 phiên,
> P95 không tăng. Hai giới hạn: phiên đang chạy bị mất khi một bản sao tác nhân chết, và lỗi treo khiến
> tài xế chờ 6–8 giây. Phần này đo trong môi trường mô phỏng với AI giả lập.
>
> **Khả dụng và bảo mật** đều đạt sau một vòng sửa: câu báo lỗi kỹ thuật được thay bằng "Bạn thử lại
> sau ít phút nhé", và nhật ký được che số điện thoại.
>
> Cuối chương, em phân tích mối đe dọa đối với độ tin cậy theo bốn loại của Wohlin: nội tại, bên ngoài,
> cấu trúc và kết luận.

### Ví dụ trong Czen — tiêm lỗi (Bảng 6.12)

| Lỗi được tiêm | Czen phản ứng | Kết quả |
|---|---|---|
| Nhật ký cuộc gọi từ chối kết nối | Phiên không bị ảnh hưởng | 20/20 |
| Dịch vụ chuyến trả 503 | Báo không thực hiện được, phiên tiếp tục | 20/20 |
| Dịch vụ chuyến treo | Chờ 8 giây rồi báo lỗi | 20/20, nhưng vượt ngân sách 2 giây |
| Dừng đột ngột một bản sao tác nhân | Phiên mới được bản sao kia phục vụ | Mới 10/10; đang chạy 0/10 |
| LLM chính lỗi | Chuyển sang LLM dự phòng | 30/30 |

### Mối đe dọa (mục 6.13) — nói ngắn gọn

> Nội tại: 341 lượt trong hai ngày, một tài khoản, một người chấm. Bên ngoài: thử tải trên một máy với
> AI giả lập, chưa phải AWS thật. Cấu trúc: độ trễ đo trải nghiệm hội thoại, không đo an toàn giao
> thông. Kết luận: mẫu nhỏ nên em báo khoảng tin cậy và không khẳng định khác biệt khi khoảng tin cậy
> chồng lấn.

### Câu hỏi hay gặp

- **"Độ trễ không đạt thì luận văn có thất bại không?"** Không — RQ2 hỏi độ trễ đạt mức nào và thành
  phần nào chi phối; câu trả lời có số liệu rõ ràng, và đó là đóng góp thứ tư. Kết quả "không đạt" được
  báo trung thực ở Bảng 6.16.
- **"Thiết kế hiện tại (có câu đệm, không còn nhánh rút gọn) đã đo chưa?"** Mới có 4 lượt (Bảng 6.5),
  chưa đủ để tính P95; cần ít nhất 200 lượt.
- **"74,4% so với τ-bench dưới 50% — Czen tốt hơn GPT-4o à?"** Không so trực tiếp được: τ-bench tính
  theo nhiệm vụ nhiều lượt, luận văn tính theo lượt (Bảng 6.17).
- **"Slide 8 nói chốt lượt 0,25–0,55 giây, Bảng 6.4 nói 0,9–1,7 giây?"** Khác cấu hình: đợt đo tháng 9
  còn dùng mô hình phát hiện lượt; cấu hình hiện tại chốt bằng VAD và khoảng lặng.

---

## Kết luận (≈ 1 phút)

> Tóm lại, em đã đi đủ các bước của nghiên cứu khoa học thiết kế: xác định yêu cầu cho bốn nhóm người
> dùng, lập luận kiến trúc từ năm yêu cầu phi chức năng, hiện thực nguyên mẫu trên WebRTC và SIP, và
> đánh giá theo 19 tiêu chí chấp nhận — 17 tiêu chí đã có kết quả.
>
> Kết quả chính: phục hồi và mở rộng đạt trong môi trường mô phỏng; chức năng đạt mức khá với mẫu nhỏ;
> độ trễ chưa đạt và bị chi phối bởi mô hình ngôn ngữ bên ngoài.
>
> Hướng phát triển: đo lại thiết kế hiện hành với ít nhất 200 lượt và thử mô hình nhanh hơn; triển khai
> đầy đủ trên AWS và đo lại; duy trì tối thiểu hai bản sao tác nhân; tăng cỡ mẫu với nhiều người đọc và
> hai người chấm; và thử nghiệm có kiểm soát với tài xế thật trong kịch bản lái mô phỏng.
>
> Em xin cảm ơn Hội đồng.

## Lưu ý khi dùng cùng bài nói theo slide

Slide 5 và slide 18 ghi "Microservices AWS". Nếu hội đồng hỏi, nói rõ: kiến trúc được **thiết kế và
viết hạ tầng dạng mã cho AWS**; thực nghiệm chạy trên máy phát triển kết nối LiveKit Cloud (mục 5.6.1).
