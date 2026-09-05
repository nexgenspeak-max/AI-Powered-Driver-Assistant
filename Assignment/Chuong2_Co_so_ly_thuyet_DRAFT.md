# Chương 2. Cơ sở lý thuyết và nghiên cứu liên quan

Chương này giải thích những khái niệm cần thiết để hiểu hệ thống trợ lý giọng nói cho tài xế, đồng thời đối chiếu với các hướng nghiên cứu liên quan. Mục 2.1–2.3 nói về cách một trợ lý “nghe – hiểu – nói” và kết nối điện thoại/ứng dụng. Mục 2.4–2.5 gắn với thực tiễn gọi xe và an toàn khi lái. Mục 2.6 nêu cách đo chất lượng; mục 2.7 chỉ ra khoảng trống mà luận văn hướng tới.

## 2.1. Trợ lý giọng nói hoạt động như thế nào?

Về bản chất, hầu hết trợ lý giọng nói hiện nay làm việc theo ba bước nối tiếp:

1. **Nghe và chuyển lời nói thành chữ** (Speech-to-Text – STT): micro ghi âm, hệ thống nhận dạng thành văn bản.
2. **Hiểu và quyết định** bằng mô hình ngôn ngữ lớn (Large Language Model – LLM): từ văn bản, hệ thống trả lời hoặc chọn một hành động cụ thể (ví dụ “xem lịch”, “gọi khách”).
3. **Đọc lại bằng giọng nói** (Text-to-Speech – TTS): chuyển câu trả lời thành âm thanh phát ra loa.

Cách tổ chức này gọi là **chuỗi xử lý theo tầng** (mỗi bước một thành phần riêng, nối tiếp nhau). Ưu điểm là có thể thay từng phần (nhà cung cấp STT/LLM/TTS khác nhau) mà không phải xây lại toàn bộ. Nhược điểm là mỗi tầng đều tốn thời gian; nếu cộng dồn quá lâu, tài xế sẽ cảm thấy trợ lý chậm phản hồi, dễ mất kiên nhẫn khi đang lái xe.

Vì vậy, hệ thống thực tế không chỉ quan tâm “nhận dạng đúng chữ”, mà còn phải **nói lại đủ nhanh**. Các bộ đánh giá trợ lý giọng nói gần đây cũng nhấn mạnh cần thử trong điều kiện gần đời sống (ồn, cách nói khác nhau), không chỉ trên dữ liệu sạch trong phòng thí nghiệm (Chen et al., 2024). Với tài xế, thêm hai ràng buộc thực tiễn: tiếng ồn trong **khoang xe** (động cơ, gió, đường) và mọi câu trả lời phải **khớp nghiệp vụ thật** (có chuyến nào, trạng thái nào), không được “bịa” cho trôi chảy.

## 2.2. Vì sao trợ lý phải “làm được việc”, không chỉ trò chuyện?

Trợ lý hội thoại thông thường chỉ sinh câu trả lời. Trợ lý cho tài xế còn phải **thao tác hộ**: nhận chuyến, cập nhật đón/trả, gọi khách, trả lời câu hỏi thường gặp về ứng dụng. Cơ chế **gọi công cụ** (function calling) cho phép mô hình chọn một công cụ đã định nghĩa sẵn và điền tham số, rồi hệ thống thực thi qua giao diện lập trình ứng dụng (API) của dịch vụ phía máy chủ (Schick et al., 2023).

Trên thực tế, thách thức không nằm ở việc có danh sách công cụ, mà ở chỗ:

- Nhiều công cụ gần nghĩa (ví dụ “hủy chuyến” và “từ chối chuyến mới”) dễ chọn nhầm.
- Các thao tác rủi ro (hủy chuyến, gọi số lạ) cần **hỏi lại một lần** trước khi làm.
- Câu trả lời bằng giọng nói phải ngắn: tài xế không ngồi nghe đoạn văn dài.

Do đó, phần lý thuyết về gọi công cụ chỉ là nền; phần quyết định thiết kế nằm ở cách mô tả công cụ, xác nhận hai bước, và đo xem hệ thống có chọn đúng hành động trên kịch bản tài xế hay không.

## 2.3. Kết nối thời gian thực: trong ứng dụng và qua điện thoại

