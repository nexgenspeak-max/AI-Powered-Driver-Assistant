#!/usr/bin/env python3
"""Build docs/thesis/LUAN_VAN_THAC_SI_FINAL.docx — clean thesis, no old chapters mixed in.

Stylesheet locked (chuẩn thực tế VN kiểu UIT/UEH — thesis_mse_docx_rules):
  A4; TNR Unicode; body 13 black justify 1.5; H1 15 bold center; H2/H3 13 bold;
  caption 12 bold; table 11; margins T/B 2.5 L 3.5 R 2 cm; refs/table line 1.0;
  TOC field; bordered tables; cite→bookmark hyperlinks.
"""
from __future__ import annotations

import re
import shutil
import os
import tempfile
from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor, Inches
from docx.text.paragraph import Paragraph

try:
    from PIL import Image as _PILImage
except Exception:  # pragma: no cover - Pillow optional
    _PILImage = None

ROOT = Path(__file__).resolve().parent

# Max drawn size for an embedded figure (fits A4 text area after locked margins)
FIG_MAX_W_CM = 14.5
FIG_MAX_H_CM = 16.0


def clean_inline(text: str) -> str:
    """Strip leftover Markdown inline syntax so it doesn't show up literally in the DOCX.

    Removes bold/italic asterisks and inline-code backticks; a leading blockquote
    marker is handled by the caller. Emphasis is dropped (single run per paragraph),
    but quoted text keeps its surrounding quotation marks.
    """
    return text.replace("**", "").replace("*", "").replace("`", "")


def figure_width_cm(img_path: Path, max_w: float = FIG_MAX_W_CM, max_h: float = FIG_MAX_H_CM) -> float:
    """Pick a draw width so portrait phone screenshots don't overflow the page."""
    if _PILImage is None:
        return 12.0
    try:
        with _PILImage.open(img_path) as im:
            w, h = im.size
    except Exception:
        return 12.0
    if not w or not h:
        return 12.0
    aspect = w / h
    width = min(max_w, aspect * max_h)
    return round(width, 2)


CONCLUSION_PARAS = [
    "Luận văn đã thực hiện trọn chu trình nghiên cứu khoa học thiết kế cho một trợ lý AI bằng giọng nói hỗ trợ tài xế xe công nghệ: xác định yêu cầu theo bốn nhóm người sử dụng (tài xế, khách hàng, điều phối viên, quản trị viên hệ thống), lập luận kiến trúc từ năm yêu cầu phi chức năng qua các chiến thuật kiến trúc, hiện thực nguyên mẫu hoạt động trên WebRTC và SIP, và đánh giá theo 19 tiêu chí chấp nhận.",
    "Trả lời các câu hỏi nghiên cứu:",
    "- RQ1: Kiến trúc microservices đáp ứng khả năng phục hồi ở mức thành phần: 200/200 lượt tiêm lỗi vào dịch vụ phụ trợ, API nghiệp vụ, kênh tin nhắn, kênh thoại và nhà cung cấp LLM đều không làm hỏng luồng hội thoại; khi dừng một bản sao tác nhân, phiên mới được bản sao khác phục vụ ngay nhưng phiên đang chạy trên bản sao đó bị mất. Trong môi trường mô phỏng, độ trễ phản hồi không tăng khi số phiên đồng thời tăng từ 1 lên 40, thêm bản sao rút ngắn thời gian tác nhân vào phiên, và bộ nhớ (khoảng 225 MB mỗi phiên) là tài nguyên giới hạn.",
    "- RQ2: Luồng xử lý qua LLM có P95 độ trễ phản hồi 3,75 giây, không đạt ngưỡng 2 giây; thành phần chi phối là thời gian mô hình ngôn ngữ sinh token đầu.",
    "- RQ3: Tỷ lệ lỗi từ tăng từ 3,1% lên 7,3% khi có nhiễu mô phỏng khoang xe (một người đọc, 22 câu).",
    "- RQ4: Khoảng 88% lượt chọn đúng công cụ và 77% hoàn thành ngay lần đầu (n ≈ 39); lỗi chủ yếu do phát ngôn không rõ ý định và sai phạm vi tham số.",
    "Đóng góp chính của luận văn là một kiến trúc tham chiếu có lập luận từ yêu cầu phi chức năng, một nguyên mẫu mã nguồn công khai, một khung đánh giá gắn với tiêu chí chấp nhận, và bằng chứng thực nghiệm rằng với chuỗi xử lý theo tầng, độ trễ phản hồi bị chi phối bởi mô hình ngôn ngữ bên ngoài chứ không bởi cách chia dịch vụ.",
    "Hạn chế và hướng phát triển tương ứng:",
    "- Độ trễ chưa đạt ngưỡng (NFR-02): đo lại thiết kế hiện hành với ít nhất 200 lượt; thử mô hình có thời gian sinh token đầu thấp hơn, rút gọn lời nhắc hệ thống, giảm số vòng gọi công cụ.",
    "- Khả năng mở rộng mới đo trong môi trường mô phỏng (NFR-03): lặp lại SC-01, SC-02 trên LiveKit Cloud và Fargate với nhà cung cấp AI thật; đặt chính sách tự mở rộng theo bộ nhớ hoặc số phiên, vì mỗi phiên tốn khoảng 225 MB.",
    "- Lỗi dạng treo làm tài xế chờ 6–8 giây và phiên đang chạy bị mất khi bản sao tác nhân dừng (NFR-04): rút ngắn thời gian chờ cho các thao tác đọc, kết hợp câu đệm có nội dung cụ thể; giữ tối thiểu hai bản sao, cho ứng dụng tự xin token lại khi tác nhân không vào phòng, và đo đường khôi phục này đầu cuối.",
    "- Hai lỗi hiện thực phát hiện khi đánh giá (nhật ký chứa số điện thoại đầy đủ, một câu báo lỗi chứa thông tin kỹ thuật) đã được sửa trong bộ định dạng nhật ký dùng chung và các công cụ gọi điện, và đạt khi kiểm tra lại (Bảng 6.10, Bảng 6.14); việc còn lại là xóa các tệp nhật ký cũ ghi trước ngày sửa và đưa phép quét nhật ký vào quy trình kiểm thử tự động.",
    "- Hệ thống chưa chạy trên kiến trúc AWS đầy đủ (mục 5.6.1): triển khai các stack bằng infra/deploy-all.sh, đo lại độ trễ và khả năng phục hồi trên Lambda, API Gateway và Fargate.",
    "- Cỡ mẫu nhỏ và một người chấm (RQ3, RQ4): mở rộng bộ câu tham chiếu với nhiều người đọc và nhiều mức nhiễu; chấm độ chính xác gọi công cụ bởi hai người độc lập và báo cáo hệ số đồng thuận.",
    "- SMS chưa giao được tới thuê bao Việt Nam (AC-11 mới đạt ở mức kiểm thử): đăng ký tên người gửi và mẫu tin với nhà mạng qua Twilio rồi đặt TWILIO_SMS_FROM, sau đó gửi thử thật và đo tỷ lệ giao tin qua báo cáo trạng thái; trong thời gian chờ, có thể thay SMS bằng cuộc gọi tự động đọc nội dung tin nhắn cho khách qua kênh thoại sẵn có.",
    "- Chưa có nghiên cứu người dùng: thử nghiệm có kiểm soát với tài xế trên kịch bản lái mô phỏng, đo thời gian tác vụ, số lần nhìn màn hình và tải nhận thức.",
]

APPENDIX_A_INTRO = (
    "Bảng A.1 liệt kê 45 công cụ (function tool) của gói ngôn ngữ tiếng Việt: 39 công cụ cho phiên tài xế "
    "trong ứng dụng (trong đó confirm_trip và reject_trip cũng là tập công cụ của phiên mời nhận chuyến) và "
    "7 công cụ cho phiên của ứng dụng khách hàng (answer_app_faq dùng chung; phiên này có trong mã nguồn nhưng ngoài phạm vi luận văn, mục 3.5). Gói tiếng Anh có cùng 39 công cụ cho tài xế. "
    "Mô tả rút gọn từ lược đồ công cụ trong mã nguồn (voicebot/locales/vn/tools_definition.py)."
)

APPENDIX_A_TOOLS = [
    ("check_upcoming_trips", "Đếm/liệt kê chuyến theo phạm vi; mặc định chỉ nói số chuyến rồi hỏi chi tiết chuyến nào."),
    ("create_walkup_trip", "Tài xế tạo chuyến cho khách vãng lai; chuyến được tạo ở trạng thái đã xác nhận."),
    ("refresh_latest_data", "Lấy dữ liệu trực tiếp cho chủ đề vừa trả lời (lịch, thu nhập, chuyến hiện tại…)."),
    ("get_current_trip_info", "Thông tin chuyến đang chạy: khách, số điện thoại, điểm đón – trả, giá, thời gian dự kiến, trạng thái."),
    ("suggest_next_stop", "Gợi ý nên đón/trả khách nào tiếp theo dựa trên vị trí tài xế và toàn bộ lịch trình."),
    ("get_optimal_route", "Thứ tự tối ưu để ghé tất cả các điểm đón/trả đang chờ theo khoảng cách đường bộ thực tế."),
    ("get_trip_traffic", "Tình trạng giao thông trên chuyến: kẹt xe, thời gian dự kiến, tuyến đường."),
    ("update_trip_status", "Cập nhật tiến độ của chuyến đã nhận (không dùng để nhận chuyến mới)."),
    ("call_customer", "Gọi khách của một chuyến."),
    ("call_custom_number", "Bước 1: gọi tới một số điện thoại bất kỳ do tài xế đọc ra (không phải khách của chuyến)."),
    ("confirm_call_custom_number", "Bước 2: thực hiện gọi số tự do sau khi tài xế xác nhận đúng số."),
    ("find_contact", "Bước 1: tìm người trong danh bạ của tài xế theo tên để gọi."),
    ("select_contact_match", "Chọn đúng người khi danh bạ trả về nhiều kết quả trùng tên."),
    ("confirm_contact_call", "Bước cuối: gọi thật tới người trong danh bạ đã xác nhận."),
    ("send_sms_to_customer", "Gửi SMS nội dung tự do cho khách của chuyến đang hoạt động."),
    ("send_sms_to_custom_number", "Bước 1: gửi SMS tới một số bất kỳ do tài xế đọc ra."),
    ("confirm_send_sms_to_custom_number", "Bước 2: gửi SMS tới số tự do sau khi tài xế xác nhận số và nội dung."),
    ("find_contact_to_message", "Bước 1: tìm người trong danh bạ theo tên để nhắn tin."),
    ("select_contact_match_for_sms", "Chọn đúng người khi tìm danh bạ để nhắn tin trả về nhiều kết quả."),
    ("confirm_send_sms_to_contact", "Bước cuối: gửi tin nhắn thật tới người trong danh bạ đã xác nhận."),
    ("get_customer_location", "Lấy địa điểm đón khách hiện tại."),
    ("confirm_trip_with_customer", "Gửi SMS xác nhận chuyến đi cho khách."),
    ("summarize_last_call", "Lấy và đọc tóm tắt cuộc gọi với khách."),
    ("check_customer_call_status", "Kiểm tra cuộc gọi khách chạy nền còn đang diễn ra không."),
    ("create_reminder", "Đặt nhắc nhở tự động trước giờ đón khách."),
    ("request_cancel_trip", "Bước 1: hỏi xác nhận trước khi hủy chuyến đang hoạt động."),
    ("confirm_cancel_trip", "Bước 2: thực hiện hủy chuyến sau khi tài xế xác nhận."),
    ("get_today_earnings", "Xem tổng thu nhập hôm nay: doanh thu, số chuyến, thưởng, giờ online."),
    ("get_earnings_summary", "Xem thu nhập theo tuần (7 ngày) hoặc tháng (30 ngày)."),
    ("check_trip_history", "Xem chuyến đã hoàn thành hoặc bị hủy trong hôm nay."),
    ("get_driver_stats", "Xem thống kê tài xế: điểm đánh giá, tỷ lệ nhận, tỷ lệ hoàn thành, tổng số chuyến."),
    ("report_customer_no_show", "Báo cáo khách không xuất hiện tại điểm đón."),
    ("report_trip_issue", "Báo cáo sự cố trong chuyến: hành vi không phù hợp, hư hỏng xe, địa chỉ sai…"),
    ("extend_wait_time", "Yêu cầu thêm thời gian chờ khách tại điểm đón."),
    ("set_driver_status", "Chuyển trạng thái tài xế: online (nhận chuyến) hoặc offline (nghỉ)."),
    ("confirm_trip", "Xác nhận nhận một chuyến đi mới (đang chờ/thông báo, chưa nhận)."),
    ("reject_trip", "Từ chối một chuyến đi mới chưa nhận."),
    ("book_trip", "Đặt một chuyến xe mới cho khách (luồng khách)."),
    ("get_my_trip", "Lấy thông tin chuyến hiện tại của khách: trạng thái, tài xế, thời gian dự kiến, địa chỉ."),
    ("request_cancel_my_trip", "Bước 1: hỏi xác nhận trước khi hủy chuyến của khách."),
    ("confirm_cancel_my_trip", "Bước 2: thực hiện hủy chuyến sau khi khách xác nhận."),
    ("get_driver_eta", "Lấy thời gian dự kiến tài xế đến và vị trí tài xế (luồng khách)."),
    ("call_driver", "Kết nối trực tiếp khách với tài xế qua điện thoại."),
    ("answer_app_faq", "Tra cứu sổ tay hướng dẫn ứng dụng để trả lời câu hỏi tính năng / cách dùng / quy trình."),
    ("end_conversation", "Chủ động kết thúc cuộc gọi với trợ lý theo yêu cầu tài xế."),
]

APPENDIX_B_INTRO = (
    "Phụ lục này trích một số lượt thoại thực tế từ nhật ký phiên (đã che thông tin định danh), "
    "minh họa một đường STT → LLM kèm công cụ → TTS cho câu quen thuộc, xử lý im lặng và kết "
    "thúc phiên lịch sự. Nhãn thời gian là độ trễ cảm nhận (user_stop_to_agent_speak); khi "
    "phản hồi chậm khoảng từ hai giây, hệ thống có thể xen câu giữ chỗ ngắn trước câu trả lời thật."
)

