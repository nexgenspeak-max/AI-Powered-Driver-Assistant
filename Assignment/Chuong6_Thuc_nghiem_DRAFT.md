# Chương 6. Thực nghiệm và đánh giá

Chương này kiểm chứng nguyên mẫu đã triển khai ở Chương 5 theo các chỉ số đã thống nhất từ Chương 2–3 và các câu hỏi nghiên cứu RQ2–RQ4 (RQ1 đã được trả lời chủ yếu qua thiết kế và hiện thực). Trọng tâm là **hành vi tài xế khi vận hành chuyến** (rảnh tay, câu ngắn, xác nhận trước việc rủi ro); **độ trễ phản hồi** được ưu tiên cao nhất. Phía khách hàng được kiểm chứng bằng **bộ test case**, không tổ chức khảo sát trải nghiệm sử dụng với khách trên đường. Chương lần lượt trình bày phạm vi và môi trường đo, bộ kịch bản, định nghĩa chỉ số, kết quả theo từng nhóm chỉ số, thảo luận theo câu hỏi nghiên cứu, và các hạn chế ảnh hưởng đến độ tin cậy của kết luận. Chi tiết thoại dài để ở Phụ lục B.

> **Ghi chú liêm chính số liệu:** Các bảng kết quả trong chương này được điền từ nhật ký phiên thật (trường `room`) và từ bộ kiểm thử tự động, trích xuất tại một thời điểm cố định trong cửa sổ hai ngày 05 và 06 tháng 9 năm 2026. Số liệu ở quy mô mẫu nhỏ và trong môi trường thử nghiệm, không phải vận hành thực địa diện rộng; các giới hạn về độ tin cậy được nêu ở mục 6.12. Nhóm nghiệp vụ chưa đủ mẫu trong cửa sổ đo được ghi rõ là “không đủ mẫu”, không suy đoán giá trị.

## 6.1. Mục tiêu và phạm vi đánh giá

Mục tiêu đánh giá là trả lời thực nghiệm:

- **RQ2:** Độ trễ phản hồi đầu cuối (tính từ lúc tài xế dứt câu đến lúc bot bắt đầu nói) đạt mức nào trên luồng cốt lõi; có duy trì được **P95 ≤ 2 giây** không? (**ưu tiên báo cáo trước**)
- **RQ3:** WER thay đổi thế nào giữa điều kiện yên tĩnh và nhiễu giả lập khoang xe (cùng đoạn đọc cố định)?
- **RQ4:** Trên bộ use case UC01–UC08 (và UC09–UC10 khi đo), tỷ lệ chọn đúng công cụ và hoàn thành nghiệp vụ là bao nhiêu, và lỗi phổ biến nằm ở đâu?

Bổ sung ngoài RQ nhưng phục vụ tính thực tiễn: (i) **trải nghiệm sử dụng** hiểu theo hành vi lái xe (danh mục kiểm tra, không bắt buộc thang SUS); (ii) **luồng khách** đạt hoặc không đạt theo test case; (iii) **bảo mật và vị trí** theo danh mục kiểm tra NFR-S.

RQ1 được xem là đã được minh họa bằng kiến trúc và mã nguồn (Chương 4–5); Chương 6 chỉ đối chiếu ngắn trong mục thảo luận.

**Trong phạm vi đo:** phiên tài xế trong ứng dụng (WebRTC); đề nghị chuyến qua điện thoại và gọi khách khi SIP sẵn sàng; FAQ; im lặng; từ khóa đánh thức (kiểm riêng); bộ test case phía khách gồm ba chế độ agent, gọi nền và ghi nhận yêu cầu.

**Ngoài phạm vi:** khảo sát trải nghiệm sử dụng với khách hàng thật trên đường; đo an toàn giao thông thực địa; so sánh A/B nhà cung cấp STT/LLM/TTS quy mô lớn; suy luận toàn mạng thương mại từ mẫu môi trường thử nghiệm.

## 6.2. Môi trường và cấu hình đo

**Bảng 6.1.** Môi trường thực nghiệm (cấu hình cụ thể của cửa sổ đo nêu ở đoạn ngay sau bảng)

| Thành phần | Cấu hình dùng khi đo | Ghi chú |
|---|---|---|
| Ứng dụng tài xế | driver-app (Expo) trên thiết bị / Simulator | Ưu tiên thiết bị thật khi đo mic/loa |
| Voice worker | llm-orchestrator (LiveKit Agents) | Nhật ký gắn `room=` |
| Backend | external-api-service + identity-service (+ call khi UC04) | Môi trường thử nghiệm / Docker cục bộ theo Phụ lục D |
| LiveKit | Cloud (WebRTC; SIP nếu đo UC02/UC04) | Không đưa bí mật vào luận văn |
| Dữ liệu chuyến | Dữ liệu thử admin / tài khoản demo nội bộ | Che thông tin cá nhân trên nhật ký và ảnh |
| Ngôn ngữ phiên | Tiếng Việt (chính); vài lượt Anh nếu đo NFR-L01 | Công cụ vn/en đối xứng |
| Kiểm thử tự động | `pytest` trong `llm-orchestrator/tests` (nhóm customer và call) | Bổ trợ test case khách, không thay việc đo độ trễ cảm nhận |

