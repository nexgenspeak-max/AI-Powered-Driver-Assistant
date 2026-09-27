# Tài liệu vòng đời phần mềm — AI Voice Driver Assistant

Bộ tài liệu dự án AVDA, viết dạng độc lập (không phải văn luận văn), để chuyển sang **Confluence Pages** của project khi bật được quyền Confluence cho connector.

| Tệp | Nội dung |
|---|---|
| `01-dac-ta-yeu-cau-SRS.md` | Đặc tả yêu cầu phần mềm: FR, NFR, use case, phạm vi, tiêu chí nghiệm thu |
| `02-nghien-cuu-kha-thi.md` | Nghiên cứu khả thi: kỹ thuật / vận hành / kinh tế / pháp lý + rủi ro |
| `03-truy-vet-yeu-cau-jira.md` | Ma trận truy vết FR/UC ↔ Epic ↔ Ticket ↔ mã nguồn ↔ trạng thái |

## Cần bổ sung (từ các chương luận văn trong `../thesis/`, chỉ có trên máy, không đưa lên git)

- `04-tai-lieu-kien-truc-SAD.md` — rút từ Chương 4 (thiết kế hệ thống).
- `05-ke-hoach-kiem-thu.md` — rút từ Chương 3 §3.8 + Chương 6.
- `06-ke-hoach-trien-khai-van-hanh.md` — cấu hình môi trường, SIP trunk, biến môi trường, quy trình sự cố.

## Đưa lên Confluence

Cách 1 — bật quyền: trong Claude → cài đặt connector Atlassian (Rovo) → kết nối lại, cấp thêm scope Confluence; site cần có license Confluence + bật Pages cho project AVDA. Sau đó nội dung các tệp này tạo được thẳng vào Pages.

Cách 2 — thủ công: tạo page trong mục Pages của project AVDA rồi dán nội dung Markdown (Confluence nhận Markdown khi dán).