APPENDIX_B_DIALOGUES = [
    (
        "Kịch bản B.1 — Tra cứu lịch trình và thông tin chuyến (phiên trong ứng dụng, 2026-09-06)",
        [
            "Trợ lý: Chào bạn, tôi là Czen, trợ lý AI của bạn.",
            "Trợ lý: Tôi có thể giúp gì cho bạn?",
            "Tài xế: Tôi muốn kiểm tra lịch trình hôm nay.  [LLM + công cụ — check_upcoming_trips]",
            "Trợ lý: Bạn có 11 chuyến sắp tới.",
            "Tài xế: Chuyến đầu tiên đi đâu?  [LLM + FollowUpKnowledge — 3,4 giây]",
            "Trợ lý: Chuyến đầu tiên đón tại Mỹ Đình và trả ở Đông Anh.",
            "Tài xế: Đón người khách tên là gì?  [LLM + FollowUpKnowledge — 2,1 giây]",
            "Trợ lý: Khách tên là Khách Mỹ Đình.",
            "Tài xế: Ok, cảm ơn.  [LLM — conversational_ack]",
            "Trợ lý: Không có gì.",
            "(im lặng ~15 giây)",
            "Trợ lý: Bạn còn đó không?",
            "(im lặng lần hai)",
            "Trợ lý: Nếu bạn không còn câu hỏi nào nữa, em xin phép kết thúc cuộc gọi ở đây. Tạm biệt bạn!",
            "Kết quả: hệ thống gọi POST /api/v1/voice/end-session và nhận mã 200.",
        ],
    ),
    (
        "Kịch bản B.2 — Nhận chuyến qua cuộc gọi mời nhận chuyến (phiên SIP, tập công cụ hẹp)",
        [
            "Trợ lý: Có chuyến mới đón tại 88 Pasteur, Quận 3. Bạn có nhận chuyến này không?",
            "Tài xế: Xác nhận nhận chuyến.  [LLM + công cụ — confirm_trip]",
            "Trợ lý: Đã nhận chuyến. Chúc bạn đi đường an toàn.",
        ],
    ),
]

APPENDIX_D_INTRO = (
    "Bảng D.1 tóm tắt cấu hình chính của tác nhân hội thoại. Cấu hình không bí mật nằm trong tệp "
    "envs/config.<môi trường>.toml, khóa bí mật nằm trong tệp .env không đưa vào kho mã nguồn; tệp mẫu "
    "envs/config.example.toml và envs/.env.example được cung cấp để tái lập môi trường. Cột cuối ghi giá trị "
    "dùng cho số liệu Chương 6."
)

APPENDIX_D_ENV = [
    ("AGENT_LANG", "Gói ngôn ngữ mặc định của tác nhân", "vn (lựa chọn: vn / en)"),
    ("STT_PROVIDER", "Nhà cung cấp nhận dạng giọng nói", "google (lựa chọn: openai / deepgram / inference)"),
    ("GOOGLE_STT_MODEL", "Mô hình STT của Google", "chirp_3"),
    ("STT_LANGUAGE", "Ngôn ngữ nhận dạng (BCP-47)", "vi-VN"),
    ("LLM_PROVIDER", "Nhà cung cấp mô hình ngôn ngữ", "openai (lựa chọn: gemini / kimi)"),
    ("LLM_MODEL", "Mô hình ngôn ngữ", "gpt-5.6-luna"),
    ("TTS_PROVIDER", "Nhà cung cấp tổng hợp giọng nói", "google (lựa chọn: elevenlabs / gemini / openai)"),
    ("GOOGLE_TTS_VOICE", "Giọng đọc tiếng Việt", "vi-VN-Chirp3-HD-Kore"),
    ("GOOGLE_TTS_SPEAKING_RATE", "Tốc độ đọc", "0,95"),
    ("GOOGLE_TTS_PITCH", "Cao độ giọng", "-2,0"),
    ("STT_FALLBACK, LLM_FALLBACK, TTS_FALLBACK", "Nhà cung cấp dự phòng (danh sách, phân cách bằng dấu phẩy)", "Không cấu hình trong đợt đo"),
    ("EXTERNAL_API_SERVICE_URL", "Địa chỉ Dịch vụ Chuyến đi và Điều phối", "http://localhost:8002 (cục bộ)"),
    ("CALL_RECORDS_SERVICE_URL", "Địa chỉ Dịch vụ Nhật ký cuộc gọi", "http://localhost:8001 (cục bộ)"),
    ("LIVEKIT_URL", "Địa chỉ LiveKit Cloud", "wss://<tên-project>.livekit.cloud"),
]

# Phụ lục C — thư viện ảnh giao diện (ảnh gốc; xử lý che thông tin trực tiếp trên DOCX nếu cần)
APPENDIX_C_FIGURES = [
    ("thesis_screenshots/register.jpg", "Hình C.1. Màn hình đăng ký trở thành tài xế trên ứng dụng Czen Driver."),
    ("thesis_screenshots/trolyczen2.jpg", "Hình C.2. Biểu tượng trợ lý giọng nói ở trạng thái đang kết nối."),
    ("thesis_screenshots/caidattroly.jpg", "Hình C.3. Cài đặt trợ lý: chọn ngôn ngữ và chế độ gọi khách mặc định (tác nhân gọi thay hoặc tài xế nói trực tiếp)."),
    ("thesis_screenshots/caidattroly2.jpg", "Hình C.4. Cài đặt trợ lý: kích hoạt rảnh tay bằng từ khóa đánh thức và các tùy chọn nhắc khách."),
    ("thesis_screenshots/mapdetails.jpg", "Hình C.5. Màn hình dẫn đường trên bản đồ của ứng dụng tài xế (chức năng bản đồ, không thuộc trợ lý giọng nói): hướng rẽ, khoảng cách và thời gian còn lại."),
    ("thesis_screenshots/chuyendidangchay.jpg", "Hình C.6. Gợi ý lộ trình tối ưu cho nhiều điểm đón/trả trong danh sách chuyến đang chạy."),
    ("thesis_screenshots/themchuyen2.jpg", "Hình C.7. Tài xế tự tạo chuyến cho khách vãng lai, kèm các yêu cầu đặc biệt (hàng cồng kềnh, đi cùng trẻ em)."),
    ("thesis_screenshots/profile.jpg", "Hình C.8. Màn hình hồ sơ tài xế và các chỉ số vận hành (đánh giá, số chuyến, tỷ lệ nhận/hoàn thành)."),
    ("thesis_screenshots/thunhap.jpg", "Hình C.9. Màn hình thu nhập theo kỳ và chi tiết cước từng chuyến đã hoàn thành."),
    ("thesis_screenshots/admin/bangchuyen.png", "Hình C.10. Trang quản trị: bảng điều phối chuyến, lọc trạng thái và gán tài xế."),
    ("thesis_screenshots/admin/taochuyen.png", "Hình C.11. Trang quản trị: điều phối viên tạo chuyến từ yêu cầu của khách và thông báo cho tài xế được gán."),
    ("thesis_screenshots/admin/taixe.png", "Hình C.12. Trang quản trị: danh sách tài xế, trạng thái trực tuyến và khóa tài khoản."),
    ("thesis_screenshots/admin/khachhang.png", "Hình C.13. Trang quản trị: danh sách khách hàng và trạng thái tài khoản."),
    ("thesis_screenshots/admin/nhatkicuocgoi.png", "Hình C.14. Trang quản trị: nhật ký cuộc gọi kèm tóm tắt nội dung hội thoại."),
    ("thesis_screenshots/superadmin/tongquan2.png", "Hình C.15. Trang giám sát hệ thống: tình trạng hoạt động của các dịch vụ backend (6/6 đang chạy)."),
    ("thesis_screenshots/superadmin/config.png", "Hình C.16. Trang giám sát hệ thống: cấu hình chuỗi STT – LLM – TTS của tác nhân hội thoại theo gói ngôn ngữ."),
    ("thesis_screenshots/superadmin/logs.png", "Hình C.17. Trang giám sát hệ thống: nhật ký thời gian thực của các dịch vụ, dùng để đọc độ trễ tổng hợp giọng nói (TTFB)."),
    ("thesis_screenshots/superadmin/cuocgoi.png", "Hình C.18. Trang giám sát hệ thống: bản ghi và tóm tắt cuộc gọi, lấy qua Dịch vụ Giám sát vận hành."),
]
# Phụ lục E — ma trận đối chiếu yêu cầu (Requirements Traceability Matrix)
APPENDIX_E_RTM = [
    # (mã, RQ, thành phần, sequence, hiện thực chính, kịch bản Ch.6, kết quả)
    ("FR-T01, FR-T02", "RQ4", "Tác nhân; Dịch vụ Chuyến đi và Điều phối", "S2, S3", "check_upcoming_trips, get_current_trip_info; routes/drivers.ts", "UC01", "Bảng 6.8"),
    ("FR-T03", "RQ4", "Tác nhân; Dịch vụ Chuyến đi và Điều phối", "S3", "update_trip_status; routes/trips.ts", "UC03", "Không đủ mẫu"),
    ("FR-T04", "RQ4", "Dịch vụ Chuyến đi và Điều phối; LiveKit SIP", "S4", "confirm_trip, reject_trip; dispatchService.ts", "UC02", "Bảng 6.8"),
    ("FR-T05", "RQ4", "Tác nhân; Dịch vụ Chuyến đi và Điều phối", "S3", "request_cancel_trip, confirm_cancel_trip", "UC05", "Bảng 6.10"),
    ("FR-T06, FR-T07", "RQ4", "Dịch vụ Chuyến đi và Điều phối; dịch vụ bản đồ", "S3 (mẫu gọi công cụ)", "create_walkup_trip; suggest_next_stop, get_optimal_route, get_trip_traffic; routeOptimizationService.ts", "UC16", "Kiểm thử tự động đạt: test_create_walkup_trip (2 ca), giao thông trong test_f7_f12_driver_tools và test_f1_f12_text_checklist; thứ tự ghé: Bảng 6.16"),
    ("FR-C01, FR-C02", "RQ4", "Tác nhân; Dịch vụ Chuyến đi và Điều phối; LiveKit SIP", "S5", "call_customer, call_custom_number; callService.ts", "UC04", "Bảng 6.8, Bảng 6.15"),
    ("FR-C03", "RQ4", "Dịch vụ Chuyến đi và Điều phối; Dịch vụ Liên lạc bằng tin nhắn", "S5", "send_sms_to_customer; smsService.ts", "UC04", "Bảng 6.15 (kiểm thử đạt); Bảng 6.13 (RS-04); chưa giao tin thật tới thuê bao Việt Nam (mục 6.13)"),
    ("FR-C04", "RQ4", "Dịch vụ Chuyến đi và Điều phối", "S3 (mẫu gọi công cụ)", "get_customer_location", "UC15", "Bảng 6.14"),
    ("FR-C05", "RQ4", "Dịch vụ Nhật ký cuộc gọi", "S6", "summarize_last_call; conversation_service.py", "UC04", "Bảng 6.15"),
    ("FR-W01, FR-W02", "RQ4", "Tác nhân; Dịch vụ Chuyến đi và Điều phối", "S3 (mẫu gọi công cụ)", "create_reminder, extend_wait_time", "UC15", "Kiểm thử tự động đạt: gia hạn chờ 3 ca (test_trip_on_route_actions); nhắc việc 4 ca (test_create_reminder)"),
    ("FR-I01, FR-I02", "RQ4", "Dịch vụ Chuyến đi và Điều phối", "S3 (mẫu gọi công cụ)", "report_customer_no_show, report_trip_issue", "UC06", "Bảng 6.10"),
    ("FR-E01, FR-E02", "RQ4", "Dịch vụ Chuyến đi và Điều phối", "S3 (mẫu gọi công cụ)", "get_today_earnings, get_earnings_summary, set_driver_status", "UC08", "Bảng 6.8"),
    ("FR-F01", "RQ4", "Tác nhân (truy xuất tri thức)", "S3 (mẫu gọi công cụ)", "answer_app_faq; app/rag", "UC07", "Bảng 6.8"),
    ("FR-L01", "Ngoài RQ (kiểm tra tuân thủ)", "Tác nhân", "S2 (chọn ngôn ngữ khi mở phiên)", "voicebot/locales/vn, voicebot/locales/en", "Mọi UC của tài xế", "Kiểm thử tự động đạt: test_locale_loader, test_locale_service, test_session_lang, test_tool_parity (17 ca); chưa đo tỷ lệ lỗi từ tiếng Anh"),
    ("FR-L02", "RQ4", "Tác nhân", "S3 (theo dõi im lặng giữa các lượt)", "Theo dõi im lặng trong session.py", "UC09", "Bảng 6.10"),
    ("FR-L03", "RQ4", "Tác nhân", "S4", "Tập công cụ theo loại phiên trong locales/*/agent.py", "UC02", "Bảng 6.8"),
    ("FR-A01", "Ngoài RQ (kiểm tra tuân thủ)", "Ứng dụng tài xế", "S2", "wakeWordService.ts", "UC10", "Chưa đo định lượng tỷ lệ đánh thức đúng và đánh thức nhầm; hướng phát triển"),
    ("FR-A02", "Ngoài RQ (kiểm tra tuân thủ)", "Tác nhân", "S5", "Cụm từ kết thúc chế độ nói trực tiếp", "UC04", "Kiểm thử tự động đạt: chọn chế độ nói trực tiếp (test_outbound_call_modes, 9 ca); cụm từ kết thúc và trả quyền về trợ lý (test_bridge_end_phrase, 4 ca)"),
    ("FR-K01, FR-K04", "RQ4", "Tác nhân (gọi khách nền, tác nhân gọi thay); Dịch vụ Nhật ký cuộc gọi", "S5", "Phòng custcall-…; test_customer_outbound_opening, test_record_customer_request, test_customer_call_faq", "UC12", "Bảng 6.15"),
    ("FR-K02", "RQ4", "Tác nhân; LiveKit SIP", "S5", "Chế độ nói trực tiếp (bridge); test_outbound_call_modes", "UC12", "Bảng 6.15"),
    ("FR-K03", "RQ4", "Dịch vụ Chuyến đi và Điều phối; Dịch vụ Liên lạc bằng tin nhắn", "S5", "confirm_trip_with_customer, send_sms_to_customer", "UC13", "Bảng 6.13 (RS-04, đường lỗi)"),
    ("FR-Q01 đến FR-Q05", "Ngoài RQ (kiểm tra tuân thủ)", "Trang quản trị điều hành; Dịch vụ Chuyến đi và Điều phối; Dịch vụ Định danh; Dịch vụ Nhật ký cuộc gọi", "S4", "admin-panel: TripBoardPage, CreateTripPage, DriversPage, CustomerPage, CallLogsPage", "UC14, UC17", "Hình C.10 đến C.14"),
    ("FR-S01 đến FR-S03", "Ngoài RQ (kiểm tra tuân thủ)", "Trang giám sát hệ thống; Dịch vụ Giám sát vận hành", "Luồng ⑰ (Bảng 4.4)", "super-admin-panel: OverviewPage, AgentPage, LogsPage", "UC18", "Hình C.15 đến C.17"),
    ("FR-O01, FR-O02", "Ngoài RQ (kiểm tra tuân thủ)", "Dịch vụ Giám sát vận hành; Dịch vụ Nhật ký cuộc gọi; tác nhân", "S7", "session_metrics.py; ops-service/src/services/reports; ReportsPage.tsx", "UC11", "Bảng 6.15"),
    ("NFR-01", "RQ4", "Tác nhân", "S3", "Phân loại phiên; hành động chờ xác nhận; câu báo lỗi (test_call_error_message)", "Danh mục hành vi", "Bảng 6.10 (đạt sau một vòng sửa)"),
    ("NFR-02", "RQ2", "Tác nhân; nhà cung cấp AI", "S2, S3", "turn_filler.py; prefetch.py; context_store.py", "UC01, UC03, UC04, UC07", "Bảng 6.4, Bảng 6.6"),
    ("NFR-03", "RQ1", "Tác nhân (ECS); các Lambda; DynamoDB", "S2 (phân công bản sao tác nhân)", "infra/llm-orchestrator/cfn.yaml (DesiredCount); infra/*/sam.yaml", "SC-01 đến SC-03", "Bảng 6.11, Bảng 6.12 (đạt trong môi trường mô phỏng)"),
    ("NFR-04", "RQ1", "Tác nhân; Dịch vụ Nhật ký cuộc gọi; nhà cung cấp AI", "S3, S6", "providers/fallback.py; backend_api.py; conversation_service.py", "RS-01 đến RS-05", "Bảng 6.13"),
    ("NFR-05", "Ngoài RQ (kiểm tra tuân thủ)", "Dịch vụ Định danh; mọi dịch vụ", "S1", "tokenService.ts; middleware xác minh JWT; tham số NoEcho; che số điện thoại trong logger/format", "Danh mục bảo mật", "Bảng 6.14 (đạt sau một vòng sửa)"),
    ("CON-01", "Ngoài RQ (kiểm tra tuân thủ)", "Tác nhân", "S3", "backend_api.py", "Kiểm tra mã nguồn", "Bảng 6.14"),
    ("CON-02", "Ngoài RQ (kiểm tra tuân thủ)", "Mọi dịch vụ", "Mọi sequence", "Bảng DynamoDB riêng từng stack", "Kiểm tra cấu hình", "Bảng 5.6"),
    ("CON-03", "Ngoài RQ (kiểm tra tuân thủ)", "Dịch vụ Định danh", "S1", "tokenService.ts", "Kiểm tra mã nguồn", "Bảng 6.14"),
    ("CON-04", "Ngoài RQ (kiểm tra tuân thủ)", "Mọi dịch vụ", "Luồng ⑱ (Bảng 4.4)", "Nhật ký gắn room và conv", "Kiểm tra nhật ký", "Bảng 6.14"),
]