Trước mỗi buổi đo: (1) chuẩn bị đủ chuyến cho UC01–UC05; (2) xác nhận worker đã **làm nóng trước**; (3) loại phiên “lạnh” đầu tiên khỏi thống kê P95 hoặc báo cáo tách riêng cột phiên lạnh và phiên ấm nếu mẫu đủ lớn. Cấu hình mô hình STT, LLM và TTS được ghi lại trong nhật ký buổi đo (Phụ lục D) để kết quả tái lập được.

**Cấu hình cửa sổ đo dùng trong luận văn này.** Số liệu độ trễ ở mục 6.5 được trích từ nhật ký `turn_metrics` của llm-orchestrator trong hai ngày 2026-09-05 và 2026-09-06 (n = 341 lượt), cùng cấu hình: mô hình ngôn ngữ `gpt-5.6-luna`, nhận dạng giọng nói Google `chirp_3` (vi-VN), tổng hợp giọng nói Google `vi-VN-Chirp3-HD-Kore`, kênh WebRTC trong ứng dụng, tài khoản demo nội bộ. Ở đây `gpt-5.6-luna` là một mô hình lớp GPT truy cập qua giao diện tương thích OpenAI (bí danh nội bộ của dự án, cố định trong suốt cửa sổ đo); mọi kết luận về độ trễ token đầu ở mục 6.5 gắn với riêng mô hình này và sẽ thay đổi nếu đổi nhà cung cấp — đây cũng chính là lý do kiến trúc Chương 4 tách nhà cung cấp qua lớp cấu hình. Nhật ký thuộc môi trường phát triển và thử nghiệm, kịch bản do tác giả tự đọc, chưa phải khảo sát mù trên đường; script trích xuất `extract_ch6_metrics.py` đi kèm để tái lập.

## 6.3. Bộ kịch bản và quy trình thực nghiệm

Bộ kịch bản bám Bảng 3.7 (use case cốt lõi) và Bảng 3.9 (ánh xạ yêu cầu sang chỉ số), cùng kho câu hỏi và luồng đa bước nội bộ của dự án (câu tài xế thường nói khi chạy xe: xem lịch, cập nhật tiến độ, gọi khách, hủy có xác nhận, thu nhập…). Mỗi use case có **điều kiện thành công** đã nêu ở Chương 3; bản thoại chi tiết để ở Phụ lục B.

**Bảng 6.2.** Ánh xạ use case với chỉ số ưu tiên

| Use case | Việc tài xế (hành vi thực tế) | Đo độ trễ | Đo độ đúng công cụ | Ghi chú |
|---|---|---|---|---|
| UC01 | Hỏi lịch, hỏi số chuyến khi đang chạy | Có | Có | Một đường + nạp ngữ cảnh trước |
| UC02 | Điện thoại reo, nhận hoặc từ chối nhanh | Có (nếu đo SIP) | Có | Tập công cụ hẹp |
| UC03 | Báo đến nơi, khách lên xe, xong chuyến | Có | Có | Câu ngắn, một ý |
| UC04 | Gọi khách khi cần xác nhận đón | Có | Có | Chế độ đã chọn sẵn |
| UC05 | Muốn hủy, phải xác nhận rõ | Tùy | Có | An toàn thao tác |
| UC06 | Khách không ra hoặc gặp sự cố | Tùy | Có | |
| UC07 | Hỏi cách dùng ứng dụng (FAQ) | Có | Có (FAQ) | Không bịa chính sách |
| UC08 | Thu nhập; bật hoặc tắt nhận chuyến | Tùy | Có | |
| UC09 | Im lặng hoặc API lỗi | Không bắt buộc | Chấm theo hành vi | 15 giây, tối đa hai lần nhắc |
| UC10 | Từ khóa đánh thức mở trợ lý | Kiểm riêng | Kiểm riêng | Ngoài chuỗi xử lý công cụ LiveKit |

**Quy trình một lượt đo nghiệp vụ (độ đúng công cụ và mức hoàn thành việc):** mở trợ lý, chờ chào hai pha, đọc đúng câu kịch bản (hoặc diễn đạt ngắn giống cách tài xế nói), ghi lại công cụ được gọi, trạng thái backend và câu TTS. Lặp tối thiểu N lần cho mỗi kịch bản; khuyến nghị N ≥ 10 khi báo cáo phần trăm, nếu ít hơn thì nêu rõ.

**Quy trình đo độ trễ:** lấy `user_stop_to_agent_speak` sau khi phiên ấm. Số liệu Bảng 6.3 còn tách *đường tắt* và *đường LLM* theo nhật ký đợt A/B cũ (khi còn bật tự gọi công cụ theo ý định); thiết kế hiện tại đo trên một đường duy nhất và ghi thêm sự kiện câu giữ chỗ khi có.

