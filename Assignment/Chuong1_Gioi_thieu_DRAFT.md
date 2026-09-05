# Chương 1. Giới thiệu

Chương này đặt nền tảng cho toàn bộ luận văn. Trước hết, mục 1.1 trình bày bối cảnh ngành vận tải công nghệ, động lực an toàn khi lái xe và ý nghĩa của đề tài. Tiếp theo, mục 1.2 phát biểu bài toán nghiên cứu. Các mục 1.3 và 1.4 lần lượt làm rõ mục tiêu, ngưỡng đánh giá chính cùng câu hỏi nghiên cứu và mối liên hệ giữa chúng. Sau đó, mục 1.5 xác định đối tượng, không gian–thời gian, phạm vi và giới hạn; mục 1.6 mô tả phương pháp nghiên cứu. Cuối cùng, mục 1.7 nêu đóng góp dự kiến và mục 1.8 giới thiệu cấu trúc các chương tiếp theo.

## 1.1. Bối cảnh và động lực nghiên cứu

Trong những năm gần đây, các dịch vụ gọi xe công nghệ và giao nhận hàng hóa ngày càng phổ biến nhờ đáp ứng linh hoạt nhu cầu di chuyển và vận chuyển. Song song với sự mở rộng đó, tài xế phải thực hiện nhiều nghiệp vụ trong lúc điều khiển phương tiện: xem và xác nhận chuyến, cập nhật trạng thái đón/trả khách, liên lạc với khách hàng, tra cứu thông tin lộ trình, cũng như xử lý các tình huống phát sinh trên đường. Những thao tác này thường diễn ra trên điện thoại thông minh, đòi hỏi chú ý bằng mắt và thao tác bằng tay, trong khi tài xế vẫn cần tập trung vào giao thông.

Nhiều bằng chứng thực nghiệm đã chỉ ra mối liên hệ giữa việc sử dụng điện thoại khi lái xe và nguy cơ mất an toàn. Phân tích trên dữ liệu lái xe tự nhiên quy mô lớn cho thấy các yếu tố liên quan đến tài xế (sai sót, suy giảm khả năng, mệt mỏi, phân tâm) hiện diện trong gần 90% các vụ va chạm được quan sát; đồng thời khẳng định phân tâm — đặc biệt khi thao tác thiết bị cầm tay — làm tăng nguy cơ mất an toàn (Dingus et al., 2016). Tổng hợp của Insurance Institute for Highway Safety (IIHS) cũng nêu rằng nguy cơ va chạm tăng khoảng từ hai đến sáu lần khi người lái thao tác trên điện thoại so với khi không bị phân tâm (Insurance Institute for Highway Safety, n.d.). Điều này cho thấy nhu cầu tìm phương thức tương tác thay thế — đặc biệt là tương tác rảnh tay bằng giọng nói — nhằm giảm thao tác màn hình trong lúc lái xe.

Song song với nhu cầu thực tiễn, tiến bộ của trí tuệ nhân tạo (Artificial Intelligence – AI) đã tạo điều kiện kỹ thuật cho các hệ thống hội thoại thời gian thực. Các thành phần nhận dạng giọng nói (Speech-to-Text – STT), mô hình ngôn ngữ lớn (Large Language Model – LLM) và tổng hợp giọng nói (Text-to-Speech – TTS) có thể được kết hợp thành một **chuỗi xử lý hội thoại**. Đặc biệt, cơ chế **gọi công cụ** (function calling) cho phép LLM không chỉ sinh câu trả lời bằng ngôn ngữ tự nhiên mà còn kích hoạt hành động nghiệp vụ cụ thể thông qua giao diện lập trình ứng dụng (Application Programming Interface – API), như đã được minh họa trong hướng nghiên cứu về việc để mô hình ngôn ngữ tự học cách sử dụng công cụ bên ngoài (Schick et al., 2023). Trên nền tảng truyền thông thời gian thực, LiveKit Agents cung cấp hạ tầng WebRTC (truyền âm thanh thời gian thực trên ứng dụng) và tích hợp SIP (giao thức khởi tạo phiên thoại, dùng khi cần gọi điện thoại) để xây dựng trợ lý hội thoại thời gian thực (LiveKit Inc., n.d.).