Để tài xế nói chuyện với trợ lý ngay trên điện thoại, âm thanh cần truyền đi gần như tức thời. **WebRTC** là bộ giao thức phổ biến cho thoại/video thời gian thực trên trình duyệt và ứng dụng (Alvestrand, 2021). Trong luận văn, kênh chính trong ứng dụng tài xế dùng WebRTC: tài xế bấm (hoặc gọi bằng từ khóa đánh thức), tham gia một phòng hội thoại với trợ lý (agent).

Khi cần gọi ra mạng điện thoại cố định/di động (Public Switched Telephone Network – PSTN) — ví dụ hệ thống gọi tài xế đề nghị chuyến, hoặc gọi khách — thường dùng thêm **SIP** và cầu nối với nhà cung cấp thoại. Điểm quan trọng về mặt thực tiễn: **cùng một logic nghiệp vụ** (nhận/từ chối, gọi khách…) nên tái sử dụng được trên cả hai kênh, thay vì viết hai trợ lý tách biệt.

Nền tảng như LiveKit Agents hỗ trợ xây trợ lý tham gia phòng hội thoại thời gian thực và gắn STT/LLM/TTS (LiveKit Inc., n.d.). Luận văn kế thừa tầng truyền thông này; đóng góp nằm ở việc gắn nghiệp vụ vận tải và đánh giá theo tiêu chí của tài xế.

## 2.4. AI trong gọi xe: tối ưu nền tảng khác với trợ lý trên xe

Nhiều nghiên cứu AI cho gọi xe tập trung vào **phía nền tảng**: phân phối đơn, điều xe, tái định vị tài xế bằng mô hình ngôn ngữ như một agent ra quyết định (Lyu et al., 2025). Hướng này quan trọng cho vận hành mạng lưới nhưng **không thay** nhu cầu tài xế đang lái cần hỏi lịch, gọi khách, cập nhật trạng thái mà ít phải nhìn màn hình.

Ở lớp trải nghiệm người dùng, có công trình dùng chatbot giọng nói để tăng cảm giác an toàn cho **hành khách** trong chuyến đi (Alvarado Contreras et al., 2024). Đối tượng và bài toán khác với bộ nghiệp vụ của tài xế.

Khoảng trống thực tiễn vì vậy khá rõ: thiếu trợ lý chuyên cho tài xế — nghe–hiểu–làm việc trên hệ thống chuyến — và được đo bằng độ trễ, độ đúng hành động, chứ không chỉ bằng độ “hay nói”.

## 2.5. An toàn khi lái và lý do dùng giọng nói

Thao tác điện thoại khi lái gắn với nguy cơ phân tâm. Phân tích dữ liệu lái xe tự nhiên quy mô lớn cho thấy yếu tố liên quan tài xế (sai sót, mệt, phân tâm…) xuất hiện trong phần lớn vụ va chạm được quan sát; phân tâm khi cầm thiết bị làm tăng nguy cơ mất an toàn (Dingus et al., 2016). Tổng hợp của Insurance Institute for Highway Safety (IIHS) cũng nêu nguy cơ va chạm tăng khoảng hai đến sáu lần khi người lái thao tác điện thoại so với khi không bị phân tâm (Insurance Institute for Highway Safety, n.d.).

Các hệ thống trên xe (Android Auto, Apple CarPlay…) giúp giảm một phần thao tác tay–mắt cho bản đồ và giải trí, nhưng thường **không** bao phủ đủ nghiệp vụ của ứng dụng gọi xe/giao hàng cụ thể (nhận chuyến, gọi đúng khách của chuyến, báo khách không ra…). Luận văn lấy động lực từ nhu cầu giảm nhìn–chạm màn hình trong lúc lái, và giới hạn phạm vi ở trợ lý nghiệp vụ gắn hệ thống chuyến — không thay thế toàn bộ hệ thống giải trí trên xe.

## 2.6. Đo thế nào thì biết trợ lý “đủ dùng”?

Một trợ lý có thể nhận dạng chữ tốt nhưng vẫn “hỏng việc” nếu gọi sai công cụ hoặc nói chậm. Luận văn dùng đồng thời bốn nhóm chỉ số (định nghĩa vận hành và cách đo chi tiết ở Chương 1 và Chương 6):

**Bảng 2.1.** Các chỉ số đánh giá và ý nghĩa thực tiễn

