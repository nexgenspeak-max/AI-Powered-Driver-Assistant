# Kế hoạch review luận văn thạc sĩ (bản final)

**Đề tài:** Phát triển trợ lý AI bằng giọng nói hỗ trợ tài xế xe công nghệ
**Đối tượng review:** `LUAN_VAN_THAC_SI_FINAL.docx` (build ngày 11/10/2026, sau khi sửa theo 23 comment của GVHD)
**Vai trò người review:** phản biện độc lập ở trình độ tiến sĩ, chuyên ngành kỹ nghệ phần mềm
**Mục đích:** (1) đặt chuẩn đánh giá rõ ràng, có căn cứ; (2) chấm điểm từng phần bản hiện tại; (3) rút ra danh mục sửa đổi có ưu tiên để luận văn đạt chuẩn thạc sĩ Việt Nam và quốc tế.

> Điểm ở mục 4 là **chấm sơ bộ** dựa trên lần đọc toàn văn trong phiên sửa vừa qua. Điểm chính thức phải chấm lại sau vòng review R2 (mục 2), khi đã đọc kỹ Chương 5–6 và phụ lục theo đúng rubric.

---

## 1. Khung chuẩn tham chiếu (benchmark)

Mỗi tiêu chí ở mục 3 đều dẫn về ít nhất một chuẩn dưới đây. Những chuẩn có ghi **[cần xác minh]** phải được đối chiếu với văn bản gốc hoặc quy định của trường trước khi dùng làm căn cứ chính thức.

### 1.1. Chuẩn Việt Nam

| Mã | Chuẩn | Nội dung dùng để đánh giá |
|---|---|---|
| VN-1 | Thông tư 23/2021/TT-BGDĐT, Quy chế tuyển sinh và đào tạo trình độ thạc sĩ | Yêu cầu chung đối với luận văn/đề án tốt nghiệp: tính trung thực, giải quyết vấn đề khoa học hoặc thực tiễn, đánh giá bởi hội đồng theo thang điểm 10. **[cần xác minh]** Chương trình MSE của FSB theo định hướng ứng dụng hay nghiên cứu, vì định hướng ứng dụng có thể gọi sản phẩm là "đề án" thay vì "luận văn" |
| VN-2 | Khung trình độ quốc gia Việt Nam, bậc 7 – thạc sĩ (Quyết định 1982/QĐ-TTg, 2016) | Chuẩn đầu ra: kiến thức chuyên sâu; kỹ năng nghiên cứu, phân tích, tổng hợp; tự chủ và tự chịu trách nhiệm khi giải quyết vấn đề phức tạp |
| VN-3 | Quy định trình bày luận văn của FSB / Trường Đại học FPT **[cần lấy bản chính thức]** | Khổ giấy, lề, font, cấu trúc bắt buộc (tóm tắt tiếng Việt và tiếng Anh, danh mục, phụ lục), số trang, ngưỡng kiểm tra trùng lặp |

### 1.2. Chuẩn quốc tế

| Mã | Chuẩn | Nội dung dùng để đánh giá |
|---|---|---|
| INT-1 | Dublin Descriptors, chu trình thứ hai – thạc sĩ (Joint Quality Initiative, 2004) | Kiến thức và hiểu biết vượt bậc cử nhân; vận dụng vào bối cảnh mới; đưa ra nhận định khi thông tin chưa đầy đủ; trình bày kết luận rõ ràng |
| INT-2 | QAA FHEQ Level 7 (Anh) | Hiểu biết có hệ thống và nhận thức phê phán về vấn đề hiện tại; hiểu phương pháp luận đủ để đánh giá phê phán nghiên cứu hiện có |
| INT-3 | Hevner, March, Park & Ram (2004), *Design Science in Information Systems Research*, MIS Quarterly | 7 hướng dẫn của nghiên cứu khoa học thiết kế: sản phẩm thiết kế, mức liên quan của bài toán, đánh giá thiết kế, đóng góp, tính chặt chẽ, thiết kế như quá trình tìm kiếm, truyền đạt |
| INT-4 | Peffers et al. (2007), *A Design Science Research Methodology*, JMIS | 6 hoạt động: xác định vấn đề, mục tiêu giải pháp, thiết kế và phát triển, minh họa, đánh giá, truyền đạt |
| INT-5 | Venable, Pries-Heje & Baskerville (2016), *FEDS*, European Journal of Information Systems | Chiến lược đánh giá: nhân tạo hay tự nhiên, trước hay sau khi xây dựng; chọn chiến lược theo rủi ro |
| INT-6 | ACM SIGSOFT Empirical Standards (Ralph et al., 2020) – chuẩn "Engineering Research" và "Benchmarking" | Tiêu chí bắt buộc và mong muốn khi báo cáo nghiên cứu xây dựng sản phẩm phần mềm và đo hiệu năng |
| INT-7 | Wohlin et al. (2012), *Experimentation in Software Engineering* | Bốn loại mối đe dọa độ tin cậy: nội tại, bên ngoài, cấu trúc (construct), kết luận |
| INT-8 | Kazman, Klein & Clements (2000), *ATAM* (CMU/SEI-2000-TR-004); Bass et al. (2021) | Đánh giá kiến trúc: cây tiện ích, điểm nhạy, điểm đánh đổi, rủi ro |
| INT-9 | APA 7th edition | Trích dẫn và danh mục tài liệu tham khảo nhất quán |