Về ý nghĩa thực tiễn, đề tài hướng tới hỗ trợ tài xế hoàn thành các nghiệp vụ vận hành phổ biến bằng giọng nói, góp phần giảm thao tác tay–mắt trên điện thoại trong lúc lái xe và nâng cao trải nghiệm làm việc. Về ý nghĩa học thuật và kỹ thuật, đề tài đóng góp một nghiên cứu theo hướng **thiết kế, xây dựng và đánh giá** hệ thống trợ lý giọng nói chuyên biệt theo nghiệp vụ: kết hợp hội thoại thời gian thực, gọi công cụ và tích hợp dịch vụ quản lý chuyến, rồi **đánh giá định lượng** bằng các chỉ số đo được. Chi tiết khoảng trống nghiên cứu được phân tích ở Chương 2; các mục tiếp theo phát biểu rõ bài toán, mục tiêu và phạm vi.

## 1.2. Phát biểu bài toán

Bài toán đặt ra là thiết kế, triển khai và đánh giá một hệ thống trợ lý AI bằng giọng nói hỗ trợ tài xế trong quá trình vận hành chuyến xe. Hệ thống cần tiếp nhận yêu cầu bằng giọng nói tiếng Việt (và tiếng Anh như ngôn ngữ bổ trợ), hiểu ý định người dùng, thực thi nghiệp vụ tương ứng trên hệ thống quản lý chuyến đi thông qua cơ chế gọi công cụ, rồi phản hồi lại bằng giọng nói trong thời gian thực.

Cụ thể hơn, tài xế cần có khả năng: (i) tra cứu và quản lý thông tin chuyến đi (xem lịch trình, cập nhật trạng thái, hủy chuyến khi đủ điều kiện); (ii) liên lạc hoặc xác nhận với khách hàng (ví dụ khởi tạo cuộc gọi qua trợ lý, gửi tin nhắn khi được các dịch vụ phía máy chủ — backend — hỗ trợ); (iii) nhận hỗ trợ theo ngữ cảnh vận hành như nhắc trước giờ đón, trả lời câu hỏi thường gặp về cách dùng ứng dụng; và (iv) với nghiệp vụ giao hàng, hỗ trợ trích xuất thông tin đơn từ hình ảnh khi tài xế cung cấp ảnh đơn hàng. Đồng thời, hệ thống phải vận hành ổn định trên cả kênh trong ứng dụng (WebRTC) và kênh điện thoại (SIP) khi cần gọi ra ngoài hoặc nhận cuộc gọi.

Bài toán không dừng lại ở việc “trả lời hội thoại”, mà đòi hỏi hệ thống hành động đúng nghiệp vụ, kiểm soát được độ trễ phản hồi mà người dùng cảm nhận được, và chịu được điều kiện âm thanh không lý tưởng trong khoang xe. Cách **đo lường và cụ thể hóa** các yêu cầu này được thể hiện qua mục tiêu và câu hỏi nghiên cứu ở các mục kế tiếp.

## 1.3. Mục tiêu nghiên cứu

Mục tiêu tổng quát của luận văn là xây dựng một giải pháp trợ lý AI bằng giọng nói giúp giảm thao tác thủ công trên thiết bị di động của tài xế xe công nghệ và giao hàng, đồng thời chứng minh tính khả thi kỹ thuật của giải pháp thông qua triển khai thực tế và đánh giá theo các chỉ số đo được.

Các mục tiêu cụ thể gồm:

1. Phân tích yêu cầu chức năng và yêu cầu phi chức năng cho trợ lý giọng nói dành cho tài xế trong ngữ cảnh gọi xe và giao hàng.
2. Đề xuất kiến trúc hệ thống **tách lớp rõ ràng**, tách tầng hội thoại AI khỏi tầng nghiệp vụ vận tải, hỗ trợ **thay nhà cung cấp** STT/LLM/TTS khi cần, và **phân loại phiên hội thoại** để chọn đúng tập nghiệp vụ được phép thực hiện.
3. Triển khai hệ thống nguyên mẫu tích hợp trên nền tảng truyền thông thời gian thực (WebRTC/SIP), ứng dụng di động tài xế và các dịch vụ backend quản lý chuyến đi.
4. Đánh giá hệ thống theo độ trễ phản hồi, độ chính xác nhận dạng giọng nói trong điều kiện khác nhau, độ chính xác gọi công cụ và tỷ lệ hoàn thành nghiệp vụ trên bộ kịch bản thử nghiệm; bổ sung quan sát từ thử nghiệm với tài xế thật khi đủ điều kiện.