# Phụ lục F — đối chiếu sequence diagram với mã nguồn (đường dẫn tính từ src/backend/)
APPENDIX_F_SEQUENCE = [
    ("S1", "1", "POST /api/v1/auth/login", "identity-service/src/routes/auth.ts:109"),
    ("S1", "6", "Ký access token, refresh token", "identity-service/src/services/tokenService.ts:16, :22"),
    ("S1", "9", "POST /api/v1/auth/refresh", "identity-service/src/routes/auth.ts:142"),
    ("S2", "1", "POST /api/v1/voice/token", "external-api-service/src/routes/voice.ts:47"),
    ("S2", "4", "Tạo phòng driver-{số}-{UUID}", "external-api-service/src/routes/voice.ts:96"),
    ("S2", "5", "Ký token LiveKit", "external-api-service/src/routes/voice.ts:157"),
    ("S2", "6", "Phân công tác nhân", "external-api-service/src/routes/voice.ts:160; services/voiceSessionService.ts:38"),
    ("S2", "10", "PUT /api/v1/drivers/me/session", "llm-orchestrator/app/services/backend_api.py:501; external-api-service/src/routes/drivers.ts:164"),
    ("S2", "12", "GET /api/v1/drivers/me/context", "llm-orchestrator/app/services/backend_api.py:217; external-api-service/src/routes/drivers.ts:91"),
    ("S3", "2, 4", "Chuỗi nhà cung cấp dự phòng, thời gian chờ 5 giây", "llm-orchestrator/app/providers/__init__.py:80, :98, :115"),
    ("S3", "5", "Câu đệm sau 2 giây", "llm-orchestrator/app/voicebot/processors/turn_filler.py:19"),
    ("S3", "7", "PATCH /api/v1/trips/{tripId}, thời gian chờ 8 giây", "llm-orchestrator/app/services/backend_api.py:242; external-api-service/src/routes/trips.ts:256"),
    ("S4", "1", "POST /api/v1/trips/{tripId}/dispatch", "external-api-service/src/routes/trips.ts:540"),
    ("S4", "2–5", "Tạo phòng, phân công tác nhân, quay số SIP", "external-api-service/src/services/dispatchService.ts:24"),
    ("S4", "8", "confirm_trip, reject_trip cập nhật trạng thái", "llm-orchestrator/app/voicebot/processors/confirm_trip_flow.py:34"),
    ("S5", "2", "POST /api/v1/calls/start, thời gian chờ 25 giây", "llm-orchestrator/app/services/backend_api.py:289; external-api-service/src/routes/calls.ts:46"),
    ("S5", "2–4", "Ba chế độ gọi, quay số SIP", "external-api-service/src/services/callService.ts:123, :148; services/telephony/livekit.ts:19"),
    ("S5", "6", "POST /api/v1/calls/complete", "llm-orchestrator/app/services/backend_api.py:390; external-api-service/src/routes/calls.ts:127"),
    ("S5", "7–9", "POST /api/v1/sms/send", "llm-orchestrator/app/services/backend_api.py:322; external-api-service/src/routes/sms.ts:7; services/smsService.ts:5; external-channel-service/src/routes/sms.ts:7"),
    ("S6", "2", "POST /api/v1/records, thử lại có giới hạn", "llm-orchestrator/app/services/conversation_service.py:270; call-records-service/src/routes/records.ts:6"),
    ("S6", "5–7", "GET /api/v1/calls/latest, GET /api/v1/records", "external-api-service/src/routes/calls.ts:140; call-records-service/src/routes/records.ts:15, :28"),
    ("S5", "11", "Lưu sự kiện vào channel-events", "external-channel-service/src/services/twilioMonitor.ts; services/events/dynamoStore.ts"),
    ("S7", "1", "Sự kiện theo lịch source=ops.schedule", "ops-service/src/index.ts (handler); infra/ops-service/sam.yaml (ScheduleV2)"),
    ("S7", "2–3", "GET /api/v1/records?date=&cursor=", "ops-service/src/services/reports/index.ts (fetchRecords); call-records-service/src/services/recordService.ts (listByDate)"),
    ("S7", "4–6", "Tổng hợp; chấm LLM trên mẫu", "ops-service/src/services/reports/aggregate.ts; judge.ts"),
    ("S7", "7–9", "Lưu daily-reports; GET /api/v1/reports/daily", "ops-service/src/services/reports/store.ts; ops-service/src/routes/reports.ts"),
]


# Phụ lục H — tái lập số liệu thực nghiệm
APPENDIX_H_INTRO = (
    "Bảng H.1 liệt kê script và lệnh để tạo lại từng nhóm số liệu ở Chương 6. Các script nằm trong thư mục "
    "docs/thesis và docs/thesis/experiments của kho mã nguồn (mục 5.2). Thí nghiệm thử tải và tiêm lỗi chạy "
    "trên môi trường cô lập: cơ sở dữ liệu giả lập, thông tin đăng nhập AWS giả, số điện thoại trong dải "
    "giả lập; không thí nghiệm nào gọi tới tài nguyên AWS hoặc nhà cung cấp bên ngoài."
)
APPENDIX_H_ROWS = [
    ("Độ trễ phản hồi và phân tích điểm nghẽn (Bảng 6.4, 6.5)",
     "python3 docs/thesis/extract_ch6_metrics.py",
     "Nhật ký tác nhân agent.*.log của đợt đo 05–06/09/2026",
     "P50, P90, P95 theo nhánh; độ trễ theo chặng"),
    ("Tỷ lệ lỗi từ (Bảng 6.7)",
     "python3 docs/thesis/compute_wer.py --room <mã phòng> --label A|B",
     "Nhật ký STT của phiên đọc 22 câu tham chiếu",
     "WER theo điều kiện âm thanh"),
    ("SC-03 – thử tải API (Bảng 6.11)",
     "docs/thesis/experiments/sc03_setup.sh; sc03_run.sh; python3 sc03_analyze.py",
     "Bảng bench-trips (200 tài xế giả lập × 3 chuyến) trên DynamoDB giả lập; k6",
     "P50, P95 theo số người dùng ảo; tỷ lệ lỗi"),
    ("RS-01, RS-02, RS-04 – tiêm lỗi mức thành phần (Bảng 6.13)",
     "PYTHONPATH=. .venv/bin/python docs/thesis/experiments/rs_component_faults.py --trials 20 (chạy trong src/backend/llm-orchestrator)",
     "Máy chủ tiêm lỗi trả 503, treo, hoặc từ chối kết nối",
     "Tỷ lệ lượt đạt; thời gian đến khi tác nhân báo lỗi"),
    ("RS-05 – dự phòng nhà cung cấp LLM (Bảng 6.13)",
     ".venv/bin/python docs/thesis/experiments/rs05_provider_fallback.py --trials 30 (chạy trong src/backend/llm-orchestrator)",
     "FallbackAdapter của LiveKit Agents với nhà cung cấp giả lập",
     "Tỷ lệ thành công; thời gian đến token đầu khi chuyển đổi"),
    ("SC-01, SC-02 – phiên hội thoại đồng thời (Bảng 6.12)",
     "Máy chủ LiveKit: docker run livekit/livekit-server --dev; python3 experiments/fake_ai_server.py; source experiments/sc_agent_env.sh; bản sao tác nhân: python -m app.main start hoặc experiments/bench_worker.py; python3 experiments/sc_sessions.py --levels 1 5 10 20 40",
     "Tác nhân thật, nhà cung cấp AI giả lập (STT 0,3 s, LLM 0,8 s, TTS 0,2 s), lk perf agent-load-test",
     "Phiên được phục vụ; P50, P95 độ trễ phản hồi; thời gian vào phiên; CPU, RAM"),
    ("RS-03 – dừng một bản sao tác nhân (Bảng 6.13)",
     "python3 docs/thesis/experiments/rs03_replica_kill.py --trials 10 (chạy trong src/backend/llm-orchestrator, cùng môi trường SC-01)",
     "Hai bản sao tác nhân; SIGKILL bản sao đang phục vụ phiên",
     "Phiên mới được phục vụ; phiên đang chạy được giữ; thời gian khôi phục bản sao"),
    ("Kiểm tra lại nhật ký sau khi che số điện thoại (Bảng 6.14, mục 4)",
     ".venv/bin/python docs/thesis/experiments/log_masking_check.py --trials 20 (chạy trong src/backend/llm-orchestrator)",
     "Chạy lại RS-01, RS-02, RS-04 với nhật ký mức DEBUG; phát lại nhật ký cũ qua hàm che",
     "Số lần xuất hiện số điện thoại đầy đủ (kỳ vọng 0)"),
    ("Sắp xếp thứ tự ghé (Bảng 6.16)",
     "node docs/thesis/experiments/route_opt_quality.js (chạy trong src/backend/external-api-service)",
     "600 bộ điểm dừng sinh ngẫu nhiên, hạt giống 20261013",
     "Tỷ lệ đúng tối ưu; chênh lệch quãng đường so với tối ưu và với thứ tự theo danh sách"),
    ("Luồng khách hàng và báo cáo ngày (Bảng 6.15)",
     "pytest trong src/backend/llm-orchestrator (529 ca, gồm test_send_sms_flow); npm run verify:ops; npm run verify:records; npm run verify:sms (hai dịch vụ); npm run verify:logger",
     "Bộ kiểm thử tự động",
     "Kết quả đạt/không đạt"),
]

# Phụ lục I — bảng thuật ngữ Anh – Việt
APPENDIX_I_TERMS = [
    ("Acceptance criteria", "Tiêu chí chấp nhận", "ISTQB (n.d.)"),
    ("Architectural driver", "Động lực kiến trúc", "Bass et al. (2021)"),
    ("Architectural pattern", "Mẫu kiến trúc", "Bass et al. (2021)"),
    ("Architectural tactic", "Chiến thuật kiến trúc", "Bass et al. (2021)"),
    ("Artifact (design science)", "Sản phẩm thiết kế", "Hevner et al. (2004)"),
    ("Availability", "Tính sẵn sàng", "ISO/IEC (2023)"),
    ("Bounded context", "Ngữ cảnh giới hạn", "Newman (2021)"),
    ("Cascaded pipeline", "Chuỗi xử lý theo tầng", "Mục 2.1"),
    ("Conclusion validity", "Độ tin cậy của kết luận", "Wohlin et al. (2012)"),
    ("Construct validity", "Độ tin cậy cấu trúc", "Wohlin et al. (2012)"),
    ("Design for failure", "Thiết kế cho lỗi", "Lewis & Fowler (2014)"),
    ("Design science research", "Nghiên cứu khoa học thiết kế", "Hevner et al. (2004)"),
    ("End-of-utterance detection", "Phát hiện kết thúc phát ngôn", "Skantze (2021)"),
    ("External validity", "Độ tin cậy bên ngoài", "Wohlin et al. (2012)"),
    ("Failure", "Sự cố", "Bass et al. (2021)"),
    ("Fault", "Lỗi", "Bass et al. (2021)"),
    ("Fault injection", "Tiêm lỗi", "Mục 6.2.2"),
    ("Fault tolerance", "Khả năng chịu lỗi", "ISO/IEC (2023)"),
    ("Filler utterance", "Câu đệm", "Mục 2.8"),
    ("Flexibility", "Tính linh hoạt", "ISO/IEC (2023)"),
    ("Function calling", "Gọi công cụ", "Schick et al. (2023)"),
    ("Graceful degradation", "Suy giảm có kiểm soát", "Bass et al. (2021)"),
    ("Interaction capability", "Năng lực tương tác", "ISO/IEC (2023)"),
    ("Favored user class", "Lớp người dùng ưu tiên", "Wiegers & Beatty (2013)"),
    ("Internal validity", "Độ tin cậy nội tại", "Wohlin et al. (2012)"),
    ("Persona", "Chân dung người dùng", "Cooper et al. (2014)"),
    ("Performance efficiency", "Hiệu quả hiệu năng (gọi tắt: hiệu năng)", "ISO/IEC (2023)"),
    ("Quality attribute scenario", "Kịch bản thuộc tính chất lượng", "Bass et al. (2021)"),
    ("Recoverability", "Khả năng khôi phục", "ISO/IEC (2023)"),
    ("Redundant spare", "Dự phòng thay thế", "Bass et al. (2021)"),
    ("Reliability", "Độ tin cậy", "ISO/IEC (2023)"),
    ("Resilience", "Khả năng phục hồi (gồm tính sẵn sàng, khả năng chịu lỗi, khả năng khôi phục)", "Mục 2.4.2"),
    ("Scalability", "Khả năng mở rộng", "ISO/IEC (2023)"),
    ("Sensitivity point", "Điểm nhạy", "Kazman et al. (2000)"),
    ("Technology heterogeneity", "Đa dạng công nghệ", "Newman (2021)"),
    ("Time to first token", "Thời gian sinh token đầu", "Mục 2.1"),
    ("Tradeoff point", "Điểm đánh đổi", "Kazman et al. (2000)"),
    ("Usability", "Tính khả dụng", "Bass et al. (2021)"),
    ("Usability heuristics", "Nguyên tắc khả dụng", "Nielsen (1994)"),
    ("Use case (user-goal level)", "Use case ở mức mục tiêu người dùng", "Cockburn (2001)"),
    ("User class", "Lớp người dùng", "Wiegers & Beatty (2013)"),
    ("User requirements", "Yêu cầu người dùng", "Sommerville (2016)"),
    ("Utility tree", "Cây tiện ích", "Kazman et al. (2000)"),
    ("Wake word", "Từ khóa đánh thức", "Mục 1.5.2"),
]