### 1.3. Mức "đạt chuẩn quốc tế" được hiểu cụ thể

Một luận văn thạc sĩ kỹ nghệ phần mềm theo hướng khoa học thiết kế được xem là đạt chuẩn quốc tế khi:

1. Bài toán có ý nghĩa thực tiễn và được đặt trong bối cảnh tài liệu (INT-2, INT-3).
2. Sản phẩm (artifact) được thiết kế có lập luận, truy vết từ yêu cầu đến thiết kế đến hiện thực đến đánh giá (INT-3, INT-4).
3. Việc đánh giá **trả lời được mọi câu hỏi nghiên cứu** bằng số liệu có cỡ mẫu, khoảng tin cậy và phân tích mối đe dọa độ tin cậy (INT-5, INT-6, INT-7).
4. Đóng góp được phân biệt rõ với công trình liên quan (INT-1).
5. Trình bày và trích dẫn theo chuẩn, không có số liệu bỏ trống (INT-9, VN-3).

---

## 2. Quy trình review (5 vòng)

| Vòng | Mục tiêu | Đầu vào | Đầu ra | Ước lượng |
|---|---|---|---|---|
| R1 – Tuân thủ quy chế và hình thức | Đối chiếu với VN-1, VN-3 | Quy định FSB, docx | Danh sách lỗi hình thức (mục 5) | 0,5 ngày |
| R2 – Đọc toàn văn theo rubric | Chấm 9 tiêu chí ở mục 3, ghi bằng chứng theo trang/mục | docx, rubric | Bảng điểm chính thức, cập nhật mục 4 | 1 ngày |
| R3 – Đọc như phản biện | Tìm lập luận yếu, kết luận vượt quá dữ liệu, câu hỏi hội đồng sẽ hỏi | docx | Danh sách câu hỏi phản biện (mục 6) | 0,5 ngày |
| R4 – Truy vết và kiểm tra số liệu | Mọi số liệu trong Chương 6 lấy lại được từ dữ liệu thô và script; mọi yêu cầu có đường truy vết | Phụ lục E, F; `compute_wer.py`, `extract_ch6_metrics.py`, nhật ký | Biên bản kiểm tra số liệu | 1 ngày |
| R5 – Ngôn ngữ và trích dẫn | Thuật ngữ nhất quán, APA 7, không còn ghi chú nháp | docx, danh mục tham khảo | Danh sách sửa câu chữ | 0,5 ngày |

Quy tắc ghi nhận khi review: mỗi phát hiện ghi **vị trí (chương/mục/bảng) – mô tả – căn cứ (mã chuẩn ở mục 1) – mức độ (P0/P1/P2) – đề xuất sửa**.

---

## 3. Thang điểm (rubric)

Thang điểm 10 cho mỗi tiêu chí, khớp với thang điểm của hội đồng Việt Nam. Điểm tổng là tổng có trọng số. Bốn mức mô tả chung:

- **9–10, Xuất sắc:** đạt mọi yêu cầu, có điểm vượt chuẩn, có thể đăng thành bài báo.
- **7–8,9, Tốt:** đạt yêu cầu, còn thiếu sót nhỏ không ảnh hưởng kết luận.
- **5–6,9, Đạt:** đạt mức tối thiểu, có thiếu sót ảnh hưởng độ tin cậy của một phần kết luận.
- **< 5, Chưa đạt:** thiếu thành phần bắt buộc hoặc kết luận không được dữ liệu hỗ trợ.

