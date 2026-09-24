# Báo cáo trạng thái luận văn + checklist ảnh / nội dung còn thiếu

**File chính:** `Assignment/LUAN_VAN_THAC_SI_FINAL.docx`  
**Nguồn MD:** `Chuong1` … `Chuong6_*.md`  
**Ngày:** 2026-09-05  

---

## 1. Đã hoàn thành

| Phần | Nội dung chính |
|---|---|
| Stylesheet | TNR 13 / H1 15 đậm / giãn 1.5 / lề 2.5·3.5·2 / chữ đen / justify — đã khóa trong build |
| Ch.1 Giới thiệu | Bối cảnh, bài toán, mục tiêu, RQ1–4, P95 ≤ 2s, phạm vi, Bảng 1.1 |
| Ch.2 Cơ sở lý thuyết | STT–LLM–TTS, tool calling, WebRTC/SIP, AI gọi xe, an toàn, Bảng 2.1, khoảng trống; 8 cite verified |
| Ch.3 Phân tích yêu cầu | Actors, FR/NFR, UC01–UC10, ~39 tools, OOS (không group chat), Bảng 3.1–3.4 |
| Ch.4 Thiết kế | Kiến trúc, pipeline, sequence, context, tool↔API; Hình 4.1–4.2 |
| Ch.5 Triển khai | Stack, monorepo, llm-orchestrator, backend, app, module; Bảng 5.1–5.4 |
| Ch.6 Thực nghiệm | Method + định nghĩa chỉ số + bảng kết quả (ô — chờ số) + threats; Bảng 6.1–6.7 |
| Phần đầu | Bìa (từ gốc) + Tóm tắt VI + cảm ơn + TOC field + danh sách bảng/hình |
| Phụ lục | Khung A–D (chưa điền) |

**Không làm:** trộn chương cũ vào FINAL; bịa số đo Ch.6; chụp Simulator (bạn tự thêm ảnh sau).

---

## 2. Chưa viết (thứ tự tiếp)

1. **Kết luận & hướng phát triển** (viết chắc sau khi có số Ch.6; có thể khung tạm)  
2. **Abstract tiếng Anh** (nếu FSB/GVHD yêu cầu)  
3. **Danh mục viết tắt**  
4. **Điền Phụ lục A–D** + cập nhật Tóm tắt sau khi có số liệu Ch.6  
5. Word: chuột phải Mục lục → **Update Field**  
6. **Điền số** vào Bảng 6.3–6.6 + Hình 6.1–6.2
---

## 3. Ảnh cần bạn thêm (chú thích đề xuất)

Ưu tiên chụp **portrait**, theme **light**, che SĐT khách đầy đủ / PII. Đặt vào `Assignment/thesis_screenshots/` (ví dụ `H5_1_landing.png`).

### 3.1. Sơ đồ (có thể vẽ, không cần app)

| Mã hình | Chú thích đề xuất | Ghi chú |
|---|---|---|
| **Hình 4.1** | Sơ đồ kiến trúc tổng thể hệ thống trợ lý giọng nói và nền tảng tích hợp | FigJam / draw.io — agent vẽ giúp được nếu bạn muốn |
| **Hình 4.2** | Chuỗi xử lý hội thoại một đường + câu giữ chỗ | Khối STT → LLM kèm công cụ → TTS (+ filler ≈ 2s) |

### 3.2. Ảnh ứng dụng tài xế (bạn chụp)

| Mã hình | Chú thích đề xuất | Màn hình cần chụp |
|---|---|---|
| **Hình 5.1** | Màn hình chào (landing) ứng dụng Czen Driver | Auth landing — brand + CTA Đăng nhập |
| **Hình 5.2** | Màn hình đăng nhập tài xế | Form SĐT + mật khẩu |
| **Hình 5.3** | Màn hình trang chủ sau đăng nhập | Dashboard / tab Trang chủ |
| **Hình 5.4** | Nút/orb trợ lý AI ở trạng thái chờ (idle) | Tab Trợ lý — chưa kết nối |
| **Hình 5.5** | Phiên trợ lý đang lắng nghe hoặc đang nói | Orb + sóng / trạng thái connected |
| **Hình 5.6** | Hội thoại mẫu — tra cứu lịch hoặc xác nhận chuyến | Bubble chat + nội dung nghiệp vụ |
| **Hình 5.7** | Cài đặt chế độ gọi khách mặc định | Assistant settings (agent / bridge) |
| **Hình 5.8** | Kích hoạt rảnh tay (wake-word), nếu UI có | Settings hoặc màn hướng dẫn |

### 3.3. Tuỳ chọn

| Mã hình | Chú thích đề xuất | Khi nào cần |
|---|---|---|
| **Hình 5.9** | Giao diện quản trị tạo chuyến thử nghiệm | Demo end-to-end |
| **Hình 6.1+** | Biểu đồ độ trễ / WER / tỷ lệ hoàn thành tác vụ | Sau khi có số liệu Ch.6 |

Ảnh đưa vào **thân Ch.5** (2–4 hình tiêu biểu) + phần còn lại **Phụ lục C**.

---

## 4. Nội dung / số liệu cần bổ sung (không phải ảnh)

### Chương 6 (bắt buộc để “đóng” luận văn)

| Hạng mục | Cần gì | Ngưỡng / ghi chú |
|---|---|---|
| Latency | P50, P95 (speech-end → first audio) trên UC cốt lõi | Định hướng **P95 ≤ 2s** |
| WER | Cùng đoạn đọc: yên tĩnh vs nhiễu khoang xe giả lập | So sánh tương đối + mô tả điều kiện đo |
| Tool-call accuracy | % chọn đúng tool + tham số | Theo nhóm UC01–UC08 |
| Task success | % hoàn thành nghiệp vụ end-to-end | Có/không confirm đúng quy trình |
| Log mẫu | Vài phiên `room=…` (che PII) | Phụ lục hoặc minh họa thảo luận |
| Hạn chế / độ tin cậy kết luận | Mẫu nhỏ, phòng thử vs đường thật, nhà cung cấp STT… | Mục 6.12 |

### Phụ lục

| Phụ lục | Nội dung cần điền |
|---|---|
| **A** | Bảng đầy đủ ~39 tool (tên + mô tả ngắn) — export từ code |
| **B** | Kịch bản hội thoại chi tiết (từng lượt thoại) cho UC chính |
| **C** | Ảnh UI + chú thích Hình 5.x |
| **D** | Cấu hình môi trường mẫu (**không** secret/token/.env thật) |

### Phần đầu còn mỏng

- Abstract **EN**  
- Danh mục **từ viết tắt** (STT, TTS, LLM, SIP, WER, P95…)  
- Danh sách hình (cập nhật khi có ảnh)  
- (Nếu có) lời cam đoan theo mẫu FSB  

---

## 5. Việc agent có thể làm tiếp (không cần ảnh)

- Viết **Ch.5** và khung **Ch.6** (method + bảng trống chờ số)  
- Sinh **Phụ lục A** (danh mục tool từ code)  
- Vẽ **Hình 4.1 / 4.2** (FigJam) rồi chèn DOCX  
- Khi bạn gửi ảnh/file số liệu → chèn chú thích + rebuild FINAL  

---

## 6. Ghi chú bảo mật

Tài khoản demo dùng lúc thử Simulator **không** lưu trong luận văn / git / Second Brain. Nên đổi mật khẩu nếu tài khoản đó dùng ngoài máy local.
