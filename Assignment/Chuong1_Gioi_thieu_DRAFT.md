# Chương 1. Giới thiệu

Chương này xác lập bối cảnh, bài toán và định hướng của luận văn: vì sao cần một trợ lý giọng nói cho tài xế, hệ thống phải làm được gì, và được đánh giá theo tiêu chí nào. Các mục tiêu và câu hỏi nghiên cứu nêu ở đây định hướng nội dung các chương sau.

## 1.1. Bối cảnh và động lực nghiên cứu

Trong những năm gần đây, các dịch vụ gọi xe công nghệ ngày càng phổ biến nhờ đáp ứng linh hoạt nhu cầu đi lại. Song song với sự mở rộng đó, tài xế phải thực hiện nhiều nghiệp vụ trong lúc điều khiển phương tiện: xem và xác nhận chuyến, cập nhật trạng thái đón/trả khách, liên lạc với khách hàng, tra cứu thông tin lộ trình. Những thao tác này thường diễn ra trên điện thoại thông minh, buộc tài xế rời mắt khỏi đường và một tay rời vô-lăng, trong khi vẫn cần tập trung vào giao thông.

Nhiều bằng chứng thực nghiệm đã chỉ ra mối liên hệ giữa việc sử dụng điện thoại khi lái xe và nguy cơ mất an toàn. Phân tích trên dữ liệu lái xe tự nhiên quy mô lớn cho thấy các yếu tố liên quan đến tài xế (sai sót, suy giảm khả năng, mệt mỏi, phân tâm) hiện diện trong gần 90% các vụ va chạm được quan sát; đồng thời khẳng định phân tâm — đặc biệt khi thao tác thiết bị cầm tay — làm tăng nguy cơ mất an toàn (Dingus et al., 2016). Tổng hợp của Insurance Institute for Highway Safety (IIHS) cũng nêu nguy cơ va chạm cao gấp khoảng hai đến sáu lần khi người lái thao tác trên điện thoại so với khi không bị phân tâm (Insurance Institute for Highway Safety, n.d.). Thực tế đó cho thấy cần một cách tương tác khác — rảnh tay, bằng giọng nói — để tài xế bớt phải nhìn và chạm màn hình khi lái.

Song song, các mô hình trí tuệ nhân tạo (Artificial Intelligence – AI) cho hội thoại đã đủ chín: nhận dạng giọng nói (Speech-to-Text – STT), mô hình ngôn ngữ lớn (Large Language Model – LLM) và tổng hợp giọng nói (Text-to-Speech – TTS) có thể ghép thành một chuỗi xử lý thời gian thực. Quan trọng hơn, cơ chế **gọi công cụ** (function calling) cho phép mô hình ngôn ngữ không chỉ trả lời bằng ngôn ngữ tự nhiên mà còn thực thi nghiệp vụ qua giao diện lập trình ứng dụng (Application Programming Interface – API) (Schick et al., 2023). Hạ tầng truyền thông thời gian thực — WebRTC cho ứng dụng, SIP cho điện thoại — cũng đã sẵn có (LiveKit Inc., n.d.).

Từ nhu cầu và điều kiện kỹ thuật trên, luận văn đặt vấn đề xây dựng và đánh giá một trợ lý giọng nói chuyên cho nghiệp vụ tài xế, trình bày ở mục 1.2.

## 1.2. Phát biểu bài toán

Bài toán đặt ra là thiết kế, triển khai và đánh giá một hệ thống trợ lý AI bằng giọng nói hỗ trợ tài xế khi đang chạy xe. Hệ thống cần tiếp nhận yêu cầu bằng giọng nói tiếng Việt (và tiếng Anh như ngôn ngữ bổ trợ), hiểu ý định người dùng, thực thi nghiệp vụ tương ứng trên hệ thống quản lý chuyến đi thông qua cơ chế gọi công cụ, rồi phản hồi bằng giọng nói trong thời gian thực.

