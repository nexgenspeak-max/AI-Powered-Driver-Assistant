# Đặc tả Yêu cầu Phần mềm (SRS) — AI Voice Driver Assistant

- **Dự án:** AI Voice Driver Assistant (Jira: AVDA)
- **Phiên bản tài liệu:** 1.0 — 10/09/2026
- **Nguồn:** rút gọn từ luận văn Chương 1 & 3, đối chiếu mã nguồn `src/backend/llm-orchestrator`, `src/backend/external-api-service`, `src/frontend/driver-app`.
- **Trạng thái:** bản nền để chuyển sang Confluence Pages của project AVDA.

---

## 1. Giới thiệu

### 1.1. Mục đích
Tài liệu đặc tả yêu cầu chức năng (FR) và phi chức năng (NFR) cho trợ lý giọng nói dành cho tài xế xe công nghệ / giao hàng: nghe tiếng Việt (tiếng Anh bổ trợ), hiểu ý định, thực thi nghiệp vụ qua **gọi công cụ** (function calling) trên hệ quản lý chuyến đi, rồi phản hồi bằng giọng nói thời gian thực.

### 1.2. Phạm vi hệ thống
Trợ lý hoạt động trên hai cửa vào: **micro trong ứng dụng tài xế** (WebRTC) và **cuộc gọi điện thoại** khi hệ thống đề nghị chuyến (SIP). Thành phần phần mềm:

| Thành phần | Vai trò | Ràng buộc |
|---|---|---|
| `llm-orchestrator` (Python worker / LiveKit) | Nghe – hiểu – nói, chọn công cụ, gọi HTTP | Không truy cập CSDL trực tiếp |
| `external-api-service` | Nguồn sự thật nghiệp vụ: chuyến, ngữ cảnh, token thoại, gọi/SMS, đơn giao hàng | — |
| `identity-service` | Đăng nhập, cấu hình người dùng (JWT) | — |
| `external-channel-service` / `call-records-service` | Quay số ra, lưu vết / tóm tắt cuộc gọi | — |
| `driver-app` | Giao diện, lấy token thoại, wake-word, tham gia phòng LiveKit | Không tự bịa dữ liệu chuyến |
| LiveKit | Truyền âm thanh thời gian thực; SIP khi cần | Phân biệt kênh trong ứng dụng / điện thoại |

### 1.3. Người dùng
- **Tài xế** — người dùng chính, đối tượng đánh giá trọng tâm.
- **Khách hàng** — luồng thoại riêng (đặt chuyến, theo dõi, để bot gọi thay tài xế); chấp nhận qua bộ test case.
- **Điều phối / quản trị** — tạo chuyến thử, theo dõi cuộc gọi trên bảng quản trị.
- **Vận hành kỹ thuật** — giám sát qua lớp ops.

---

## 2. Yêu cầu chức năng

Mỗi FR kèm điều kiện chấp nhận quan sát được. Cột **Epic** trỏ tới Epic Jira chịu trách nhiệm (xem `03-truy-vet-yeu-cau-jira.md`).

### 2.1. Nhóm chuyến đi (FR-T)

| Mã | Việc tài xế muốn | Hệ thống phải | Điều kiện chấp nhận | Epic |
|---|---|---|---|---|
| FR-T01 | "Hôm nay còn chuyến nào?" | Đọc lịch / chuyến sắp tới từ ngữ cảnh hoặc API | Nêu đúng dữ liệu; không bịa chuyến | AVDA-1, AVDA-2 |
| FR-T02 | "Chuyến hiện tại thế nào?" | Nêu điểm đón/trả, trạng thái | Thiếu dữ liệu thì nói thiếu, không đoán | AVDA-1 |
| FR-T03 | "Đã đón khách / cập nhật tiến độ" | Đổi trạng thái qua backend khi đủ điều kiện | Xác nhận lại bằng lời ngắn | AVDA-1 |
| FR-T04 | Nhận / từ chối chuyến mới | Đúng công cụ nhận hoặc từ chối | Không nhầm với hủy chuyến đang chạy | AVDA-1 |
| FR-T05 | "Hủy chuyến này" | Hai bước: hỏi chắc rồi mới hủy | Không hủy vì một câu mơ hồ | AVDA-9 |

### 2.2. Nhóm liên lạc khách (FR-C)