| Mã | Tiêu chí | Trọng số | Câu hỏi kiểm tra (benchmark) | Căn cứ |
|---|---|---|---|---|
| C1 | Bài toán, mục tiêu, câu hỏi nghiên cứu | 10% | Bài toán có ý nghĩa thực tiễn và có số liệu dẫn chứng? Mục tiêu đo được? RQ trả lời được bằng phương pháp đã chọn? Có ánh xạ mục tiêu – RQ – chương? | INT-1, INT-3 (hướng dẫn 2), VN-2 |
| C2 | Tổng quan tài liệu và khoảng trống | 15% | Bao phủ đủ các mảng liên quan? Có bảng so sánh công trình liên quan theo tiêu chí? Khoảng trống được suy ra từ so sánh, không tự khẳng định? Số lượng và chất lượng nguồn (bình duyệt, cập nhật)? | INT-2, INT-3 (hướng dẫn 5) |
| C3 | Phương pháp nghiên cứu | 10% | Có nêu và trích dẫn khung phương pháp (DSR)? Các hoạt động DSR ánh xạ vào chương? Chiến lược đánh giá được chọn có lý do? Các mối đe dọa độ tin cậy được xác định từ đầu? | INT-3, INT-4, INT-5, INT-7 |
| C4 | Phân tích yêu cầu | 10% | Yêu cầu có nguồn gốc, có mã, kiểm thử được? NFR đặc tả đo được? Tiêu chí chấp nhận rõ đạt/không đạt? | Bass et al. (2021), ISO/IEC 25010, ISTQB |
| C5 | Thiết kế kiến trúc | 15% | Quyết định kiến trúc có phương án thay thế và lý do? Lập luận từ NFR qua chiến thuật đến mẫu kiến trúc? Có mô hình cấu trúc và hành vi? Có phân tích đánh đổi và rủi ro? | INT-8, Bass et al. (2021) |
| C6 | Hiện thực | 10% | Hiện thực khớp thiết kế (có truy vết)? Tái lập được (mã nguồn, hạ tầng dạng mã, cấu hình)? Mức hoàn thiện nguyên mẫu? | INT-3 (hướng dẫn 1), INT-6 |
| C7 | Đánh giá thực nghiệm | 20% | Mọi RQ và NFR có số liệu? Cỡ mẫu đủ, có khoảng tin cậy, có quy tắc làm sạch dữ liệu? Có đường cơ sở để so sánh? Đánh giá người dùng cho tính khả dụng? Có phân tích mối đe dọa độ tin cậy theo 4 loại? | INT-5, INT-6, INT-7 |
| C8 | Thảo luận, kết luận, đóng góp | 5% | Mỗi RQ có câu trả lời trực tiếp? Đóng góp phân biệt với công trình liên quan? Hạn chế gắn với hướng phát triển? Không kết luận vượt quá dữ liệu? | INT-1, INT-3 (hướng dẫn 4) |
| C9 | Trình bày, trích dẫn, liêm chính | 5% | Đúng quy định trình bày? APA nhất quán? Thuật ngữ thống nhất? Không còn nội dung nháp? Có tóm tắt tiếng Anh? Đạt ngưỡng kiểm tra trùng lặp? | VN-1, VN-3, INT-9 |

**Ngưỡng mục tiêu:** điểm tổng ≥ 8,0; không tiêu chí nào dưới 7,0; C7 ≥ 7,5.

---

## 4. Chấm sơ bộ bản hiện tại

| Mã | Điểm | Bằng chứng chính |
|---|---|---|
| C1 | 8,0 | Bối cảnh có số liệu (Dingus et al., 2016; IIHS); 4 mục tiêu, 4 RQ, Bảng 1.1 ánh xạ rõ. Điểm trừ: đóng góp 1 "xác định khoảng trống" chưa phải đóng góp; RQ2 dạng có/không. |
| C2 | 6,0 | 24 tài liệu tham khảo, trong đó khá nhiều nguồn web, "n.d." hoặc preprint arXiv. Mục 2.9 chỉ có 2 công trình liên quan. Thiếu tài liệu về giao diện giọng nói trên xe và xao nhãng nhận thức, đánh giá LLM gọi công cụ, và chuyển lượt trong hội thoại máy. Chưa có bảng so sánh công trình liên quan. |
| C3 | 6,5 | Có nêu "design science research" ở 1.6 nhưng không trích Hevner/Peffers; chưa ánh xạ hoạt động DSR vào chương; chiến lược đánh giá chưa được lập luận; mối đe dọa độ tin cậy chỉ xuất hiện cuối Chương 6. |
| C4 | 8,0 | Sau đợt sửa: FR theo chân dung, NFR dạng kịch bản thuộc tính chất lượng, chiến thuật kiến trúc, AC dạng Given–When–Then. Điểm trừ: chưa ưu tiên hóa yêu cầu; một số quy tắc nghiệp vụ chưa định lượng. |
| C5 | 8,0 | ADR-01 với 4 phương án, ADR-02; mô hình cấu trúc và 3 mô hình luồng hành vi; 7 sequence; đối chiếu Nielsen. Điểm trừ: đánh giá phương án thuần định tính; chưa có điểm nhạy, điểm đánh đổi, rủi ro theo ATAM; chưa ước tính chi phí vận hành. |
| C6 | 7,5 | Hạ tầng dạng mã cho từng dịch vụ, Phụ lục F đối chiếu mã, link GitHub. Điểm trừ: chưa chứng minh triển khai đầu cuối trên AWS thật; chưa có hướng dẫn tái lập phần đánh giá. |
| C7 | 4,5 | **Rủi ro lớn nhất.** Còn 18 ô 「—」 trong Chương 6. RQ1 chưa có kết luận. NFR-03 và NFR-04 chưa có số liệu. NFR-02 chưa đạt (P95 = 3,75 s) và thiết kế hiện hành chưa được đo lại. WER đo trên 1 người đọc, 22 câu; độ chính xác gọi công cụ trên khoảng 39 lượt, 1 người chấm. Chưa có khoảng tin cậy, chưa có đường cơ sở; tính khả dụng chỉ đánh giá bằng danh mục kiểm tra. |
| C8 | 6,0 | Hạn chế được nêu trung thực (6.13), nhưng kết luận RQ1 và RQ2 còn bỏ ngỏ; phần Kết luận viết "sẽ được bổ sung". |
| C9 | 7,5 | Thuật ngữ đã thống nhất; danh mục bảng/hình đầy đủ. Điểm trừ: chưa có Abstract tiếng Anh; còn ghi chú nháp ("Ghi chú liêm chính số liệu", ô 「—」); vài trích dẫn chưa đầy đủ (Song et al. 2023 thiếu tác giả, ISTQB chỉ có trang chủ, tên chiến thuật của Bass chưa đối chiếu sách). |