**Quy trình đo WER:** cùng đoạn đọc cố định, hai điều kiện âm thanh (yên / nhiễu khoang xe giả lập).

## 6.4. Định nghĩa chỉ số và cách thu thập

### 6.4.1. Độ trễ phản hồi đầu cuối (RQ2)

**Định nghĩa vận hành:** thời gian từ lúc tài xế **kết thúc câu nói** (agent chuyển từ trạng thái đang nói sang đang nghe) đến lúc agent **bắt đầu phát âm** câu trả lời. Đây là độ trễ tài xế cảm nhận được khi đang lái, khớp NFR-P01 và RQ2.

Trong mã nguồn, chỉ số này do `turn_metrics` ghi lại dưới tên `user_stop_to_agent_speak`; ngưỡng nội bộ 2 giây đánh dấu là chậm — cùng ý với P95 ≤ 2 giây. Các mốc phụ bên trong một lượt (phát hiện hết câu, thời gian đến token đầu của LLM, thời gian đến âm thanh đầu của TTS) chỉ dùng để phân tích nút nghẽn, không thay chỉ số chính.

**Báo cáo:** P50 và P95 (giây) theo nhóm UC; với đợt A/B cũ còn báo theo đường xử lý (đường tắt / đường đủ). Không dùng lần “làm nóng” mạng làm đại diện cho trải nghiệm lái xe.

### 6.4.2. Tỷ lệ lỗi từ — WER (RQ3)

Công thức: WER = (S + D + I) / N, trong đó S, D, I lần lượt là số từ bị thay thế, xóa, chèn khi so với câu đọc đúng, và N là tổng số từ của câu gốc. Đo trong hai điều kiện: (A) yên tĩnh; (B) nhiễu khoang xe giả lập (ghi rõ nguồn nhiễu).

### 6.4.3. Độ đúng gọi công cụ (RQ4)

Một lượt **đúng công cụ** khi: (i) tên công cụ thuộc tập kỳ vọng UC; (ii) tham số then chốt đúng; (iii) không gọi thêm công cụ phá nghiệp vụ. Mọi lượt trên thiết kế hiện hành đi qua LLM kèm công cụ; đợt A/B cũ còn có nhánh đường tắt (`spoken_intent`) chấm cùng tiêu chí.

### 6.4.4. Hoàn thành nghiệp vụ (RQ4)

UC **thành công** khi thỏa Bảng 3.7. Thành công không đồng nghĩa với “nói trôi chảy”: nếu câu TTS hay nhưng backend không thay đổi trong khi lẽ ra phải thay đổi thì vẫn tính là **thất bại**.

### 6.4.5. Trải nghiệm sử dụng theo ngữ cảnh lái xe (NFR-U01)

Không dùng thang SUS bắt buộc. Chấm **danh mục kiểm tra hành vi** trên cùng bản ghi UC (đạt/không đạt từng mục), ví dụ: câu TTS ngắn (một ý chính); không đọc địa chỉ/GPS dài khi không được hỏi; việc rủi ro có hỏi lại; tài xế hoàn thành việc mà không cần chạm màn hình trên kịch bản rảnh tay. Có thể bổ sung vài nhận xét định tính nếu có người đóng vai tài xế — mẫu nhỏ chỉ minh họa.

### 6.4.6. Luồng khách qua test case

“Khách có thể dùng” = các test case liên quan **đạt** (pytest và/hoặc kịch bản thoại): khởi tạo gọi đúng chế độ; bot phía khách không bịa thời gian đến / giá khi thiếu dữ liệu; ghi nhận yêu cầu khách đẩy về tài xế; chặn gọi nhầm số trùng tài xế… Không đo P95 khách như tiêu chí chính; nếu đo độ trễ khách thì báo riêng, không gộp vào P95 tài xế.

## 6.5. Kết quả độ trễ (RQ2)

Các Bảng 6.3–6.10 dưới đây được điền từ nhật ký phiên và bộ kiểm thử. Toàn bộ số liệu độ trễ trích bằng `extract_ch6_metrics.py` trên cùng cửa sổ hai ngày; số liệu ở quy mô mẫu nhỏ, môi trường thử nghiệm — xem Ghi chú liêm chính số liệu ở đầu chương và mục 6.12.

**Lưu ý thiết kế hiện hành:** Bảng 6.3 và Hình 6.1 phản ánh đợt A/B khi còn bật **đường tắt** (tự gọi công cụ theo ý định nói). Sau đợt đo, mã nguồn đã chuyển sang **một đường** STT → LLM kèm công cụ → TTS và câu giữ chỗ khoảng hai giây (`SPOKEN_INTENT_AUTO_TOOL=False`). Các con số P95 đường tắt **không** còn là cam kết hiệu năng của bản hiện hành; chúng là bằng chứng lịch sử rằng bỏ qua LLM giúp bám ngưỡng, còn chi phí TTFT của đường đủ là nút nghẽn chính — đúng với giả thuyết phải tối ưu lời nhắc / mô hình / câu giữ chỗ trên một đường duy nhất.