Cụ thể, trợ lý cần hỗ trợ ba nhóm việc: (i) tra cứu và quản lý thông tin chuyến đi (xem lịch trình, cập nhật trạng thái, hủy chuyến khi đủ điều kiện); (ii) liên lạc và xác nhận với khách hàng, gồm khởi tạo cuộc gọi qua trợ lý và gửi tin nhắn qua dịch vụ phía máy chủ (backend); và (iii) hỗ trợ theo ngữ cảnh vận hành (nhắc trước giờ đón, trả lời câu hỏi thường gặp về cách dùng ứng dụng). Hệ thống phải chạy ổn định trên cả kênh trong ứng dụng (WebRTC) và kênh SIP khi hệ thống gọi cho tài xế hoặc gọi khách.

Bài toán không dừng lại ở việc “trả lời hội thoại”, mà đòi hỏi hệ thống hành động đúng nghiệp vụ, kiểm soát được độ trễ tài xế cảm nhận được, và hoạt động được trong tiếng ồn khoang xe. Cách **đo lường và cụ thể hóa** các yêu cầu này được thể hiện qua mục tiêu và câu hỏi nghiên cứu ở các mục kế tiếp.

## 1.3. Mục tiêu nghiên cứu

Mục tiêu tổng quát của luận văn là xây dựng một giải pháp trợ lý AI bằng giọng nói giúp giảm thao tác thủ công trên thiết bị di động của tài xế xe công nghệ, đồng thời chứng minh tính khả thi kỹ thuật của giải pháp thông qua triển khai thực tế và đánh giá theo các chỉ số đo được.

Các mục tiêu cụ thể gồm:

1. Phân tích yêu cầu chức năng và yêu cầu phi chức năng cho trợ lý giọng nói dành cho tài xế trong ngữ cảnh gọi xe.
2. Đề xuất kiến trúc hệ thống **tách lớp rõ ràng**, tách tầng hội thoại AI khỏi tầng nghiệp vụ vận tải, hỗ trợ **thay nhà cung cấp** cho ba khối STT, LLM và TTS khi cần, và **phân loại phiên hội thoại** để chọn đúng tập nghiệp vụ được phép thực hiện.
3. Triển khai hệ thống nguyên mẫu tích hợp trên nền tảng truyền thông thời gian thực (WebRTC và SIP), ứng dụng di động tài xế và các dịch vụ backend quản lý chuyến đi.
4. Đánh giá hệ thống theo độ trễ phản hồi, độ chính xác nhận dạng giọng nói trong điều kiện khác nhau, độ chính xác gọi công cụ và tỷ lệ hoàn thành nghiệp vụ trên bộ kịch bản thử nghiệm; bổ sung quan sát từ thử nghiệm với tài xế thật khi đủ điều kiện.

Đối với mục tiêu đánh giá (mục tiêu 4), luận văn đặt trước các ngưỡng định hướng sau (chi tiết cách đo ở Chương 6). Đây là mốc kỳ vọng khi đánh giá, chưa phải kết quả đã đo:

- **Độ trễ phản hồi:** thời gian từ khi tài xế **kết thúc câu nói** đến khi hệ thống **bắt đầu phát âm** trả lời. Luận văn dùng phân vị 95 (ký hiệu **P95**): trong tập các lần đo, khoảng 95% lần đo có độ trễ không vượt quá mốc đã chọn. Ngưỡng định hướng: **P95 ≤ 2 giây** trên các luồng nghiệp vụ cốt lõi. Mốc 2 giây được chọn như một biên nới rộng: khoảng lặng giữa các lượt trong hội thoại tự nhiên thường dưới một giây, nhưng khi vừa lái vừa nói, một khoảng chờ tới khoảng hai giây vẫn được coi là chấp nhận được; cơ sở lý thuyết về khoảng lặng hội thoại trình bày ở Chương 2.
- **Tỷ lệ lỗi từ trong nhận dạng giọng nói** (Word Error Rate – **WER**): so chữ hệ thống nhận được với câu đọc đúng; càng nhiều từ sai, sót hoặc thừa thì WER càng cao. Luận văn không đặt ngưỡng tuyệt đối cho WER mà so sánh tương đối giữa điều kiện yên tĩnh và điều kiện nhiễu giả lập khoang xe (chi tiết cách đo ở Chương 6).
- **Độ chính xác gọi công cụ** và **tỷ lệ hoàn thành tác vụ:** báo cáo theo nhóm kịch bản; không khẳng định trước kết quả số tại Chương 1.