Đối với mục tiêu đánh giá (mục tiêu 4), luận văn đặt trước các ngưỡng định hướng sau (chi tiết cách đo ở Chương 6). Đây là mốc kỳ vọng khi đánh giá, chưa phải kết quả đã đo:

- **Độ trễ phản hồi:** thời gian từ khi tài xế **kết thúc câu nói** đến khi hệ thống **bắt đầu phát âm** trả lời. Luận văn dùng phân vị 95 (ký hiệu **P95**): trong tập các lần đo, khoảng 95% lần đo có độ trễ không vượt quá mốc đã chọn. Ngưỡng định hướng: **P95 ≤ 2 giây** trên các luồng nghiệp vụ cốt lõi.
- **Tỷ lệ lỗi từ khi nhận dạng giọng nói** (Word Error Rate – **WER**): so chữ hệ thống nhận được với câu đọc đúng; càng nhiều từ sai, sót hoặc thừa thì WER càng cao. Luận văn so sánh WER giữa điều kiện yên tĩnh và điều kiện nhiễu giả lập khoang xe; ngưỡng chi tiết được chốt ở Chương 3 và Chương 6.
- **Độ chính xác gọi công cụ** và **tỷ lệ hoàn thành tác vụ:** báo cáo theo nhóm kịch bản; không khẳng định trước kết quả số tại Chương 1.

Việc đạt được các mục tiêu trên được kiểm chứng thông qua việc trả lời các câu hỏi nghiên cứu nêu ở mục 1.4.

## 1.4. Câu hỏi nghiên cứu

Luận văn định hướng trả lời các câu hỏi nghiên cứu (Research Questions – RQ) sau:

- **RQ1.** Làm thế nào để thiết kế và triển khai một trợ lý AI bằng giọng nói cho tài xế xe công nghệ/giao hàng, trong đó LLM đóng vai trò điều phối nghiệp vụ thông qua gọi công cụ trên hạ tầng hội thoại thời gian thực?
- **RQ2.** Với các luồng nghiệp vụ cốt lõi (ví dụ tra cứu chuyến, xác nhận/từ chối, liên lạc khách hàng), độ trễ phản hồi (tài xế dứt câu → trợ lý bắt đầu nói) đạt mức nào, và liệu **P95** có duy trì được **≤ 2 giây**?
- **RQ3.** **WER** (tỷ lệ lỗi từ khi nhận dạng giọng nói) thay đổi như thế nào giữa môi trường yên tĩnh và môi trường có nhiễu nền giả lập điều kiện trong xe, khi áp dụng các cấu hình xử lý âm thanh phù hợp từng kênh (ứng dụng so với điện thoại)?
- **RQ4.** Trên bộ kịch bản nghiệp vụ đã thiết kế, tỷ lệ lựa chọn đúng công cụ và hoàn thành đúng tác vụ đạt mức nào, và những lỗi phổ biến nào ảnh hưởng đến trải nghiệm rảnh tay của tài xế?

Mối liên hệ giữa mục tiêu cụ thể, câu hỏi nghiên cứu và chương chịu trách nhiệm trả lời được tóm tắt trong Bảng 1.1. Bảng này là chỉ mục định hướng đánh giá: mỗi mục tiêu gắn với RQ tương ứng và chương sẽ làm rõ phương pháp cũng như kết quả.

**Bảng 1.1.** Chỉ mục ánh xạ mục tiêu nghiên cứu – câu hỏi nghiên cứu – chương trả lời

| STT | Mục tiêu cụ thể | Câu hỏi nghiên cứu (RQ) | Tiêu chí / chỉ số định hướng | Chương làm rõ / trả lời |
|---|---|---|---|---|
| 1 | Phân tích yêu cầu | Cơ sở cho RQ1–RQ4 | Định nghĩa nghiệp vụ “đúng”, kịch bản chấp nhận | Chương 3 |
| 2 | Đề xuất kiến trúc | RQ1 | Kiến trúc tách lớp, WebRTC/SIP, gọi công cụ | Chương 4 |
| 3 | Triển khai nguyên mẫu | RQ1 | Triển khai voice-agent, dịch vụ backend và ứng dụng tích hợp | Chương 5 |
| 4 | Đánh giá theo chỉ số | RQ2, RQ3, RQ4 | Độ trễ (P95 ≤ 2s), WER (tỷ lệ lỗi từ), độ đúng gọi công cụ, tỷ lệ hoàn thành tác vụ | Chương 6 |