**Điểm tổng sơ bộ:** 8,0×0,10 + 6,0×0,15 + 6,5×0,10 + 8,0×0,10 + 8,0×0,15 + 7,5×0,10 + 4,5×0,20 + 6,0×0,05 + 7,5×0,05 = **6,68/10** (mức Đạt).

Nếu hoàn thành nhóm P0 ở mục 5, C7 ước lên 7,5 và C8 lên 7,5, tổng khoảng **7,4**. Hoàn thành thêm nhóm P1, tổng ước khoảng **8,2–8,5**.

---

## 5. Danh mục sửa đổi và cải thiện

Mức ưu tiên:
- **P0:** bắt buộc trước khi nộp; thiếu thì có nguy cơ bị đánh giá chưa đạt.
- **P1:** cần để đạt mức Tốt và chuẩn quốc tế.
- **P2:** hoàn thiện.

### 5.1. P0 – Bắt buộc

| ID | Vị trí | Nội dung sửa | Căn cứ | Tiêu chí hoàn thành | Tiêu chí điểm |
|---|---|---|---|---|---|
| R-01 | 6.8, Bảng 6.11 | Chạy kịch bản thử tải SC-01 đến SC-03 (1, 5, 10, 20 phiên đồng thời, số bản sao tác nhân tương ứng). Mỗi mức chạy ít nhất 3 lần; báo cáo P50, P95 kèm khoảng tin cậy 95% (bootstrap) và tỷ lệ phiên lỗi | INT-6 (Benchmarking), AC-16 | Bảng 6.11 đầy đủ; kết luận đạt/không đạt AC-16 | C7, C8 |
| R-02 | 6.9, Bảng 6.12 | Chạy kịch bản tiêm lỗi RS-01 đến RS-05; mỗi kịch bản ít nhất 10 phiên; báo cáo tỷ lệ phiên duy trì và thời gian khôi phục (trung vị, lớn nhất) | INT-6, AC-17 | Bảng 6.12 đầy đủ; kết luận AC-17 | C7, C8 |
| R-03 | 6.4, Bảng 6.6 | Đo lại độ trễ trên thiết kế hiện hành (mọi lượt qua LLM, có câu đệm), ít nhất 200 lượt trên UC01, UC03, UC04, UC07; tách chặng phát hiện kết thúc phát ngôn, sinh token đầu, TTS; báo cáo tỷ lệ lượt có câu đệm | INT-6, AC-15 | Bảng 6.6 đầy đủ; RQ2 có câu trả lời trực tiếp | C7 |
| R-04 | 6.3 | Viết quy tắc làm sạch dữ liệu **trước** khi tính số liệu: loại lượt tự kiểm thử, xử lý ngoại lệ (lượt khoảng 21 s), phương pháp tính phân vị, khoảng tin cậy | INT-6, INT-7 (giá trị kết luận) | Mục 6.3 có quy tắc; mọi bảng ghi n sau làm sạch | C7 |
| R-05 | 6.12, Kết luận | Trả lời trực tiếp RQ1–RQ4, mỗi RQ một đoạn: kết quả, đạt/không đạt, giải thích. Nếu NFR-02 vẫn không đạt, trình bày như một kết quả âm có phân tích nguyên nhân, không né tránh | INT-1, INT-3 (hướng dẫn 4) | Không còn ô 「—」; không còn câu "sẽ được bổ sung" | C7, C8 |
| R-06 | Toàn văn | Xác minh loại sản phẩm (luận văn hay đề án) và quy định trình bày của FSB; sửa theo quy định | VN-1, VN-3 | Có bản quy định; checklist R1 đạt 100% | C9 |
| R-07 | Chương 6 đầu chương | Bỏ khối "Ghi chú liêm chính số liệu" kiểu nháp; chuyển nội dung thành đoạn văn chính thức về nguồn dữ liệu ở 6.2 | VN-3 | Không còn ghi chú nháp | C9 |

### 5.2. P1 – Đạt mức Tốt và chuẩn quốc tế