# Phụ lục G — ánh xạ tên thành phần
APPENDIX_G_NAMES = [
    ("Dịch vụ Định danh", "identity-service", "Lambda, API Gateway REST, DynamoDB (accounts, driver-settings)", "Microservices; Data"),
    ("Dịch vụ Chuyến đi và Điều phối", "external-api-service", "Lambda, API Gateway REST và WebSocket, DynamoDB (trips, ws-connections)", "Microservices; API Gateway; Data"),
    ("Dịch vụ Liên lạc bằng tin nhắn", "external-channel-service", "Lambda, API Gateway REST, DynamoDB (channel-events)", "Microservices; Data"),
    ("Dịch vụ Nhật ký cuộc gọi", "call-records-service", "Lambda, API Gateway REST, DynamoDB (call-records)", "Microservices; Data"),
    ("Dịch vụ Giám sát vận hành", "ops-service", "Lambda, API Gateway REST, DynamoDB (daily-reports), EventBridge Scheduler", "Microservices; Data; Cross-cutting"),
    ("Dịch vụ Liên lạc hội thoại thời gian thực", "llm-orchestrator", "ECS Fargate, ECR, CloudWatch Logs", "Real-time Communication & Conversational AI"),
    ("Nền tảng truyền thông thời gian thực", "LiveKit Cloud", "Dịch vụ bên ngoài", "Real-time Communication & Conversational AI"),
    ("Ứng dụng tài xế", "driver-app, driver-web", "Cài trên điện thoại (Expo); bản web driver-web lưu trên S3", "Client"),
    ("Ứng dụng khách hàng (ngoài phạm vi)", "customer-app, customer-web", "S3 (bản web)", "Client"),
    ("Trang quản trị điều hành", "admin-panel", "S3", "Client"),
    ("Trang giám sát hệ thống", "super-admin-panel", "S3", "Client"),
    ("Nhà cung cấp dịch vụ thoại", "Twilio", "Dịch vụ bên ngoài", "External Systems"),
]

# Style/section template. Prefer the original GVHD source if present; else reuse FINAL
# via a temp copy so we never open+overwrite the same path.
_SRC_PRIMARY = ROOT / "LUẬN VĂN THẠC SĨ _ TRƯƠNG BÁ CHÍNH.docx"
# THESIS_OUT lets a preview build run while Word holds the FINAL file open.
OUT = Path(os.environ["THESIS_OUT"]) if os.environ.get("THESIS_OUT") else ROOT / "LUAN_VAN_THAC_SI_FINAL.docx"
if _SRC_PRIMARY.is_file():
    SRC = _SRC_PRIMARY
elif OUT.is_file():
    _tmp = Path(tempfile.gettempdir()) / "avda_thesis_style_template.docx"
    shutil.copy2(OUT, _tmp)
    SRC = _tmp
else:
    SRC = _SRC_PRIMARY  # will fail with a clear PackageNotFoundError
CHAPTER_MDS = [
    ROOT / "Chuong1_Gioi_thieu_DRAFT.md",
    ROOT / "Chuong2_Co_so_ly_thuyet_DRAFT.md",
    ROOT / "Chuong3_Phan_tich_yeu_cau_DRAFT.md",
    ROOT / "Chuong4_Thiet_ke_he_thong_DRAFT.md",
    ROOT / "Chuong5_Trien_khai_DRAFT.md",
    ROOT / "Chuong6_Thuc_nghiem_DRAFT.md",
]

# Locked stylesheet (UIT/UEH-style VN thesis)
FONT_NAME = "Times New Roman"
BODY_PT = 13
H1_PT = 15
H2_PT = 13
H3_PT = 13
CAPTION_PT = 12
TABLE_PT = 11
BODY_LINE = 1.5
REF_LINE = 1.0
MARGIN_TOP_CM = 2.5
MARGIN_BOTTOM_CM = 2.5
MARGIN_LEFT_CM = 3.5
MARGIN_RIGHT_CM = 2.0
FIRST_INDENT_CM = 1.0
TEXT_BLACK = RGBColor(0, 0, 0)

REFERENCES = [
    (
        "ref_aws_waf2024",
        "Amazon Web Services. (2024). AWS Well-Architected Framework (Reliability Pillar; "
        "Performance Efficiency Pillar). https://docs.aws.amazon.com/wellarchitected/latest/framework/",
        "Amazon Web Services, 2024",
    ),
    (
        "ref_alvestrand2021",
        "Alvestrand, H. (2021). Overview: Real-Time Protocols for Browser-Based Applications "
        "(RFC 8825). IETF. https://www.rfc-editor.org/rfc/rfc8825",
        "Alvestrand, 2021",
    ),
    (
        "ref_alvarado2024",
        "Alvarado Contreras, R. E., Escobedo, L., & Beltrán, J. (2024). "
        "AI Companions in Ride-Hailing: Enhancing Sense of Safety with Voice Chatbots. "
        "Avances en Interacción Humano-Computadora, 9(1), 11–15. "
        "https://doi.org/10.47756/aihc.y9i1.138",
        "Alvarado Contreras et al., 2024",
    ),
    (
        "ref_bass2021",
        "Bass, L., Clements, P., & Kazman, R. (2021). Software Architecture in Practice (4th ed.). "
        "Addison-Wesley. ISBN 978-0-13-688597-9",
        "Bass et al., 2021",
    ),
    (
        "ref_chen2024_voicebench",
        "Chen, Y., Yue, X., Zhang, C., Gao, X., Tan, R. T., & Li, H. (2024). "
        "VoiceBench: Benchmarking LLM-Based Voice Assistants. arXiv:2410.17196. "
        "https://arxiv.org/abs/2410.17196",
        "Chen et al., 2024",
    ),
    (
        "ref_dingus2016",
        "Dingus, T. A., Guo, F., Lee, S., Antin, J. F., Perez, M., Buchanan-King, M., & Hankey, J. (2016). "
        "Driver crash risk factors and prevalence evaluation using naturalistic driving data. "
        "Proceedings of the National Academy of Sciences, 113(10), 2636–2641. "
        "https://doi.org/10.1073/pnas.1513271113",
        "Dingus et al., 2016",
    ),
    (
        "ref_dragoni2017",
        "Dragoni, N., Giallorenzo, S., Lluch Lafuente, A., Mazzara, M., Montesi, F., Mustafin, R., & Safina, L. (2017). "
        "Microservices: Yesterday, today, and tomorrow. In M. Mazzara & B. Meyer (Eds.), "
        "Present and Ulterior Software Engineering (pp. 195–216). Springer. "
        "https://doi.org/10.1007/978-3-319-67425-4_12",
        "Dragoni et al., 2017",
    ),
    (
        "ref_iihs_distracted",
        "Insurance Institute for Highway Safety. (n.d.). Distracted driving. "
        "https://www.iihs.org/research-areas/distracted-driving",
        "Insurance Institute for Highway Safety, n.d.",
    ),
    (
        "ref_iso25010_2023",
        "ISO/IEC. (2023). ISO/IEC 25010:2023 Systems and software engineering — Systems and software "
        "Quality Requirements and Evaluation (SQuaRE) — Product quality model. "
        "https://www.iso.org/standard/78176.html",
        "ISO/IEC, 2023",
    ),
    (
        "ref_jonas2019",
        "Jonas, E., Schleier-Smith, J., Sreekanti, V., Tsai, C.-C., Khandelwal, A., Pu, Q., Shankar, V., "
        "Carreira, J., Krauth, K., Yadwadkar, N., Gonzalez, J. E., Popa, R. A., Stoica, I., & Patterson, D. A. (2019). "
        "Cloud Programming Simplified: A Berkeley View on Serverless Computing. arXiv:1902.03383. "
        "https://arxiv.org/abs/1902.03383",
        "Jonas et al., 2019",
    ),
    (
        "ref_lewis_fowler2014",
        "Lewis, J., & Fowler, M. (2014, March 25). Microservices: A definition of this new architectural term. "
        "https://martinfowler.com/articles/microservices.html",
        "Lewis & Fowler, 2014",
    ),
    (
        "ref_livekit_agents",
        "LiveKit Inc. (n.d.). Agents. LiveKit Documentation. https://docs.livekit.io/agents/",
        "LiveKit Inc., n.d.",
    ),
    (
        "ref_lyu2025",
        "Lyu, T., Feng, S., Liu, H., & Yang, H. (2025). "
        "LLM-ODDR: A Large Language Model Framework for Joint Order Dispatching and Driver Repositioning. "
        "arXiv:2505.22695. https://arxiv.org/abs/2505.22695",
        "Lyu et al., 2025",
    ),
    (
        "ref_nhtsa2013",
        "National Highway Traffic Safety Administration. (2013). Visual-Manual NHTSA Driver Distraction "
        "Guidelines for In-Vehicle Electronic Devices. Federal Register, 78 FR 24817. https://www.transportation.gov/regulations/federal-register-documents/2013-09883",
        "National Highway Traffic Safety Administration, 2013",
    ),
    (
        "ref_newman2021",
        "Newman, S. (2021). Building Microservices: Designing Fine-Grained Systems (2nd ed.). "
        "O'Reilly Media. ISBN 978-1-492-03402-5",
        "Newman, 2021",
    ),
    (
        "ref_richardson2018",
        "Richardson, C. (2018). Microservices Patterns: With examples in Java. Manning. ISBN 978-1-61729-454-9",
        "Richardson, 2018",
    ),
    (
        "ref_schick2023",
        "Schick, T., Dwivedi-Yu, J., Dessì, R., Raileanu, R., Lomeli, M., Hambro, E., "
        "Zettlemoyer, L., Cancedda, N., & Scialom, T. (2023). "
        "Toolformer: Language Models Can Teach Themselves to Use Tools. "
        "arXiv:2302.04761. https://arxiv.org/abs/2302.04761",
        "Schick et al., 2023",
    ),
    (
        "ref_iihs2022_gig",
        "Insurance Institute for Highway Safety. (2022, November 3). Smartphone apps drive gig workers, parents to distraction. "
        "https://www.iihs.org/news/detail/smartphone-apps-drive-gig-workers-parents-to-distraction",
        "Insurance Institute for Highway Safety, 2022",
    ),
    (
        "ref_song2023",
        "Song, X., Li, X., Yin, K., Qi, H., & Fang, X. (2023). Analyze Factors Influencing Drivers' Cell Phone "
        "Online Ride-hailing Software Using While Driving: A Case Study in China. arXiv:2311.14689. "
        "https://arxiv.org/abs/2311.14689",
        "Song et al., 2023",
    ),
    (
        "ref_defossez2024",
        'Défossez, A., Mazaré, L., Orsini, M., Royer, A., Pérez, P., Jégou, H., Grave, E., & Zeghidour, N. (2024). Moshi: A speech-text foundation model for real-time dialogue. arXiv:2410.00037. https://arxiv.org/abs/2410.00037',
        'Défossez et al., 2024',
    ),
    (
        "ref_hevner2004",
        'Hevner, A. R., March, S. T., Park, J., & Ram, S. (2004). Design science in information systems research. MIS Quarterly, 28(1), 75–105. https://doi.org/10.2307/25148625',
        'Hevner et al., 2004',
    ),
    (
        "ref_kazman2000",
        'Kazman, R., Klein, M., & Clements, P. (2000). ATAM: Method for architecture evaluation (Technical Report CMU/SEI-2000-TR-004). Software Engineering Institute, Carnegie Mellon University.',
        'Kazman et al., 2000',
    ),
    (
        "ref_patil2023",
        'Patil, S. G., Zhang, T., Wang, X., & Gonzalez, J. E. (2023). Gorilla: Large language model connected with massive APIs. arXiv:2305.15334. https://arxiv.org/abs/2305.15334',
        'Patil et al., 2023',
    ),
    (
        "ref_peffers2007",
        'Peffers, K., Tuunanen, T., Rothenberger, M. A., & Chatterjee, S. (2007). A design science research methodology for information systems research. Journal of Management Information Systems, 24(3), 45–77. https://doi.org/10.2753/MIS0742-1222240302',
        'Peffers et al., 2007',
    ),
    (
        "ref_qin2023",
        'Qin, Y., Liang, S., Ye, Y., Zhu, K., Yan, L., Lu, Y., Lin, Y., Cong, X., Tang, X., Qian, B., Zhao, S., Hong, L., Tian, R., Xie, R., Zhou, J., Gerstein, M., Li, D., Liu, Z., & Sun, M. (2023). ToolLLM: Facilitating large language models to master 16000+ real-world APIs. arXiv:2307.16789. https://arxiv.org/abs/2307.16789',
        'Qin et al., 2023',
    ),
    (
        "ref_skantze2021",
        'Skantze, G. (2021). Turn-taking in conversational systems and human-robot interaction: A review. Computer Speech & Language, 67, 101178. https://doi.org/10.1016/j.csl.2020.101178',
        'Skantze, 2021',
    ),
    (
        "ref_strayer2019",
        'Strayer, D. L., Cooper, J. M., Goethe, R. M., McCarty, M. M., Getty, D. J., & Biondi, F. (2019). Assessing the visual and cognitive demands of in-vehicle information systems. Cognitive Research: Principles and Implications, 4, 18. https://doi.org/10.1186/s41235-019-0166-3',
        'Strayer et al., 2019',
    ),
    (
        "ref_taibi2017",
        'Taibi, D., Lenarduzzi, V., & Pahl, C. (2017). Processes, motivations, and issues for migrating to microservices architectures: An empirical investigation. IEEE Cloud Computing, 4(5), 22–32. https://doi.org/10.1109/MCC.2017.4250931',
        'Taibi et al., 2017',
    ),
    (
        "ref_twilio_vn",
        'Twilio. (n.d.). Vietnam: SMS guidelines. https://www.twilio.com/en-us/guidelines/vn/sms',
        'Twilio, n.d.',
    ),
    (
        "ref_venable2016",
        'Venable, J., Pries-Heje, J., & Baskerville, R. (2016). FEDS: A framework for evaluation in design science research. European Journal of Information Systems, 25(1), 77–89. https://doi.org/10.1057/ejis.2014.36',
        'Venable et al., 2016',
    ),
    (
        "ref_wohlin2012",
        'Wohlin, C., Runeson, P., Höst, M., Ohlsson, M. C., Regnell, B., & Wesslén, A. (2012). Experimentation in software engineering. Springer. https://doi.org/10.1007/978-3-642-29044-2',
        'Wohlin et al., 2012',
    ),
    (
        "ref_yao2024",
        'Yao, S., Shinn, N., Razavi, P., & Narasimhan, K. (2024). τ-bench: A benchmark for tool-agent-user interaction in real-world domains. arXiv:2406.12045. https://arxiv.org/abs/2406.12045',
        'Yao et al., 2024',
    ),
    (
        "ref_cockburn2001",
        'Cockburn, A. (2001). Writing Effective Use Cases. Addison-Wesley. ISBN 978-0-201-70225-5',
        'Cockburn, 2001',
    ),
    (
        "ref_cooper2014",
        'Cooper, A., Reimann, R., Cronin, D., & Noessel, C. (2014). About Face: The Essentials of Interaction Design (4th ed.). Wiley. ISBN 978-1-118-76657-6',
        'Cooper et al., 2014',
    ),
    (
        "ref_sommerville2016",
        'Sommerville, I. (2016). Software Engineering (10th ed.). Pearson. ISBN 978-0-13-394303-0',
        'Sommerville, 2016',
    ),
    (
        "ref_wiegers2013",
        'Wiegers, K., & Beatty, J. (2013). Software Requirements (3rd ed.). Microsoft Press. ISBN 978-0-7356-7966-5',
        'Wiegers & Beatty, 2013',
    ),
    (
        "ref_istqb_glossary",
        "ISTQB. (n.d.). ISTQB Glossary: Acceptance criteria. International Software Testing Qualifications Board. "
        "https://glossary.istqb.org/en_US/term/acceptance-criteria",
        "ISTQB, n.d.",
    ),
    (
        "ref_nielsen1994",
        "Nielsen, J. (1994, updated 2024). 10 Usability Heuristics for User Interface Design. Nielsen Norman Group. "
        "https://www.nngroup.com/articles/ten-usability-heuristics/",
        "Nielsen, 1994",
    ),
    (
        "ref_north2006",
        "North, D. (2006). Introducing BDD. Better Software Magazine. https://dannorth.net/introducing-bdd/",
        "North, 2006",
    ),
    (
        "ref_soldani2018",
        "Soldani, J., Tamburri, D. A., & Van Den Heuvel, W.-J. (2018). The pains and gains of microservices: "
        "A Systematic grey literature review. Journal of Systems and Software, 146, 215–232. "
        "https://doi.org/10.1016/j.jss.2018.09.082",
        "Soldani et al., 2018",
    ),
    (
        "ref_stivers2009",
        "Stivers, T., Enfield, N. J., Brown, P., Englert, C., Hayashi, M., Heinemann, T., Hoymann, G., "
        "Rossano, F., de Ruiter, J. P., Yoon, K.-E., & Levinson, S. C. (2009). Universals and cultural "
        "variation in turn-taking in conversation. Proceedings of the National Academy of Sciences, "
        "106(26), 10587–10592. https://doi.org/10.1073/pnas.0903616106",
        "Stivers et al., 2009",
    ),
]