**Bảng 6.3.** Độ trễ phản hồi cảm nhận theo đường xử lý — đợt A/B khi còn đường tắt (giây, nhật ký 2026-09-05..06, `gpt-5.6-luna`)

| Đường xử lý (đợt A/B cũ) | n | P50 | P90 | P95 | % lượt ≥ 2s | Đạt P95 ≤ 2s? |
|---|---|---|---|---|---|---|
| Đường tắt (khớp ý định nói, không qua LLM) | 167 | 0,21 | 1,48 | 2,00 | 5,4% | Đạt (sát ngưỡng) |
| Đường đủ và trò chuyện nhẹ (qua LLM) | 174 | 1,54 | 2,78 | 3,75 | 30,5% | Chưa |
| Gộp mọi lượt | 341 | 0,50 | 2,29 | 2,87 | 18,2% | Chưa (đạt ở đường tắt) |

Đường xử lý gán theo việc `spoken_intent` có kích hoạt trong lượt hay không (cách gán xấp xỉ, nêu ở mục 6.12). Trong cửa sổ đo đó, câu mở đầu mỗi use case cốt lõi (xem lịch, nhận chuyến, gọi khách, thu nhập) hầu hết đi đường tắt; câu hỏi chi tiết tiếp theo ("chuyến đầu đi đâu", "đón mấy giờ") và câu mơ hồ đi đường đủ. Nhóm UC03 và UC07 không đủ mẫu trong cửa sổ đo để tách riêng.

**Bảng 6.4.** Tách nút nghẽn độ trễ trong một lượt (mili-giây, mọi lượt có mốc sự kiện, `gpt-5.6-luna`)

| Chặng trong một lượt | P50 (ms) | P95 (ms) | Nhận xét |
|---|---|---|---|
| Phát hiện tài xế dứt câu (EOU) | 935 | 1 700 | Phụ thuộc mô hình ngắt lời và độ dài câu |
| Mô hình ngôn ngữ sinh token đầu (TTFT) | 1 249 | 2 487 | Chi phí trội của mọi lượt qua LLM (thiết kế hiện hành) |
| Tổng hợp giọng nói đến âm thanh đầu (TTFB) | 161 | 288 | Gần như không đáng kể |

Hình 6.1 minh họa P50/P95 theo đường xử lý của đợt A/B cũ. Nhận định chính:

- **Đợt A/B — đường tắt bám ngưỡng** P95 ≤ 2 giây (P95 = 2,00 giây, chỉ 5,4% lượt ≥ 2 giây); phần lớn lượt kết thúc dưới 0,5 giây. Biên an toàn mỏng; thiết kế hiện hành **không** còn dựa vào đường tắt để đạt ngưỡng.
- **Đợt A/B — đường đủ chưa đạt** (P95 = 3,75 giây). Theo Bảng 6.4, chi phí trội nằm ở thời gian mô hình ngôn ngữ sinh token đầu (P95 ≈ 2,5 giây); tổng hợp giọng nói gần như không đáng kể. Trên thiết kế một đường hiện hành, **mọi** câu quen thuộc cũng trả chi phí TTFT này; câu giữ chỗ ≈ 2 giây che khoảng chờ cảm nhận, còn nạp ngữ cảnh trước giúp rút ngắn phần thân công cụ.
- **Gộp chung (đợt A/B)** P95 = 2,87 giây, vượt ngưỡng vì khoảng 51% lượt trong các buổi thử đi đường đủ.

Kết quả khớp giả thuyết ở mục 4.3.2: bỏ qua LLM từng giúp cảm giác tức thì, nhưng đã được thay bằng một đường + câu giữ chỗ; hướng tối ưu tiếp theo là rút gọn lời nhắc, giảm số vòng công cụ, hoặc mô hình có độ trễ token đầu thấp hơn — rồi đo lại P95 trên bản hiện hành.

**Hình 6.1. Độ trễ cảm nhận P50/P95 theo đường xử lý — đợt A/B khi còn đường tắt (n = 341 lượt, 2026-09-05..06).**

![Biểu đồ P50 P95 độ trễ theo đường xử lý](thesis_screenshots/H6_1_latency.png)

## 6.6. Kết quả WER (RQ3)

**Bảng 6.5.** WER theo điều kiện âm thanh (sơ bộ: một người đọc, một lượt mỗi điều kiện)

| Điều kiện | Số câu / số từ | S / D / I | WER |
|---|---|---|---|
| A — Yên tĩnh | 22 câu / 192 từ | 1 / 5 / 0 | 3,1% |
| B — Nhiễu khoang xe giả lập | 22 câu / 192 từ | 3 / 5 / 6 | 7,3% |
| Chênh lệch B − A | | | +4,2 điểm phần trăm |