| STT | Chỉ số | Ý nghĩa với tài xế | Liên hệ nghiên cứu |
|---|---|---|---|
| 1 | Độ trễ phản hồi (ưu tiên P95 ≤ 2 giây) | Từ lúc tài xế dứt câu đến lúc nghe trợ lý nói; P95 là mốc mà khoảng 95% lần đo không chậm hơn | RQ2 |
| 2 | Tỷ lệ lỗi từ (WER) | STT nghe sai nhiều thì dễ chọn sai việc | RQ3 |
| 3 | Độ đúng gọi công cụ | Có chọn đúng hành động và tham số không | RQ4 |
| 4 | Hoàn thành nghiệp vụ | Trên kịch bản (và thử với tài xế nếu có), việc có xong không | RQ4 |

Các khung đánh giá trợ lý giọng nói dựa trên LLM cũng cho thấy cần nhìn nhiều khía cạnh và điều kiện thực tế, không chỉ một điểm số đơn (Chen et al., 2024).

## 2.7. Khoảng trống và định hướng luận văn

Tóm lại có ba khoảng trống gắn trực tiếp đề tài:

1. Thiếu tích hợp đồng thời: hội thoại thời gian thực + LLM có gọi công cụ + nghiệp vụ tài xế gọi xe/giao hàng + góc nhìn giảm thao tác khi lái.
2. Nghiên cứu AI gọi xe nghiêng về tối ưu dịch vụ phía máy chủ (backend) hoặc trải nghiệm khách, chưa đủ tập trung trợ lý thực thi việc cho tài xế.
3. Đánh giá cần bộ chỉ số gắn lĩnh vực vận tải (độ trễ, WER, đúng công cụ, xong việc), không chỉ hội thoại hỏi–đáp chung.

Luận văn định hướng lấp các khoảng trống này bằng cách thiết kế–triển khai–đánh giá nguyên mẫu trong phạm vi Chương 1, trên nền tảng WebRTC/SIP và dịch vụ quản lý chuyến thật.

## Kết luận chương

Chương 2 đã làm rõ chuỗi nghe–hiểu–nói, vai trò gọi công cụ, kênh trong ứng dụng và qua điện thoại, sự khác biệt với AI điều phối mạng gọi xe hoặc trợ lý cho khách, động lực an toàn, bộ chỉ số đo và khoảng trống nghiên cứu. Những nội dung này là nền để Chương 3 mô tả yêu cầu theo đúng cách hệ thống vận hành trên thực tế.

---

## Tài liệu trích dẫn trong Chương 2 (bản nháp — gộp vào danh mục cuối)

1. Alvestrand, H. (2021). *Overview: Real-Time Protocols for Browser-Based Applications* (RFC 8825). IETF. https://www.rfc-editor.org/rfc/rfc8825
2. Alvarado Contreras, R. E., Escobedo, L., & Beltrán, J. (2024). AI Companions in Ride-Hailing: Enhancing Sense of Safety with Voice Chatbots. *Avances en Interacción Humano-Computadora, 9*(1), 11–15. https://doi.org/10.47756/aihc.y9i1.138
3. Chen, Y., Yue, X., Zhang, C., Gao, X., Tan, R. T., & Li, H. (2024). *VoiceBench: Benchmarking LLM-Based Voice Assistants*. arXiv:2410.17196. https://arxiv.org/abs/2410.17196
4. Dingus, T. A., Guo, F., Lee, S., Antin, J. F., Perez, M., Buchanan-King, M., & Hankey, J. (2016). Driver crash risk factors and prevalence evaluation using naturalistic driving data. *PNAS, 113*(10), 2636–2641. https://doi.org/10.1073/pnas.1513271113
5. Insurance Institute for Highway Safety. (n.d.). *Distracted driving*. https://www.iihs.org/research-areas/distracted-driving
6. LiveKit Inc. (n.d.). *Agents*. https://docs.livekit.io/agents/
7. Lyu, T., Feng, S., Liu, H., & Yang, H. (2025). *LLM-ODDR: A Large Language Model Framework for Joint Order Dispatching and Driver Repositioning*. arXiv:2505.22695. https://arxiv.org/abs/2505.22695
8. Schick, T., et al. (2023). *Toolformer*. arXiv:2302.04761. https://arxiv.org/abs/2302.04761

---

## Self-review (Chương 2 — rà từ ngữ VN + EN)

| Hạng mục | Kết quả |
|---|---|
| Bỏ cascaded / cabin / tool / realtime thô | Đạt |
| P95/WER nhắc lại ngắn trong Bảng 2.1 | Đạt |
| Thống nhất gọi công cụ; backend có tiếng Việt kèm | Đạt |
| Cite verified, không claim số đo | Đạt |