| Mã | Việc | Hệ thống phải | Điều kiện chấp nhận | Epic |
|---|---|---|---|---|
| FR-C01 | "Gọi khách giúp" | Gọi theo chế độ agent / nói trực tiếp (bridge) / gọi nền | Đúng khách của chuyến; tôn trọng mặc định + lời nói rõ khác mặc định | AVDA-4 |
| FR-C02 | Gọi số khác / danh bạ | Hỏi xác nhận rồi mới quay | Có bước xác nhận rõ | AVDA-4 |
| FR-C03 | Nhắn SMS | Gửi qua backend khi được hỗ trợ | Báo thành công / thất bại ngắn | AVDA-1 |
| FR-C04 | "Khách đang ở đâu / xác nhận với khách" | Dùng API vị trí / xác nhận nếu có | Không bịa vị trí | AVDA-2 |
| FR-C05 | "Gọi xong chưa? Tóm tắt cuộc gọi" | Đọc trạng thái / tóm tắt từ nhật ký | Không có dữ liệu thì nói chưa có | AVDA-4 |

### 2.3. Chờ đón, sự cố, thu nhập, FAQ, ngôn ngữ

| Mã | Việc | Yêu cầu cốt lõi | Epic |
|---|---|---|---|
| FR-W01 | Đặt nhắc | Tạo nhắc và đọc lại thời điểm | AVDA-1 |
| FR-W02 | "Cho thêm vài phút chờ" | Gia hạn chờ qua backend | AVDA-4 |
| FR-I01 | "Khách không ra" | Gợi ý chờ / gọi nếu hợp lý; báo sau xác nhận | AVDA-1 |
| FR-I02 | Báo sự cố | Hỏi loại sự cố; ghi nhận; không xử lý tranh chấp pháp lý / thanh toán | AVDA-1 |
| FR-E01–E03 | Thu nhập / thống kê / bật–tắt nhận chuyến | Lấy số từ API; thiếu thì nói chưa có | AVDA-5 |
| FR-F01–F02 | Hỏi cách dùng ứng dụng | Ưu tiên FAQ / tri thức; ngoài phạm vi thì từ chối đúng cách | AVDA-5 |
| FR-L01–L03 | Tiếng Việt / Anh; tắt trợ lý; đúng kiểu phiên | Hành vi công cụ tương đương; không trộn công cụ phiên trong ứng dụng với phiên đề nghị chuyến qua điện thoại | AVDA-6 |

### 2.4. Ngoài lượt thoại (FR-D)

| Mã | Việc | Cách vận hành | Epic |
|---|---|---|---|
| FR-D01 | Chụp / chọn ảnh đơn → lấy thông tin | Ứng dụng gọi API quét ảnh (vision sidecar); tài xế xem lại rồi mới lưu | AVDA-2 |
| FR-D02 | Gọi trợ lý bằng từ khóa | Wake-word trên máy → mở cùng luồng lấy token + vào phòng | AVDA-6 |
| FR-D03 | Kết thúc nói trực tiếp với khách | Trong chế độ bridge, dùng cụm từ kết thúc ("Trợ lý kết thúc") | AVDA-4 |

---

## 3. Yêu cầu phi chức năng (NFR)

| Mã | Yêu cầu | Cách hiểu thực tiễn |
|---|---|---|
| NFR-P01 | P95 độ trễ ≤ 2 giây trên việc cốt lõi | Tài xế dứt câu → nghe bot nói lại trong khoảng chấp nhận được khi đang lái |
| NFR-P02 | Việc quen thuộc nhanh hơn đường đầy đủ | "Xem lịch", "nhận chuyến", "ok" không cần vòng suy luận dài |
| NFR-P03 | Nạp ngữ cảnh lúc vào phiên | Câu hỏi đầu về lịch/chuyến không phải tải lại từ đầu |
| NFR-R01 | Không bịa dữ liệu chuyến / thu nhập / cuộc gọi | Sai thì nhận thiếu dữ liệu |
| NFR-R02 | Thao tác rủi ro phải hỏi lại | Hủy chuyến, khách không ra, gọi số lạ |
| NFR-R03 | Câu trả lời ngắn trên loa | Một ý chính mỗi lượt khi có thể |
| NFR-L01 | Việt / Anh cùng năng lực công cụ | Đổi ngôn ngữ phiên, không mất công cụ |
| NFR-O01 | Lỗi lần theo được theo phiên | Nhật ký gắn mã phòng (`{service} {fn} room= conv=`) |
| NFR-S01–S02 | Hạn chế lộ số điện thoại / token trên loa và nhật ký; llm-orchestrator chỉ gọi HTTP | Bảo vệ riêng tư và biên dịch vụ |
| NFR-S03 | Vị trí / điểm đón chỉ nói mức đủ dùng; không bịa tọa độ | Chia sẻ vị trí theo API chuyến |
| NFR-U01 | Trải nghiệm theo ngữ cảnh lái xe | Trả lời ngắn; việc quen ít bước; xác nhận trước hành động phá hủy |
| NFR-B01 | Hành vi im lặng | Nhắc khi im ~15s, tối đa 2 lần rồi kết thúc lịch sự |