**Thiết lập.** Cùng một đoạn 22 câu (truy vấn chuyến, xác nhận, gọi/nhắn khách, hai địa chỉ đầy đủ có số, mốc giờ), đọc một lượt ở điều kiện A rồi một lượt ở điều kiện B, cùng thiết bị và micro. Điều kiện B phát tiếng ồn nền mô phỏng khoang xe từ một thiết bị phụ (không phát qua chính điện thoại đang đọc, tránh bộ khử tiếng vọng bóp mất input). Văn bản nhận dạng lấy từ `event=stt_final text=…` trong nhật ký; chuẩn hoá qua lại giữa số và chữ số, bỏ dấu câu trước khi so; kèm script `compute_wer.py`.

**Nhận xét.** WER tăng hơn gấp đôi khi có nhiễu, từ 3,1% lên 7,3%. Ở điều kiện B xuất hiện thêm các lỗi không có ở điều kiện A: nhận nhầm từ mang nghĩa ("thu nhập" thành "phim Nhật"), sai chữ số trong địa chỉ ("năm mươi tư" thành "50" hoặc "24"), và rụng các hư từ ngắn như "đón", "này", "trước". Nhận dạng vẫn dùng được cho câu lệnh ngắn nhưng độ tin cậy giảm, phù hợp với giới hạn "không huấn luyện lại mô hình nhận dạng cho tiếng Việt trong khoang xe" nêu ở Chương 1. Mẫu nhỏ (một người đọc, một lượt mỗi điều kiện); cần nhiều người đọc và nhiều mức nhiễu để khái quát.

**Hình 6.2. So sánh WER điều kiện yên tĩnh và nhiễu khoang xe giả lập.**

![Biểu đồ WER điều kiện A và B](thesis_screenshots/H6_2_wer.png)

## 6.7. Kết quả gọi công cụ và hoàn thành nghiệp vụ (RQ4)

**Bảng 6.6.** Độ đúng công cụ và hoàn thành nghiệp vụ (chấm tay sơ bộ, một người, chưa mù; mẫu nhật ký 2026-09-05..06)

| Nhóm nghiệp vụ | n | % đúng công cụ | % hoàn thành ngay lần đầu | Lỗi quan sát |
|---|---|---|---|---|
| UC01 Xem lịch / hỏi chuyến | 21 | ≈ 100% | ≈ 95% | 1 lần địa chỉ bị cắt (E-UX) |
| UC02 Nhận / từ chối chuyến | 4 | 100% | 100% | không có |
| UC04 Gọi khách | 6 | ≈ 67% | ≈ 50% | "gọi khách như nào?" → gọi luôn (E-INTENT); chuyển lời nhắn hỏng (E-UX) |
| UC08 Thu nhập | 6 | ≈ 100% | ≈ 67% | hỏi "tháng"/"cả năm" → trả về hôm nay (E-PARAM) |
| UC07 FAQ / cách dùng | 2 | 100% | 100% | không có |
| **Gộp** | ≈ 39 | ≈ 88% | ≈ 77% | E-INTENT, E-PARAM, E-UX (Bảng 6.7) |

Chấm bởi một người, chưa mù, phiên phát triển nhiều câu cạnh biên; n mỗi nhóm nhỏ (2–21). **Các lỗi E-INTENT ở nhóm UC04 đã được vá ở phiên bản mã nguồn sau cửa sổ đo** (xác nhận bằng kiểm thử `test_spoken_intent`: "gọi khách như nào?" nay không còn tự kích hoạt công cụ gọi). Con số theo từng UC riêng lẻ (UC03/05/06) cần đợt chấm chính thức có gắn nhãn, kịch bản mù và ≥ 2 người chấm.

Bổ sung mang tính mô tả (trên toàn bộ nhật ký đợt A/B cũ, rộng hơn cửa sổ hai ngày ở Bảng 6.3): khi còn bật đường tắt, cơ chế kích hoạt trên khoảng chín loại ý định, tập trung nhiều nhất ở xem chuyến sắp tới, gọi khách, xác nhận hoặc cảm ơn ngắn, và tra thu nhập. Trên thiết kế hiện hành, các câu này cũng đi qua LLM; độ đúng công cụ phụ thuộc chọn tool của mô hình và nạp ngữ cảnh trước.

**Bảng 6.7.** Phân loại lỗi quan sát (mẫu nhật ký 2026-09-05..06, n ≈ 39 lượt, 1 người chấm)