Các câu hỏi nghiên cứu ở mục 1.4 cụ thể hóa việc kiểm chứng các mục tiêu này.

## 1.4. Câu hỏi nghiên cứu

Luận văn định hướng trả lời các câu hỏi nghiên cứu (Research Questions – RQ) sau:

- **RQ1.** Làm thế nào để thiết kế và triển khai một trợ lý AI bằng giọng nói cho tài xế xe công nghệ, trong đó mô hình ngôn ngữ đóng vai trò điều phối nghiệp vụ thông qua gọi công cụ trên hạ tầng hội thoại thời gian thực?
- **RQ2.** Với các luồng nghiệp vụ cốt lõi (ví dụ tra cứu chuyến, xác nhận/từ chối, liên lạc khách hàng), độ trễ phản hồi (tính từ lúc tài xế dứt câu đến lúc trợ lý bắt đầu nói) đạt mức nào, và liệu **P95** có duy trì được **≤ 2 giây**?
- **RQ3.** **WER** (tỷ lệ lỗi từ trong nhận dạng giọng nói) thay đổi như thế nào giữa môi trường yên tĩnh và môi trường có nhiễu nền giả lập điều kiện trong xe?
- **RQ4.** Trên bộ kịch bản nghiệp vụ đã thiết kế, tỷ lệ lựa chọn đúng công cụ và hoàn thành đúng tác vụ đạt mức nào, và những lỗi phổ biến nào ảnh hưởng đến trải nghiệm rảnh tay của tài xế?

Mối liên hệ giữa mục tiêu cụ thể, câu hỏi nghiên cứu và chương chịu trách nhiệm trả lời được tóm tắt trong Bảng 1.1.

**Bảng 1.1.** Chỉ mục ánh xạ mục tiêu nghiên cứu – câu hỏi nghiên cứu – chương trả lời

| STT | Mục tiêu cụ thể | Câu hỏi nghiên cứu (RQ) | Tiêu chí / chỉ số định hướng | Chương trả lời |
|---|---|---|---|---|
| 1 | Phân tích yêu cầu | Cơ sở cho RQ1–RQ4 | Định nghĩa nghiệp vụ “đúng”, kịch bản chấp nhận | Chương 3 |
| 2 | Đề xuất kiến trúc | RQ1 | Kiến trúc tách lớp, WebRTC và SIP, gọi công cụ | Chương 4 |
| 3 | Triển khai nguyên mẫu | RQ1 | Triển khai llm-orchestrator, dịch vụ backend và ứng dụng tích hợp | Chương 5 |
| 4 | Đánh giá theo chỉ số | RQ2, RQ3, RQ4 | Độ trễ (P95 ≤ 2s), WER (tỷ lệ lỗi từ), độ đúng gọi công cụ, tỷ lệ hoàn thành tác vụ | Chương 6 |

Các câu hỏi trên sẽ được làm rõ về phương pháp đo ở Chương 3 và Chương 6; chương này chỉ xác lập chúng như định hướng cho thiết kế và đánh giá.

## 1.5. Phạm vi và giới hạn nghiên cứu

### Đối tượng, không gian và thời gian nghiên cứu

