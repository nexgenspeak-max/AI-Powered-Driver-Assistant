# Chương 6. Thực nghiệm và đánh giá

Chương này kiểm chứng nguyên mẫu đã triển khai ở Chương 5 theo các chỉ số đã thống nhất từ Chương 2–3 và các câu hỏi nghiên cứu RQ2–RQ4 (RQ1 đã được trả lời chủ yếu qua thiết kế–hiện thực). Trọng tâm là **hành vi tài xế khi vận hành chuyến** (rảnh tay, câu ngắn, xác nhận trước việc rủi ro); **độ trễ phản hồi** được ưu tiên cao nhất. Phía khách hàng được kiểm chứng bằng **bộ test case**, không tổ chức khảo sát trải nghiệm sử dụng với khách trên đường. Mục 6.1–6.4 mô tả phạm vi, môi trường, kịch bản và định nghĩa chỉ số. Mục 6.5–6.7 trình bày kết quả độ trễ / WER / công cụ–nghiệp vụ. Mục 6.8–6.10 lần lượt nêu trải nghiệm sử dụng theo ngữ cảnh lái xe, kiểm thử luồng khách, và danh mục kiểm tra bảo mật–vị trí. Mục 6.11 thảo luận RQ; mục 6.12 nêu hạn chế và các yếu tố ảnh hưởng đến độ tin cậy của kết luận. Chi tiết thoại dài để ở Phụ lục B.

> **Ghi chú liêm chính số liệu:** Tại thời điểm viết chương, các ô kết quả mang ký hiệu **「—」** nghĩa là *đã thiết kế phương pháp đo nhưng chưa chạy đủ chiến dịch đo để điền số*. Không suy diễn P50/P95/WER/% thành công từ kỳ vọng. Khi có nhật ký phiên (`room=…`) và bảng số, chỉ cần thay 「—」 và bổ sung chú thích Hình 6.x — không đổi định nghĩa chỉ số ở mục 6.4.

## 6.1. Mục tiêu và phạm vi đánh giá

Mục tiêu đánh giá là trả lời thực nghiệm:

- **RQ2:** Độ trễ phản hồi đầu cuối (tài xế dứt câu → bot bắt đầu nói) đạt mức nào trên luồng cốt lõi; có duy trì được **P95 ≤ 2 giây** không? (**ưu tiên báo cáo trước**)
- **RQ3:** WER thay đổi thế nào giữa điều kiện yên tĩnh và nhiễu giả lập khoang xe (cùng đoạn đọc cố định)?
- **RQ4:** Trên bộ use case UC01–UC08 (và UC09–UC10 khi đo), tỷ lệ chọn đúng công cụ / hoàn thành nghiệp vụ là bao nhiêu, và lỗi phổ biến nằm ở đâu?

Bổ sung ngoài RQ nhưng phục vụ tính thực tiễn: (i) **trải nghiệm sử dụng** hiểu theo hành vi lái xe (danh mục kiểm tra, không bắt buộc thang SUS); (ii) **luồng khách** đạt/không đạt theo test case; (iii) **bảo mật / vị trí** theo danh mục kiểm tra NFR-S.

RQ1 được xem là đã được minh họa bằng kiến trúc và mã nguồn (Chương 4–5); Chương 6 chỉ đối chiếu ngắn trong mục thảo luận.

**Trong phạm vi đo:** phiên tài xế trong ứng dụng (WebRTC); đề nghị chuyến qua điện thoại và gọi khách khi SIP sẵn sàng; FAQ; im lặng; từ khóa đánh thức và quét đơn (kiểm riêng); bộ test case phía khách (agent / gọi nền / ghi nhận yêu cầu).

**Ngoài phạm vi:** khảo sát trải nghiệm sử dụng với khách hàng thật trên đường; đo an toàn giao thông thực địa; so sánh A/B nhà cung cấp STT/LLM/TTS quy mô lớn; suy luận toàn mạng thương mại từ mẫu môi trường thử nghiệm.

## 6.2. Môi trường và cấu hình đo

**Bảng 6.1.** Môi trường thực nghiệm (mẫu — điền phiên bản cụ thể khi đo)