Các câu hỏi trên sẽ được làm rõ về phương pháp đo ở Chương 3 và Chương 6; Chương này chỉ xác lập chúng như định hướng cho thiết kế và đánh giá. Chi tiết bộ kịch bản thử đầy đủ (nếu phát sinh dài) sẽ được đưa vào Phụ lục thay vì làm dài phần thân các chương.

## 1.5. Phạm vi và giới hạn nghiên cứu

### Đối tượng, không gian và thời gian nghiên cứu

- **Đối tượng nghiên cứu chính:** trợ lý AI bằng giọng nói dành cho tài xế xe công nghệ và giao hàng; **đối tượng tham gia đánh giá** là tài xế (và một phần luồng khách hàng khi cần minh họa tích hợp), với ngôn ngữ ưu tiên tiếng Việt.
- **Không gian nghiên cứu:** hệ thống nguyên mẫu triển khai trên **môi trường phát triển và thử nghiệm** (LiveKit Cloud, dịch vụ backend và ứng dụng di động), không phải toàn bộ mạng lưới vận hành thương mại quy mô lớn.
- **Thời gian nghiên cứu:** giai đoạn thiết kế–triển khai–đánh giá gắn với quá trình thực hiện luận văn (khoảng 2025–2026); số liệu thực nghiệm phản ánh cấu hình hệ thống tại thời điểm đo và sẽ được ghi rõ ở Chương 6.

### Phạm vi nghiên cứu

Luận văn tập trung vào lớp trợ lý giọng nói tích hợp với nền tảng vận hành chuyến đi, chứ không nhằm xây dựng toàn bộ một hệ thống quản lý vận tải hoàn chỉnh (điều phối tối ưu toàn mạng, định giá cước, thanh toán, bảo hiểm). Các thành phần ứng dụng di động, dịch vụ xác thực và dịch vụ quản lý chuyến được xem là **nền tảng tích hợp** cần thiết để trợ lý giọng nói thực thi nghiệp vụ thật, và được trình bày ở mức đủ để làm rõ cách các thành phần kết nối với nhau.

Trong phạm vi chức năng của trợ lý, luận văn bao gồm: tương tác bằng giọng nói tiếng Việt và tiếng Anh; quản lý chuyến đi bằng giọng nói; hỗ trợ liên lạc/xác nhận với khách hàng; hỗ trợ nhắc lịch và câu hỏi thường gặp (kèm truy xuất tri thức khi được triển khai); hỗ trợ quét thông tin đơn giao hàng từ ảnh; và cơ chế kích hoạt rảnh tay trên ứng dụng tài xế (từ khóa đánh thức – wake-word) như một phần trải nghiệm an toàn. Hệ thống được thiết kế để hoạt động trên kênh WebRTC trong ứng dụng và kênh SIP khi cần thoại qua mạng điện thoại công cộng (PSTN).

### Giới hạn

Luận văn không huấn luyện lại các mô hình AI nền tảng (STT/LLM/TTS) từ dữ liệu riêng quy mô lớn, mà sử dụng các mô hình và dịch vụ hiện có thông qua **lớp trung gian** để có thể thay nhà cung cấp. Nghiên cứu cũng không bao gồm nhắn tin nhóm giữa các tài xế, điều hướng rẽ từng bước thay thế Google Maps/Waze, hay xử lý tranh chấp thanh toán và khiếu nại pháp lý. Quy mô thử nghiệm với tài xế thật bị giới hạn bởi điều kiện triển khai thực tế và sẽ được thảo luận như một hạn chế ở Chương 6.

Những giới hạn trên **xác định ranh giới** đóng góp và giúp tránh đánh giá quá mức khả năng của hệ thống so với phạm vi đã cam kết.

## 1.6. Phương pháp nghiên cứu