| ID | Vị trí | Nội dung sửa | Căn cứ | Tiêu chí hoàn thành | Tiêu chí điểm |
|---|---|---|---|---|---|
| R-08 | Chương 2 | Mở rộng tổng quan thành 4 mảng: (a) giao diện giọng nói trên xe và xao nhãng nhận thức (ví dụ Strayer et al., các nghiên cứu của AAA Foundation về hệ thống thông tin giải trí trên xe); (b) đánh giá LLM gọi công cụ (Gorilla/Berkeley Function Calling Leaderboard – Patil et al., 2023; τ-bench – Yao et al., 2024; ToolLLM – Qin et al., 2023); (c) chuyển lượt và độ trễ trong hệ thống hội thoại (Skantze, 2021, *Computer Speech & Language*); (d) nghiên cứu thực nghiệm về microservices cho hệ thống AI hoặc thời gian thực | INT-2 | ≥ 40 tài liệu, ≥ 60% bình duyệt hoặc chuẩn chính thức, ≥ 50% trong 5 năm gần nhất | C2 |
| R-09 | 2.11 (mới: bảng) | Thêm bảng so sánh công trình liên quan theo tiêu chí: hội thoại thời gian thực, gọi công cụ thực thi nghiệp vụ, đối tượng tài xế, kênh điện thoại, đánh giá NFR hệ thống phân tán. Khoảng trống được suy ra từ các ô trống của bảng | INT-1, INT-2 | Bảng ≥ 8 công trình | C2, C8 |
| R-10 | 1.6 (mở rộng) | Trích Hevner et al. (2004), Peffers et al. (2007); bảng ánh xạ 6 hoạt động DSR → chương; nêu chiến lược đánh giá theo FEDS (đánh giá nhân tạo trước, tự nhiên sau, kèm lý do) | INT-3, INT-4, INT-5 | Có bảng ánh xạ và đoạn lập luận chiến lược | C3 |
| R-11 | 6.13 | Tổ chức lại hạn chế theo 4 loại mối đe dọa độ tin cậy của Wohlin et al. (2012), mỗi mối đe dọa có biện pháp giảm thiểu đã áp dụng | INT-7 | 4 tiểu mục: nội tại, bên ngoài, cấu trúc, kết luận | C7 |
| R-12 | 6.6 | Mở rộng đánh giá gọi công cụ: ≥ 120 lượt từ bộ kịch bản có kiểm soát, phủ mọi nhóm FR của tài xế và khách hàng; 2 người chấm độc lập; báo cáo hệ số Cohen's kappa (mục tiêu ≥ 0,6 theo Landis & Koch, 1977) và khoảng tin cậy Wilson cho từng tỷ lệ | INT-6, INT-7 | Bảng 6.8 có n, kappa, khoảng tin cậy | C7 |
| R-13 | 6.5 | Mở rộng đo WER: ≥ 3 người đọc (khác giới, vùng miền), ≥ 50 câu; nhiễu ở các mức SNR xác định (ví dụ 10, 5, 0 dB); nêu quy tắc chuẩn hóa văn bản tiếng Việt trước khi tính WER | INT-6 | Bảng 6.7 theo người đọc và mức SNR | C7 |
| R-14 | 6.7 (mới: nghiên cứu người dùng) | Nghiên cứu người dùng nhỏ: 5–8 người tham gia trên kịch bản lái mô phỏng, so sánh giọng nói với thao tác chạm cho 3 tác vụ (tra chuyến, gọi khách, cập nhật trạng thái); đo thời gian tác vụ, số lần nhìn màn hình, SUS (Brooke, 1996) và NASA-TLX (Hart & Staveland, 1988); có phiếu đồng ý tham gia | INT-5 (đánh giá tự nhiên), Nielsen | Có số liệu SUS và NASA-TLX; NFR-01 không chỉ dựa vào danh mục kiểm tra | C7 |
| R-15 | 6.4 (ablation) | Thí nghiệm loại bỏ thành phần trên cùng bộ kịch bản: có/không tải trước ngữ cảnh; có/không câu đệm (đo độ trễ cảm nhận); hai mô hình LLM khác nhau. Đây là đường cơ sở để chứng minh tác dụng của chiến thuật | INT-6 | ≥ 2 cấu hình so sánh, có kiểm định thống kê phù hợp | C5, C7 |
| R-16 | 4.2 (mở rộng) | Đánh giá kiến trúc rút gọn theo ATAM: cây tiện ích từ 5 NFR, các điểm nhạy (ví dụ thời gian sinh token đầu), điểm đánh đổi (độ trễ với tính đúng nghiệp vụ trong ADR-02; chi phí với khả năng phục hồi khi dùng nhà cung cấp dự phòng), danh sách rủi ro | INT-8 | Bảng cây tiện ích và bảng rủi ro/đánh đổi | C5 |
| R-17 | 4.2 hoặc 5.6 | Ước tính chi phí vận hành AWS và nhà cung cấp AI theo số phiên mỗi ngày (trụ cột tối ưu chi phí của AWS Well-Architected) | AWS (2024) | Bảng chi phí cho 3 mức tải | C5, C6 |
| R-18 | 1.7, Kết luận | Viết lại đóng góp thành đóng góp sản phẩm và tri thức: (1) kiến trúc tham chiếu có lập luận từ NFR qua chiến thuật; (2) nguyên mẫu mã nguồn mở; (3) bộ kịch bản và khung đánh giá theo AC; (4) phát hiện thực nghiệm (ví dụ thời gian sinh token đầu là điểm nghẽn). Bỏ "xác định khoảng trống" khỏi danh sách đóng góp | INT-3 (hướng dẫn 4) | Mỗi đóng góp đối chiếu được với bảng so sánh R-09 | C1, C8 |
| R-19 | Phụ lục mới | Phụ lục tái lập: dữ liệu kịch bản kiểm thử, câu tham chiếu WER, lệnh chạy `compute_wer.py`, `extract_ch6_metrics.py`, cấu hình môi trường mô phỏng | INT-6 | Người khác chạy lại được số liệu chính | C6, C7 |
| R-20 | 6.2 hoặc phụ lục | Tuyên bố về đạo đức và dữ liệu: đồng ý của người tham gia, che số điện thoại, thời hạn lưu trữ, không dùng dữ liệu khách hàng thật | VN-1 (trung thực), INT-6 | Có đoạn tuyên bố | C9 |