| Mã | Nhóm lỗi | Ví dụ quan sát trong nhật ký | Tầng nghi ngờ | Số lần (mẫu n ≈ 39) |
|---|---|---|---|---|
| E-INTENT | Đúng chữ nhưng chọn sai việc | “gọi khách như nào?” → gọi luôn thay vì trả lời cách dùng; câu mơ hồ khác kích hoạt công cụ sai | LLM / đường tắt (đợt A/B cũ) | ≈ 3 |
| E-PARAM | Đúng công cụ, sai tham số | Hỏi thu nhập “tháng vừa rồi” / “từ trước đến giờ” → trả về thu nhập hôm nay | Ngữ cảnh / LLM | ≈ 2 |
| E-UX | Việc xong nhưng câu nói khó nghe khi lái | Đọc địa chỉ bị cắt “…ba đ….”; chuyển lời nhắn thành câu vô nghĩa | Lời nhắc TTS | ≈ 3 |
| E-CONFIRM | Đáp “vâng” nhưng chưa gọi công cụ (việc đang chờ) | “Vâng.” rồi không kiểm tra cho tới khi tài xế hỏi lại | Lời nhắc hệ thống / việc đang chờ | ≈ 2 |
| E-STT | Nghe sai tên riêng | “NexGen Speak” bị nghe thành “Nick Jan Speed” (bot thường tự phục hồi) | STT hoặc ồn | ≈ 2 |
| E-API | Công cụ đúng nhưng HTTP lỗi | Không quan sát thấy trong cửa sổ đo (mọi lệnh HTTP đều 200) | Backend / mạng | 0 |

Kiểm riêng UC09–UC10: danh mục kiểm tra đạt/không đạt — chi tiết Phụ lục B.

## 6.8. Trải nghiệm sử dụng theo hành vi tài xế (NFR-U01)

**Bảng 6.8.** Danh mục kiểm tra trải nghiệm theo ngữ cảnh lái xe (điền đạt/không trên mẫu UC)

| STT | Tiêu chí (gắn hành vi thực tế) | UC gắn | Đạt? | Bằng chứng (nhật ký / kiểm thử) |
|---|---|---|---|---|
| 1 | Hoàn thành việc cốt lõi không cần chạm màn hình (theo kịch bản) | UC01–UC04 | Đạt (mẫu) | Phiên 2026-09-06: lần lượt hỏi lịch, số chuyến, điểm đón, tên khách mà không thao tác màn hình |
| 2 | Câu trả lời ngắn, một ý chính | UC01, UC03 | Đạt | Độ dài câu TTS trên toàn nhật ký: trung vị 44 ký tự, 93% câu ≤ 120 ký tự (n = 2 638 câu) |
| 3 | Thao tác rủi ro có bước xác nhận | UC05, UC06 | Đạt | Ý định `confirm` tách khỏi hành động; kiểm thử `test_confirm_trip`, `test_pending_action` đạt |
| 4 | Không bịa chuyến, thu nhập hoặc vị trí khi thiếu dữ liệu | UC01, UC08 | Đạt (mẫu) | Câu trả lời khớp dữ liệu ngữ cảnh (`GET /api/v1/drivers/me/context` mã 200); không quan sát thấy bịa |
| 5 | Im lặng được nhắc rồi kết thúc lịch sự | UC09 | Đạt | Nhiều nhịp theo dõi im lặng trên toàn nhật ký; phiên mẫu: bot nhắc “Bạn còn đó không?”, sau đó chào kết thúc và gọi `POST /api/v1/voice/end-session` (mã 200) |

Trải nghiệm sử dụng ở đây là **quan sát hành vi hệ thống khớp cách tài xế làm việc**, không phải điểm trung bình khảo sát lớn.

## 6.9. Luồng khách hàng qua test case

**Bảng 6.9.** Kết quả test case phía khách (đạt / không đạt)

| Nhóm test case | Việc kiểm | Cách chạy | Kết quả |
|---|---|---|---|
| Gọi khách từ tài xế | Đúng chế độ; chặn tự gọi; không quay khi thiếu chuyến | `test_call_customer`, `test_outbound_call_modes` | Đạt |
| Agent / gọi nền nói với khách | Mở đầu đúng; không bịa thời gian đến/giá khi thiếu trường; tóm tắt về tài xế | `test_customer_outbound_opening`, `test_customer_call_faq` | Đạt |
| Ghi nhận yêu cầu khách | Chờ thêm / ghi chú được lưu và đẩy tóm tắt | `test_record_customer_request`, `test_resolve_customer_trip` | Đạt |

Các test case nhóm khách / gọi đạt (pytest, 2026-09-06). Bộ kiểm thử đầy đủ: **451/452 đạt**; test còn lại kiểm độ dài lời nhắc hệ thống, không phải hành vi nghiệp vụ.

Cách diễn giải: **đạt bộ test case** = chứng minh tích hợp “khách có thể được phục vụ bởi voice trong phạm vi đã thiết kế”. Không suy ra “khách hàng thật hài lòng trên đường”.

## 6.10. Danh mục kiểm tra bảo mật và chia sẻ vị trí

**Bảng 6.10.** Kiểm nhanh NFR-S (quan sát trên phiên thử / nhật ký đã che)