| Thành phần | Cấu hình dùng khi đo | Ghi chú |
|---|---|---|
| Ứng dụng tài xế | driver-app (Expo) trên thiết bị / Simulator | Ưu tiên thiết bị thật khi đo mic/loa |
| Voice worker | voice-agent (LiveKit Agents) | Nhật ký gắn `room=` |
| Backend | trip-service + auth (+ call khi UC04) | Môi trường thử nghiệm / Docker cục bộ theo Phụ lục D |
| LiveKit | Cloud (WebRTC; SIP nếu đo UC02/UC04) | Không đưa bí mật vào luận văn |
| Dữ liệu chuyến | Dữ liệu thử admin / tài khoản demo nội bộ | Che thông tin cá nhân trên nhật ký và ảnh |
| Ngôn ngữ phiên | Tiếng Việt (chính); vài lượt Anh nếu đo NFR-L01 | Công cụ vn/en đối xứng |
| Kiểm thử tự động | `pytest` trong `voice-agent/tests` (nhóm customer / call) | Bổ trợ test case khách — không thay đo độ trễ cảm nhận |

Trước mỗi buổi đo: (1) chuẩn bị đủ chuyến cho UC01–UC05; (2) xác nhận worker đã **làm nóng trước**; (3) loại phiên “lạnh” đầu tiên khỏi thống kê P95 hoặc báo cáo tách cột *lạnh / ấm* nếu mẫu đủ lớn. Cấu hình mô hình STT/LLM/TTS ghi lại trong nhật ký buổi đo (Phụ lục D) để kết quả tái lập được.

## 6.3. Bộ kịch bản và quy trình thực nghiệm

Bộ kịch bản bám Bảng 3.3–3.4 và kho câu hỏi / luồng đa bước nội bộ của dự án (câu tài xế thường nói khi chạy xe: xem lịch, cập nhật tiến độ, gọi khách, hủy có xác nhận, thu nhập…). Mỗi use case có **điều kiện thành công** đã nêu ở Chương 3; bản thoại chi tiết để ở Phụ lục B.

**Bảng 6.2.** Ánh xạ use case → chỉ số ưu tiên

| Use case | Việc tài xế (hành vi thực tế) | Độ trễ | Công cụ / nghiệp vụ | Ghi chú |
|---|---|---|---|---|
| UC01 | Hỏi lịch / “mấy chuyến” khi đang chạy | Có | Có | Ưu tiên đường tắt |
| UC02 | Điện thoại reo → nhận/từ chối nhanh | Có (nếu đo SIP) | Có | Tập công cụ hẹp |
| UC03 | “Đến nơi / khách lên xe / xong chuyến” | Có | Có | Câu ngắn, một ý |
| UC04 | Gọi khách khi cần xác nhận đón | Có | Có | Chế độ đã chọn sẵn |
| UC05 | Muốn hủy → phải xác nhận rõ | Tùy | Có | An toàn thao tác |
| UC06 | Khách không ra / sự cố | Tùy | Có | |
| UC07 | Hỏi cách dùng ứng dụng / FAQ | Có | Có (FAQ) | Không bịa chính sách |
| UC08 | Thu nhập / online–offline | Tùy | Có | |
| UC09 | Im lặng / API lỗi | Không bắt buộc | Hành vi | 15s × 2 nhắc |
| UC10 | Từ khóa đánh thức / quét đơn | Kiểm riêng | Có/Không | Ngoài chuỗi xử lý công cụ LiveKit |

**Quy trình một lượt đo nghiệp vụ (công cụ / hoàn thành việc):** mở trợ lý → chờ chào hai pha → đọc đúng câu kịch bản (hoặc diễn đạt ngắn giống cách tài xế nói) → ghi công cụ, trạng thái backend, câu TTS → lặp tối thiểu *N* lần (khuyến nghị N ≥ 10 khi báo cáo %; nếu ít hơn thì nêu rõ).

**Quy trình đo độ trễ:** lấy `user_stop_to_agent_speak` sau khi phiên ấm; tách *đường tắt* và *đường LLM* khi nhận diện được từ nhật ký.

**Quy trình đo WER:** cùng đoạn đọc cố định, hai điều kiện âm thanh (yên / nhiễu khoang xe giả lập).

## 6.4. Định nghĩa chỉ số và cách thu thập

### 6.4.1. Độ trễ phản hồi đầu cuối (RQ2)

**Định nghĩa vận hành:** thời gian từ lúc tài xế **kết thúc câu nói** (đang nói → đang nghe) đến lúc agent **bắt đầu phát âm** (agent → đang nói). Đây là độ trễ tài xế cảm nhận được khi đang lái, khớp NFR-P01 / RQ2.

Trong mã nguồn, chỉ số này do `turn_metrics` ghi dưới dạng **thời gian thực tế cảm nhận** `user_stop_to_agent_speak`; ngưỡng nội bộ **2 giây** đánh dấu chậm — cùng ý với P95 ≤ 2 giây. Tổng thời gian phát hiện hết câu (EOU) + thời gian đến token đầu LLM (TTFT) + thời gian đến âm thanh đầu TTS (TTFB) chỉ dùng phân tích nút nghẽn, không thay chỉ số thời gian thực tế cảm nhận.