# ---- Độ rộng cột bảng ----
# Word chia đều cột khi không đặt độ rộng, làm cột mã (UC01, NFR-02) rộng bằng
# cột mô tả dài. Độ rộng được tính từ bề rộng chữ đo bằng font Times New Roman
# thật: cột ngắn vừa một dòng, cột chữ không hẹp hơn từ dài nhất, phần còn lại
# chia cho cột chữ theo lượng chữ.
CELL_PAD_CM = 2 * 90 / 567 + 0.12   # lề trái + phải của ô (tblCellMar 90 twips) + dư an toàn
SHORT_MAX_CM = 3.0                  # cột có mọi ô vừa một dòng trong mức này là cột ngắn
_TNR = {}


def _font(bold: bool):
    if bold not in _TNR:
        try:
            from PIL import ImageFont
            name = "Times New Roman Bold.ttf" if bold else "Times New Roman.ttf"
            _TNR[bold] = ImageFont.truetype(f"/System/Library/Fonts/Supplemental/{name}", 110)
        except Exception:  # không có PIL hoặc font: dùng ước lượng
            _TNR[bold] = None
    return _TNR[bold]


def text_cm(text: str, bold: bool = False) -> float:
    """Bề rộng một dòng chữ ở cỡ TABLE_PT (11 pt), đơn vị cm."""
    font = _font(bold)
    if font is None:
        return len(text) * 0.21
    return font.getlength(text) / 10 / 72 * 2.54


def table_layout(rows: list[list[str]], usable_cm: float) -> tuple[list[float], list[bool]]:
    n = max(len(r) for r in rows)
    cols = [[(r[c] if c < len(r) else "") for r in rows] for c in range(n)]
    one_line, min_word, weight = [], [], []
    for col in cols:
        head, body = col[0], (col[1:] or [""])
        body_line = max(text_cm(x) for x in body)
        head_word = max((text_cm(w, True) for w in head.split()), default=0.0)
        body_word = max((text_cm(w) for x in body for w in x.split()), default=0.0)
        one_line.append(max(body_line, head_word) + CELL_PAD_CM)
        min_word.append(min(max(body_word, head_word), 4.0) + CELL_PAD_CM)
        weight.append(max(sum(text_cm(x) for x in body) / len(body), 1.5) ** 0.75)
    short = [one_line[i] <= SHORT_MAX_CM + CELL_PAD_CM for i in range(n)]
    # Quá nhiều cột ngắn thì cột chữ bị ép: chuyển cột ngắn rộng nhất sang cột chữ.
    while sum(one_line[i] for i in range(n) if short[i]) > usable_cm * 0.6 and any(short):
        widest = max((i for i in range(n) if short[i]), key=lambda i: one_line[i])
        short[widest] = False
    if all(short):
        scale = usable_cm / sum(one_line)
        return [w * scale for w in one_line], short
    widths = [one_line[i] if short[i] else 0.0 for i in range(n)]
    free = usable_cm - sum(widths)
    # Chia lặp: cột nào có phần chia nhỏ hơn từ dài nhất thì giữ mức đó,
    # phần còn lại chia tiếp theo trọng số cho các cột chữ khác.
    pending = [i for i in range(n) if not short[i]]
    while pending:
        total_w = sum(weight[i] for i in pending)
        pinned = [i for i in pending if free * weight[i] / total_w < min_word[i]]
        if not pinned:
            for i in pending:
                widths[i] = free * weight[i] / total_w
            break
        for i in pinned:
            widths[i] = min_word[i]
            free -= min_word[i]
            pending.remove(i)
    total = sum(widths)
    if total > usable_cm:  # chỉ xảy ra với bảng quá nhiều cột: thu đều
        widths = [w * usable_cm / total for w in widths]
    return widths, short


_BREAK_AFTER = re.compile(r"([/_.?&,=-])")


def soft_breaks(text: str, width_cm: float) -> str:
    """Cho phép Word ngắt định danh dài (đường dẫn, tên công cụ, biến môi trường)
    sau / _ . ? & , = - thay vì cắt giữa chữ: chèn zero-width space khi từ rộng hơn ô."""
    out = []
    for word in text.split(" "):
        if text_cm(word) + CELL_PAD_CM > width_cm:
            word = _BREAK_AFTER.sub("\\1\u200b", word)
        out.append(word)
    return " ".join(out)

ABSTRACT_PARAS = [
    "Tài xế xe công nghệ thường phải thao tác trên điện thoại trong lúc lái để xem chuyến, cập nhật trạng thái và liên lạc với khách hàng. Luận văn thiết kế, triển khai và đánh giá một trợ lý AI bằng giọng nói giúp tài xế thực hiện các nghiệp vụ này mà không cần dùng tay, theo phương pháp nghiên cứu khoa học thiết kế.",
    "Yêu cầu chức năng được xác định cho bốn nhóm người sử dụng (tài xế, khách hàng, điều phối viên, quản trị viên hệ thống); năm yêu cầu phi chức năng (tính khả dụng, hiệu năng, khả năng mở rộng, khả năng phục hồi, bảo mật) được đặc tả theo ISO/IEC 25010 dưới dạng kịch bản thuộc tính chất lượng, kèm 19 tiêu chí chấp nhận dạng Given – When – Then. Từ các chiến thuật kiến trúc đáp ứng những yêu cầu này, luận văn lập luận lựa chọn kiến trúc microservices trên AWS: Dịch vụ Liên lạc hội thoại thời gian thực xử lý mỗi lượt theo chuỗi STT – LLM kèm gọi công cụ – TTS, có nhà cung cấp dự phòng và câu đệm, tách khỏi các dịch vụ nghiệp vụ. Nguyên mẫu hoạt động trong ứng dụng tài xế (WebRTC) và qua cuộc gọi điện thoại (SIP).",
    "Kết quả đánh giá: 200/200 lượt tiêm lỗi ở mức thành phần không làm hỏng luồng hội thoại; trong môi trường mô phỏng, độ trễ phản hồi không tăng khi số phiên đồng thời tăng từ 1 lên 40, với bộ nhớ khoảng 225 MB mỗi phiên là giới hạn; P95 độ trễ phản hồi của luồng qua mô hình ngôn ngữ là 3,75 giây, chưa đạt ngưỡng 2 giây, với thời gian sinh token đầu là thành phần chi phối; tỷ lệ lỗi từ tăng từ 3,1% lên 7,3% khi có nhiễu; khoảng 88% lượt chọn đúng công cụ. Đánh giá cũng phát hiện hai lỗi hiện thực (nhật ký chứa số điện thoại đầy đủ, một câu báo lỗi chứa thông tin kỹ thuật); cả hai đã được sửa và đạt khi kiểm tra lại. Thứ tự ghé điểm dừng do hệ thống đề xuất dài hơn lời giải tối ưu trung bình 1,2–6,3% trên dữ liệu mô phỏng. Các phép đo còn thiếu được nêu rõ cùng cỡ mẫu và giới hạn.",
    "Từ khóa: trợ lý AI bằng giọng nói, tài xế xe công nghệ, kiến trúc microservices, chiến thuật kiến trúc, ISO/IEC 25010, gọi công cụ, nghiên cứu khoa học thiết kế.",
]

ABSTRACT_EN_PARAS = [
    "Ride-hailing drivers often operate their phones while driving to check trips, update trip status and contact passengers. Following design science research, this thesis designs, implements and evaluates a voice-based AI assistant that lets drivers perform these tasks hands-free.",
    "Functional requirements are specified for four user personas (driver, customer, dispatcher, system administrator). Five non-functional requirements (usability, performance, scalability, resilience, security) are classified with ISO/IEC 25010, written as quality attribute scenarios and paired with 19 acceptance criteria in Given–When–Then form. From the architectural tactics that address these requirements, the thesis argues for a microservices architecture on AWS: a real-time conversational service processes each turn through an STT – LLM with tool calling – TTS pipeline with provider fallback and filler utterances, separated from the business services. The prototype runs in the driver app (WebRTC) and over phone calls (SIP).",
    "Results: all 200 component-level fault injections left the conversation flow intact; in a simulated environment, response latency did not increase as concurrent sessions grew from 1 to 40, with memory (about 225 MB per session) as the limiting resource; the P95 response latency of turns that go through the language model is 3.75 seconds, above the 2-second target, dominated by the model's time to first token; the word error rate rises from 3.1% to 7.3% under simulated cabin noise; about 88% of turns selected the correct tool. The evaluation also revealed two implementation defects (full phone numbers in logs, one error message exposing technical details); both were fixed and passed re-testing. The stop ordering proposed by the system is on average 1.2–6.3% longer than the optimal route on simulated data. Measurements still missing are reported with sample size and limitations.",
    "Keywords: voice AI assistant, ride-hailing driver, microservices architecture, architectural tactics, ISO/IEC 25010, tool calling, design science research.",
]