| STT | Kiểm tra | Kỳ vọng | Đạt? | Bằng chứng |
|---|---|---|---|---|
| 1 | TTS / chat không đọc số điện thoại đầy đủ khi không được hỏi | Chỉ đọc khi tài xế yêu cầu | Đạt | Trong nhật ký, số điện thoại đầy đủ chỉ được đọc khi tài xế chủ động hỏi (công cụ `get_customer_phone`); không tự đọc trong câu trả lời khác |
| 2 | Nhật ký phiên không chứa token LiveKit / mật khẩu | Chỉ `room=` và mã lỗi an toàn | Đạt | Grep nhật ký: không có `bearer`, JWT (`eyJ…`), `password`, API key |
| 3 | Hỏi vị trí khách / điểm đón | Lấy từ API chuyến; thiếu thì nói chưa có — không bịa | Đạt (mẫu) | Câu trả lời vị trí trong phiên mẫu lấy từ dữ liệu chuyến; không đọc tọa độ |
| 4 | llm-orchestrator không mở cơ sở dữ liệu trực tiếp | Chỉ HTTP tới external-api-service | Đạt | Mã llm-orchestrator không có trình điều khiển CSDL (psycopg / SQLAlchemy / Mongo / MySQL); chỉ HTTP |

## 6.11. Thảo luận theo câu hỏi nghiên cứu

**RQ1 (thiết kế và triển khai).** Nguyên mẫu hoạt động theo trình tự: ứng dụng lấy token và vào phòng LiveKit; worker phân loại phiên theo tên phòng; câu nói đi qua nhận dạng giọng nói rồi **một đường** mô hình ngôn ngữ kèm công cụ, sau đó tổng hợp giọng nói; khi phản hồi chậm khoảng từ hai giây có thể xen câu giữ chỗ; mọi thao tác nghiệp vụ gọi HTTP tới external-api-service. Thiết kế này khớp hành vi tài xế: xác nhận hai bước cho việc rủi ro, chế độ gọi khách không hỏi lại mỗi lần nếu đã cấu hình sẵn, và không bịa trạng thái chuyến để nói cho nhanh.

**RQ2 (độ trễ — ưu tiên).** Trên n = 341 lượt (nhật ký 2026-09-05..06, `gpt-5.6-luna`, **đợt A/B khi còn đường tắt**): đường tắt khi đó bám ngưỡng P95 = 2,00 giây (5,4% lượt vượt 2 giây); đường đủ chưa đạt P95 = 3,75 giây, nghẽn chủ yếu ở thời gian mô hình ngôn ngữ sinh token đầu (P95 ≈ 2,5 giây). Gộp chung P95 = 2,87 giây. Thiết kế hiện hành đã tắt đường tắt: mọi câu quen thuộc cũng trả TTFT; câu giữ chỗ ≈ 2 giây che khoảng chờ; hướng cải thiện là rút gọn lời nhắc hệ thống, giảm vòng công cụ, hoặc dùng mô hình có độ trễ token đầu thấp hơn — rồi đo lại P95. Đây là kết quả sơ bộ từ môi trường thử nghiệm với một nhà cung cấp mô hình (hạn chế ở mục 6.12), chưa phải đo trên đường thật.

**RQ3 (WER).** Trên cùng đoạn 22 câu (N = 192 từ): WER tăng từ **3,1%** (yên tĩnh) lên **7,3%** khi có nhiễu khoang xe giả lập — hơn gấp đôi, chênh +4,2 điểm phần trăm (Bảng 6.5, Hình 6.2). Nhiễu gây thêm lỗi thay từ mang nghĩa và sai chữ số trong địa chỉ. Mức WER này vẫn đủ để nhận diện câu lệnh ngắn nhưng cho thấy giới hạn khi không huấn luyện lại STT cho tiếng Việt trong khoang xe. Mẫu nhỏ, một người đọc.

**RQ4 (công cụ và nghiệp vụ, kèm trải nghiệm sử dụng).** Trên mẫu quan sát n ≈ 39 lượt (nhật ký 2026-09-05..06, một người chấm, chưa mù): khoảng 88% lượt chọn đúng công cụ và 77% hoàn thành đúng ngay lần đầu. Nhóm lỗi thường gặp: chọn sai việc từ câu mơ hồ (E-INTENT, ví dụ “gọi khách như nào?” bị hiểu thành lệnh gọi), sai phạm vi tham số thu nhập (E-PARAM), câu đọc bị cắt hoặc chuyển lời nhắn vô nghĩa (E-UX), và đáp “vâng” nhưng chưa gọi công cụ (E-CONFIRM). Các câu quen thuộc trong đợt đo đó đi đường tắt (xem lịch, xác nhận, cảm ơn) ổn định; trên bản hiện hành chúng đi qua LLM. Con số này là quan sát sơ bộ; cần đợt chấm có gắn nhãn UC, kịch bản mù và nhiều người chấm để kết luận định lượng.

**Khách hàng.** Bảng 6.9 chỉ kết luận mức “test case đạt”, gắn với phạm vi Chương 3 — không nâng thành nghiên cứu người dùng khách.

Tổng hợp: đã có số liệu độ trễ (RQ2), WER hai điều kiện (RQ3), quan sát sơ bộ độ đúng công cụ (RQ4), kiểm thử luồng khách (Bảng 6.9) và danh mục bảo mật–vị trí (Bảng 6.10). Các số này đều từ mẫu nhỏ trong môi trường thử nghiệm; số liệu RQ4 theo từng UC vẫn cần đợt chấm có gắn nhãn để khẳng định đầy đủ.