**Báo cáo:** P50 và P95 (giây) theo nhóm UC / đường xử lý; tỷ lệ lượt ≥ 2s. Không dùng lần “làm nóng” mạng làm đại diện trải nghiệm lái xe.

### 6.4.2. Tỷ lệ lỗi từ — WER (RQ3)

\[
\mathrm{WER} = \frac{S + D + I}{N}
\]

với *S*, *D*, *I* lần lượt số từ thay thế, xóa, chèn; *N* số từ bản gốc. Hai điều kiện: (A) yên; (B) nhiễu khoang xe giả lập (ghi rõ nguồn nhiễu).

### 6.4.3. Độ đúng gọi công cụ (RQ4)

Một lượt **đúng công cụ** khi: (i) tên công cụ thuộc tập kỳ vọng UC; (ii) tham số then chốt đúng; (iii) không gọi thêm công cụ phá nghiệp vụ. Đường tắt (khớp ý định nói — `spoken_intent`) chấm cùng tiêu chí.

### 6.4.4. Hoàn thành nghiệp vụ (RQ4)

UC **thành công** khi thỏa Bảng 3.3. Thành công ≠ “nói trôi chảy”: TTS hay nhưng backend không đổi khi cần đổi → **thất bại**.

### 6.4.5. Trải nghiệm sử dụng theo ngữ cảnh lái xe (NFR-U01)

Không dùng thang SUS bắt buộc. Chấm **danh mục kiểm tra hành vi** trên cùng bản ghi UC (đạt/không đạt từng mục), ví dụ: câu TTS ngắn (một ý chính); không đọc địa chỉ/GPS dài khi không được hỏi; việc rủi ro có hỏi lại; tài xế hoàn thành việc mà không cần chạm màn hình trên kịch bản rảnh tay. Có thể bổ sung vài nhận xét định tính nếu có người đóng vai tài xế — mẫu nhỏ chỉ minh họa.

### 6.4.6. Luồng khách qua test case

“Khách có thể dùng” = các test case liên quan **đạt** (pytest và/hoặc kịch bản thoại): khởi tạo gọi đúng chế độ; bot phía khách không bịa thời gian đến / giá khi thiếu dữ liệu; ghi nhận yêu cầu khách đẩy về tài xế; chặn gọi nhầm số trùng tài xế… Không đo P95 khách như tiêu chí chính; nếu đo độ trễ khách thì báo riêng, không gộp vào P95 tài xế.

## 6.5. Kết quả độ trễ (RQ2)

**Bảng 6.3.** Độ trễ thời gian thực tế cảm nhận theo nhóm nghiệp vụ (giây)

| Nhóm / UC | Số lượt (n) | P50 | P95 | % lượt ≥ 2s | Đạt P95 ≤ 2s? |
|---|---|---|---|---|---|
| UC01 Xem lịch (ưu tiên đường tắt) | — | — | — | — | — |
| UC03 Cập nhật tiến độ | — | — | — | — | — |
| UC04 Gọi khách | — | — | — | — | — |
| UC07 FAQ | — | — | — | — | — |
| Gộp luồng cốt lõi (UC01+03+04+07) | — | — | — | — | — |

**Bảng 6.4.** So sánh đường xử lý (cùng môi trường)

| Đường | n | P50 | P95 | Nhận xét ngắn |
|---|---|---|---|---|
| Đường tắt (khớp ý định nói → TTS) | — | — | — | Kỳ vọng thấp hơn đường đủ |
| Đường đủ (LLM + công cụ) | — | — | — | |
| Trò chuyện nhẹ (không công cụ) | — | — | — | |

Khi có số: vẽ **Hình 6.1** (biểu đồ cột P50/P95 theo UC). Phân tích chậm gắn `room=` và tách HTTP công cụ khỏi LLM/TTS.

## 6.6. Kết quả WER (RQ3)

**Bảng 6.5.** WER theo điều kiện âm thanh

| Điều kiện | Số câu / số từ | WER trung bình | Ghi chú thiết lập |
|---|---|---|---|
| A — Yên tĩnh | — | — | |
| B — Nhiễu khoang xe giả lập | — | — | Mô tả nguồn nhiễu khi đo |
| Chênh lệch B − A (điểm phần trăm) | — | — | |

**Hình 6.2** (khi có số): so sánh WER A vs B.

## 6.7. Kết quả gọi công cụ và hoàn thành nghiệp vụ (RQ4)

**Bảng 6.6.** Độ đúng công cụ và hoàn thành UC