# Danh mục viết tắt (EN) — chuẩn luận văn VN: ABC; lần đầu trong bài vẫn viết đủ + ngoặc
# Cột: viết tắt | tiếng Anh | tiếng Việt
ABBREVIATIONS_EN = [
    ("AC", "Acceptance Criteria", "Tiêu chí chấp nhận (mã ở Chương 3)"),
    ("ADR", "Architecture Decision Record", "Bản ghi quyết định kiến trúc"),
    ("AI", "Artificial Intelligence", "Trí tuệ nhân tạo"),
    ("API", "Application Programming Interface", "Giao diện lập trình ứng dụng"),
    ("AWS", "Amazon Web Services", "Nền tảng điện toán đám mây của Amazon"),
    ("BDD", "Behaviour-Driven Development", "Phát triển hướng hành vi"),
    ("CLI", "Command-Line Interface", "Giao diện dòng lệnh"),
    ("CON", "Constraint", "Ràng buộc kiến trúc (mã ở Chương 3)"),
    ("ECR", "Elastic Container Registry", "Kho image container của AWS"),
    ("ECS", "Elastic Container Service", "Dịch vụ điều phối container của AWS"),
    ("FaaS", "Function as a Service", "Hàm như dịch vụ"),
    ("FAQ", "Frequently Asked Questions", "Câu hỏi thường gặp"),
    ("FR", "Functional Requirement", "Yêu cầu chức năng"),
    ("HTTP", "Hypertext Transfer Protocol", "Giao thức truyền siêu văn bản"),
    ("HTTPS", "Hypertext Transfer Protocol Secure", "Giao thức HTTP có mã hóa"),
    ("IAM", "Identity and Access Management", "Quản lý định danh và quyền truy cập"),
    ("IIHS", "Insurance Institute for Highway Safety", "Viện Bảo hiểm An toàn Đường cao tốc (Hoa Kỳ)"),
    ("JWT", "JSON Web Token", "Mã thông báo web JSON (xác thực)"),
    ("LLM", "Large Language Model", "Mô hình ngôn ngữ lớn"),
    ("MSA", "Microservices Architecture", "Kiến trúc microservices"),
    ("NFR", "Non-Functional Requirement", "Yêu cầu phi chức năng"),
    ("NHTSA", "National Highway Traffic Safety Administration", "Cục An toàn Giao thông Đường cao tốc (Hoa Kỳ)"),
    ("P50", "50th percentile (median)", "Trung vị: một nửa số lần đo nhanh hơn hoặc bằng mức này"),
    ("P90", "90th percentile", "Mức thời gian mà 90% số lần đo nhanh hơn hoặc bằng"),
    ("P95", "95th percentile", "Mức thời gian mà 95% số lần đo nhanh hơn hoặc bằng; chỉ 5% lần chậm nhất vượt mức này"),
    ("PSTN", "Public Switched Telephone Network", "Mạng điện thoại công cộng"),
    ("RAG", "Retrieval-Augmented Generation", "Sinh câu trả lời có truy xuất tri thức"),
    ("REST", "Representational State Transfer", "Kiểu thiết kế API qua HTTP"),
    ("RQ", "Research Question", "Câu hỏi nghiên cứu"),
    ("SAM", "Serverless Application Model", "Mô hình ứng dụng serverless của AWS (hạ tầng dạng mã)"),
    ("SDK", "Software Development Kit", "Bộ công cụ phát triển phần mềm"),
    ("SIP", "Session Initiation Protocol", "Giao thức khởi tạo phiên thoại"),
    ("SMS", "Short Message Service", "Dịch vụ tin nhắn ngắn"),
    ("STT", "Speech-to-Text", "Nhận dạng giọng nói thành chữ"),
    ("TTFB", "Time to First Byte", "Thời gian đến khi nhận byte (âm thanh) đầu tiên"),
    ("TTL", "Time to Live", "Thời hạn tồn tại của bản ghi hoặc token"),
    ("TTS", "Text-to-Speech", "Tổng hợp giọng nói từ chữ"),
    ("UC", "Use Case", "Trường hợp sử dụng"),
    ("URL", "Uniform Resource Locator", "Địa chỉ tài nguyên trên mạng"),
    ("UUID", "Universally Unique Identifier", "Mã định danh duy nhất"),
    ("VAD", "Voice Activity Detection", "Phát hiện hoạt động giọng nói"),
    ("VPC", "Virtual Private Cloud", "Mạng riêng ảo trên AWS"),
    ("WebRTC", "Web Real-Time Communication", "Truyền thông thời gian thực trên web/ứng dụng"),
    ("WER", "Word Error Rate", "Tỷ lệ lỗi từ khi nhận dạng giọng nói (so với câu đúng)"),
    ("WSS", "WebSocket Secure", "WebSocket có mã hóa"),
]

# Front-matter metadata (Vietnamese academic cover — do not clone English UofT-style template)
THESIS_TITLE = (
    "PHÁT TRIỂN TRỢ LÝ AI BẰNG GIỌNG NÓI HỖ TRỢ TÀI XẾ XE CÔNG NGHỆ"
)
AUTHOR_NAME = "Trương Bá Chính"
DEGREE_VI = "Kỹ thuật phần mềm"
DEGREE_EN = "Master of Software Engineering"
SCHOOL_LINE = "FPT School of Business & Technology (FSB)"
SUPERVISORS = [
    "TS. Lê Minh Đức",
]
PLACE_YEAR = "Hà Nội — 2026"


def _supervisors_phrase() -> str:
    if len(SUPERVISORS) == 1:
        return SUPERVISORS[0]
    if len(SUPERVISORS) == 2:
        return f"{SUPERVISORS[0]} và {SUPERVISORS[1]}"
    return ", ".join(SUPERVISORS[:-1]) + f" và {SUPERVISORS[-1]}"


THANKS_PARAS = [
    "Trước hết, tôi xin bày tỏ lòng biết ơn sâu sắc tới "
    f"{_supervisors_phrase()}, "
    "giảng viên hướng dẫn đã tận tình chỉ bảo, định hướng chuyên môn và góp ý trong suốt quá trình thực hiện luận văn.",
    "Tôi xin chân thành cảm ơn Ban Giám hiệu, quý thầy cô và toàn thể cán bộ của "
    "FPT School of Business & Technology (FSB) đã tạo điều kiện học tập và nghiên cứu thuận lợi.",
    "Tôi cũng xin gửi lời cảm ơn đến đồng nghiệp, bạn bè đã sẵn sàng chia sẻ kinh nghiệm, "
    "hỗ trợ chuyên môn và động viên trong quá trình triển khai hệ thống nguyên mẫu.",
    "Đặc biệt, tôi xin bày tỏ lòng biết ơn sâu sắc đến gia đình — chỗ dựa vững chắc, "
    "luôn động viên và tạo điều kiện để tôi hoàn thành luận văn này.",
    "Dù đã dành nhiều thời gian và nỗ lực, luận văn khó tránh khỏi thiếu sót. "
    "Tôi rất mong nhận được ý kiến đóng góp của quý thầy cô và bạn đọc để hoàn thiện hơn.",
    "Xin trân trọng cảm ơn!",
]

DECLARATION_PARAS = [
    (
        "Tôi xin cam đoan đây là công trình nghiên cứu của riêng tôi, được thực hiện dưới sự hướng dẫn của "
        f"{_supervisors_phrase()}. Các kết quả nêu trong luận văn là trung thực và chưa được "
        "công bố trong bất kỳ công trình nào khác để nhận bằng cấp."
    ),
    (
        "Tôi xin chịu trách nhiệm trước Nhà trường về tính trung thực của luận văn này."
    ),
]


def enable_update_fields_on_open(doc: Document) -> None:
    settings = doc.settings.element
    # w:updateFields so Word refreshes TOC when opening
    existing = settings.find(qn("w:updateFields"))
    if existing is None:
        el = OxmlElement("w:updateFields")
        el.set(qn("w:val"), "true")
        settings.append(el)
    else:
        existing.set(qn("w:val"), "true")


def set_run_font(run, size_pt=BODY_PT, bold=None, *, color: RGBColor | None = TEXT_BLACK) -> None:
    run.font.name = FONT_NAME
    if bold is not None:
        run.bold = bold
    if size_pt:
        run.font.size = Pt(size_pt)
    if color is not None:
        run.font.color.rgb = color
    r = run._element
    rPr = r.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.insert(0, rFonts)
    rFonts.set(qn("w:ascii"), FONT_NAME)
    rFonts.set(qn("w:hAnsi"), FONT_NAME)
    rFonts.set(qn("w:eastAsia"), FONT_NAME)


def apply_section_margins(sec) -> None:
    sec.top_margin = Cm(MARGIN_TOP_CM)
    sec.bottom_margin = Cm(MARGIN_BOTTOM_CM)
    sec.left_margin = Cm(MARGIN_LEFT_CM)
    sec.right_margin = Cm(MARGIN_RIGHT_CM)


def configure_base_styles(doc: Document) -> None:
    """Push locked sizes into Word styles so cloned front-matter stays closer to standard."""
    try:
        normal = doc.styles["Normal"]
        normal.font.name = FONT_NAME
        normal.font.size = Pt(BODY_PT)
        normal.font.color.rgb = TEXT_BLACK
        normal.paragraph_format.line_spacing = BODY_LINE
        normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    except KeyError:
        pass
    for name, size, bold in (
        ("Heading 1", H1_PT, True),
        ("Heading 2", H2_PT, True),
        ("Heading 3", H3_PT, True),
    ):
        try:
            st = doc.styles[name]
            st.font.name = FONT_NAME
            st.font.size = Pt(size)
            st.font.bold = bold
            st.font.color.rgb = TEXT_BLACK
        except KeyError:
            pass


def add_bookmark(paragraph: Paragraph, name: str, bookmark_id: int) -> None:
    """Wrap paragraph content with a bookmark start/end."""
    start = OxmlElement("w:bookmarkStart")
    start.set(qn("w:id"), str(bookmark_id))
    start.set(qn("w:name"), name)
    end = OxmlElement("w:bookmarkEnd")
    end.set(qn("w:id"), str(bookmark_id))
    p = paragraph._p
    p.insert(0, start)
    p.append(end)


def add_internal_hyperlink(paragraph: Paragraph, bookmark: str, text: str) -> None:
    """Hyperlink to a bookmark inside the same document."""
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("w:anchor"), bookmark)
    hyperlink.set(qn("w:history"), "1")
    run = OxmlElement("w:r")
    rPr = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "0563C1")
    rPr.append(color)
    u = OxmlElement("w:u")
    u.set(qn("w:val"), "single")
    rPr.append(u)
    rFonts = OxmlElement("w:rFonts")
    rFonts.set(qn("w:ascii"), FONT_NAME)
    rFonts.set(qn("w:hAnsi"), FONT_NAME)
    rFonts.set(qn("w:eastAsia"), FONT_NAME)
    rPr.append(rFonts)
    sz = OxmlElement("w:sz")
    sz.set(qn("w:val"), str(BODY_PT * 2))  # half-points
    rPr.append(sz)
    run.append(rPr)
    t = OxmlElement("w:t")
    t.set(qn("xml:space"), "preserve")
    t.text = text
    run.append(t)
    hyperlink.append(run)
    paragraph._p.append(hyperlink)


def add_page_numbers(doc: Document) -> None:
    """Footer: MỘT số trang ở góc dưới bên phải (Ả Rập, toàn tài liệu).

    Xoá sạch mọi nội dung footer sẵn có (kể cả số trang từ template gốc) rồi
    dựng lại đúng một đoạn canh phải chứa field PAGE. Word tính số khi mở file.
    """
    for section in doc.sections:
        footer = section.footer
        footer.is_linked_to_previous = False
        ftr = footer._element  # <w:ftr>
        # Xoá MỌI nội dung sẵn có: đoạn văn, bảng, và cả content-control <w:sdt>
        # (template gốc bọc số trang trong <w:sdt> nên footer.paragraphs không thấy).
        for child in list(ftr):
            if child.tag in (qn("w:p"), qn("w:tbl"), qn("w:sdt")):
                ftr.remove(child)
        para = footer.add_paragraph()
        para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        para.paragraph_format.space_before = Pt(0)
        para.paragraph_format.space_after = Pt(0)
        run = para.add_run()
        for typ in ("begin",):
            el = OxmlElement("w:fldChar"); el.set(qn("w:fldCharType"), typ); run._r.append(el)
        instr = OxmlElement("w:instrText"); instr.set(qn("xml:space"), "preserve"); instr.text = " PAGE "
        run._r.append(instr)
        for typ in ("separate", "end"):
            el = OxmlElement("w:fldChar"); el.set(qn("w:fldCharType"), typ); run._r.append(el)
        set_run_font(run, CAPTION_PT)


def add_toc_field(paragraph: Paragraph) -> None:
    """Insert a Word TOC field with hyperlinks (\\h)."""
    run = paragraph.add_run()
    r = run._r

    def fld_char(typ: str):
        el = OxmlElement("w:fldChar")
        el.set(qn("w:fldCharType"), typ)
        return el

    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    # \\h = hyperlinks; \\z = hide tab/page in web view; \\u = outline levels
    instr.text = ' TOC \\o "1-3" \\h \\z \\u '

    r.append(fld_char("begin"))
    r.append(instr)
    r.append(fld_char("separate"))
    # Placeholder until Word updates the field
    run2 = paragraph.add_run(
        "Nhấp chuột phải rồi chọn Update Field (Cập nhật trường) để hiện mục lục. "
        "Sau đó bấm vào từng mục để nhảy tới nội dung tương ứng."
    )
    run2.italic = True
    set_run_font(run2, CAPTION_PT)
    run3 = paragraph.add_run()
    run3._r.append(fld_char("end"))


