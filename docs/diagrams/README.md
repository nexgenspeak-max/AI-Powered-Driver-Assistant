# Hình vẽ luận văn (draw.io)

Nguồn: `gen_drawio.py` (sinh lại bằng `python3 docs/diagrams/gen_drawio.py`). Mỗi hình có hai bản: tiếng Việt (tên tệp không hậu tố, dùng trong luận văn) và tiếng Anh (hậu tố `_en`, dùng trong README gốc); bản dịch nằm trong bảng `EN` của script. Git chỉ theo dõi script, README và bản `_en`; bản tiếng Việt và luận văn (`docs/thesis/`) chỉ nằm trên máy (xem `.gitignore`). Sửa **nội dung** trong script rồi sinh lại; chỉnh **bố cục** tinh trên app.diagrams.net (File → Open from → Device).

| Tệp | Trang | Hình trong luận văn | PNG cần xuất (build tự chèn) |
|---|---|---|---|
| `H4_1_aws_architecture.drawio` | H4.1 Kiến trúc tổng thể | Hình 4.1 | `H4_1_aws_architecture.png` |
| | H4.2 Luồng hành vi: Tài xế | Hình 4.2 | `H4_1_aws_architecture_driver.png` |
| | H4.3 Luồng hành vi: Khách hàng | Hình 4.3 | `H4_1_aws_architecture_customer.png` |
| | H4.4 Luồng hành vi: Điều phối viên | Hình 4.4 | `H4_1_aws_architecture_dispatcher.png` |
| | H4.5 Luồng hành vi: Quản trị viên hệ thống | Hình 4.5 | `H4_1_aws_architecture_sysadmin.png` |
| `H4_sequences.drawio` | S1 Đăng nhập | Hình 4.6 | `H4_S1_identity_login.png` |
| | S2 Khởi tạo phiên | Hình 4.7 | `H4_S2_voice_session.png` |
| | S3 Một lượt hội thoại | Hình 4.8 | `H4_S3_voice_turn.png` |
| | S4 Mời nhận chuyến | Hình 4.9 | `H4_S4_trip_offer.png` |
| | S5 Gọi khách và SMS | Hình 4.10 | `H4_S5_customer_call.png` |
| | S6 Nhật ký cuộc gọi | Hình 4.11 | `H4_S6_call_records.png` |
| | S7 Báo cáo ngày | Hình 4.12 | `H4_S7_daily_report.png` |
| `H4_2_turn_pipeline.drawio` | H4.9 Một lượt hội thoại | Hình 4.13 | `H4_2_turn_pipeline.png` |

Xuất PNG: File → Export as → PNG, **Zoom 200%** (≈ 300 dpi khi in), bỏ chọn "Transparent background", lưu vào thư mục này với đúng tên ở cột cuối, rồi chạy `docs/thesis/.venv-docx/bin/python docs/thesis/build_thesis_final.py`.

Hoặc bằng draw.io desktop CLI (mỗi trang một lệnh, `N` bắt đầu từ 1):

```
/Applications/draw.io.app/Contents/MacOS/draw.io --export --format png --scale 2 --border 16 --page-index N -o H4_S1_identity_login.png H4_sequences.drawio
```

## Quy ước

- **Icon:** bộ AWS Architecture Icons của draw.io (`mxgraph.aws4.*`), màu theo nhóm dịch vụ AWS (Compute/Containers cam, Database tím hồng, Networking tím, Storage xanh lá, Management hồng, Security đỏ).
- **Nhóm AWS:** AWS Cloud → Region ap-southeast-1 → VPC → Public subnet (chỉ chứa tác nhân hội thoại trên Fargate). Lambda, API Gateway, DynamoDB, S3 ở cấp vùng, không gắn VPC — đúng `infra/`.
- **Lớp (cột, trái → phải):** Client · Real-time Communication & Conversational AI · API Gateway · Microservices · Data; dải Cross-cutting Concerns ở đáy; hộp xám nét đứt = hệ thống bên ngoài AWS. Mỗi Lambda cùng hàng với bảng DynamoDB của nó.
- **Nhãn:** tên chức năng tiếng Việt in đậm, tên kỹ thuật chữ nhỏ bên dưới (Phụ lục G).
- **Dịch vụ:** mỗi dịch vụ một khung nét đứt bao Lambda và bảng DynamoDB riêng của nó (database per service).
- **Luồng:** trang H4.1 (cấu trúc) vẽ mọi kết nối không số; các trang H4.2–H4.5 chỉ vẽ luồng của một nhóm người dùng, thành phần không liên quan được làm mờ, số ①–㉔ = Bảng 4.4; mỗi bước sequence ghi số luồng tương ứng; mũi tên nét đứt = luồng phụ trợ.
- **Sequence:** UML (lifeline, thông điệp đồng bộ mũi tên đặc, phản hồi nét đứt, khung `alt`/`opt`); nhãn thông điệp ngắn, chi tiết và ghi chú nằm ở cột "Ghi chú" của bảng bước. Bước và endpoint khớp Bảng 4.6–4.12 và Phụ lục F (tệp:dòng).
- **Truy vết:** mỗi hình khối có thuộc tính `service`, `layer`, `aws_resource`, `source` (Edit Data trên draw.io). `aws_resource` dùng quy ước tên mới (mục 12.1 kế hoạch); các stack SAM còn tên cũ sẽ khớp sau khi đổi tên hạ tầng.

- **Cỡ chữ theo khổ in (≥ 8 pt khi in):** Hình 4.1 in trên trang A4 ngang 24,7 × 14,5 cm, chữ 28 px (tên kỹ thuật 23 px, tên lớp 30 px); sequence in rộng 14,5 cm, cao tối đa 20 cm, chữ 23 px, khung ≤ 1130 px; Hình 4.9 chữ 22/19 px trên khung 1100 px. `check_layout.py` kiểm tra PRINT: chữ chính ≥ 8 pt, chữ phụ ≥ 6,5 pt.
- **Bố cục Hình 4.1:** nhãn Lambda bên trái icon để mũi tên tới bảng đi thẳng sang phải; mũi tên vào Lambda đi qua làn giữa hai hàng; nhãn mũi tên chỉ ghi số luồng (giao thức ở Bảng 4.4).
- **EventBridge Scheduler:** lịch 00:15 (Asia/Ho_Chi_Minh) kích hoạt dịch vụ giám sát lập báo cáo ngày (luồng ⑲).
- **ECS/ECR:** Cụm ECS (Amazon ECS) chạy tác vụ Fargate của tác nhân trong public subnet; Amazon ECR (cấp vùng, ngoài VPC) cung cấp image cho ECS.

## Kiểm tra bố cục

```
python3 docs/diagrams/check_layout.py docs/diagrams/*.drawio        # báo lỗi, exit 1 nếu có
python3 docs/diagrams/check_layout.py --svg <thư mục> docs/diagrams/*.drawio   # kèm ảnh xem trước
```

Script ước lượng khung icon, nhãn chữ, tiêu đề nhóm và đường đi của mũi tên (theo cổng và điểm gấp), báo: mũi tên cắt qua icon/nhãn/tiêu đề không liên quan (CROSS), hai mũi tên chạy chồng (OVERLAP), nhãn đè nhau (LABEL), nhãn mũi tên đè vật khác (ELABEL), chữ nhỏ hơn ngưỡng khi in theo đúng cách build đặt hình (PRINT). Kết quả hiện tại: **0 vấn đề trên cả 9 trang**, kể cả PRINT. Độ rộng chữ là ước lượng (Helvetica) nên vẫn cần duyệt bằng mắt trên app.diagrams.net trước khi xuất PNG.