### 5.3. P2 – Hoàn thiện

| ID | Vị trí | Nội dung sửa | Căn cứ | Tiêu chí hoàn thành |
|---|---|---|---|---|
| R-21 | Đầu luận văn | Thêm Abstract tiếng Anh và keywords | VN-3, thông lệ quốc tế | Có trang Abstract |
| R-22 | Danh mục tham khảo | Rà APA 7: tác giả đầy đủ (Song et al., 2023), URL cụ thể cho ISTQB, thay nguồn "n.d." bằng nguồn có năm; đối chiếu tên chiến thuật và số hình với sách Bass et al. (2021) | INT-9 | 0 lỗi định dạng; mọi trích dẫn có trong danh mục và ngược lại |
| R-23 | Phụ lục mới | Bảng thuật ngữ Anh – Việt (chiến thuật, đặc tính ISO 25010, thuật ngữ AI) | Góp ý GVHD về dịch chuẩn | Mọi thuật ngữ chuyên môn có trong bảng |
| R-24 | 1.3, 1.4 | Viết lại RQ2 thành câu hỏi mở ("độ trễ đạt mức nào và thành phần nào chi phối") thay vì có/không | INT-1 | RQ2 mới |
| R-25 | Chương 3 | Gắn mức ưu tiên (MoSCoW) cho FR | Bass et al. (2021) | Cột ưu tiên trong Bảng 3.2–3.9 |
| R-26 | Toàn văn | Kiểm tra trùng lặp bằng công cụ của trường; rà câu văn dịch máy, câu quá dài | VN-1, VN-3 | Báo cáo trùng lặp dưới ngưỡng |
| R-27 | Hình | Kiểm tra cỡ chữ khi in của các ảnh chụp màn hình và Hình 4.13; ô tiêu đề 3 dòng ở sequence | VN-3 | Chữ ≥ 8 pt khi in |
| R-28 | Kết luận | Hướng phát triển gắn trực tiếp với từng hạn chế ở 6.13 | INT-1 | Mỗi hạn chế có hướng tương ứng |

---

## 6. Câu hỏi phản biện dự kiến của hội đồng

| # | Câu hỏi | Chuẩn bị trả lời bằng |
|---|---|---|
| Q1 | Microservices có thật sự cần thiết cho nguyên mẫu quy mô nhỏ, hay nguyên khối phân mô-đun đã đủ? | ADR-01, Bảng 4.2, kết quả R-01/R-02, phân tích đánh đổi R-16 |
| Q2 | NFR-02 không đạt thì kiến trúc có thất bại không? | Phân tích điểm nghẽn ở thời gian sinh token đầu (thuộc nhà cung cấp, không thuộc kiến trúc), ablation R-15 |
| Q3 | Vì sao thử tải trên môi trường mô phỏng mà không trên AWS thật? Kết quả khái quát hóa đến đâu? | 6.13 theo Wohlin (R-11): giá trị bên ngoài, lập luận tính chất mở rộng ngang |
| Q4 | Một người chấm thì độ chính xác gọi công cụ tin được bao nhiêu? | R-12: hai người chấm, kappa, khoảng tin cậy |
| Q5 | Đóng góp mới so với Alexa Auto, Google Assistant on Android Auto là gì? | Bảng so sánh R-09; nghiệp vụ riêng của tài xế, gọi công cụ thực thi nghiệp vụ, kênh SIP |
| Q6 | Ngưỡng 2 giây dựa trên căn cứ nào? | Mục 2.8: Stivers et al. (2009), NHTSA (2013); nêu rõ đây là lựa chọn thiết kế |
| Q7 | Tương tác giọng nói vẫn gây xao nhãng nhận thức, luận văn xử lý thế nào? | Tài liệu R-08a; nghiên cứu người dùng R-14; ghi nhận là hạn chế |
| Q8 | LLM "ảo giác" dữ liệu nghiệp vụ thì sao? | Quy tắc nghiệp vụ chung (3.3), CON-01, kết quả phân loại lỗi Bảng 6.9 |
| Q9 | Chi phí vận hành mỗi phiên là bao nhiêu? | R-17 |
| Q10 | Dữ liệu cá nhân của khách hàng và tài xế được bảo vệ thế nào? | NFR-05, AC-18, R-20 |

---

## 7. Lộ trình thực hiện