---

## 4. Use case chính

| Mã | Tình huống | Thành công khi | Ngoại lệ phải xử lý |
|---|---|---|---|
| UC01 | Xem lịch chuyến trong ứng dụng | Nêu đúng danh sách từ ngữ cảnh / API | Ngữ cảnh trống → nói chưa có chuyến / nhờ làm mới |
| UC02 | Gọi điện đề nghị chuyến → nhận / từ chối | Cập nhật đúng quyết định | Không nghe rõ → hỏi lại; API lỗi → báo không cập nhật được |
| UC03 | Cập nhật tiến độ | Trạng thái mới được xác nhận | Không đủ điều kiện nghiệp vụ → giải thích ngắn |
| UC04 | Gọi khách (1 trong 3 chế độ) | Cuộc gọi khởi tạo đúng chế độ | Đang có cuộc gọi → không mở thêm; lỗi quay số → báo rõ |
| UC05 | Hủy chuyến hai bước | Chỉ hủy sau "đồng ý" | "Không" → hủy thao tác, giữ chuyến |
| UC06 | Báo khách không ra / sự cố | Ghi nhận sau xác nhận | Không bịa quy định bồi thường |
| UC07 | Hỏi FAQ | Trả lời theo playbook | Ngoài phạm vi → hướng kênh phù hợp |
| UC08 | Thu nhập / online–offline | Đúng số liệu hoặc trạng thái API | Thiếu API → nói chưa có dữ liệu |
| UC09 | Im lặng lâu / API lỗi giữa chừng | Hỏi còn đó không / báo lỗi ngắn, không sập phiên | Không bịa chuyến |
| UC10 | Wake-word mở trợ lý | Vào phiên trong ứng dụng bình thường | Không nhận từ khóa → vẫn bấm mic được |

---

## 5. Trong / ngoài phạm vi

**Trong phạm vi:** toàn bộ FR/NFR trên — kênh trong ứng dụng và gọi điện khi cần, FAQ, quét đơn, wake-word.

**Ngoài phạm vi:** nhắn tin nhóm tài xế (Epic AVDA-3 — chưa triển khai); chỉ đường rẽ từng bước thay Google Maps/Waze; tranh chấp thanh toán – hoàn tiền – bảo hiểm; đổi hồ sơ / biển số bằng giọng nói; quên mật khẩu; thao tác ứng dụng hãng khác; huấn luyện lại mô hình STT/LLM/TTS quy mô lớn.

---

## 6. Tiêu chí nghiệm thu (chuyển sang giai đoạn đánh giá)

| Nhóm | Đo bằng | Use case ưu tiên |
|---|---|---|
| Chuyến + gọi khách | Đúng công cụ; xong việc; checklist trải nghiệm khi lái | UC01–UC06 |
| FAQ | Đúng FAQ; không bịa chính sách | UC07 |
| Độ trễ (ưu tiên cao nhất) | P95 ≤ 2s | UC01, UC03, UC04, UC07 |
| Nghe trong ồn | WER yên tĩnh vs nhiễu | Mẫu đọc cố định |
| Luồng khách | Đạt / không đạt test case | TC gọi khách / ghi nhận yêu cầu |
| Bảo mật & vị trí | Checklist NFR-S | UC vị trí, gọi, nhật ký |
| Wake-word / quét đơn | Kiểm riêng | UC10; kịch bản ảnh đơn |
| Im lặng / lỗi API | Hành vi an toàn | UC09 |
