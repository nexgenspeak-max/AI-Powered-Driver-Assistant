# Bài nói bảo vệ luận văn — Czen: trợ lý giọng nói AI cho tài xế công nghệ

Tài liệu này đi kèm bộ slide "Czen Demo" (18 slide, https://claude.ai/artifact/Rcp28zoRMY7KjeEc2p1mGY)
và luận văn 100 trang (`docs/thesis/100page`). Mỗi slide có: thời lượng gợi ý, lời nói, câu chuyển
và chỗ trong luận văn để trỏ tới khi hội đồng hỏi.

## Cách dùng

- Tổng thời lượng trình bày khoảng **18 phút** (khoảng 1 phút mỗi slide; slide kỹ thuật và kết quả
  dài hơn, slide demo ngắn hơn). Nếu hội đồng chỉ cho 15 phút: dùng mục "Bản rút gọn" ở cuối.
- Lời nói viết theo văn nói, xưng "em", gọi "thầy cô" / "Hội đồng". Không cần đọc thuộc lòng; nắm ý
  in đậm và các con số.
- Con số nào cũng lấy từ Chương 6. Khi bị hỏi sâu, trả lời bằng số và nói rõ "mẫu nhỏ" khi cần —
  hội đồng đánh giá cao việc tự nêu giới hạn.
- Video demo: `docs/video/czen_demo.mp4`. Có thể bật video ở slide 12 rồi quay lại slide 13–15, hoặc
  dùng ảnh trên slide nếu thời gian ngắn.

## Số liệu cần nhớ (thẻ nhớ)

| Chỉ số | Kết quả | Nguồn |
|---|---|---|
| Ngưỡng độ trễ | P95 ≤ 2 giây (từ lúc tài xế dứt lời đến lúc Czen bắt đầu nói) | Mục 1.3, 2.8 |
| Độ trễ luồng qua LLM | P50 1,54 s · P95 **3,75 s** (n = 174) — không đạt | Bảng 6.3 |
| Độ trễ toàn bộ lượt | P95 2,87 s (n = 341) | Bảng 6.3 |
| Token đầu của LLM | P50 1,25 s · P95 **2,49 s** — chặng lớn nhất | Bảng 6.4 |
| Chọn đúng công cụ | **37/43 = 86,0%** (KTC 95% Wilson 72,7–93,4%) | Mục 6.6 |
| Hoàn thành ngay lần đầu | **32/43 = 74,4%** (59,8–85,1%) | Mục 6.6 |
| Tỷ lệ lỗi từ (WER) | **3,1%** yên tĩnh → **7,3%** có nhiễu (1 người đọc, 22 câu) | Mục 6.5 |
| Phục hồi | **200/200** lượt tiêm lỗi không làm hỏng hội thoại; lỗi treo 6–8 s | Bảng 6.12 |
| Mở rộng | 1 → 40 phiên, P95 không tăng (1,54 → 1,51 s), AI giả lập; ~225 MB RAM/phiên | Bảng 6.11 |
| Tiêu chí chấp nhận | 19 tiêu chí; 17 đã có kết quả | Kết luận |
| Công cụ | 48 công cụ gói tiếng Việt (42 cho tài xế) | Phụ lục A |

---

## Slide 1 — Bìa (≈ 40 giây)

> Kính thưa Hội đồng, em là Trương Bá Chính. Đề tài của em là **Czen — trợ lý giọng nói AI cho tài
> xế công nghệ**.
>
> Ý tưởng rất đơn giản: tài xế nhận chuyến, gọi khách, hỏi đường, xem thu nhập — **chỉ bằng giọng
> nói**, mắt vẫn trên đường, tay vẫn trên vô lăng. Trên màn hình là app thật: Czen đọc chuyến mới,
> tài xế chỉ cần nói "Nhận chuyến nhé".

**Chuyển:** "Bài trình bày của em gồm bốn phần."

## Slide 2 — Nội dung (≈ 30 giây)

> Phần một là tổng quan: bài toán, giải pháp, kiến trúc, công nghệ và cách một lượt hội thoại được
> xử lý. Phần hai là kết quả đánh giá trên hệ thống thật, gồm cả điểm đạt và điểm chưa đạt. Phần ba
> là demo trọn một chuyến đi ở Hà Nội. Cuối cùng là giọng nói của Czen và tổng kết.

## Slide 3 — Bài toán (≈ 1 phút)

> Tài xế công nghệ phải dùng điện thoại ngay khi đang lái: xem chuyến, tra địa chỉ, bấm gọi khách,
> xem thu nhập. **Mỗi lần nhìn và chạm màn hình là một lần rời mắt khỏi đường.**
>
> Nghiên cứu SHRP 2 trên hơn 900 vụ va chạm cho thấy yếu tố người lái có mặt trong gần 90% số vụ, và
> thao tác thiết bị cầm tay làm tăng đáng kể nguy cơ. Thêm vào đó, nhiều việc lặp đi lặp lại hằng
> ngày, và với các hãng xe nhận chuyến qua tổng đài, Zalo, Facebook thì điều phối viên và tài xế còn
> phải gọi qua lại để xác nhận — chậm và dễ sót.

**Luận văn:** mục 1.1 (bối cảnh), 1.2 (phát biểu bài toán).

**Chuyển:** "Từ đó, em đặt bài toán: xây một trợ lý giọng nói không chỉ trả lời mà **làm được nghiệp vụ thật**."

## Slide 4 — Giải pháp: một hệ thống, bốn vai trò (≈ 1 phút)

> Czen phục vụ bốn vai trò. **Tài xế** dùng app có trợ lý nghe tiếng Việt và thực hiện nghiệp vụ qua
> gọi công cụ. **Điều phối viên** là người tạo chuyến chính: nhận yêu cầu từ mọi kênh, gán tài xế và
> theo dõi. **Khách hàng** đặt qua tổng đài, Zalo, Facebook — web là tùy chọn — và nhận cuộc gọi do AI
> thực hiện. **Vận hành** giám sát chất lượng hội thoại, độ trễ và báo cáo hằng ngày.
>
> Hai nguyên tắc thiết kế xuyên suốt: **không bịa** — Czen chỉ nói dữ liệu lấy từ hệ thống; và **xác
> nhận trước** — hủy chuyến hay gọi số lạ đều phải hỏi lại.

**Luận văn:** mục 3.2 (nhóm người dùng), Bảng 3.8 (19 tiêu chí chấp nhận).

## Slide 5 — Kiến trúc (≈ 1 phút 15 giây)

> Kiến trúc là microservices trên AWS, được **lập luận từ năm yêu cầu phi chức năng** qua các chiến
> thuật kiến trúc. Hệ thống có sáu dịch vụ: năm dịch vụ nghiệp vụ — định danh, chuyến đi và điều
> phối, liên lạc bằng tin nhắn, nhật ký cuộc gọi, giám sát vận hành — viết bằng Node.js trên Lambda,
> mỗi dịch vụ có bảng DynamoDB riêng.
>
> Dịch vụ thứ sáu là **tác nhân hội thoại** viết bằng Python trên LiveKit Agents, chạy trên ECS Fargate
> vì nó phải giữ kết nối âm thanh dài hạn — điều Lambda không làm được. LiveKit đưa âm thanh tới app
> qua WebRTC và gọi điện thoại thật cho khách qua SIP.

**Luận văn:** mục 4.2 (ADR), 4.4 (sáu dịch vụ), Bảng 4.11 (rủi ro).

**Nếu bị hỏi "vì sao tách tác nhân khỏi dịch vụ nghiệp vụ":** để mở rộng độc lập (tác nhân tốn RAM
theo phiên, API thì không), để lỗi AI không kéo đổ nghiệp vụ, và để đổi nhà cung cấp AI mà không đụng
nghiệp vụ.

## Slide 6 — Công nghệ (≈ 45 giây)

> Ba khâu của trợ lý đều **chọn nhà cung cấp qua cấu hình** và có dự phòng. Nghe dùng Google Chirp 3
> cho tiếng Việt. Hiểu dùng mô hình GPT của OpenAI có gọi công cụ. Nói dùng ElevenLabs v4 turbo giọng
> Kiều Linh, Google TTS tự động dự phòng. Phần thời gian thực chạy trên LiveKit; ứng dụng dùng React
> Native và React; hạ tầng trên AWS.

**Luận văn:** mục 5.3, Phụ lục D (cấu hình lúc đo).

## Slide 7 — Một lượt hội thoại (≈ 1 phút)

> Mỗi lượt đi qua bốn bước: **Nghe** — phát hiện lời nói và nhận dạng tiếng Việt; **Hiểu** — LLM chọn
> đúng công cụ và tham số; **Làm** — gọi API thật về chuyến, khách, thu nhập; **Nói** — đọc lại bằng
> giọng ElevenLabs.
>
> Ba cơ chế bảo vệ trải nghiệm: chờ quá **2 giây** thì Czen nói câu đệm "Đợi mình một chút…"; thao tác
> rủi ro **xác nhận hai bước**; và mỗi khâu STT, LLM, TTS đều có **nhà cung cấp dự phòng**.

**Chuyển:** "Hai slide tiếp theo đi sâu vào phần kỹ thuật khó nhất: biết khi nào tài xế nói xong, và
trả lời nhanh mà không bị tiếng ồn đánh lừa."

## Slide 8 — Làm sao Czen biết tài xế đã nói xong? (≈ 1 phút 30 giây)

> Âm thanh đi qua bốn lớp.
>
> **Lớp một — lọc tại nguồn:** trong app, WebRTC khử tiếng vọng và giảm ồn; với cuộc gọi điện thoại,
> hệ thống bật bộ lọc ồn BVC Telephony.
>
> **Lớp hai — VAD Silero:** một mô hình nhỏ nhận biết khung âm thanh nào có giọng người, nên tiếng máy
> xe hay khoảng lặng không bị coi là lời nói.
>
> **Lớp ba — nhận dạng trực tuyến:** Google Chirp 3 nhận dạng tiếng Việt ngay khi tài xế đang nói, có
> gợi ý ưu tiên cụm "nhận chuyến".
>
> **Lớp bốn — chốt lượt:** sau lời cuối, im lặng **0,25 đến 0,55 giây** thì coi như tài xế đã nói xong
> và gửi câu cho LLM. Tiếng Việt chưa có mô hình chốt lượt chuyên biệt, nên hệ thống chốt bằng VAD và
> khoảng lặng.

**Lưu ý quan trọng (hội đồng có thể hỏi):** Bảng 6.4 ghi chặng "phát hiện kết thúc phát ngôn" là P50
0,94 s, P95 1,7 s — dài hơn nhiều so với 0,25–0,55 s trên slide. Cả hai đều đúng vì **khác cấu hình**:
đợt đo 05–06/09/2026 còn dùng mô hình phát hiện lượt; cấu hình hiện tại dùng VAD + khoảng lặng với
ngưỡng ngắn hơn và mới có 4 lượt đo (Bảng 6.5). Nói chủ động câu này nếu thời gian cho phép:

> Số 0,25–0,55 giây là cấu hình hiện tại. Đợt đo chính trong tháng 9 còn dùng mô hình chốt lượt cũ,
> nên chặng này ở Bảng 6.4 dài hơn — em sẽ trình bày ở phần kết quả.

## Slide 9 — Trả lời nhanh, đúng, và không bị tiếng ồn đánh lừa (≈ 1 phút 30 giây)

> Để trả lời nhanh, em dùng ba kỹ thuật. **Sinh trước:** LLM và TTS chạy ngay khi có bản ghi cuối, chưa
> đợi chốt lượt; nếu tài xế nói thêm thì bản nháp bị hủy. **Gọi công cụ thật:** LLM không tự bịa mà
> gọi API; thao tác rủi ro hỏi lại trước. **Vừa sinh vừa đọc:** từng câu đi qua từ điển phát âm rồi
> sang ElevenLabs phát luồng, không chờ cả đoạn.
>
> Về chống ồn: tài xế nói chen từ **0,5 giây** thì Czen dừng để nghe, trừ các câu xác nhận quan trọng.
> Nếu đó chỉ là tiếng động và sau 0,5 giây không ra chữ nào, Czen **nói tiếp câu đang dở**. Những bản
> ghi không phải lời nói — rỗng, "nhạc chuông", "tút tút" — bị lọc trước khi thành một lượt.
>
> Ngưỡng 0,5 giây được chọn sau khi thử 0,3 giây và thấy tiếng vọng, tiếng đường làm Czen tự ngắt lời
> mình nhiều lần. Cuối cùng, im lặng 15 giây thì Czen hỏi "Bạn còn đó không?", thêm 10 giây thì chào
> và kết thúc phiên.

**Chuyển:** "Hệ thống như vậy có đạt yêu cầu không? Em xin trình bày kết quả đo trên hệ thống thật."

## Slide 10 — Kết quả đánh giá (≈ 2 phút) — slide quan trọng nhất

> Em đánh giá theo bốn câu hỏi nghiên cứu, gắn với 19 tiêu chí chấp nhận.
>
> **RQ4 — tính đúng chức năng:** trên 43 lượt được chấm, Czen chọn đúng công cụ **86,0%** và hoàn thành
> nghiệp vụ ngay lần đầu **74,4%**. Khoảng tin cậy còn rộng vì cỡ mẫu nhỏ, nên em ghi rõ "mẫu nhỏ".
> Lỗi chính là sai tham số và "đáp lời nhưng chưa thực hiện" — đây cũng là lý do em giữ xác nhận hai
> bước.
>
> **RQ1 — mở rộng và phục hồi:** **200/200** lượt tiêm lỗi không làm hỏng hội thoại; khi tăng từ 1 lên
> **40 phiên** đồng thời, P95 không tăng. Phần này đo trong môi trường mô phỏng với AI giả lập.
>
> **RQ3 — nhận dạng giọng nói:** tỷ lệ lỗi từ tăng từ **3,1%** lên **7,3%** khi có nhiễu khoang xe —
> với một người đọc và 22 câu, đây là xu hướng.
>
> **RQ2 — độ trễ: chưa đạt.** P95 của luồng qua LLM là **3,75 giây**, ngưỡng là 2 giây. Thành phần
> chi phối là thời gian **LLM sinh token đầu**, P95 khoảng 2,5 giây. Kết luận của em là: khi dùng mô
> hình qua API bên ngoài, việc đạt ngưỡng phụ thuộc chủ yếu vào nhà cung cấp mô hình, **không phải vào
> cách chia dịch vụ** — bằng chứng là độ trễ không tăng khi số phiên tăng. Vì vậy câu đệm sau 2 giây
> rất quan trọng với trải nghiệm.

**Luận văn:** Bảng 6.3, 6.4 (độ trễ), mục 6.5 (WER), 6.6 (gọi công cụ), Bảng 6.11–6.12, Bảng 6.16
(tổng hợp), mục 6.12 (trả lời RQ).

## Slide 11 — Kịch bản demo (≈ 40 giây)

> Phần demo. Tài xế David lái Hyundai Palisade bảy chỗ. Khách Bá Chính gọi tổng đài đặt chuyến từ Nhà
> hát Lớn Hà Nội đến khu đô thị Ciputra, khoảng 12 km, cước 157.800 đồng. Toàn bộ quay trên hệ thống
> chạy thật; **các cuộc gọi tới khách là cuộc gọi điện thoại thật**; vị trí xe được mô phỏng theo lộ
> trình thật.

## Slide 12 — Luồng demo: mười một bước (≈ 40 giây, hoặc bật video ở đây)

> Video đi qua mười một bước, từ lúc tài xế đăng ký đến trang vận hành. Em sẽ nhấn vào ba bước tô tím:
> điều phối viên tạo chuyến, Czen đọc chuyến và tài xế nhận bằng giọng nói, rồi hỏi đáp với Czen.

**Gợi ý:** nếu hội đồng cho thời gian, bật `czen_demo.mp4` tại đây rồi quay lại slide 13.

## Slide 13 — Bước 3: điều phối viên tạo chuyến (≈ 40 giây)

> Khách gọi tổng đài. Điều phối viên nhập tên, số điện thoại, chọn kênh "Gọi tổng đài", điểm đón,
> điểm trả, ghi chú hai vali, chọn tài xế David rồi bấm "Tạo và thông báo tài xế". Kênh đặt và ghi
> chú được lưu cùng chuyến; bảng chuyến chuyển sang "Đã xác nhận" ngay khi tài xế nhận.

## Slide 14 — Bước 4: nhận chuyến bằng một câu nói (≈ 45 giây)

> Ngay khi điều phối viên bấm tạo, chuyến hiện trên app. Czen **tự kết nối** và đọc: "Bạn có chuyến
> mới: đón Bá Chính ở Nhà hát Lớn Hà Nội. Bạn nhận chuyến này không?" Tài xế chỉ nói "Nhận chuyến
> nhé", Czen nhận qua công cụ, và trang điều phối cập nhật trong khoảng một giây. **Không cần nhìn hay
> chạm màn hình.**

## Slide 15 — Bước 5: hỏi đáp (≈ 45 giây)

> Trước khi lăn bánh, tài xế hỏi: khách có ghi chú gì không, tới điểm đón mất bao lâu. Mọi câu trả lời
> lấy từ **dữ liệu chuyến thật**. Và khi tài xế khen, Czen đáp vui tươi — đó là phần tiếp theo: giọng
> nói.

## Slide 16 — Giọng nói của Czen (≈ 1 phút)

> Czen dùng giọng nữ miền Nam "Kiều Linh" của ElevenLabs, Google làm dự phòng. Czen nhấn nhá đúng lúc:
> tươi khi chào, cảm ơn; nghiêm túc khi xác nhận thao tác, đọc tiền hay gọi khách. Với khách, Czen xưng
> "anh chị".
>
> Một vấn đề thực tế: LLM viết "30A-123.45", "14:30", "TP.HCM" — nếu đọc nguyên văn thì rất khó nghe.
> Vì vậy mọi câu trả lời đi qua **từ điển phát âm** trước khi tới bất kỳ nhà cung cấp TTS nào: biển số,
> giờ, đơn vị và từ viết tắt được đổi sang cách đọc tiếng Việt.

**Lưu ý:** đợt đo trong Chương 6 dùng TTS Google (Bảng 6.2); ElevenLabs được đưa vào sau đợt đo, vì vậy
"đo lại với giọng ElevenLabs" nằm trong bước tiếp theo.

## Slide 17 — Thông điệp (≈ 15 giây)

> Thông điệp của Czen: **mắt trên đường, tay trên vô lăng** — mọi thao tác của chuyến đi bằng giọng nói.

## Slide 18 — Tổng kết (≈ 1 phút 15 giây)

> Tóm lại, em đã đi đủ các bước của nghiên cứu khoa học thiết kế: xác định yêu cầu cho bốn nhóm người
> dùng, lập luận kiến trúc từ năm yêu cầu phi chức năng, hiện thực nguyên mẫu trên WebRTC và SIP, và
> đánh giá theo 19 tiêu chí chấp nhận.
>
> **Đã làm được:** tài xế đi trọn một chuyến bằng giọng nói; AI gọi điện thoại thật cho khách; kiến
> trúc microservices trên AWS với LiveKit, mã nguồn công khai.
>
> **Chưa đạt:** độ trễ — P95 luồng qua LLM 3,75 giây so với ngưỡng 2 giây trong đợt đo tháng 9, chủ
> yếu do LLM sinh token đầu.
>
> **Bước tiếp theo:** giảm độ trễ token đầu — mô hình nhanh hơn, lời nhắc ngắn hơn, ít vòng gọi công cụ
> hơn — và đo lại với ít nhất 200 lượt; đo lại với giọng ElevenLabs; và thử nghiệm với tài xế thật
> trên đường.
>
> Em xin cảm ơn thầy cô và các bạn đã lắng nghe. Em rất mong nhận được câu hỏi và góp ý của Hội đồng.

---

## Chuẩn bị câu hỏi của Hội đồng

**1. Độ trễ không đạt thì hệ thống có còn dùng được không?**
Có, với giới hạn rõ ràng. P50 luồng qua LLM là 1,54 s; chỉ đuôi phân phối vượt 2 s, và câu đệm sau 2 s
giúp tài xế biết hệ thống đang xử lý. Luận văn không giấu kết quả này: AC-15 ghi "Không đạt" (Bảng
6.16). Đóng góp thứ tư của luận văn chính là bằng chứng rằng nút thắt nằm ở token đầu của LLM chứ không
ở kiến trúc.

**2. Vì sao không dùng mô hình giọng nói đầu-cuối (speech-to-speech) cho nhanh?**
Mô hình song công như Moshi đạt khoảng 200 ms nhưng không gọi công cụ được (Bảng 6.17). Bài toán của
em cần thực hiện nghiệp vụ thật qua API, nên chọn chuỗi STT – LLM – TTS; chuỗi này chậm hơn khoảng một
bậc độ lớn — đó là cái giá để gọi được công cụ (mục 2.9.3).

**3. Cỡ mẫu nhỏ (43 lượt, 22 câu, 1 người đọc, 1 người chấm) thì kết luận được gì?**
Em báo khoảng tin cậy Wilson, ghi "mẫu nhỏ" và không khẳng định khác biệt khi khoảng tin cậy chồng
lấn (mục 6.13, độ tin cậy kết luận). Đây là giai đoạn đánh giá nhân tạo theo khung FEDS; đợt sau cần
hai người chấm độc lập và hệ số đồng thuận.

**4. Chưa thử với tài xế thật — vậy nói "an toàn hơn" có căn cứ không?**
Luận văn không khẳng định an toàn giao thông: độ trễ đo trải nghiệm hội thoại, không đo an toàn thực
địa (mục 6.13, độ tin cậy cấu trúc). Giọng nói giảm rời mắt nhưng không loại bỏ tải nhận thức (mục
2.9.1). Nghiên cứu người dùng trong kịch bản lái mô phỏng là hướng phát triển.

**5. Khả năng mở rộng đo trên mô phỏng, chưa phải AWS?**
Đúng. Thử tải và tiêm lỗi chạy trên một máy với AI giả lập; khởi động nguội Lambda, giới hạn API
Gateway, tăng bản sao Fargate và giới hạn tốc độ của nhà cung cấp AI chưa được quan sát (mục 6.13, độ
tin cậy bên ngoài). Phát hiện hữu ích: bộ nhớ là giới hạn chính, khoảng 225 MB mỗi phiên, nên tự mở
rộng cần dựa trên bộ nhớ hoặc số phiên.

**6. Khi một bản sao tác nhân chết thì sao?**
Phiên mới được phục vụ 10/10 lần, nhưng phiên đang chạy bị mất, và lỗi treo khiến tài xế chờ 6–8 giây
(Bảng 6.12). Hướng sửa: rút ngắn thời gian chờ, duy trì tối thiểu hai bản sao, tự xin lại token.

**7. Làm sao tránh LLM "bịa" hay làm sai thao tác nguy hiểm?**
Czen chỉ trả lời từ dữ liệu công cụ trả về; thao tác rủi ro (hủy chuyến, gọi/nhắn số ngoài chuyến) bắt
buộc xác nhận hai bước — AC-14 đạt 100% thao tác rủi ro có xác nhận. Các câu xác nhận quan trọng không
cho ngắt lời.

**8. Bảo mật và dữ liệu cá nhân?**
Kiểm tra theo danh mục đạt 5/6 lúc đầu vì nhật ký còn số điện thoại đầy đủ; đã sửa (che số) và đạt
6/6 (Bảng 6.13). Còn tồn tại: webhook Twilio chưa kiểm tra chữ ký X-Twilio-Signature (mục 6.13).

**9. Vì sao tiếng Việt không dùng mô hình chốt lượt như tiếng Anh?**
Bộ phát hiện lượt của LiveKit chưa hỗ trợ tiếng Việt, nên hệ thống chốt bằng VAD Silero và khoảng lặng
0,25–0,55 s, kết hợp sinh trước để bù thời gian.

**10. Vì sao SMS cho khách chưa đạt?**
Nhà mạng Việt Nam chỉ nhận SMS quốc tế từ tên người gửi và mẫu tin đã đăng ký; phép gửi thật ngày
12/10/2026 bị từ chối mã 21612, nên AC-11 chỉ đạt ở mức kiểm thử.

**11. Đóng góp khoa học của luận văn là gì so với chỉ "làm một app"?**
Bốn đóng góp (mục 1.7): kiến trúc tham chiếu lập luận từ NFR; nguyên mẫu đầu cuối mã nguồn công khai;
khung đánh giá gắn 19 tiêu chí Given – When – Then có truy vết; và bằng chứng thực nghiệm về giới hạn
độ trễ của chuỗi xử lý theo tầng.

**12. So với các benchmark công bố thì sao?**
Chỉ để định vị (Bảng 6.17): τ-bench báo GPT-4o hoàn thành dưới 50% nhiệm vụ nhiều lượt — luận văn tính
theo lượt nên 74,4% không so trực tiếp được; WER 3,1% thấp hơn Whisper trên FLEURS tiếng Việt (10,3%)
nhưng bộ câu của em ngắn và đúng miền, nên chưa đủ để kết luận khâu nhận dạng tốt hơn.

## Kiểm tra trước buổi bảo vệ

Những điểm đã ghi nhận khi rà soát luận văn, cần tự xác nhận để không bị hỏi bất ngờ:

- Chương 6, RS-03 ghi "trung vị 4,1 s" nhưng tệp `results_rs03.txt` ghi 0,1 s — kiểm tra lại số nào đúng.
- Bảng 6.8: số lỗi tổng (4/3/2/2) chưa khớp các dòng chấm chi tiết (3/2/1/0).
- Một chỗ ghi 2.350, tệp kết quả ghi 2.352.
- Hình 5.3: Chương 5 nói dữ liệu 18/10 nhưng Bảng 6.14 dẫn cho giai đoạn 30/08–10/09.
- Mục 6.2 nói "số điện thoại được che" trong khi mục 6.10 nói nhật ký có số đầy đủ trước khi sửa —
  thống nhất cách nói theo thời gian.
- Bìa: bổ sung mã học viên; xác nhận tên người hướng dẫn và tên đề tài chính xác.
- Luận văn hiện khoảng 112 trang so với mục tiêu 100 trang.

## Bản rút gọn 15 phút

Giữ nguyên slide 1, 2, 4, 5, 7, 8, 9, 10, 14, 18. Gộp: slide 3 nói một câu ("mỗi lần chạm màn hình là
một lần rời mắt khỏi đường"); slide 6 bỏ qua (đã nêu ở slide 5 và 7); slide 11–13 nói chung một đoạn
30 giây; slide 15–17 nói chung một đoạn 45 giây.