| Giai đoạn | Việc | Phụ thuộc | Ước lượng |
|---|---|---|---|
| G1 | R-06 (quy định FSB), R-04 (quy tắc làm sạch dữ liệu), R-10, R-11 (khung phương pháp và độ tin cậy) | — | 2 ngày |
| G2 | Thực nghiệm: R-01, R-02, R-03, R-12, R-13, R-15 | G1 | 5–7 ngày |
| G3 | Nghiên cứu người dùng R-14 (song song với G2 nếu tuyển được người tham gia) | G1 | 3–5 ngày |
| G4 | Viết lại Chương 6 và Kết luận: R-05, R-07, R-18, R-28 | G2, G3 | 2 ngày |
| G5 | Tổng quan và kiến trúc: R-08, R-09, R-16, R-17 | — (song song) | 3 ngày |
| G6 | Hoàn thiện: R-19 đến R-27, chấm lại theo rubric (vòng R2) | G4, G5 | 2 ngày |

Cổng chất lượng trước khi nộp: điểm tổng tự chấm ≥ 8,0; không tiêu chí nào dưới 7,0; 0 ô 「—」; 0 ghi chú nháp; checklist mục 8 đạt 100%.

---

## 8. Checklist cuối trước khi nộp

- [ ] Đúng loại sản phẩm và quy định trình bày của FSB (R-06)
- [ ] Có Tóm tắt tiếng Việt và Abstract tiếng Anh (R-21)
- [ ] Mỗi RQ có câu trả lời trực tiếp ở 6.12 và Kết luận (R-05)
- [ ] Mọi AC-01 đến AC-19 có kết quả đạt/không đạt ở Chương 6
- [ ] Mọi số liệu có n, cách tính và khoảng tin cậy khi phù hợp (R-04)
- [ ] Mọi yêu cầu có đường truy vết trong Phụ lục E
- [ ] Mục lục đã cập nhật (Update Field); số bảng và số hình liên tục
- [ ] Mọi trích dẫn có trong danh mục và ngược lại; APA 7 (R-22)
- [ ] Đã kiểm tra trùng lặp (R-26)
- [ ] Link GitHub truy cập công khai; commit trong luận văn khớp mã nguồn nộp kèm
- [ ] Lời cam đoan, chữ ký, xác nhận của GVHD

---

## 9. Danh mục tài liệu căn cứ của kế hoạch

- Bass, L., Clements, P., & Kazman, R. (2021). *Software Architecture in Practice* (4th ed.). Addison-Wesley.
- Bộ Giáo dục và Đào tạo. (2021). Thông tư 23/2021/TT-BGDĐT ban hành Quy chế tuyển sinh và đào tạo trình độ thạc sĩ.
- Brooke, J. (1996). SUS: A "quick and dirty" usability scale. In *Usability Evaluation in Industry*. Taylor & Francis.
- Hart, S. G., & Staveland, L. E. (1988). Development of NASA-TLX. *Advances in Psychology, 52*, 139–183.
- Hevner, A. R., March, S. T., Park, J., & Ram, S. (2004). Design science in information systems research. *MIS Quarterly, 28*(1), 75–105.
- Joint Quality Initiative. (2004). *Shared 'Dublin' descriptors for Short Cycle, First Cycle, Second Cycle and Third Cycle Awards*.
- Kazman, R., Klein, M., & Clements, P. (2000). *ATAM: Method for Architecture Evaluation* (CMU/SEI-2000-TR-004). Software Engineering Institute.
- Landis, J. R., & Koch, G. G. (1977). The measurement of observer agreement for categorical data. *Biometrics, 33*(1), 159–174.
- Patil, S. G., Zhang, T., Wang, X., & Gonzalez, J. E. (2023). Gorilla: Large language model connected with massive APIs. arXiv:2305.15334.
- Peffers, K., Tuunanen, T., Rothenberger, M. A., & Chatterjee, S. (2007). A design science research methodology for information systems research. *Journal of Management Information Systems, 24*(3), 45–77.
- QAA. (2024). *The Frameworks for Higher Education Qualifications of UK Degree-Awarding Bodies*.
- Qin, Y., et al. (2023). ToolLLM: Facilitating large language models to master 16000+ real-world APIs. arXiv:2307.16789.
- Ralph, P., et al. (2020). *Empirical Standards for Software Engineering Research*. arXiv:2010.03525.
- Skantze, G. (2021). Turn-taking in conversational systems and human-robot interaction: A review. *Computer Speech & Language, 67*, 101178.
- Thủ tướng Chính phủ. (2016). Quyết định 1982/QĐ-TTg phê duyệt Khung trình độ quốc gia Việt Nam.
- Venable, J., Pries-Heje, J., & Baskerville, R. (2016). FEDS: A framework for evaluation in design science research. *European Journal of Information Systems, 25*(1), 77–89.
- Wohlin, C., Runeson, P., Höst, M., Ohlsson, M. C., Regnell, B., & Wesslén, A. (2012). *Experimentation in Software Engineering*. Springer.
- Yao, S., Shinn, N., Razavi, P., & Narasimhan, K. (2024). τ-bench: A benchmark for tool-agent-user interaction in real-world domains. arXiv:2406.12045.