Luận văn theo tiếp cận **thiết kế – xây dựng – đánh giá**, phù hợp với nghiên cứu kỹ thuật phần mềm mang tính xây dựng hệ thống. Các bước chính gồm:

1. **Khảo sát và phân tích yêu cầu:** tổng hợp nhu cầu nghiệp vụ của tài xế, đối chiếu với năng lực kỹ thuật hiện có, và chuyển thành yêu cầu chức năng/phi chức năng cùng bộ kịch bản chấp nhận.
2. **Thiết kế kiến trúc:** đề xuất kiến trúc nhiều dịch vụ nhỏ phối hợp (microservices), chuỗi xử lý hội thoại thời gian thực, cơ chế phân loại phiên để chọn tập nghiệp vụ phù hợp, và **quy ước giao tiếp (API)** giữa tầng AI với tầng nghiệp vụ.
3. **Triển khai nguyên mẫu:** hiện thực hóa trên một kho mã nguồn dùng chung với voice-agent (Python), các dịch vụ backend bằng TypeScript, và ứng dụng tài xế/khách hàng; cấu hình LiveKit Cloud cùng tích hợp SIP khi cần.
4. **Đánh giá thực nghiệm:** đo độ trễ phản hồi (đối chiếu ngưỡng P95 ≤ 2 giây), tỷ lệ lỗi từ WER, độ chính xác gọi công cụ và tỷ lệ hoàn thành nghiệp vụ trên kịch bản có kiểm soát; bổ sung phản hồi định tính từ tài xế thật khi đủ điều kiện tổ chức thử nghiệm.
5. **Thảo luận và rút hạn chế:** đối chiếu kết quả với mục tiêu/RQ, phân tích các yếu tố ảnh hưởng đến độ tin cậy của kết luận, và đề xuất hướng phát triển.

Phương pháp chi tiết cho từng nhóm chỉ số được trình bày ở Chương 6. Chương 2 cung cấp cơ sở lý thuyết và khoảng trống nghiên cứu làm nền cho các quyết định thiết kế.

## 1.7. Những đóng góp của luận văn

Luận văn hướng tới ba nhóm đóng góp chính.

Thứ nhất, về mặt bài toán và khảo sát, luận văn làm rõ khoảng trống giữa các trợ lý giọng nói đa dụng (không tối ưu nghiệp vụ vận tải), các nghiên cứu tối ưu vận hành phía backend của gọi xe, và nhu cầu tương tác rảnh tay của tài xế trong lúc lái xe. Khoảng trống này được phân tích chi tiết hơn ở Chương 2.

Thứ hai, về mặt kỹ thuật, luận văn đề xuất và triển khai một kiến trúc trợ lý giọng nói thời gian thực kết hợp WebRTC/SIP, chuỗi xử lý STT–LLM–TTS có thể thay nhà cung cấp, phân loại phiên hội thoại theo ngữ cảnh, và gọi công cụ để thực thi nghiệp vụ chuyến đi thông qua API backend — thay vì chỉ sinh câu trả lời hội thoại.

Thứ ba, về mặt đánh giá ứng dụng, luận văn xây dựng bộ kịch bản nghiệp vụ gắn với tài xế và đánh giá hệ thống theo các chỉ số đo được (độ trễ với ngưỡng P95 ≤ 2 giây, tỷ lệ lỗi từ WER, độ chính xác gọi công cụ, tỷ lệ hoàn thành tác vụ), từ đó cung cấp bằng chứng thực nghiệm về tính khả thi của giải pháp trong phạm vi đã xác định. Các kết quả số liệu cụ thể được trình bày ở Chương 6 và không được khẳng định trước tại Chương 1.

Các đóng góp trên định hướng nội dung các chương còn lại như trình bày ở mục 1.8.

## 1.8. Cấu trúc luận văn

Phần còn lại của luận văn được tổ chức như sau.

**Chương 2 — Cơ sở lý thuyết và nghiên cứu liên quan** trình bày nền tảng STT/TTS, LLM và gọi công cụ, truyền thông thời gian thực, các nghiên cứu liên quan trong gọi xe/giao hàng và an toàn khi lái xe, cùng bộ chỉ số đánh giá và khoảng trống nghiên cứu.

**Chương 3 — Phân tích yêu cầu** mô tả đối tượng người dùng, yêu cầu chức năng và phi chức năng, các tình huống sử dụng chính và ràng buộc tích hợp.