## 6.12. Hạn chế và yếu tố ảnh hưởng đến độ tin cậy của kết luận

Mục này nêu những điểm có thể khiến kết quả thực nghiệm trông tốt hơn hoặc khác so với thực tế vận hành, cùng cách luận văn hạn chế ảnh hưởng đó.

**Kết quả trong phòng thử có thể “đẹp” hơn thực tế.** Người đọc kịch bản biết trước câu nên dễ trôi chảy hơn tài xế thật phải ứng biến. Để giảm thiểu, luận văn thêm vài cách diễn đạt ngắn và ghi rõ tỷ lệ câu cố định so với câu tự do.

**Khó suy ra toàn bộ điều kiện thực tế.** Môi trường thử nghiệm và nhiễu giả lập không đại diện mọi khoang xe; đạt test case phía khách không đồng nghĩa khách thật trên đường dùng như vậy.

**Chỉ số đo không thay thế mọi khái niệm cần quan tâm.** Thời gian thực tế cảm nhận đo phản hồi thoại, không đo an toàn giao thông thực địa. Danh mục kiểm tra trải nghiệm sử dụng cũng không thay được điểm hài lòng đo trong dài hạn.

**Mẫu nhỏ làm suy yếu khẳng định thống kê.** Khi cỡ mẫu nhỏ, luận văn nêu rõ con số và tránh kết luận tuyệt đối.

**Phụ thuộc nhà cung cấp mô hình nhận dạng, ngôn ngữ và tổng hợp giọng nói.** Cấu hình buổi đo được ghi ở Phụ lục D để người khác tái lập.

**Số liệu độ trễ lấy từ nhật ký phát triển.** n = 341 lượt trong hai ngày, cùng một tài khoản demo và một số kịch bản; kịch bản do tác giả tự đọc nên chưa mù, và cửa sổ này còn lẫn một số lượt tự kiểm thử của tác giả (đọc đoạn đo WER, thử luồng gọi khách) chưa được lọc riêng. Việc phân loại đường tắt và đường đủ dựa trên `spoken_intent` có kích hoạt hay không chỉ áp dụng cho **đợt A/B cũ**; thiết kế hiện hành không còn tách hai đường như vậy. Một lượt ngoại lệ khoảng 21 giây do nghẽn mạng vẫn được tính vào P95 và trung bình. Cần đợt đo lại trên một đường + câu giữ chỗ, có gắn nhãn use case, tách riêng lượt nghiệp vụ khỏi lượt tự kiểm thử, và nhiều người đọc để kết quả đại diện hơn.

**Thiên lệch người chấm.** Việc chấm dựa trên rubric ở Bảng 6.7 và 6.8; đợt đo chính thức nên có hai người chấm độc lập.

Các hạn chế phạm vi Chương 1 vẫn giữ khi diễn giải kết quả.

## Kết luận chương

Chương 6 đã neo đánh giá vào **hành vi tài xế thực tế** (rảnh tay, câu ngắn, xác nhận rủi ro) và đặt **độ trễ** lên trước. Bảng 6.3–6.10 và Hình 6.1–6.2 có số liệu và kết quả từ nhật ký phiên và bộ kiểm thử: đợt A/B khi còn đường tắt cho P95 ≈ 2,0 giây (đường tắt) và P95 ≈ 3,8 giây (đường đủ, nghẽn ở TTFT); thiết kế hiện hành là một đường + câu giữ chỗ ≈ 2 giây — cần đo lại P95. WER sơ bộ 3,1% (yên tĩnh) so với 7,3% (nhiễu); chấm tay sơ bộ ≈ 88% lượt chọn đúng công cụ và ≈ 77% hoàn thành ngay lần đầu; luồng khách và danh mục bảo mật, vị trí đạt trên bộ kiểm thử. Kết quả RQ2 có cỡ mẫu lớn hơn (n = 341 lượt) nhưng phụ thuộc một nhà cung cấp mô hình và phản ánh phiên bản trước khi tắt đường tắt; RQ3 và RQ4 mới ở mức quan sát sơ bộ (một người đọc, một người chấm). Đợt đo chính thức trên bản một đường + câu giữ chỗ, có gắn nhãn UC, kịch bản mù và nhiều người đọc là bước tiếp theo để khẳng định đầy đủ RQ2–RQ4.

---

## Self-review (Chương 6 — rà từ ngữ đúng nghĩa)

| Hạng mục | Kết quả |
|---|---|
| 6.12 đổi tên + viết lại đúng nghĩa (không “đe dọa tính hợp lệ”) | Đạt |
| wall clock / usability / inbound / cabin / vendor / Mitigation | Đã Việt hóa đúng nghĩa |
| Không bịa số | Đạt (ô 「—」) |
| Cần bổ sung số liệu | P0: đo + điền bảng |