- **Đối tượng nghiên cứu chính:** trợ lý AI bằng giọng nói dành cho tài xế xe công nghệ; **đối tượng tham gia đánh giá** là tài xế (và một phần luồng khách hàng khi cần minh họa tích hợp), với ngôn ngữ ưu tiên tiếng Việt.
- **Không gian nghiên cứu:** hệ thống nguyên mẫu triển khai trên **môi trường phát triển và thử nghiệm** (LiveKit Cloud, dịch vụ backend và ứng dụng di động), không phải toàn bộ mạng lưới vận hành thương mại quy mô lớn.
- **Thời gian nghiên cứu:** giai đoạn thiết kế–triển khai–đánh giá gắn với quá trình thực hiện luận văn (khoảng 2025–2026); số liệu thực nghiệm phản ánh cấu hình hệ thống tại thời điểm đo và sẽ được ghi rõ ở Chương 6.

### Phạm vi nghiên cứu

Luận văn tập trung vào lớp trợ lý giọng nói tích hợp với nền tảng vận hành chuyến đi, chứ không nhằm xây dựng toàn bộ một hệ thống quản lý vận tải hoàn chỉnh (điều phối tối ưu toàn mạng, định giá cước, thanh toán, bảo hiểm). Các thành phần ứng dụng di động, dịch vụ xác thực và dịch vụ quản lý chuyến được xem là **nền tảng tích hợp** cần thiết để trợ lý giọng nói thực thi nghiệp vụ thật, và được trình bày ở mức đủ để làm rõ cách các thành phần kết nối với nhau.

Trong phạm vi chức năng của trợ lý, luận văn bao gồm: tương tác bằng giọng nói tiếng Việt và tiếng Anh; quản lý chuyến đi bằng giọng nói; hỗ trợ liên lạc/xác nhận với khách hàng; hỗ trợ nhắc lịch và câu hỏi thường gặp (có truy xuất tri thức); và cơ chế kích hoạt rảnh tay trên ứng dụng tài xế (từ khóa đánh thức – wake-word) như một phần trải nghiệm an toàn. Hệ thống được thiết kế để hoạt động trên kênh WebRTC trong ứng dụng và kênh SIP khi cần thoại qua mạng điện thoại công cộng (PSTN). Các dịch vụ backend theo MSA mang tên theo chức năng (identity-service, external-api-service, llm-orchestrator, external-channel-service, call-records-service, ops-service) — chi tiết yêu cầu ở Chương 3.

### Giới hạn

Luận văn không huấn luyện lại các mô hình AI nền tảng (STT/LLM/TTS) từ dữ liệu riêng quy mô lớn, mà sử dụng các mô hình và dịch vụ hiện có thông qua **lớp trung gian** để có thể thay nhà cung cấp. Nghiên cứu cũng không bao gồm quét/tạo đơn giao hàng từ ảnh, nhắn tin nhóm giữa các tài xế, điều hướng rẽ từng bước thay thế Google Maps/Waze, hay xử lý tranh chấp thanh toán và khiếu nại pháp lý. Quy mô thử nghiệm với tài xế thật bị giới hạn bởi điều kiện triển khai thực tế và sẽ được thảo luận như một hạn chế ở Chương 6.

Những giới hạn này **xác định ranh giới** đóng góp và tránh phóng đại kết quả so với phạm vi đã cam kết.

## 1.6. Phương pháp nghiên cứu

Luận văn theo tiếp cận nghiên cứu khoa học thiết kế (design science research): **thiết kế – xây dựng – đánh giá**. Bốn mục tiêu ở mục 1.3 tương ứng bốn giai đoạn và bốn chương — phân tích yêu cầu (Chương 3), thiết kế kiến trúc (Chương 4), triển khai nguyên mẫu (Chương 5), đánh giá thực nghiệm (Chương 6) — kết thúc bằng bước thảo luận và rút hạn chế. Việc đánh giá dựa trên bộ kịch bản có kiểm soát, bổ sung phản hồi định tính từ tài xế thật khi đủ điều kiện; cách đo chi tiết từng chỉ số trình bày ở Chương 6.

## 1.7. Những đóng góp của luận văn

Luận văn hướng tới ba đóng góp chính:

1. **Làm rõ khoảng trống nghiên cứu:** chưa có trợ lý giọng nói vừa hội thoại thời gian thực, vừa thực thi nghiệp vụ vận tải qua gọi công cụ, vừa được đánh giá theo tiêu chí của tài xế (phân tích ở Chương 2).
2. **Đề xuất và hiện thực một kiến trúc** tách tầng AI khỏi tầng nghiệp vụ, một đường STT → LLM kèm công cụ → TTS với câu giữ chỗ khoảng hai giây, và phân loại phiên hội thoại theo ngữ cảnh (Chương 4–5).
3. **Xây dựng bộ kịch bản và khung đo** (độ trễ, WER, gọi công cụ, hoàn thành nghiệp vụ) để đánh giá định lượng hệ thống trong phạm vi đã xác định (Chương 6). Số liệu cụ thể trình bày ở Chương 6, không khẳng định trước tại đây.

## 1.8. Cấu trúc luận văn

Phần còn lại của luận văn gồm: Chương 2 — cơ sở lý thuyết và khoảng trống nghiên cứu; Chương 3 — phân tích yêu cầu; Chương 4 — thiết kế hệ thống; Chương 5 — triển khai; Chương 6 — thực nghiệm và đánh giá; và phần Kết luận tổng kết đóng góp, nêu hạn chế và hướng phát triển.

Các nội dung bổ trợ (danh mục công cụ đầy đủ, bộ kịch bản kiểm thử chi tiết, ảnh màn hình, cấu hình môi trường không chứa bí mật) đặt ở Phụ lục để giữ thân bài tập trung vào lập luận chính.

## Kết luận chương

Chương 1 đã xác lập bối cảnh an toàn, bài toán, bốn mục tiêu và bốn câu hỏi nghiên cứu (RQ1–RQ4), cùng phạm vi và các ngưỡng đánh giá định hướng — nổi bật là P95 ≤ 2 giây cho độ trễ phản hồi. Trọng tâm nghiên cứu là trợ lý AI bằng giọng nói cho tài xế xe công nghệ; ứng dụng và dịch vụ quản lý chuyến đóng vai trò nền tảng tích hợp. Chương tiếp theo trình bày cơ sở lý thuyết và làm rõ khoảng trống mà luận văn hướng tới.

---

## Tài liệu trích dẫn trong Chương 1 (bản nháp — sẽ gộp vào danh mục cuối)

1. Dingus, T. A., Guo, F., Lee, S., Antin, J. F., Perez, M., Buchanan-King, M., & Hankey, J. (2016). Driver crash risk factors and prevalence evaluation using naturalistic driving data. *Proceedings of the National Academy of Sciences, 113*(10), 2636–2641. https://doi.org/10.1073/pnas.1513271113

2. Insurance Institute for Highway Safety. (n.d.). *Distracted driving*. https://www.iihs.org/research-areas/distracted-driving

3. Schick, T., Dwivedi-Yu, J., Dessì, R., Raileanu, R., Lomeli, M., Hambro, E., Zettlemoyer, L., Cancedda, N., & Scialom, T. (2023). *Toolformer: Language Models Can Teach Themselves to Use Tools*. arXiv:2302.04761. https://arxiv.org/abs/2302.04761

4. LiveKit Inc. (n.d.). *Agents*. LiveKit Documentation. https://docs.livekit.io/agents/

> Ghi chú biên tập: Mọi nguồn ở trên đã kiểm được DOI/URL.

---

## Self-review (Chương 1 — review lần 2: P95/WER + đọc lần đầu)

| Hạng mục | Kết quả |
|---|---|
| P95 / WER giải thích bằng tiếng Việt thường trước khi dùng tắt | Đạt (1.3 + Tóm tắt + danh mục viết tắt) |
| Nêu rõ “ngưỡng định hướng ≠ kết quả đã đo” | Đạt (1.3) |
| backend lần đầu có tiếng Việt kèm | Đạt (1.2) |
| Khung 1.1–1.8, Bảng 1.1, không claim số Chương 6 | Đạt |
| Cần Chinh đọc lại Tóm tắt + mục 1.3 | P0 duyệt cảm nhận |