> Thông tin thư mục ở mục 9 được ghi theo hiểu biết của người review; cần đối chiếu DOI, số trang và năm xuất bản trước khi đưa vào danh mục tham khảo của luận văn (R-22).

---

## 10. Chấm lại sau đợt sửa ngày 12/10/2026

Các mục đã thực hiện: R-02 (một phần), R-04, R-05, R-07, R-08, R-09, R-10, R-11, R-16, R-18, R-19, R-20, R-21, R-22 (một phần), R-23, R-24, cùng bốn thí nghiệm mới chạy thật trên môi trường cô lập: SC-03 (thử tải API), RS-01/02/04 (140 lượt tiêm lỗi), RS-05 (60 lượt tiêm lỗi nhà cung cấp LLM), quét nhật ký kiểm tra bảo mật.

| Mã | Trước | Sau | Lý do chính | Còn thiếu để đạt ≥ 8,5 |
|---|---|---|---|---|
| C1 | 8,0 | 8,5 | RQ2 thành câu hỏi mở; đóng góp viết lại theo sản phẩm và tri thức | — |
| C2 | 6,0 | 8,0 | 5 hướng nghiên cứu liên quan, bảng so sánh 8 công trình, 36 tài liệu | Thêm ≥ 4 nguồn bình duyệt (ví dụ nghiên cứu thực nghiệm về độ trễ trợ lý giọng nói, về microservices cho hệ thống AI) |
| C3 | 6,5 | 8,5 | Hevner, Peffers, FEDS, bảng ánh xạ DSR; quy tắc thống kê cố định trước | — |
| C4 | 8,0 | 8,0 | Không thay đổi trong đợt này | Gắn mức ưu tiên cho FR (R-25) |
| C5 | 8,0 | 8,5 | Thêm ATAM rút gọn: cây tiện ích, 2 điểm nhạy, 4 điểm đánh đổi, 4 rủi ro | Ước tính chi phí vận hành (R-17) để lên 9 |
| C6 | 7,5 | 8,0 | Phụ lục H tái lập, script thí nghiệm công khai | Bằng chứng triển khai đầu cuối trên AWS thật |
| C7 | 4,5 | 6,5 | Có số liệu thật cho NFR-04 (200/200), SC-03, bảo mật; kết quả âm được báo cáo trung thực; khoảng tin cậy Wilson | Xem danh sách bên dưới |
| C8 | 6,0 | 8,5 | Trả lời trực tiếp RQ1–RQ4; mỗi hạn chế có hướng phát triển | — |
| C9 | 7,5 | 8,0 | Abstract tiếng Anh, bảng thuật ngữ, đối chiếu trích dẫn đủ | Xác minh quy định FSB (R-06), kiểm tra trùng lặp (R-26) |

**Điểm tổng tự chấm:** 0,85 + 1,20 + 0,85 + 0,80 + 1,275 + 0,80 + 1,30 + 0,425 + 0,40 = **7,90/10** (trước: 6,68).

**Việc còn lại để C7 đạt ≥ 8,5** (cần người thực hiện hoặc thiết bị thật, không tự động hóa được trên máy phát triển):

1. Đo lại độ trễ thiết kế hiện hành: ≥ 200 lượt trên UC01, UC03, UC04, UC07 bằng phiên hội thoại thật (Bảng 6.6; hiện chỉ có 4 lượt).
2. SC-01, SC-02, RS-03: chạy nhiều tác nhân trên một máy chủ LiveKit với người tham gia giả lập phát âm thanh.
3. Chấm độ chính xác gọi công cụ bởi hai người độc lập trên ≥ 120 lượt, báo cáo kappa (R-12).
4. Đo WER với ≥ 3 người đọc và nhiều mức nhiễu (R-13).
5. Nghiên cứu người dùng nhỏ 5–8 người với SUS, NASA-TLX (R-14).
6. Sửa hai lỗi hiện thực đã phát hiện (che số điện thoại trong nhật ký; câu báo lỗi khi gọi khách chứa thông tin kỹ thuật) rồi kiểm tra lại Bảng 6.10 và 6.13.

Các phát hiện đáng chú ý của đợt thí nghiệm, đã đưa vào Chương 6:

- Cô lập lỗi hoạt động đúng: 200/200 lượt tiêm lỗi không làm hỏng luồng hội thoại.
- Lỗi dạng treo làm tài xế chờ 8 giây (API nghiệp vụ) hoặc 6 giây (nhà cung cấp LLM) – điểm đánh đổi TP-2, TP-3.
- Nhật ký chứa khoảng 2.360 lần xuất hiện số điện thoại đầy đủ – AC-18 không đạt.
- Một câu báo lỗi đọc thông tin kỹ thuật cho tài xế – danh mục tính khả dụng đạt 5/6.
- Trong SC-03, nút thắt là bộ giả lập cơ sở dữ liệu (CPU 106–113%), không phải dịch vụ (CPU 19–28%).