| UC | n | % đúng công cụ | % hoàn thành nghiệp vụ | Lỗi phổ biến (mã ngắn) |
|---|---|---|---|---|
| UC01 | — | — | — | — |
| UC02 | — | — | — | — |
| UC03 | — | — | — | — |
| UC04 | — | — | — | — |
| UC05 | — | — | — | — |
| UC06 | — | — | — | — |
| UC07 | — | — | — | — |
| UC08 | — | — | — | — |
| Trung bình có trọng số | — | — | — | — |

**Bảng 6.7.** Phân loại lỗi quan sát (điền sau khi chấm)

| Mã | Nhóm lỗi | Ví dụ | Tầng nghi ngờ |
|---|---|---|---|---|
| E-STT | Nghe sai từ khóa | “hủy” ↔ “gửi” | STT / ồn |
| E-INTENT | Đúng chữ nhưng chọn sai việc | Xem lịch → gọi khách | LLM / đường tắt |
| E-PARAM | Đúng công cụ, sai tham số | Nhầm chuyến | Ngữ cảnh / LLM |
| E-CONFIRM | Bỏ qua xác nhận hai bước | Hủy ngay một câu | Lời nhắc hệ thống / chính sách công cụ |
| E-API | Công cụ đúng nhưng HTTP lỗi | Hết thời gian chờ trip-service | Backend / mạng |
| E-UX | Việc xong nhưng câu nói khó nghe khi lái | Dài, nhiều số, địa chỉ nguyên văn | Lời nhắc TTS |

Kiểm riêng UC09–UC10: danh mục kiểm tra đạt/không đạt — chi tiết Phụ lục B.

## 6.8. Trải nghiệm sử dụng theo hành vi tài xế (NFR-U01)

**Bảng 6.8.** Danh mục kiểm tra trải nghiệm theo ngữ cảnh lái xe (điền đạt/không trên mẫu UC)

| STT | Tiêu chí (gắn hành vi thực tế) | UC gắn | Đạt? | Ghi chú |
|---|---|---|---|---|
| 1 | Hoàn thành việc cốt lõi không cần chạm màn hình (theo kịch bản) | UC01–UC04 | — | |
| 2 | Câu trả lời ngắn, một ý chính | UC01, UC03 | — | |
| 3 | Thao tác rủi ro có bước xác nhận | UC05, UC06 | — | |
| 4 | Không bịa chuyến / thu nhập / vị trí khi thiếu dữ liệu | UC01, UC08 | — | |
| 5 | Im lặng được nhắc rồi kết thúc lịch sự | UC09 | — | |

Trải nghiệm sử dụng ở đây là **quan sát hành vi hệ thống khớp cách tài xế làm việc**, không phải điểm trung bình khảo sát lớn.

## 6.9. Luồng khách hàng qua test case

**Bảng 6.9.** Kết quả test case phía khách (đạt / không đạt)

| Nhóm test case | Việc kiểm | Cách chạy | Kết quả |
|---|---|---|---|
| Gọi khách từ tài xế | Đúng chế độ; chặn tự gọi; không quay khi thiếu chuyến | pytest +/hoặc kịch bản UC04 | — |
| Agent / gọi nền nói với khách | Mở đầu đúng; không bịa thời gian đến/giá thiếu trường; tóm tắt về tài xế | Kịch bản custcall + kiểm thử liên quan | — |
| Ghi nhận yêu cầu khách | Chờ thêm / ghi chú được lưu và đẩy tóm tắt | kiểm thử `record_customer_request`… | — |
| FAQ cuộc gọi khách (nếu có) | Trả lời trong phạm vi playbook cuộc gọi | kiểm thử FAQ cuộc gọi | — |

Cách diễn giải: **đạt bộ test case** = chứng minh tích hợp “khách có thể được phục vụ bởi voice trong phạm vi đã thiết kế”. Không suy ra “khách hàng thật hài lòng trên đường”.

## 6.10. Danh mục kiểm tra bảo mật và chia sẻ vị trí

**Bảng 6.10.** Kiểm nhanh NFR-S (quan sát trên phiên thử / nhật ký đã che)

| STT | Kiểm tra | Kỳ vọng | Đạt? |
|---|---|---|---|
| 1 | TTS / chat không đọc số điện thoại đầy đủ khi không cần | Che hoặc rút gọn | — |
| 2 | Nhật ký phiên không chứa token LiveKit / mật khẩu | Chỉ `room=` và mã lỗi an toàn | — |
| 3 | Hỏi vị trí khách / điểm đón | Lấy từ API chuyến; thiếu thì nói chưa có — không bịa | — |
| 4 | Voice-agent không mở cơ sở dữ liệu trực tiếp | Chỉ HTTP tới trip-service | — (đối chiếu thiết kế Ch.4–5) |