**Chương 4 — Thiết kế hệ thống** trình bày kiến trúc tổng thể, luồng WebRTC/SIP, phân loại phiên hội thoại, chuỗi xử lý giọng nói, tích hợp công cụ với dịch vụ backend, xác thực và xử lý trạng thái bất thường, cũng như thiết kế dữ liệu/API ở mức khái niệm.

**Chương 5 — Triển khai** mô tả công nghệ sử dụng, tổ chức mã nguồn, hiện thực voice-agent và các dịch vụ liên quan, cùng các thành phần tiêu biểu (gọi khách, câu hỏi thường gặp, quét đơn giao hàng, từ khóa đánh thức).

**Chương 6 — Thực nghiệm và đánh giá** trình bày phương pháp đo, kết quả theo từng nhóm chỉ số, thảo luận và các yếu tố ảnh hưởng đến độ tin cậy của kết luận.

**Kết luận và hướng phát triển** tóm tắt đóng góp đã chứng minh bằng thực nghiệm, nêu hạn chế và đề xuất hướng nghiên cứu tiếp theo.

**Tài liệu tham khảo** và **Phụ lục** nằm ở phần cuối luận văn. Phụ lục dành cho các nội dung bổ trợ (ví dụ danh mục công cụ đầy đủ, bộ kịch bản kiểm thử chi tiết, ảnh màn hình, cấu hình môi trường không chứa bí mật) để giữ thân bài tập trung vào lập luận chính.

## Kết luận chương

Chương 1 đã xác lập bối cảnh và ý nghĩa đề tài, bài toán, mục tiêu (kèm ngưỡng độ trễ P95 ≤ 2 giây và các chỉ số WER, gọi công cụ, hoàn thành tác vụ), câu hỏi nghiên cứu cùng bảng ánh xạ mục tiêu–RQ, đối tượng/không gian–thời gian, phạm vi, phương pháp và đóng góp dự kiến của luận văn. Trọng tâm nghiên cứu là trợ lý AI bằng giọng nói cho tài xế xe công nghệ/giao hàng; ứng dụng và dịch vụ quản lý chuyến đóng vai trò nền tảng tích hợp. Chương tiếp theo trình bày cơ sở lý thuyết và các nghiên cứu liên quan, từ đó làm rõ khoảng trống mà luận văn hướng tới giải quyết.

---

## Tài liệu trích dẫn trong Chương 1 (bản nháp — sẽ gộp vào danh mục cuối)

1. Dingus, T. A., Guo, F., Lee, S., Antin, J. F., Perez, M., Buchanan-King, M., & Hankey, J. (2016). Driver crash risk factors and prevalence evaluation using naturalistic driving data. *Proceedings of the National Academy of Sciences, 113*(10), 2636–2641. https://doi.org/10.1073/pnas.1513271113

2. Insurance Institute for Highway Safety. (n.d.). *Distracted driving*. https://www.iihs.org/research-areas/distracted-driving

3. Schick, T., Dwivedi-Yu, J., Dessì, R., Raileanu, R., Lomeli, M., Hambro, E., Zettlemoyer, L., Cancedda, N., & Scialom, T. (2023). *Toolformer: Language Models Can Teach Themselves to Use Tools*. arXiv:2302.04761. https://arxiv.org/abs/2302.04761

4. LiveKit Inc. (n.d.). *Agents*. LiveKit Documentation. https://docs.livekit.io/agents/

> Ghi chú biên tập: Mọi nguồn ở trên đã kiểm được DOI/URL.

---

## Self-review (Ch.1 — review lần 2: P95/WER + đọc lần đầu)

| Hạng mục | Kết quả |
|---|---|
| P95 / WER giải thích bằng tiếng Việt thường trước khi dùng tắt | Đạt (1.3 + Tóm tắt + danh mục viết tắt) |
| Nêu rõ “ngưỡng định hướng ≠ kết quả đã đo” | Đạt (1.3) |
| backend lần đầu có tiếng Việt kèm | Đạt (1.2) |
| Khung 1.1–1.8, Bảng 1.1, không claim số Ch.6 | Đạt |
| Cần Chinh đọc lại Tóm tắt + mục 1.3 | P0 duyệt cảm nhận |