def build() -> Path:
    src = Document(str(SRC))
    new = Document(str(SRC))
    enable_update_fields_on_open(new)
    configure_base_styles(new)

    body = new.element.body
    sectPr = body.find(qn("w:sectPr"))
    for child in list(body):
        if child is not sectPr:
            body.remove(child)

    for sec in new.sections:
        apply_section_margins(sec)
    add_page_numbers(new)

    bookmark_id = 1

    def insert_before_sect(el):
        if sectPr is not None:
            sectPr.addprevious(el)
        else:
            body.append(el)

    landscape_open = False

    def section_break(landscape: bool, host=None):
        """Kết thúc section hiện tại bằng một bản sao sectPr chính (giữ footer số trang,
        không đánh số lại). landscape=True: section vừa kết thúc là trang A4 ngang."""
        sp = deepcopy(sectPr)
        for tag in ("w:pgNumType", "w:titlePg"):
            for el in sp.findall(qn(tag)):
                sp.remove(el)
        if landscape:
            sz = sp.find(qn("w:pgSz"))
            sz.set(qn("w:w"), "16838")
            sz.set(qn("w:h"), "11906")
            sz.set(qn("w:orient"), "landscape")
            mar = sp.find(qn("w:pgMar"))
            for side, cm in (("top", 2.0), ("bottom", 2.0), ("left", 2.5), ("right", 2.5)):
                mar.set(qn(f"w:{side}"), str(int(cm * 567)))
        if host is None:
            p = OxmlElement("w:p")
            insert_before_sect(p)
            host = Paragraph(p, new)
        host._p.get_or_add_pPr().append(sp)

    def clone_para(paragraph):
        return deepcopy(paragraph._element)

    def add_page_break():
        p = OxmlElement("w:p")
        insert_before_sect(p)
        paragraph = Paragraph(p, new)
        paragraph.add_run().add_break(WD_BREAK.PAGE)
        return paragraph

    def add_styled(
        text: str,
        style: str,
        *,
        first_line_indent=True,
        italic=False,
        space_after=6,
        bookmark: str | None = None,
        line_spacing: float | None = None,
        justify: bool | None = None,
        center: bool = False,
        bold: bool | None = None,
        size_pt: float | None = None,
        space_before: float = 0,
    ):
        nonlocal bookmark_id
        p = OxmlElement("w:p")
        insert_before_sect(p)
        paragraph = Paragraph(p, new)
        try:
            paragraph.style = new.styles[style]
        except KeyError:
            paragraph.style = new.styles["Normal"]
        run = paragraph.add_run(text)
        run.italic = italic
        pf = paragraph.paragraph_format
        pf.space_after = Pt(space_after)
        pf.space_before = Pt(space_before)
        if style == "Heading 1":
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            set_run_font(run, H1_PT, bold=True)
            pf.space_before = Pt(0)
            pf.space_after = Pt(18)
            pf.line_spacing = 1.0
            pf.first_line_indent = Cm(0)
        elif style in ("Heading 2", "Heading 3"):
            paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            set_run_font(run, H2_PT if style == "Heading 2" else H3_PT, bold=True)
            pf.space_before = Pt(12)
            pf.space_after = Pt(8)
            pf.line_spacing = 1.0
            pf.first_line_indent = Cm(0)
        else:
            if center:
                paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                use_justify = True if justify is None else justify
                paragraph.alignment = (
                    WD_ALIGN_PARAGRAPH.JUSTIFY if use_justify else WD_ALIGN_PARAGRAPH.LEFT
                )
            use_bold = bold if bold is not None else False
            use_size = size_pt if size_pt is not None else BODY_PT
            set_run_font(run, use_size, bold=use_bold)
            pf.line_spacing = BODY_LINE if line_spacing is None else line_spacing
            pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
            pf.first_line_indent = Cm(FIRST_INDENT_CM) if first_line_indent else Cm(0)
        if bookmark:
            add_bookmark(paragraph, bookmark, bookmark_id)
            bookmark_id += 1
        return paragraph

    def add_list_item(raw: str):
        """Gạch đầu dòng (–) hoặc danh sách số, thụt lề treo; giữ chữ đậm của nhãn đầu ý."""
        m = re.match(r"^(- |\d+\. )(.*)$", raw)
        marker = "–" if m.group(1) == "- " else m.group(1).strip()
        body_text = m.group(2).replace("`", "")
        paragraph = add_styled("", "Normal", first_line_indent=False, space_after=3)
        pf = paragraph.paragraph_format
        pf.left_indent = Cm(1.0)
        pf.first_line_indent = Cm(-0.6)
        pf.tab_stops.add_tab_stop(Cm(1.0))
        run = paragraph.add_run(marker + "\t")
        set_run_font(run, BODY_PT)
        for k, seg in enumerate(body_text.split("**")):
            if seg:
                run = paragraph.add_run(seg.replace("*", ""))
                set_run_font(run, BODY_PT, bold=(k % 2 == 1))
        return paragraph

    def add_blank(n: int = 1):
        for _ in range(n):
            add_styled("", "Normal", first_line_indent=False, space_after=6, line_spacing=1.0)

    def add_cover_pages():
        """Một trang bìa duy nhất (không nhân đôi trang gần giống nhau)."""
        for line, sz, bold in [
            ("BỘ GIÁO DỤC VÀ ĐÀO TẠO", 13, True),
            ("TRƯỜNG ĐẠI HỌC FPT", 13, True),
            (SCHOOL_LINE, 12, False),
        ]:
            add_styled(
                line,
                "Normal",
                first_line_indent=False,
                center=True,
                bold=bold,
                size_pt=sz,
                space_after=4,
                line_spacing=1.15,
                justify=False,
            )
        add_blank(3)
        add_styled(
            "LUẬN VĂN THẠC SĨ",
            "Normal",
            first_line_indent=False,
            center=True,
            bold=True,
            size_pt=16,
            space_after=16,
            line_spacing=1.15,
            justify=False,
        )
        add_styled(
            THESIS_TITLE,
            "Normal",
            first_line_indent=False,
            center=True,
            bold=True,
            size_pt=14,
            space_after=14,
            line_spacing=1.3,
            justify=False,
        )
        add_blank(2)
        add_styled(
            f"Chương trình đào tạo: Thạc sĩ — {DEGREE_VI}",
            "Normal",
            first_line_indent=False,
            center=True,
            size_pt=13,
            space_after=4,
            line_spacing=1.15,
            justify=False,
        )
        add_styled(
            f"({DEGREE_EN})",
            "Normal",
            first_line_indent=False,
            center=True,
            italic=True,
            size_pt=12,
            space_after=16,
            line_spacing=1.15,
            justify=False,
        )
        add_blank(1)
        add_styled(
            f"Học viên thực hiện: {AUTHOR_NAME}",
            "Normal",
            first_line_indent=False,
            center=True,
            size_pt=13,
            space_after=10,
            line_spacing=1.15,
            justify=False,
        )
        add_styled(
            "Giảng viên hướng dẫn:",
            "Normal",
            first_line_indent=False,
            center=True,
            bold=True,
            size_pt=13,
            space_after=6,
            line_spacing=1.15,
            justify=False,
        )
        for name in SUPERVISORS:
            add_styled(
                name,
                "Normal",
                first_line_indent=False,
                center=True,
                size_pt=13,
                space_after=4,
                line_spacing=1.15,
                justify=False,
            )
        add_blank(4)
        add_styled(
            PLACE_YEAR,
            "Normal",
            first_line_indent=False,
            center=True,
            bold=True,
            size_pt=13,
            space_after=6,
            line_spacing=1.15,
            justify=False,
        )

    def add_heading1_new_page(text: str, bookmark: str | None = None):
        add_page_break()
        return add_styled(text, "Heading 1", first_line_indent=False, bookmark=bookmark)

    def add_table_caption(text: str):
        p = add_styled(text, "Normal", first_line_indent=False, space_after=6, line_spacing=1.0)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        # Giữ tên bảng dính với bảng ngay sau nó (không để rơi cuối trang tách khỏi nội dung).
        p.paragraph_format.keep_with_next = True
        for run in p.runs:
            set_run_font(run, CAPTION_PT, bold=True)
        return p

    def add_figure_caption(text: str):
        p = add_styled(text, "Normal", first_line_indent=False, space_after=6, line_spacing=1.0)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        # Chú thích hình nằm dưới hình: hình giữ với chú thích (keep_with_next ở đoạn ảnh),
        # còn chú thích không kéo đoạn phía sau theo, tránh đẩy cả khối sang trang mới.
        p.paragraph_format.keep_with_next = False
        for run in p.runs:
            set_run_font(run, CAPTION_PT, bold=True)
        return p

    def add_figure_image(rel_path: str, width_cm: float = 14.0):
        img_path = ROOT / rel_path
        if not img_path.is_file():
            add_styled(
                f"(Thiếu file hình: {rel_path})",
                "Normal",
                first_line_indent=False,
                italic=True,
            )
            return None
        p = OxmlElement("w:p")
        insert_before_sect(p)
        paragraph = Paragraph(p, new)
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = paragraph.add_run()
        run.add_picture(str(img_path), width=Cm(width_cm))
        pf = paragraph.paragraph_format
        pf.space_before = Pt(6)
        pf.space_after = Pt(6)
        # Chú thích nằm dưới hình: giữ hình cùng trang với chú thích.
        pf.keep_with_next = True
        return paragraph

    def set_cell_border(cell):
        tc = cell._tc
        tcPr = tc.get_or_add_tcPr()
        tcBorders = OxmlElement("w:tcBorders")
        for edge in ("top", "left", "bottom", "right"):
            el = OxmlElement(f"w:{edge}")
            el.set(qn("w:val"), "single")
            el.set(qn("w:sz"), "8")
            el.set(qn("w:space"), "0")
            el.set(qn("w:color"), "000000")
            tcBorders.append(el)
        old = tcPr.find(qn("w:tcBorders"))
        if old is not None:
            tcPr.remove(old)
        tcPr.append(tcBorders)

    def shade_cell(cell, fill="D9E2F3"):
        tc = cell._tc
        tcPr = tc.get_or_add_tcPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:fill"), fill)
        shd.set(qn("w:val"), "clear")
        old = tcPr.find(qn("w:shd"))
        if old is not None:
            tcPr.remove(old)
        tcPr.append(shd)

    def add_bordered_table(data_rows: list[list[str]]):
        cols = max(len(r) for r in data_rows)
        data_rows = [r + [""] * (cols - len(r)) for r in data_rows]
        usable_cm = 21.0 - MARGIN_LEFT_CM - MARGIN_RIGHT_CM
        widths, short = table_layout(data_rows, usable_cm)
        table = new.add_table(rows=len(data_rows), cols=cols)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        tbl = table._tbl
        body.remove(tbl)
        insert_before_sect(tbl)
        tblPr = tbl.tblPr
        if tblPr is None:
            tblPr = OxmlElement("w:tblPr")
            tbl.insert(0, tblPr)
        for tag in ("w:tblW", "w:tblLayout", "w:tblCellMar"):
            old = tblPr.find(qn(tag))
            if old is not None:
                tblPr.remove(old)
        tbl_w = OxmlElement("w:tblW")
        tbl_w.set(qn("w:w"), str(int(sum(widths) * 567)))
        tbl_w.set(qn("w:type"), "dxa")
        tblPr.append(tbl_w)
        layout = OxmlElement("w:tblLayout")
        layout.set(qn("w:type"), "fixed")
        tblPr.append(layout)
        cell_mar = OxmlElement("w:tblCellMar")
        for edge, val in (("top", 40), ("bottom", 40), ("left", 90), ("right", 90)):
            el = OxmlElement(f"w:{edge}")
            el.set(qn("w:w"), str(val))
            el.set(qn("w:type"), "dxa")
            cell_mar.append(el)
        tblPr.append(cell_mar)
        borders = OxmlElement("w:tblBorders")
        for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
            el = OxmlElement(f"w:{edge}")
            el.set(qn("w:val"), "single")
            el.set(qn("w:sz"), "8")
            el.set(qn("w:space"), "0")
            el.set(qn("w:color"), "000000")
            borders.append(el)
        old = tblPr.find(qn("w:tblBorders"))
        if old is not None:
            tblPr.remove(old)
        tblPr.append(borders)
        grid = tbl.tblGrid
        for gc, w in zip(grid.findall(qn("w:gridCol")), widths):
            gc.set(qn("w:w"), str(int(w * 567)))
        for r_idx, row in enumerate(data_rows):
            tr = table.rows[r_idx]._tr
            trPr = tr.get_or_add_trPr()
            # Không cho một hàng bị ngắt ngang giữa hai trang.
            cant_split = OxmlElement("w:cantSplit")
            trPr.append(cant_split)
            if r_idx == 0:
                # Hàng tiêu đề lặp lại ở đầu trang khi bảng dài phải sang trang.
                tbl_header = OxmlElement("w:tblHeader")
                tbl_header.set(qn("w:val"), "true")
                trPr.append(tbl_header)
            for c_idx, val in enumerate(row):
                cell = table.cell(r_idx, c_idx)
                cell.width = Cm(widths[c_idx])
                cell.text = soft_breaks(val, widths[c_idx])
                set_cell_border(cell)
                tcPr = cell._tc.get_or_add_tcPr()
                v_align = OxmlElement("w:vAlign")
                v_align.set(qn("w:val"), "center")
                tcPr.append(v_align)
                if r_idx == 0:
                    shade_cell(cell)
                for p in cell.paragraphs:
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(2)
                    p.paragraph_format.line_spacing = REF_LINE
                    p.paragraph_format.first_line_indent = Cm(0)
                    p.alignment = (WD_ALIGN_PARAGRAPH.CENTER if (r_idx == 0 or short[c_idx])
                                   else WD_ALIGN_PARAGRAPH.LEFT)
                    if r_idx == 0:
                        p.paragraph_format.keep_with_next = True   # hàng tiêu đề không rời hàng đầu
                    for run in p.runs:
                        set_run_font(run, TABLE_PT, bold=(r_idx == 0))
        return table

    def add_paragraph_with_cite_links(text: str):
        """Split text on known cite keys and hyperlink them to ref bookmarks."""
        p = OxmlElement("w:p")
        insert_before_sect(p)
        paragraph = Paragraph(p, new)
        paragraph.style = new.styles["Normal"]
        paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        pf = paragraph.paragraph_format
        pf.line_spacing = BODY_LINE
        pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
        pf.space_after = Pt(6)
        pf.first_line_indent = Cm(FIRST_INDENT_CM)

        # Build segments by scanning for cite labels in parentheses
        cites = [(label, bookmark) for bookmark, _full, label in REFERENCES]
        cites.sort(key=lambda x: -len(x[0]))
        remaining = text
        while remaining:
            earliest = None
            earliest_label = None
            earliest_bm = None
            for label, bm in cites:
                needle = f"({label})"
                idx = remaining.find(needle)
                if idx >= 0 and (earliest is None or idx < earliest):
                    earliest = idx
                    earliest_label = label
                    earliest_bm = bm
            if earliest is None:
                run = paragraph.add_run(remaining)
                set_run_font(run, BODY_PT)
                break
            if earliest > 0:
                run = paragraph.add_run(remaining[:earliest])
                set_run_font(run, BODY_PT)
            # linked cite including parentheses
            add_internal_hyperlink(paragraph, earliest_bm, f"({earliest_label})")
            remaining = remaining[earliest + len(earliest_label) + 2 :]
        return paragraph

    add_cover_pages()

    add_heading1_new_page("Lời cam đoan", bookmark="loi_cam_doan")
    for para in DECLARATION_PARAS:
        add_styled(para, "Normal", first_line_indent=True)
    add_blank(2)
    add_styled(
        f"{PLACE_YEAR}",
        "Normal",
        first_line_indent=False,
        justify=False,
        space_after=4,
    )
    add_styled(
        f"Học viên",
        "Normal",
        first_line_indent=False,
        justify=False,
        space_after=4,
    )
    add_styled(
        AUTHOR_NAME,
        "Normal",
        first_line_indent=False,
        bold=True,
        justify=False,
        space_after=6,
    )

    add_heading1_new_page("Tóm tắt", bookmark="tom_tat")
    for para in ABSTRACT_PARAS:
        add_styled(para, "Normal", first_line_indent=True)

    add_heading1_new_page("Abstract", bookmark="abstract")
    for para in ABSTRACT_EN_PARAS:
        add_styled(para, "Normal", first_line_indent=True)

    add_heading1_new_page("Lời cảm ơn", bookmark="loi_cam_on")
    for para in THANKS_PARAS:
        add_styled(para, "Normal", first_line_indent=True)

    def collect_captions(prefix: str) -> list[str]:
        """Captions in chapter order, read from the chapter drafts so the lists never drift."""
        found: list[str] = []
        for md in CHAPTER_MDS:
            for line in md.read_text(encoding="utf-8").splitlines():
                if line.startswith("## Tài liệu trích dẫn") or line.startswith("## Self-review"):
                    break
                t = line.strip()
                if t.startswith(f"**{prefix} ") and "**" in t[2:]:
                    found.append(clean_inline(t).strip().rstrip("."))
        return found

    add_heading1_new_page("Danh sách hình ảnh", bookmark="ds_hinh")
    for caption in collect_captions("Hình") + [c for _p, c in APPENDIX_C_FIGURES]:
        add_styled(caption, "Normal", first_line_indent=False)

    add_heading1_new_page("Danh sách bảng", bookmark="ds_bang")
    for caption in collect_captions("Bảng") + [
        "Bảng A.1. Danh mục công cụ gói tiếng Việt (45 công cụ)",
        "Bảng D.1. Cấu hình chính của tác nhân hội thoại",
        "Bảng E.1. Ma trận đối chiếu yêu cầu",
        "Bảng F.1. Đối chiếu các bước sequence với mã nguồn",
        "Bảng G.1. Ánh xạ tên thành phần",
        "Bảng H.1. Tái lập số liệu thực nghiệm",
        "Bảng I.1. Bảng thuật ngữ Anh – Việt",
    ]:
        add_styled(caption, "Normal", first_line_indent=False)

    # Danh mục viết tắt (sau DS bảng, trước Mục lục) — theo hướng dẫn luận văn VN (UEH/CTU/…)
    add_heading1_new_page("Danh mục từ viết tắt", bookmark="ds_viet_tat")
    add_styled(
        "Luận văn chỉ viết tắt các thuật ngữ dùng nhiều lần. Lần xuất hiện đầu trong thân bài "
        "vẫn viết đầy đủ kèm chữ viết tắt trong ngoặc đơn. Bảng dưới xếp theo thứ tự ABC.",
        "Normal",
        first_line_indent=True,
    )
    add_bordered_table(
        [["Từ viết tắt", "Tiếng Anh", "Tiếng Việt"]]
        + [[a, b, c] for a, b, c in ABBREVIATIONS_EN]
    )

    # Auto TOC (clickable after Update Field in Word)
    add_heading1_new_page("Mục lục", bookmark="muc_luc")
    toc_p = OxmlElement("w:p")
    insert_before_sect(toc_p)
    toc_para = Paragraph(toc_p, new)
    add_toc_field(toc_para)

    def load_chapter_body(md_path: Path) -> list[str]:
        md_lines = md_path.read_text(encoding="utf-8").splitlines()
        content_lines: list[str] = []
        for line in md_lines:
            if line.startswith("## Tài liệu trích dẫn") or line.startswith("## Self-review"):
                break
            if line.strip() == "---" and content_lines and any(
                "Kết luận chương" in x for x in content_lines[-20:]
            ):
                break
            content_lines.append(line)
        return content_lines

    def render_chapter(md_path: Path, bookmark: str) -> None:
        nonlocal landscape_open
        content_lines = load_chapter_body(md_path)
        first_h1 = True
        i = 0
        while i < len(content_lines):
            s = content_lines[i].strip()
            i += 1
            if not s:
                continue
            if s.startswith(">"):
                s = s.lstrip(">").strip()
                if not s:
                    continue
            if s.startswith("|") and "|" in s[1:]:
                rows = [s]
                while i < len(content_lines) and content_lines[i].strip().startswith("|"):
                    rows.append(content_lines[i].strip())
                    i += 1
                data_rows = []
                for r in rows:
                    core = r.replace("|", "").replace("-", "").replace(":", "").replace(" ", "")
                    if core:
                        data_rows.append([clean_inline(c).strip() for c in r.strip("|").split("|")])
                if data_rows:
                    add_bordered_table(data_rows)
                    add_styled("", "Normal", first_line_indent=False, space_after=6)
                continue
            if s.startswith("**Bảng ") and "**" in s[2:]:
                add_table_caption(clean_inline(s).strip())
                continue
            if s.startswith("**Hình ") and "**" in s[2:]:
                cap = add_figure_caption(clean_inline(s).strip())
                if landscape_open:
                    section_break(landscape=True, host=cap)   # trang ngang kết thúc ở chú thích
                    landscape_open = False
                continue
            if s.startswith("![") and "](" in s and s.endswith(")"):
                # ![alt](relative/path.png)
                path = s.split("](", 1)[1][:-1]
                if "H4_1_aws_architecture" in path:
                    # Hình 4.1 in trên một trang A4 ngang riêng (vùng hình 24,7 × 14,5 cm).
                    section_break(landscape=False)
                    landscape_open = True
                    width = figure_width_cm(ROOT / path, max_w=24.7, max_h=14.5)
                elif "diagrams/H4_S" in path:
                    width = figure_width_cm(ROOT / path, max_h=17.0)   # sequence: chừa chỗ tiêu đề mục, chú thích
                else:
                    width = figure_width_cm(ROOT / path)
                add_figure_image(path, width_cm=width)
                continue
            if s.startswith("# "):
                title = clean_inline(s[2:]).strip()
                if first_h1:
                    add_heading1_new_page(title, bookmark=bookmark)
                    first_h1 = False
                else:
                    add_styled(title, "Heading 1", first_line_indent=False)
                continue
            if s.startswith("## "):
                add_styled(clean_inline(s[3:]).strip(), "Heading 2", first_line_indent=False)
                continue
            if s.startswith("### "):
                add_styled(clean_inline(s[4:]).strip(), "Heading 3", first_line_indent=False)
                continue
            text = clean_inline(s)
            if any(f"({label})" in text for _, _, label in REFERENCES):
                add_paragraph_with_cite_links(text)
            elif re.match(r"^(- |\d+\. )", s):
                add_list_item(s)
            else:
                add_styled(text, "Normal", first_line_indent=True)

    for idx, md_path in enumerate(CHAPTER_MDS, start=1):
        render_chapter(md_path, bookmark=f"chuong_{idx}")

    add_heading1_new_page("Kết luận và hướng phát triển", bookmark="ket_luan")
    for para in CONCLUSION_PARAS:
        if para.startswith("- "):
            add_list_item(para)
        else:
            add_styled(para, "Normal", first_line_indent=True)

    add_heading1_new_page("Tài liệu tham khảo", bookmark="tai_lieu_tham_khao")
    add_styled(
        "Danh mục dưới đây gồm các nguồn được trích dẫn trong luận văn, xếp theo thứ tự chữ cái của tác giả.",
        "Normal",
        first_line_indent=True,
    )
    for n, (bm, ref, _label) in enumerate(sorted(REFERENCES, key=lambda r: r[1].lower()), 1):
        p = add_styled(
            f"[{n}] {ref}",
            "Normal",
            first_line_indent=False,
            bookmark=bm,
            line_spacing=REF_LINE,
        )
        pf = p.paragraph_format
        pf.left_indent = Cm(1.0)
        pf.first_line_indent = Cm(-1.0)

    add_heading1_new_page("Phụ lục", bookmark="phu_luc")
    add_styled(
        "Phụ lục gồm: A — danh mục công cụ; B — kịch bản hội thoại mẫu; C — ảnh giao diện; "
        "D — cấu hình môi trường (không chứa bí mật); E — ma trận đối chiếu yêu cầu; "
        "F — bảng đối chiếu sequence diagram với mã nguồn; G — bảng ánh xạ tên thành phần.",
        "Normal",
        first_line_indent=True,
    )

    # ---- Phụ lục A: danh mục công cụ ----
    add_styled("Phụ lục A. Danh mục công cụ của trợ lý giọng nói", "Heading 2", first_line_indent=False)
    add_styled(APPENDIX_A_INTRO, "Normal", first_line_indent=True)
    add_table_caption("Bảng A.1. Danh mục công cụ gói tiếng Việt (45 công cụ)")
    add_bordered_table(
        [["STT", "Tên công cụ", "Mô tả ngắn"]]
        + [[str(i), name, desc] for i, (name, desc) in enumerate(APPENDIX_A_TOOLS, 1)]
    )
    add_styled("", "Normal", first_line_indent=False, space_after=6)

    # ---- Phụ lục B: kịch bản thoại ----
    add_styled("Phụ lục B. Kịch bản thoại mẫu", "Heading 2", first_line_indent=False)
    add_styled(APPENDIX_B_INTRO, "Normal", first_line_indent=True)
    for title, turns in APPENDIX_B_DIALOGUES:
        add_styled(title, "Heading 3", first_line_indent=False)
        for turn in turns:
            add_styled(turn, "Normal", first_line_indent=False, space_after=2, line_spacing=1.15)
        add_styled("", "Normal", first_line_indent=False, space_after=6)

    # ---- Phụ lục C: ảnh giao diện ----
    add_styled("Phụ lục C. Ảnh màn hình ứng dụng và trang quản trị", "Heading 2", first_line_indent=False)
    add_styled(
        "Các ảnh dưới đây minh họa giao diện nguyên mẫu ở thời điểm chụp. Thông tin định danh "
        "trong ảnh (số điện thoại, thư điện tử, biển số…) thuộc tài khoản thử nghiệm nội bộ; "
        "khi in ấn có thể che trực tiếp trên bản DOCX.",
        "Normal",
        first_line_indent=True,
    )
    for rel_path, caption in APPENDIX_C_FIGURES:
        add_figure_image(rel_path, width_cm=figure_width_cm(ROOT / rel_path))
        add_figure_caption(caption)
        add_styled("", "Normal", first_line_indent=False, space_after=4, line_spacing=1.0)

    # ---- Phụ lục D: cấu hình môi trường ----
    add_styled("Phụ lục D. Cấu hình môi trường triển khai", "Heading 2", first_line_indent=False)
    add_styled(APPENDIX_D_INTRO, "Normal", first_line_indent=True)
    add_table_caption("Bảng D.1. Cấu hình chính của tác nhân hội thoại")
    add_bordered_table(
        [["Biến", "Ý nghĩa", "Giá trị"]] + [list(row) for row in APPENDIX_D_ENV]
    )
    add_styled(
        "Không đưa khóa API, token LiveKit, mật khẩu hay đường dẫn credential vào luận văn.",
        "Normal",
        first_line_indent=True,
        italic=True,
    )

    # ---- Phụ lục E: ma trận đối chiếu yêu cầu ----
    add_styled("Phụ lục E. Ma trận đối chiếu yêu cầu", "Heading 2", first_line_indent=False)
    add_styled(
        "Bảng E.1 liên kết từng yêu cầu với câu hỏi nghiên cứu, thành phần, sequence diagram, hiện thực "
        "trong mã nguồn, kịch bản đánh giá và bảng kết quả ở Chương 6.",
        "Normal",
        first_line_indent=True,
    )
    add_table_caption("Bảng E.1. Ma trận đối chiếu yêu cầu")
    add_bordered_table(
        [["Mã yêu cầu", "RQ", "Thành phần", "Sequence", "Hiện thực chính", "Kịch bản", "Kết quả"]]
        + [list(row) for row in APPENDIX_E_RTM]
    )
    add_styled("", "Normal", first_line_indent=False, space_after=6)

    # ---- Phụ lục F: đối chiếu sequence ----
    add_styled("Phụ lục F. Đối chiếu sequence diagram với mã nguồn", "Heading 2", first_line_indent=False)
    add_styled(
        "Bảng F.1 ghi vị trí mã nguồn (tệp và dòng, tính từ thư mục src/backend/ tại thời điểm viết) "
        "hiện thực các bước của sequence S1–S6 ở mục 4.5.",
        "Normal",
        first_line_indent=True,
    )
    add_table_caption("Bảng F.1. Đối chiếu các bước sequence với mã nguồn")
    add_bordered_table(
        [["Sequence", "Bước", "Thông điệp", "Vị trí mã nguồn"]]
        + [list(row) for row in APPENDIX_F_SEQUENCE]
    )
    add_styled("", "Normal", first_line_indent=False, space_after=6)

    # ---- Phụ lục G: ánh xạ tên ----
    add_styled("Phụ lục G. Bảng ánh xạ tên thành phần", "Heading 2", first_line_indent=False)
    add_styled(
        "Thân luận văn dùng tên tiếng Việt theo chức năng; Bảng G.1 đối chiếu với tên thư mục mã nguồn, "
        "tài nguyên AWS và lớp trên Hình 4.1.",
        "Normal",
        first_line_indent=True,
    )
    add_table_caption("Bảng G.1. Ánh xạ tên thành phần")
    add_bordered_table(
        [["Tên trong luận văn", "Tên trong mã nguồn", "Tài nguyên triển khai", "Lớp trên Hình 4.1"]]
        + [list(row) for row in APPENDIX_G_NAMES]
    )

    # ---- Phụ lục H: tái lập số liệu ----
    add_styled("Phụ lục H. Tái lập số liệu thực nghiệm", "Heading 2", first_line_indent=False)
    add_styled(APPENDIX_H_INTRO, "Normal", first_line_indent=True)
    add_table_caption("Bảng H.1. Tái lập số liệu thực nghiệm")
    add_bordered_table(
        [["Số liệu", "Script hoặc lệnh", "Dữ liệu đầu vào", "Kết quả trong luận văn"]]
        + [list(row) for row in APPENDIX_H_ROWS]
    )
    add_styled("", "Normal", first_line_indent=False, space_after=6)

    # ---- Phụ lục I: thuật ngữ ----
    add_styled("Phụ lục I. Bảng thuật ngữ Anh – Việt", "Heading 2", first_line_indent=False)
    add_styled(
        "Bảng I.1 liệt kê các thuật ngữ chuyên môn dùng trong luận văn, cách dịch sang tiếng Việt và nguồn "
        "định nghĩa. Lần xuất hiện đầu trong thân bài ghi tiếng Việt kèm thuật ngữ gốc trong ngoặc đơn.",
        "Normal",
        first_line_indent=True,
    )
    add_table_caption("Bảng I.1. Bảng thuật ngữ Anh – Việt")
    add_bordered_table([["Thuật ngữ gốc", "Tiếng Việt", "Nguồn"]] + [list(r) for r in APPENDIX_I_TERMS])

    new.save(str(OUT))
    return OUT


if __name__ == "__main__":
    out = build()
    print("Wrote", out)