## 6.11. Thảo luận theo câu hỏi nghiên cứu

**RQ1 (thiết kế–triển khai).** Nguyên mẫu: ứng dụng lấy token → phòng LiveKit → worker phân loại theo tên phòng → STT–(đường tắt|LLM+công cụ)–TTS → HTTP trip-service. Khớp hành vi tài xế: đường tắt cho câu quen thuộc; xác nhận hai bước cho việc rủi ro; chế độ gọi khách không hỏi lại mỗi lần nếu đã cấu hình.

**RQ2 (độ trễ — ưu tiên).** Sau Bảng 6.3–6.4: đối chiếu P95 với 2 giây. Nếu đường tắt đạt mà đường đủ vượt ngưỡng, thảo luận cách kết hợp hai đường. Phân tích chậm bằng nhật ký `room=` (HTTP vs LLM vs TTS).

**RQ3 (WER).** Sau Bảng 6.5: mức suy giảm khi ồn khoang xe giả lập; liên hệ giới hạn không huấn luyện lại STT.

**RQ4 (công cụ / nghiệp vụ + trải nghiệm sử dụng).** Sau Bảng 6.6–6.8: UC nào ổn định khi tài xế nói ngắn; lỗi E-CONFIRM/E-UX ảnh hưởng trực tiếp trải nghiệm rảnh tay.

**Khách hàng.** Bảng 6.9 chỉ kết luận mức “test case đạt”, gắn với phạm vi Ch.3 — không nâng thành nghiên cứu người dùng khách.

Tổng hợp tạm (trước khi có số): hệ thống **đã sẵn sàng đo** theo NFR/UC; kết luận “đạt ngưỡng” chỉ sau khi thay 「—」.

## 6.12. Hạn chế và yếu tố ảnh hưởng đến độ tin cậy của kết luận

Mục này nêu những điểm có thể làm kết quả thực nghiệm **trông tốt hơn (hoặc khác) so với thực tế vận hành**, cùng cách luận văn hạn chế ảnh hưởng đó.

**Kết quả trong phòng thử có thể “đẹp” hơn thực tế.** Người đọc kịch bản biết trước câu → dễ trôi hơn tài xế thật ứng biến. *Cách giảm thiểu:* thêm vài cách diễn đạt ngắn; ghi rõ tỷ lệ câu cố định so với câu tự do.

**Khó suy ra toàn bộ điều kiện thực tế.** Môi trường thử nghiệm và nhiễu giả lập không đại diện mọi khoang xe; đạt test case phía khách không đồng nghĩa khách thật trên đường dùng như vậy.

**Chỉ số đo không thay thế mọi khái niệm cần quan tâm.** Thời gian thực tế cảm nhận đo phản hồi thoại, không đo an toàn giao thông thực địa. Danh mục kiểm tra trải nghiệm sử dụng không thay điểm hài lòng dài hạn.

**Mẫu nhỏ làm suy yếu khẳng định thống kê.** Khi *n* nhỏ phải nêu rõ *n*; tránh kết luận tuyệt đối.

**Phụ thuộc nhà cung cấp STT/LLM/TTS.** Khóa cấu hình buổi đo ở Phụ lục D để người khác tái lập được.

**Thiên lệch người chấm.** Dùng rubric Bảng 6.7–6.8; nếu có thể thì hai người chấm độc lập.

Các hạn chế phạm vi Chương 1 vẫn giữ khi diễn giải kết quả.

## Kết luận chương

Chương 6 đã neo đánh giá vào **hành vi tài xế thực tế** (rảnh tay, câu ngắn, xác nhận rủi ro), đặt **độ trễ** lên trước, bổ sung danh mục kiểm tra trải nghiệm sử dụng, chứng minh phía khách bằng **test case**, và thêm danh mục kiểm tra bảo mật–vị trí. Việc điền số vào Bảng 6.3–6.6 (và 6.8–6.10) cùng Hình 6.1–6.2 là bước bắt buộc trước khi khẳng định RQ2–RQ4 bằng thực nghiệm.

---

## Self-review (Chương 6 — rà từ ngữ đúng nghĩa)

| Hạng mục | Kết quả |
|---|---|
| 6.12 đổi tên + viết lại đúng nghĩa (không “đe dọa tính hợp lệ”) | Đạt |
| wall clock / usability / inbound / cabin / vendor / Mitigation | Đã Việt hóa đúng nghĩa |
| Không bịa số | Đạt (ô 「—」) |
| Cần bổ sung số liệu | P0: đo + điền bảng |
