#!/usr/bin/env python3
"""Build docs/thesis/100page/LUAN_VAN_THAC_SI_FINAL_100Page.docx — bản rút gọn ~100 trang.

Copy của build_thesis_final.py (2026-10-30) với: chapter md trong thư mục này, ảnh lấy từ docs/thesis,
hình nhỏ hơn, directive ảnh theo hàng (row=) và giới hạn cao (h=), Phụ lục C dạng contact-sheet,
bỏ Phụ lục E, lọc viết tắt/thuật ngữ theo từ thật sự dùng.

Stylesheet locked (chuẩn thực tế VN kiểu UIT/UEH — thesis_mse_docx_rules):
  A4; TNR Unicode; body 13 black justify 1.5; H1 15 bold center; H2/H3 13 bold;
  caption 12 bold; table 11; margins T/B 2.5 L 3.5 R 2 cm; refs/table line 1.0;
  TOC field; bordered tables; cite→bookmark hyperlinks.
"""
from __future__ import annotations

import re
import unicodedata
import shutil
import os
import tempfile
from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor, Inches
from docx.text.paragraph import Paragraph

try:
    from PIL import Image as _PILImage
except Exception:  # pragma: no cover - Pillow optional
    _PILImage = None

HERE = Path(__file__).resolve().parent          # docs/thesis/100page (chapter md, output)
ROOT = HERE.parent                                # docs/thesis (ảnh, diagrams, template)

# Max drawn size for an embedded figure (fits A4 text area after locked margins)
FIG_MAX_W_CM = 14.5
FIG_MAX_H_CM = 13.0
SEQ_MAX_H_CM = 12.0      # sequence diagram: nhỏ hơn bản 200 trang (17) nhưng chữ còn đọc được
ROW_CELL_W_CM = 4.6      # ảnh điện thoại xếp 3 ảnh/hàng


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
    "Luận văn đã thực hiện đủ các bước của nghiên cứu khoa học thiết kế để xây dựng một trợ lý AI bằng giọng nói hỗ trợ tài xế xe công nghệ: xác định yêu cầu cho bốn nhóm người sử dụng, lập luận lựa chọn kiến trúc từ năm yêu cầu phi chức năng thông qua các chiến thuật kiến trúc, hiện thực nguyên mẫu trên WebRTC và SIP, rồi đánh giá theo 19 tiêu chí chấp nhận. Trong đó, 17 tiêu chí đã có kết quả; AC-09 và AC-12 đã được hiện thực nhưng chưa được đánh giá riêng.",
    "Kết quả trả lời các câu hỏi nghiên cứu như sau:",
    "- RQ1: Kiến trúc microservices đáp ứng khả năng phục hồi ở mức thành phần: 200/200 lượt tiêm lỗi vào dịch vụ phụ trợ, API nghiệp vụ, kênh tin nhắn, kênh thoại và nhà cung cấp LLM đều không làm hỏng luồng hội thoại. Khi dừng một bản sao tác nhân, phiên mới được bản sao khác phục vụ, nhưng phiên đang chạy bị mất. Trong môi trường mô phỏng, độ trễ phản hồi không tăng khi số phiên đồng thời tăng từ 1 lên 40; tài nguyên giới hạn là bộ nhớ, khoảng 225 MB mỗi phiên.",
    "- RQ2: P95 độ trễ phản hồi của luồng xử lý qua LLM là 3,75 giây, không đạt ngưỡng 2 giây; yếu tố chi phối là thời gian sinh token đầu của mô hình ngôn ngữ.",
    "- RQ3: Tỷ lệ lỗi từ tăng từ 3,1% lên 7,3% khi thêm nhiễu mô phỏng khoang xe (một người đọc, 22 câu).",
    "- RQ4: 37/43 lượt (86,0%) chọn đúng công cụ và 32/43 lượt (74,4%) hoàn thành đúng ngay lần đầu. Lỗi chủ yếu do phát ngôn không rõ ý định và sai phạm vi tham số.",
    "Các đóng góp chính của luận văn gồm một kiến trúc tham chiếu được lập luận từ yêu cầu phi chức năng, một nguyên mẫu có mã nguồn công khai và một khung đánh giá gắn với tiêu chí chấp nhận. Đóng góp còn lại là bằng chứng cho thấy độ trễ của chuỗi xử lý theo tầng do thời gian sinh token đầu của mô hình ngôn ngữ bên ngoài chi phối, còn phần kiến trúc gần như không làm tăng độ trễ khi số phiên tăng.",
    "Các hạn chế và hướng phát triển tương ứng như sau:",
    "- Độ trễ chưa đạt ngưỡng (NFR-02): đo lại với ít nhất 200 lượt; thử mô hình có thời gian sinh token đầu ngắn hơn, rút gọn lời nhắc hệ thống và giảm số vòng gọi công cụ.",
    "- Khả năng mở rộng mới chỉ được đo trong môi trường mô phỏng (NFR-03): lặp lại SC-01 và SC-02 trên LiveKit Cloud và Fargate với nhà cung cấp AI thật; cấu hình tự động mở rộng theo bộ nhớ hoặc số phiên.",
    "- Lỗi dạng treo khiến tài xế phải chờ 6–8 giây, và phiên đang chạy bị mất khi bản sao tác nhân dừng (NFR-04): rút ngắn thời gian chờ tối đa của thao tác đọc, giữ tối thiểu hai bản sao, cho ứng dụng tự xin lại token và đo toàn bộ đường khôi phục từ đầu đến cuối.",
    "- Hai lỗi hiện thực phát hiện trong quá trình đánh giá (nhật ký chứa số điện thoại đầy đủ, câu báo lỗi chứa thông tin kỹ thuật) đã được sửa và đạt khi kiểm tra lại (Bảng 6.9, Bảng 6.13). Việc còn lại là xóa nhật ký cũ và đưa bước quét nhật ký vào bộ kiểm thử tự động.",
    "- Hệ thống chưa được chạy trên kiến trúc AWS đầy đủ (mục 5.6.1): triển khai các stack, sau đó đo lại độ trễ và khả năng phục hồi trên Lambda, API Gateway và Fargate.",
    "- Cỡ mẫu nhỏ và chỉ có một người chấm (RQ3, RQ4): mở rộng bộ câu tham chiếu với nhiều người đọc và nhiều mức nhiễu; dùng hai người chấm độc lập và báo cáo hệ số đồng thuận.",
    "- Tin nhắn SMS chưa giao được tới thuê bao Việt Nam (AC-11 mới đạt ở mức kiểm thử): đăng ký tên người gửi và mẫu tin qua Twilio, gửi thử thật và đo tỷ lệ giao tin; xác thực chữ ký X-Twilio-Signature để chặn sự kiện giả mạo (mục 6.13).",
    "- Chưa có nghiên cứu người dùng: tiến hành thử nghiệm có kiểm soát với tài xế trong kịch bản lái xe mô phỏng, đo thời gian hoàn thành tác vụ, số lần nhìn màn hình và tải nhận thức.",
]

APPENDIX_A_INTRO = (
    "Bảng A.1 liệt kê 48 công cụ (function tool) của gói ngôn ngữ tiếng Việt, gồm 42 công cụ cho phiên tài xế "
    "trong ứng dụng và 7 công cụ cho phiên của ứng dụng khách hàng. Hai công cụ confirm_trip và reject_trip thuộc nhóm của tài xế, "
    "đồng thời là hai công cụ duy nhất của phiên mời nhận chuyến. Công cụ answer_app_faq được dùng chung cho cả hai phiên. "
    "Phiên của ứng dụng khách hàng có trong mã nguồn nhưng nằm ngoài phạm vi luận văn (mục 3.5). Gói tiếng Anh có cùng 42 công cụ cho tài xế. "
    "Bảng gom công cụ theo nhóm chức năng; tên công cụ giữ nguyên như trong mã nguồn (voicebot/locales/vn/tools_definition.py)."
)

APPENDIX_A_TOOLS = [
    ("check_upcoming_trips", "Đếm hoặc liệt kê chuyến sắp tới theo phạm vi, theo ngày."),
    ("create_walkup_trip", "Tạo chuyến cho khách vãng lai, trạng thái đã xác nhận."),
    ("refresh_latest_data", "Lấy lại dữ liệu mới nhất cho chủ đề vừa trả lời."),
    ("get_current_trip_info", "Thông tin chuyến đang chạy: khách, điểm đón – trả, giá, trạng thái."),
    ("suggest_next_stop", "Gợi ý điểm đón/trả tiếp theo theo vị trí và lịch trình."),
    ("get_optimal_route", "Thứ tự ghé các điểm tối ưu theo khoảng cách đường bộ."),
    ("get_trip_traffic", "Tình trạng giao thông và thời gian dự kiến của chuyến."),
    ("update_trip_status", "Cập nhật tiến độ chuyến đã nhận."),
    ("call_customer", "Gọi khách của chuyến."),
    ("call_custom_number", "Bước 1: gọi tới số do tài xế đọc ra."),
    ("confirm_call_custom_number", "Bước 2: gọi số đã đọc sau khi tài xế xác nhận."),
    ("find_contact", "Bước 1: tìm người trong danh bạ theo tên để gọi."),
    ("select_contact_match", "Chọn đúng người khi danh bạ trùng tên."),
    ("confirm_contact_call", "Bước cuối: gọi người trong danh bạ đã xác nhận."),
    ("send_sms_to_customer", "Gửi SMS cho khách của chuyến đang hoạt động."),
    ("send_sms_to_custom_number", "Bước 1: gửi SMS tới số do tài xế đọc ra."),
    ("confirm_send_sms_to_custom_number", "Bước 2: gửi SMS sau khi xác nhận số và nội dung."),
    ("find_contact_to_message", "Bước 1: tìm người trong danh bạ để nhắn tin."),
    ("select_contact_match_for_sms", "Chọn đúng người khi tìm danh bạ để nhắn tin."),
    ("confirm_send_sms_to_contact", "Bước cuối: gửi tin nhắn tới người đã xác nhận."),
    ("get_customer_location", "Lấy địa điểm đón khách hiện tại."),
    ("confirm_trip_with_customer", "Gửi SMS xác nhận chuyến cho khách."),
    ("summarize_last_call", "Đọc tóm tắt cuộc gọi gần nhất với khách."),
    ("check_customer_call_status", "Kiểm tra cuộc gọi khách chạy nền còn diễn ra không."),
    ("create_reminder", "Đặt nhắc nhở trước giờ đón khách."),
    ("request_cancel_trip", "Bước 1: hỏi xác nhận trước khi hủy chuyến."),
    ("confirm_cancel_trip", "Bước 2: hủy chuyến sau khi tài xế xác nhận."),
    ("get_today_earnings", "Thu nhập hôm nay: doanh thu, số chuyến, thưởng, giờ online."),
    ("get_earnings_summary", "Thu nhập theo kỳ: 7 ngày, 30 ngày, hôm qua, tuần trước."),
    ("check_trip_history", "Đếm chuyến hoàn thành/bị hủy hôm nay, hôm qua, 7 ngày qua."),
    ("get_driver_stats", "Thống kê tài xế: đánh giá, tỷ lệ nhận, tỷ lệ hoàn thành."),
    ("get_active_bonuses", "Đọc các khoản thưởng, ưu đãi đang áp dụng."),
    ("get_driver_status", "Cho biết tài xế đang online hay offline (chỉ xem)."),
    ("get_vehicle_info", "Đọc loại xe, biển số, tên xe đã đăng ký."),
    ("report_customer_no_show", "Báo khách không xuất hiện tại điểm đón."),
    ("report_trip_issue", "Báo sự cố trong chuyến."),
    ("extend_wait_time", "Xin thêm thời gian chờ khách."),
    ("set_driver_status", "Chuyển trạng thái tài xế online/offline."),
    ("confirm_trip", "Nhận chuyến mới đang được mời."),
    ("reject_trip", "Từ chối chuyến mới đang được mời."),
    ("book_trip", "Khách đặt chuyến mới (phiên ứng dụng khách)."),
    ("get_my_trip", "Khách xem chuyến hiện tại: trạng thái, tài xế, thời gian dự kiến."),
    ("request_cancel_my_trip", "Bước 1: hỏi xác nhận trước khi khách hủy chuyến."),
    ("confirm_cancel_my_trip", "Bước 2: hủy chuyến sau khi khách xác nhận."),
    ("get_driver_eta", "Thời gian dự kiến tài xế đến và vị trí tài xế (phiên khách)."),
    ("call_driver", "Nối khách với tài xế qua điện thoại."),
    ("answer_app_faq", "Tra sổ tay hướng dẫn để trả lời câu hỏi về ứng dụng."),
    ("end_conversation", "Kết thúc cuộc gọi với trợ lý theo yêu cầu."),
]

APPENDIX_B_INTRO = (
    "Phụ lục này trích một số lượt thoại thực tế từ nhật ký phiên (đã che thông tin định danh) để minh họa "
    "đường xử lý STT → LLM kèm công cụ → TTS cho câu quen thuộc, cách xử lý im lặng và cách kết "
    "thúc phiên lịch sự. Nhãn thời gian ghi độ trễ cảm nhận (user_stop_to_agent_speak). Khi "
    "phản hồi chậm hơn khoảng hai giây, hệ thống có thể phát một câu đệm ngắn trước câu trả lời thật. "
    "Phần trong ngoặc vuông là ghi chú lấy từ nhật ký, gồm khâu xử lý (LLM, công cụ được gọi), nhãn của mô-đun nhận dạng ý định "
    "và độ trễ cảm nhận của lượt đó. Nhãn FollowUpKnowledge chỉ câu hỏi tiếp về chuyến vừa nhắc; nhãn conversational_ack chỉ câu đáp lễ."
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
    "envs/config.<môi trường>.toml; các khóa bí mật nằm trong tệp .env và không được đưa vào kho mã nguồn. Các tệp mẫu "
    "envs/config.example.toml và envs/.env.example được cung cấp để tái lập môi trường. Cột cuối ghi giá trị "
    "đã dùng khi thu thập số liệu ở Chương 6."
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
    ("thesis_screenshots/register.jpg", "Hình C.1. Đăng ký trở thành tài xế."),
    ("thesis_screenshots/chuyenmoi_offer.jpg", "Hình C.2. Bảng mời nhận chuyến: cước, đếm ngược 30 giây, lộ trình."),
    ("thesis_screenshots/trolyczen2.jpg", "Hình C.3. Khung trợ lý đang kết nối, kèm câu gợi ý nhanh."),
    ("thesis_screenshots/trolyczen_goiy.jpg", "Hình C.4. Câu gợi ý nhanh dưới lời chào của trợ lý."),
    ("thesis_screenshots/caidattroly.jpg", "Hình C.5. Cài đặt trợ lý: ngôn ngữ, chế độ gọi khách, rảnh tay."),
    ("thesis_screenshots/caidattroly2.jpg", "Hình C.6. Cài đặt bán kính nhắc khách và gợi ý điểm dừng."),
    ("thesis_screenshots/mapdetails.jpg", "Hình C.7. Màn hình dẫn đường trên bản đồ."),
    ("thesis_screenshots/chuyendidangchay.jpg", "Hình C.8. Tab Chuyến: lộ trình tối ưu và thẻ chuyến (số khách đã làm mờ)."),
    ("thesis_screenshots/themchuyen2.jpg", "Hình C.9. Tài xế tự tạo chuyến cho khách vãng lai."),
    ("thesis_screenshots/profile.jpg", "Hình C.10. Hồ sơ tài xế và chỉ số vận hành."),
    ("thesis_screenshots/thunhap.jpg", "Hình C.11. Thu nhập theo kỳ và lịch sử chuyến."),
    ("thesis_screenshots/admin/bangchuyen.png", "Hình C.12. Trang quản trị: bảng điều phối chuyến và gán tài xế."),
    ("thesis_screenshots/admin/taochuyen.png", "Hình C.13. Trang quản trị: điều phối viên tạo chuyến từ yêu cầu của khách."),
    ("thesis_screenshots/admin/taixe.png", "Hình C.14. Trang quản trị: danh sách tài xế và khóa tài khoản."),
    ("thesis_screenshots/admin/khachhang.png", "Hình C.15. Trang quản trị: danh sách khách hàng."),
    ("thesis_screenshots/admin/nhatkicuocgoi.png", "Hình C.16. Trang quản trị: nhật ký cuộc gọi kèm tóm tắt."),
    ("thesis_screenshots/superadmin/tongquan2.png", "Hình C.17. Trang giám sát: tình trạng các dịch vụ backend (6/6)."),
    ("thesis_screenshots/superadmin/config.png", "Hình C.18. Trang giám sát: cấu hình chuỗi STT – LLM – TTS theo gói ngôn ngữ."),
    ("thesis_screenshots/superadmin/logs.png", "Hình C.19. Trang giám sát: nhật ký thời gian thực, kèm độ trễ TTFB."),
    ("thesis_screenshots/superadmin/cuocgoi.png", "Hình C.20. Trang giám sát: bản ghi và tóm tắt cuộc gọi."),
]
APPENDIX_A_GROUPS = [
    ("Chuyến đi và lịch trình (tài xế)", ["check_upcoming_trips", "create_walkup_trip", "refresh_latest_data", "get_current_trip_info",
        "suggest_next_stop", "get_optimal_route", "get_trip_traffic", "update_trip_status", "get_customer_location",
        "confirm_trip_with_customer", "create_reminder", "request_cancel_trip", "confirm_cancel_trip",
        "report_customer_no_show", "report_trip_issue", "extend_wait_time", "confirm_trip", "reject_trip"]),
    ("Gọi điện (tài xế)", ["call_customer", "call_custom_number", "confirm_call_custom_number", "find_contact",
        "select_contact_match", "confirm_contact_call", "summarize_last_call", "check_customer_call_status"]),
    ("Nhắn tin SMS (tài xế)", ["send_sms_to_customer", "send_sms_to_custom_number", "confirm_send_sms_to_custom_number",
        "find_contact_to_message", "select_contact_match_for_sms", "confirm_send_sms_to_contact"]),
    ("Thu nhập, thống kê, hồ sơ (tài xế)", ["get_today_earnings", "get_earnings_summary", "check_trip_history",
        "get_driver_stats", "get_active_bonuses", "get_vehicle_info"]),
    ("Trạng thái và phiên (tài xế)", ["get_driver_status", "set_driver_status", "answer_app_faq", "end_conversation"]),
    ("Phiên ứng dụng khách hàng", ["book_trip", "get_my_trip", "request_cancel_my_trip", "confirm_cancel_my_trip",
        "get_driver_eta", "call_driver"]),
]
assert sorted(n for _, ns in APPENDIX_A_GROUPS for n in ns) == sorted(n for n, _ in APPENDIX_A_TOOLS)

# Contact-sheet Phụ lục C: ảnh điện thoại 3 ảnh/hàng, ảnh trang web 1 ảnh/hàng (chữ nhỏ hơn sẽ không đọc được)
APPENDIX_C_PHONE = [(p, c) for p, c in APPENDIX_C_FIGURES if p.endswith(".jpg")]
APPENDIX_C_WEB = [(p, c) for p, c in APPENDIX_C_FIGURES if not p.endswith(".jpg")]
APPENDIX_C_BACKUP_LINK = (
    "Bộ ảnh ở độ phân giải gốc được lưu dự phòng trong kho mã nguồn tại docs/thesis/thesis_screenshots/, "
    "kèm một bản sao trên Google Drive của tác giả. Bản in này đã đủ để đối chiếu; đường dẫn trên chỉ dùng khi cần xem ảnh phóng to."
)

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
    ("FR-Q01 đến FR-Q05", "Ngoài RQ (kiểm tra tuân thủ)", "Trang quản trị điều hành; Dịch vụ Chuyến đi và Điều phối; Dịch vụ Định danh; Dịch vụ Nhật ký cuộc gọi", "S4", "admin-panel: TripBoardPage, CreateTripPage, DriversPage, CustomerPage, CallLogsPage", "UC14, UC17", "Hình C.12 đến C.16"),
    ("FR-S01 đến FR-S03", "Ngoài RQ (kiểm tra tuân thủ)", "Trang giám sát hệ thống; Dịch vụ Giám sát vận hành", "Luồng ⑰ (Bảng 4.4)", "super-admin-panel: OverviewPage, AgentPage, LogsPage", "UC18", "Hình C.17 đến C.19"),
    ("FR-O01, FR-O02", "Ngoài RQ (kiểm tra tuân thủ)", "Dịch vụ Giám sát vận hành; Dịch vụ Nhật ký cuộc gọi; tác nhân", "S7", "session_metrics.py; ops-service/src/services/reports; ReportsPage.tsx", "UC11", "Bảng 6.15"),
    ("NFR-01", "RQ4", "Tác nhân", "S3", "Phân loại phiên; hành động chờ xác nhận; câu báo lỗi (test_call_error_message)", "Danh mục hành vi", "Bảng 6.10 (đạt sau một vòng sửa)"),
    ("NFR-02", "RQ2", "Tác nhân; nhà cung cấp AI", "S2, S3", "turn_filler.py; prefetch.py; context_store.py", "UC01, UC03, UC04, UC07", "Bảng 6.4, Bảng 6.6"),
    ("NFR-03", "RQ1", "Tác nhân (ECS); các Lambda; DynamoDB", "S2 (phân công bản sao tác nhân)", "infra/llm-orchestrator/cfn.yaml (DesiredCount); infra/*/sam.yaml", "SC-01 đến SC-03", "Bảng 6.11, Bảng 6.12 (đạt trong môi trường mô phỏng)"),
    ("NFR-04", "RQ1", "Tác nhân; Dịch vụ Nhật ký cuộc gọi; nhà cung cấp AI", "S3, S6", "providers/fallback.py; backend_api.py; conversation_service.py", "RS-01 đến RS-05", "Bảng 6.13"),
    ("NFR-05", "Ngoài RQ (kiểm tra tuân thủ)", "Dịch vụ Định danh; mọi dịch vụ", "S1", "tokenService.ts; middleware xác minh JWT; tham số NoEcho; che số điện thoại trong logger/format", "Danh mục bảo mật", "Bảng 6.14 (đạt sau một vòng sửa)"),
    ("CON-01", "Ngoài RQ (kiểm tra tuân thủ)", "Tác nhân", "S3", "backend_api.py", "Kiểm tra mã nguồn", "Bảng 6.14"),
    ("CON-02", "Ngoài RQ (kiểm tra tuân thủ)", "Mọi dịch vụ", "Mọi sequence", "Bảng DynamoDB riêng từng stack", "Kiểm tra cấu hình", "Bảng 5.6"),
    ("CON-03", "Ngoài RQ (kiểm tra tuân thủ)", "Dịch vụ Định danh", "S1", "tokenService.ts", "Kiểm tra mã nguồn", "Bảng 6.14"),
    ("CON-04", "Ngoài RQ (kiểm tra tuân thủ)", "Mọi dịch vụ", "Luồng ⑱ (Bảng 4.4)", "Nhật ký gắn mã phòng và mã hội thoại", "Kiểm tra nhật ký", "Bảng 6.14"),
]



# Phụ lục F — tái lập số liệu thực nghiệm
APPENDIX_F_INTRO = (
    "Bảng F.1 liệt kê script và lệnh để tạo lại từng nhóm số liệu ở Chương 6. Các script nằm trong thư mục "
    "docs/thesis và docs/thesis/experiments của kho mã nguồn (mục 5.2). Các thí nghiệm thử tải và tiêm lỗi chạy "
    "trong môi trường cô lập, gồm cơ sở dữ liệu giả lập, thông tin đăng nhập AWS giả và số điện thoại thuộc dải "
    "giả lập. Không thí nghiệm nào gọi tới tài nguyên AWS hoặc nhà cung cấp bên ngoài."
)
APPENDIX_F_ROWS = [
    ("Độ trễ phản hồi và phân tích điểm nghẽn (Bảng 6.3, 6.4)",
     "python3 docs/thesis/extract_ch6_metrics.py",
     "Nhật ký tác nhân agent.*.log của đợt đo 05–06/09/2026",
     "P50, P90, P95 theo nhánh; độ trễ theo chặng"),
    ("Tỷ lệ lỗi từ (Bảng 6.6)",
     "python3 docs/thesis/compute_wer.py --room <mã phòng> --label A|B",
     "Nhật ký STT của phiên đọc 22 câu tham chiếu",
     "WER theo điều kiện âm thanh"),
    ("SC-03 – thử tải API (Bảng 6.10)",
     "docs/thesis/experiments/sc03_setup.sh; sc03_run.sh; python3 sc03_analyze.py",
     "Bảng bench-trips (200 tài xế giả lập × 3 chuyến) trên DynamoDB giả lập; k6",
     "P50, P95 theo số người dùng ảo; tỷ lệ lỗi"),
    ("RS-01, RS-02, RS-04 – tiêm lỗi mức thành phần (Bảng 6.12)",
     "PYTHONPATH=. .venv/bin/python docs/thesis/experiments/rs_component_faults.py --trials 20 (chạy trong src/backend/llm-orchestrator)",
     "Máy chủ tiêm lỗi trả mã 503, treo hoặc từ chối kết nối",
     "Tỷ lệ lượt đạt; thời gian đến khi tác nhân báo lỗi"),
    ("RS-05 – dự phòng nhà cung cấp LLM (Bảng 6.12)",
     ".venv/bin/python docs/thesis/experiments/rs05_provider_fallback.py --trials 30 (chạy trong src/backend/llm-orchestrator)",
     "FallbackAdapter của LiveKit Agents với nhà cung cấp giả lập",
     "Tỷ lệ thành công; thời gian đến token đầu khi chuyển đổi"),
    ("SC-01, SC-02 – phiên hội thoại đồng thời (Bảng 6.11)",
     "Máy chủ LiveKit: docker run livekit/livekit-server --dev; python3 experiments/fake_ai_server.py; source experiments/sc_agent_env.sh; bản sao tác nhân: python -m app.main start hoặc experiments/bench_worker.py; python3 experiments/sc_sessions.py --levels 1 5 10 20 40",
     "Tác nhân thật, nhà cung cấp AI giả lập (STT 0,3 s, LLM 0,8 s, TTS 0,2 s), lk perf agent-load-test",
     "Phiên được phục vụ; P50, P95 độ trễ phản hồi; thời gian vào phiên; CPU, RAM"),
    ("RS-03 – dừng một bản sao tác nhân (Bảng 6.12)",
     "python3 docs/thesis/experiments/rs03_replica_kill.py --trials 10 (chạy trong src/backend/llm-orchestrator, cùng môi trường SC-01)",
     "Hai bản sao tác nhân; SIGKILL bản sao đang phục vụ phiên",
     "Phiên mới được phục vụ; phiên đang chạy được giữ; thời gian khôi phục bản sao"),
    ("Kiểm tra lại nhật ký sau khi che số điện thoại (Bảng 6.13, mục 4)",
     ".venv/bin/python docs/thesis/experiments/log_masking_check.py --trials 20 (chạy trong src/backend/llm-orchestrator)",
     "Chạy lại RS-01, RS-02, RS-04 với nhật ký mức DEBUG; phát lại nhật ký cũ qua hàm che",
     "Số lần xuất hiện số điện thoại đầy đủ (kỳ vọng 0)"),
    ("Sắp xếp thứ tự ghé (Bảng 6.15)",
     "node docs/thesis/experiments/route_opt_quality.js (chạy trong src/backend/external-api-service)",
     "600 bộ điểm dừng sinh ngẫu nhiên, hạt giống 20261013",
     "Tỷ lệ đạt lời giải tối ưu; chênh lệch quãng đường so với tối ưu và với thứ tự theo danh sách"),
    ("Luồng khách hàng và báo cáo ngày (Bảng 6.14)",
     "pytest trong src/backend/llm-orchestrator (662 ca, gồm test_send_sms_flow); npm run verify:ops; npm run verify:records; npm run verify:sms (hai dịch vụ); npm run verify:logger",
     "Bộ kiểm thử tự động",
     "Kết quả đạt/không đạt"),
]

# Phụ lục G — bảng thuật ngữ Anh – Việt
APPENDIX_G_TERMS = [
    ("Acceptance criteria", "Tiêu chí chấp nhận", "ISTQB (n.d.)"),
    ("Architectural driver", "Động lực kiến trúc", "Bass et al. (2021)"),
    ("Architectural pattern", "Mẫu kiến trúc", "Bass et al. (2021)"),
    ("Architectural tactic", "Chiến thuật kiến trúc", "Bass et al. (2021)"),
    ("Artifact (design science)", "Sản phẩm thiết kế", "Hevner et al. (2004)"),
    ("Availability", "Tính sẵn sàng", "ISO/IEC (2023)"),
    ("Bounded context", "Ngữ cảnh giới hạn", "Newman (2021)"),
    ("Cold start", "Khởi động nguội", "Jonas et al. (2019)"),
    ("Hallucination", "Bịa thông tin (mô hình tạo ra thông tin không có trong dữ liệu)", "Mục 2.1"),
    ("System prompt", "Lời nhắc hệ thống", "Mục 4.5.3"),
    ("Token", "Token (đơn vị chữ nhỏ nhất mà mô hình ngôn ngữ sinh ra)", "Mục 2.1"),
    ("Webhook", "Webhook (dịch vụ bên ngoài gọi ngược vào hệ thống để báo sự kiện)", "Mục 4.5.5"),
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


# Style/section template. Prefer the original GVHD source if present; else reuse FINAL
# via a temp copy so we never open+overwrite the same path.
_SRC_PRIMARY = ROOT / "LUẬN VĂN THẠC SĨ _ TRƯƠNG BÁ CHÍNH.docx"
# THESIS_OUT lets a preview build run while Word holds the FINAL file open.
OUT = Path(os.environ["THESIS_OUT"]) if os.environ.get("THESIS_OUT") else HERE / "LUAN_VAN_THAC_SI_FINAL_100Page.docx"
_TEMPLATE_FALLBACK = HERE / "LUAN_VAN_THAC_SI_FINAL_100Page.docx"
if _SRC_PRIMARY.is_file():
    SRC = _SRC_PRIMARY
elif OUT.is_file() or _TEMPLATE_FALLBACK.is_file():
    _tmp = Path(tempfile.gettempdir()) / "avda_thesis_100page_style_template.docx"
    shutil.copy2(OUT if OUT.is_file() else _TEMPLATE_FALLBACK, _tmp)
    SRC = _tmp
else:
    SRC = _SRC_PRIMARY  # will fail with a clear PackageNotFoundError
CHAPTER_MDS = [
    HERE / "Chuong1_Gioi_thieu.md",
    HERE / "Chuong2_Co_so_ly_thuyet.md",
    HERE / "Chuong3_Phan_tich_yeu_cau.md",
    HERE / "Chuong4_Thiet_ke_he_thong.md",
    HERE / "Chuong5_Trien_khai.md",
    HERE / "Chuong6_Thuc_nghiem.md",
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

# Cụm «…» trong nội dung tài liệu đánh dấu đoạn in nghiêng (APA 7); dấu không xuất hiện ở đầu ra.
REFERENCES = [
    (
        "ref_aws_waf2024",
        "Amazon Web Services. (2024). «AWS Well-Architected Framework» (Reliability Pillar; "
        "Performance Efficiency Pillar). https://docs.aws.amazon.com/wellarchitected/latest/framework/",
        "Amazon Web Services, 2024",
    ),
    (
        "ref_alvestrand2021",
        "Alvestrand, H. (2021). «Overview: Real-time protocols for browser-based applications» "
        "(RFC 8825). IETF. https://www.rfc-editor.org/rfc/rfc8825",
        "Alvestrand, 2021",
    ),
    (
        "ref_alvarado2024",
        "Alvarado Contreras, R. E., Escobedo, L., & Beltrán, J. (2024). "
        "AI companions in ride-hailing: Enhancing sense of safety with voice chatbots. "
        "«Avances en Interacción Humano-Computadora, 9»(1), 11–15. "
        "https://doi.org/10.47756/aihc.y9i1.138",
        "Alvarado Contreras et al., 2024",
    ),
    (
        "ref_bass2021",
        "Bass, L., Clements, P., & Kazman, R. (2021). «Software architecture in practice» (4th ed.). "
        "Addison-Wesley.",
        "Bass et al., 2021",
    ),
    (
        "ref_chen2024_voicebench",
        "Chen, Y., Yue, X., Zhang, C., Gao, X., Tan, R. T., & Li, H. (2024). "
        "«VoiceBench: Benchmarking LLM-based voice assistants» [Preprint]. arXiv. "
        "https://doi.org/10.48550/arXiv.2410.17196",
        "Chen et al., 2024",
    ),
    (
        "ref_dingus2016",
        "Dingus, T. A., Guo, F., Lee, S., Antin, J. F., Perez, M., Buchanan-King, M., & Hankey, J. (2016). "
        "Driver crash risk factors and prevalence evaluation using naturalistic driving data. "
        "«Proceedings of the National Academy of Sciences, 113»(10), 2636–2641. "
        "https://doi.org/10.1073/pnas.1513271113",
        "Dingus et al., 2016",
    ),
    (
        "ref_dragoni2017",
        "Dragoni, N., Giallorenzo, S., Lluch Lafuente, A., Mazzara, M., Montesi, F., Mustafin, R., & Safina, L. (2017). "
        "Microservices: Yesterday, today, and tomorrow. In M. Mazzara & B. Meyer (Eds.), "
        "«Present and ulterior software engineering» (pp. 195–216). Springer. "
        "https://doi.org/10.1007/978-3-319-67425-4_12",
        "Dragoni et al., 2017",
    ),
    (
        "ref_iihs_distracted",
        "Insurance Institute for Highway Safety. (n.d.). «Distracted driving». "
        "https://www.iihs.org/research-areas/distracted-driving",
        "Insurance Institute for Highway Safety, n.d.",
    ),
    (
        "ref_iso25010_2023",
        "ISO/IEC. (2023). «ISO/IEC 25010:2023 Systems and software engineering — Systems and software "
        "Quality Requirements and Evaluation (SQuaRE) — Product quality model». "
        "https://www.iso.org/standard/78176.html",
        "ISO/IEC, 2023",
    ),
    (
        "ref_jonas2019",
        "Jonas, E., Schleier-Smith, J., Sreekanti, V., Tsai, C.-C., Khandelwal, A., Pu, Q., Shankar, V., "
        "Carreira, J., Krauth, K., Yadwadkar, N., Gonzalez, J. E., Popa, R. A., Stoica, I., & Patterson, D. A. (2019). "
        "«Cloud programming simplified: A Berkeley view on serverless computing» [Preprint]. arXiv. "
        "https://doi.org/10.48550/arXiv.1902.03383",
        "Jonas et al., 2019",
    ),
    (
        "ref_lewis_fowler2014",
        "Lewis, J., & Fowler, M. (2014, March 25). «Microservices: A definition of this new architectural term». "
        "https://martinfowler.com/articles/microservices.html",
        "Lewis & Fowler, 2014",
    ),
    (
        "ref_livekit_agents",
        "LiveKit Inc. (n.d.). «Agents». LiveKit Documentation. https://docs.livekit.io/agents/",
        "LiveKit Inc., n.d.",
    ),
    (
        "ref_lyu2025",
        "Lyu, T., Feng, S., Liu, H., & Yang, H. (2025). "
        "«LLM-ODDR: A large language model framework for joint order dispatching and driver repositioning» "
        "[Preprint]. arXiv. https://doi.org/10.48550/arXiv.2505.22695",
        "Lyu et al., 2025",
    ),
    (
        "ref_nhtsa2013",
        "National Highway Traffic Safety Administration. (2013). «Visual-manual NHTSA driver distraction "
        "guidelines for in-vehicle electronic devices». Federal Register, 78 FR 24817. https://www.transportation.gov/regulations/federal-register-documents/2013-09883",
        "National Highway Traffic Safety Administration, 2013",
    ),
    (
        "ref_newman2021",
        "Newman, S. (2021). «Building microservices: Designing fine-grained systems» (2nd ed.). "
        "O'Reilly Media.",
        "Newman, 2021",
    ),
    (
        "ref_richardson2018",
        "Richardson, C. (2018). «Microservices patterns: With examples in Java». Manning.",
        "Richardson, 2018",
    ),
    (
        "ref_schick2023",
        "Schick, T., Dwivedi-Yu, J., Dessì, R., Raileanu, R., Lomeli, M., Hambro, E., "
        "Zettlemoyer, L., Cancedda, N., & Scialom, T. (2023). "
        "«Toolformer: Language models can teach themselves to use tools» [Preprint]. arXiv. "
        "https://doi.org/10.48550/arXiv.2302.04761",
        "Schick et al., 2023",
    ),
    (
        "ref_iihs2022_gig",
        "Insurance Institute for Highway Safety. (2022, November 3). «Smartphone apps drive gig workers, parents to distraction». "
        "https://www.iihs.org/news/detail/smartphone-apps-drive-gig-workers-parents-to-distraction",
        "Insurance Institute for Highway Safety, 2022",
    ),
    (
        "ref_song2023",
        "Song, X., Li, X., Yin, K., Qi, H., & Fang, X. (2023). «Analyze factors influencing drivers' cell phone "
        "online ride-hailing software using while driving: A case study in China» [Preprint]. arXiv. "
        "https://doi.org/10.48550/arXiv.2311.14689",
        "Song et al., 2023",
    ),
    (
        "ref_defossez2024",
        'Défossez, A., Mazaré, L., Orsini, M., Royer, A., Pérez, P., Jégou, H., Grave, E., & Zeghidour, N. (2024). «Moshi: A speech-text foundation model for real-time dialogue» [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2410.00037',
        'Défossez et al., 2024',
    ),
    (
        "ref_hevner2004",
        'Hevner, A. R., March, S. T., Park, J., & Ram, S. (2004). Design science in information systems research. «MIS Quarterly, 28»(1), 75–105. https://doi.org/10.2307/25148625',
        'Hevner et al., 2004',
    ),
    (
        "ref_kazman2000",
        'Kazman, R., Klein, M., & Clements, P. (2000). «ATAM: Method for architecture evaluation» (Technical Report CMU/SEI-2000-TR-004). Software Engineering Institute, Carnegie Mellon University.',
        'Kazman et al., 2000',
    ),
    (
        "ref_patil2023",
        'Patil, S. G., Zhang, T., Wang, X., & Gonzalez, J. E. (2023). «Gorilla: Large language model connected with massive APIs» [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2305.15334',
        'Patil et al., 2023',
    ),
    (
        "ref_patil2025",
        'Patil, S. G., Mao, H., Yan, F., Ji, C. C.-J., Suresh, V., Stoica, I., & Gonzalez, J. E. (2025). The Berkeley Function Calling Leaderboard (BFCL): From tool use to agentic evaluation of large language models. In «Proceedings of the 42nd International Conference on Machine Learning» (PMLR 267, pp. 48371–48392). https://proceedings.mlr.press/v267/patil25a.html',
        'Patil et al., 2025',
    ),
    (
        "ref_radford2023",
        'Radford, A., Kim, J. W., Xu, T., Brockman, G., McLeavey, C., & Sutskever, I. (2023). Robust speech recognition via large-scale weak supervision. In «Proceedings of the 40th International Conference on Machine Learning» (PMLR 202, pp. 28492–28518). https://proceedings.mlr.press/v202/radford23a.html',
        'Radford et al., 2023',
    ),
    (
        "ref_peffers2007",
        'Peffers, K., Tuunanen, T., Rothenberger, M. A., & Chatterjee, S. (2007). A design science research methodology for information systems research. «Journal of Management Information Systems, 24»(3), 45–77. https://doi.org/10.2753/MIS0742-1222240302',
        'Peffers et al., 2007',
    ),
    (
        "ref_qin2023",
        'Qin, Y., Liang, S., Ye, Y., Zhu, K., Yan, L., Lu, Y., Lin, Y., Cong, X., Tang, X., Qian, B., Zhao, S., Hong, L., Tian, R., Xie, R., Zhou, J., Gerstein, M., Li, D., Liu, Z., & Sun, M. (2023). «ToolLLM: Facilitating large language models to master 16000+ real-world APIs» [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2307.16789',
        'Qin et al., 2023',
    ),
    (
        "ref_skantze2021",
        'Skantze, G. (2021). Turn-taking in conversational systems and human-robot interaction: A review. «Computer Speech & Language, 67», 101178. https://doi.org/10.1016/j.csl.2020.101178',
        'Skantze, 2021',
    ),
    (
        "ref_strayer2019",
        'Strayer, D. L., Cooper, J. M., Goethe, R. M., McCarty, M. M., Getty, D. J., & Biondi, F. (2019). Assessing the visual and cognitive demands of in-vehicle information systems. «Cognitive Research: Principles and Implications, 4», 18. https://doi.org/10.1186/s41235-019-0166-3',
        'Strayer et al., 2019',
    ),
    (
        "ref_taibi2017",
        'Taibi, D., Lenarduzzi, V., & Pahl, C. (2017). Processes, motivations, and issues for migrating to microservices architectures: An empirical investigation. «IEEE Cloud Computing, 4»(5), 22–32. https://doi.org/10.1109/MCC.2017.4250931',
        'Taibi et al., 2017',
    ),
    (
        "ref_twilio_vn",
        'Twilio. (n.d.). «Vietnam: SMS guidelines». https://www.twilio.com/en-us/guidelines/vn/sms',
        'Twilio, n.d.',
    ),
    (
        "ref_venable2016",
        'Venable, J., Pries-Heje, J., & Baskerville, R. (2016). FEDS: A framework for evaluation in design science research. «European Journal of Information Systems, 25»(1), 77–89. https://doi.org/10.1057/ejis.2014.36',
        'Venable et al., 2016',
    ),
    (
        "ref_wohlin2012",
        'Wohlin, C., Runeson, P., Höst, M., Ohlsson, M. C., Regnell, B., & Wesslén, A. (2012). «Experimentation in software engineering». Springer. https://doi.org/10.1007/978-3-642-29044-2',
        'Wohlin et al., 2012',
    ),
    (
        "ref_yao2024",
        'Yao, S., Shinn, N., Razavi, P., & Narasimhan, K. (2024). «τ-bench: A benchmark for tool-agent-user interaction in real-world domains» [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2406.12045',
        'Yao et al., 2024',
    ),
    (
        "ref_cockburn2001",
        'Cockburn, A. (2001). «Writing effective use cases». Addison-Wesley.',
        'Cockburn, 2001',
    ),
    (
        "ref_cooper2014",
        'Cooper, A., Reimann, R., Cronin, D., & Noessel, C. (2014). «About face: The essentials of interaction design» (4th ed.). Wiley.',
        'Cooper et al., 2014',
    ),
    (
        "ref_sommerville2016",
        'Sommerville, I. (2016). «Software engineering» (10th ed.). Pearson.',
        'Sommerville, 2016',
    ),
    (
        "ref_wiegers2013",
        'Wiegers, K., & Beatty, J. (2013). «Software requirements» (3rd ed.). Microsoft Press.',
        'Wiegers & Beatty, 2013',
    ),
    (
        "ref_istqb_glossary",
        "ISTQB. (n.d.). «ISTQB Glossary: Acceptance criteria». International Software Testing Qualifications Board. "
        "https://glossary.istqb.org/en_US/term/acceptance-criteria",
        "ISTQB, n.d.",
    ),
    (
        "ref_nielsen1994",
        "Nielsen, J. (1994). «10 usability heuristics for user interface design». Nielsen Norman Group. "
        "https://www.nngroup.com/articles/ten-usability-heuristics/",
        "Nielsen, 1994",
    ),
    (
        "ref_north2006",
        "North, D. (2006). Introducing BDD. «Better Software Magazine». https://dannorth.net/introducing-bdd/",
        "North, 2006",
    ),
    (
        "ref_soldani2018",
        "Soldani, J., Tamburri, D. A., & Van Den Heuvel, W.-J. (2018). The pains and gains of microservices: "
        "A systematic grey literature review. «Journal of Systems and Software, 146», 215–232. "
        "https://doi.org/10.1016/j.jss.2018.09.082",
        "Soldani et al., 2018",
    ),
    (
        "ref_stivers2009",
        "Stivers, T., Enfield, N. J., Brown, P., Englert, C., Hayashi, M., Heinemann, T., Hoymann, G., "
        "Rossano, F., de Ruiter, J. P., Yoon, K.-E., & Levinson, S. C. (2009). Universals and cultural "
        "variation in turn-taking in conversation. «Proceedings of the National Academy of Sciences, "
        "106»(26), 10587–10592. https://doi.org/10.1073/pnas.0903616106",
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
    "Tài xế xe công nghệ thường phải thao tác trên điện thoại trong lúc lái để xem chuyến, cập nhật trạng thái chuyến và liên lạc với khách hàng. Theo phương pháp nghiên cứu khoa học thiết kế, luận văn thiết kế, triển khai và đánh giá một trợ lý AI bằng giọng nói giúp tài xế thực hiện các nghiệp vụ này mà không cần dùng tay.",
    "Yêu cầu chức năng được xác định cho bốn nhóm người sử dụng (tài xế, khách hàng, điều phối viên, quản trị viên hệ thống). Năm yêu cầu phi chức năng (tính khả dụng, hiệu năng, khả năng mở rộng, khả năng phục hồi, bảo mật) được phân loại theo ISO/IEC 25010, đặc tả dưới dạng kịch bản thuộc tính chất lượng và đi kèm 19 tiêu chí chấp nhận dạng Given–When–Then. Từ các chiến thuật kiến trúc đáp ứng những yêu cầu này, luận văn lập luận cho lựa chọn kiến trúc microservices trên AWS. Trong kiến trúc này, Dịch vụ Liên lạc hội thoại thời gian thực được tách khỏi các dịch vụ nghiệp vụ và xử lý mỗi lượt thoại theo chuỗi STT – LLM kèm gọi công cụ – TTS. Chuỗi này có nhà cung cấp dự phòng và câu đệm, tức câu ngắn báo rằng hệ thống đang xử lý khi câu trả lời chưa sẵn sàng. Nguyên mẫu hoạt động trong ứng dụng tài xế (WebRTC) và qua cuộc gọi điện thoại (SIP).",
    "Kết quả đánh giá cho thấy toàn bộ 200/200 lượt tiêm lỗi ở mức thành phần (cố ý làm một thành phần bị lỗi) đều không làm hỏng luồng hội thoại. Khi dừng đột ngột một bản sao tác nhân, phiên mới vẫn được phục vụ, nhưng phiên đang chạy bị mất (0/10). Trong môi trường mô phỏng, độ trễ phản hồi không tăng khi số phiên đồng thời tăng từ 1 lên 40; tài nguyên giới hạn là bộ nhớ, khoảng 225 MB mỗi phiên. Với các lượt đi qua mô hình ngôn ngữ, P95 độ trễ phản hồi là 3,75 giây, không đạt ngưỡng 2 giây; nguyên nhân chủ yếu là thời gian mô hình bắt đầu sinh câu trả lời. Tỷ lệ lỗi từ tăng từ 3,1% lên 7,3% khi có nhiễu mô phỏng khoang xe (22 câu, một người đọc). Trong 43 lượt được chấm, 37 lượt (86,0%) chọn đúng công cụ. Đánh giá cũng phát hiện hai lỗi hiện thực (nhật ký chứa số điện thoại đầy đủ, một câu báo lỗi chứa thông tin kỹ thuật); cả hai đã được sửa và đạt khi kiểm tra lại. Trên dữ liệu mô phỏng, thứ tự ghé điểm dừng do hệ thống đề xuất có quãng đường dài hơn lời giải tối ưu trung bình 1,2–6,3%. Mỗi kết quả được báo cáo kèm cỡ mẫu và giới hạn; những phép đo chưa thực hiện cũng được nêu rõ.",
    "Từ khóa: trợ lý AI bằng giọng nói, tài xế xe công nghệ, kiến trúc microservices, chiến thuật kiến trúc, ISO/IEC 25010, gọi công cụ, nghiên cứu khoa học thiết kế.",
]

ABSTRACT_EN_PARAS = [
    "Ride-hailing drivers often operate their phones while driving to check trips, update trip status and contact passengers. Following design science research, this thesis designs, implements and evaluates a voice-based AI assistant that lets drivers perform these tasks hands-free.",
    "Functional requirements are specified for four user personas (driver, customer, dispatcher, system administrator). Five non-functional requirements (usability, performance, scalability, resilience, security) are classified with ISO/IEC 25010, written as quality attribute scenarios and paired with 19 acceptance criteria in Given–When–Then form. From the architectural tactics that address these requirements, the thesis argues for a microservices architecture on AWS: a real-time conversational service processes each turn through an STT – LLM with tool calling – TTS pipeline with provider fallback and filler utterances, separated from the business services. The prototype runs in the driver app (WebRTC) and over phone calls (SIP).",
    "Results are as follows. All 200 component-level fault injections left the conversation flow intact; when an agent replica is killed, new sessions are still served but in-progress sessions are lost (0/10). In a simulated environment, response latency did not increase as concurrent sessions grew from 1 to 40; memory, at about 225 MB per session, was the limiting resource. The P95 response latency of turns that go through the language model is 3.75 seconds, above the 2-second target, and is dominated by the model's time to first token. The word error rate rises from 3.1% to 7.3% under simulated cabin noise (22 sentences, one speaker). Of 43 scored turns, 37 (86.0%) selected the correct tool. The evaluation also revealed two implementation defects (full phone numbers in logs, one error message exposing technical details); both were fixed and passed re-testing. The stop ordering proposed by the system is on average 1.2–6.3% longer than the optimal route on simulated data. Each result is reported with its sample size and limitations, and measurements not yet performed are stated explicitly.",
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
    ("ATAM", "Architecture Tradeoff Analysis Method", "Phương pháp phân tích đánh đổi kiến trúc"),
    ("BDD", "Behaviour-Driven Development", "Phát triển hướng hành vi"),
    ("BFCL", "Berkeley Function Calling Leaderboard", "Bảng xếp hạng khả năng gọi hàm của Berkeley"),
    ("CPU", "Central Processing Unit", "Bộ xử lý trung tâm"),
    ("DSR", "Design Science Research", "Nghiên cứu khoa học thiết kế"),
    ("GPS", "Global Positioning System", "Hệ thống định vị toàn cầu"),
    ("KTC", "—", "Khoảng tin cậy"),
    ("NR", "Non-Risk", "Không rủi ro (mã ở Bảng 4.11)"),
    ("RAM", "Random-Access Memory", "Bộ nhớ truy cập ngẫu nhiên"),
    ("RS", "Resilience Scenario", "Kịch bản đánh giá khả năng phục hồi (mã ở Chương 6)"),
    ("SC", "Scalability Scenario", "Kịch bản đánh giá khả năng mở rộng (mã ở Chương 6)"),
    ("TB", "—", "Trung bình"),
    ("CLI", "Command-Line Interface", "Giao diện dòng lệnh"),
    ("CON", "Constraint", "Ràng buộc kiến trúc (mã ở Chương 3)"),
    ("ECR", "Elastic Container Registry", "Kho lưu trữ image container của AWS"),
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
    ("NHTSA", "National Highway Traffic Safety Administration", "Cục Quản lý An toàn Giao thông Đường cao tốc Quốc gia (Hoa Kỳ)"),
    ("P50", "50th percentile (median)", "Trung vị: một nửa số lần đo nhanh hơn hoặc bằng mức này"),
    ("P90", "90th percentile", "Mức thời gian mà 90% số lần đo nhanh hơn hoặc bằng"),
    ("P95", "95th percentile", "Mức thời gian mà 95% số lần đo nhanh hơn hoặc bằng; chỉ 5% lần chậm nhất vượt mức này"),
    ("PSTN", "Public Switched Telephone Network", "Mạng điện thoại công cộng"),
    ("RAG", "Retrieval-Augmented Generation", "Sinh câu trả lời có truy xuất tri thức"),
    ("REST", "Representational State Transfer", "Chuyển giao trạng thái biểu diễn (kiểu kiến trúc API)"),
    ("RQ", "Research Question", "Câu hỏi nghiên cứu"),
    ("SAM", "Serverless Application Model", "Mô hình ứng dụng serverless của AWS (hạ tầng dạng mã)"),
    ("SDK", "Software Development Kit", "Bộ công cụ phát triển phần mềm"),
    ("SIP", "Session Initiation Protocol", "Giao thức khởi tạo phiên thoại"),
    ("SMS", "Short Message Service", "Dịch vụ tin nhắn ngắn"),
    ("STT", "Speech-to-Text", "Chuyển giọng nói thành văn bản"),
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
    "giảng viên hướng dẫn đã tận tình chỉ bảo, định hướng chuyên môn và góp ý cho tôi trong suốt quá trình thực hiện luận văn.",
    "Tôi xin chân thành cảm ơn Ban Giám hiệu, quý thầy cô và toàn thể cán bộ của "
    "FPT School of Business & Technology (FSB) đã tạo điều kiện học tập và nghiên cứu thuận lợi.",
    "Tôi cũng xin cảm ơn các đồng nghiệp và bạn bè đã luôn sẵn sàng chia sẻ kinh nghiệm, "
    "hỗ trợ chuyên môn và động viên tôi trong quá trình xây dựng hệ thống nguyên mẫu.",
    "Đặc biệt, tôi xin gửi lời tri ân đến gia đình — chỗ dựa vững chắc đã luôn động viên "
    "và tạo điều kiện để tôi hoàn thành luận văn này.",
    "Dù tôi đã dành nhiều thời gian và nỗ lực, luận văn khó tránh khỏi những thiếu sót. "
    "Tôi rất mong nhận được ý kiến đóng góp của quý thầy cô và bạn đọc để luận văn được hoàn thiện hơn.",
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


def drop_orphan_images(doc) -> None:
    """The previous FINAL is the style template, so images from earlier builds stay
    related to the cleared body and pile up in word/media; drop those no longer embedded."""
    part = doc.part
    used = {blip.get(qn("r:embed")) for blip in part.element.iter(qn("a:blip"))}
    for rid in [r for r, rel in part.rels.items() if rel.reltype == RT.IMAGE and r not in used]:
        part.rels.pop(rid)


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

    def add_figure_row(rel_paths: list[str], cell_w_cm: float = ROW_CELL_W_CM,
                       captions: list[str] | None = None, max_h_cm: float | None = None):
        """Xếp nhiều ảnh trên một hàng bằng bảng không viền, căn giữa trang.
        captions: chú thích ngắn cho từng ô (hàng thứ hai của bảng), dùng cho contact-sheet Phụ lục C."""
        n = len(rel_paths)
        if n == 0:
            return None
        rows = 2 if captions else 1
        table = new.add_table(rows=rows, cols=n)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        tbl = table._tbl
        body.remove(tbl)
        insert_before_sect(tbl)
        tblPr = tbl.tblPr
        for tag in ("w:tblW", "w:tblLayout", "w:tblBorders"):
            old = tblPr.find(qn(tag))
            if old is not None:
                tblPr.remove(old)
        col_w = cell_w_cm + 0.3
        tbl_w = OxmlElement("w:tblW")
        tbl_w.set(qn("w:w"), str(int(col_w * n * 567)))
        tbl_w.set(qn("w:type"), "dxa")
        tblPr.append(tbl_w)
        layout = OxmlElement("w:tblLayout")
        layout.set(qn("w:type"), "fixed")
        tblPr.append(layout)
        borders = OxmlElement("w:tblBorders")
        for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
            el = OxmlElement(f"w:{edge}")
            el.set(qn("w:val"), "nil")
            borders.append(el)
        tblPr.append(borders)
        for gc in tbl.tblGrid.findall(qn("w:gridCol")):
            gc.set(qn("w:w"), str(int(col_w * 567)))
        for r in table.rows:
            trPr = r._tr.get_or_add_trPr()
            trPr.append(OxmlElement("w:cantSplit"))
        for c_idx, rel_path in enumerate(rel_paths):
            cell = table.cell(0, c_idx)
            cell.width = Cm(col_w)
            para = cell.paragraphs[0]
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            para.paragraph_format.space_before = Pt(2)
            para.paragraph_format.space_after = Pt(2)
            para.paragraph_format.keep_with_next = True
            img_path = ROOT / rel_path
            if not img_path.is_file():
                run = para.add_run(f"(Thiếu file hình: {rel_path})")
                set_run_font(run, CAPTION_PT)
                continue
            w = cell_w_cm
            if max_h_cm:
                w = min(w, figure_width_cm(img_path, max_w=cell_w_cm, max_h=max_h_cm))
            para.add_run().add_picture(str(img_path), width=Cm(w))
            if captions:
                cap_cell = table.cell(1, c_idx)
                cap_cell.width = Cm(col_w)
                cp = cap_cell.paragraphs[0]
                cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
                cp.paragraph_format.space_before = Pt(0)
                cp.paragraph_format.space_after = Pt(6)
                cp.paragraph_format.line_spacing = 1.0
                run = cp.add_run(captions[c_idx])
                set_run_font(run, 10.5, bold=True)
        # Đoạn trống mỏng sau bảng để chú thích/đoạn tiếp theo không dính vào bảng.
        add_styled("", "Normal", first_line_indent=False, space_after=2, line_spacing=1.0)
        return table

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
    for caption in collect_captions("Hình") + [c for _p, c in APPENDIX_C_PHONE + APPENDIX_C_WEB]:
        add_styled(caption, "Normal", first_line_indent=False)

    add_heading1_new_page("Danh sách bảng", bookmark="ds_bang")
    for caption in collect_captions("Bảng") + [
        "Bảng A.1. Danh mục công cụ gói tiếng Việt (48 công cụ)",
        "Bảng D.1. Cấu hình chính của tác nhân hội thoại",
        "Bảng E.1. Tái lập số liệu thực nghiệm",
        "Bảng F.1. Bảng thuật ngữ Anh – Việt",
    ]:
        add_styled(caption, "Normal", first_line_indent=False)

    # Danh mục viết tắt (sau DS bảng, trước Mục lục) — theo hướng dẫn luận văn VN (UEH/CTU/…)
    add_heading1_new_page("Danh mục từ viết tắt", bookmark="ds_viet_tat")
    add_styled(
        "Luận văn chỉ viết tắt những thuật ngữ được dùng nhiều lần. Ở lần xuất hiện đầu tiên trong thân bài, "
        "thuật ngữ vẫn được viết đầy đủ, kèm chữ viết tắt trong ngoặc đơn. Bảng dưới đây xếp theo thứ tự ABC.",
        "Normal",
        first_line_indent=True,
    )
    _chapter_text = "\n".join(m.read_text(encoding="utf-8") for m in CHAPTER_MDS)
    _chapter_text = re.sub(r"`[^`]*`|https?://\S+", " ", _chapter_text)
    _used_abbr = sorted(
        (
            (a, b, c) for a, b, c in ABBREVIATIONS_EN
            if len(re.findall(r"(?<![A-Za-z0-9_])" + re.escape(a) + r"(?![A-Za-z0-9_])", _chapter_text)) >= 2
        ),
        key=lambda r: r[0].lower(),
    )
    add_bordered_table(
        [["Từ viết tắt", "Tiếng Anh", "Tiếng Việt"]]
        + [[a, b, c] for a, b, c in _used_abbr]
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
                # ![alt|h=9](path)            -> giới hạn chiều cao hình 9 cm
                # ![alt|row=4.6](a.jpg;b.jpg;c.jpg) -> các ảnh xếp trên một hàng, mỗi ô rộng 4,6 cm
                alt, path = s[2:].split("](", 1)
                path = path[:-1]
                opts: dict[str, str] = {}
                for tok in alt.split("|")[1:]:
                    k, _, v = tok.partition("=")
                    opts[k.strip()] = v.strip()
                if "row" in opts:
                    cell_w = float(opts["row"]) if opts["row"] else ROW_CELL_W_CM
                    add_figure_row([p.strip() for p in path.split(";") if p.strip()], cell_w_cm=cell_w)
                    continue
                if path.endswith("H4_1_aws_architecture.png"):
                    # Hình 4.1 in trên một trang A4 ngang riêng (vùng hình 24,7 × 14,5 cm).
                    section_break(landscape=False)
                    landscape_open = True
                    width = figure_width_cm(ROOT / path, max_w=24.7, max_h=14.5)
                elif "diagrams/H4_S" in path:
                    width = figure_width_cm(ROOT / path, max_h=float(opts.get("h", SEQ_MAX_H_CM)))
                else:
                    width = figure_width_cm(ROOT / path, max_h=float(opts.get("h", FIG_MAX_H_CM)))
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
        "Danh mục dưới đây gồm các nguồn được trích dẫn trong luận văn, xếp theo thứ tự chữ cái của tên tác giả.",
        "Normal",
        first_line_indent=True,
    )
    def _ref_key(r):
        plain = r[1].replace("«", "").replace("»", "")
        return unicodedata.normalize("NFKD", plain).encode("ascii", "ignore").decode().lower()

    for bm, ref, _label in sorted(REFERENCES, key=_ref_key):
        # «…» đánh dấu đoạn in nghiêng (tên sách, tên tạp chí + số tập, ...); tách thành các run.
        segments = re.split(r"«(.*?)»", ref)
        p = add_styled(
            segments[0],
            "Normal",
            first_line_indent=False,
            bookmark=bm,
            line_spacing=REF_LINE,
        )
        for k, seg in enumerate(segments[1:], start=1):
            if seg:
                run = p.add_run(seg)
                set_run_font(run, BODY_PT, bold=False)
                run.italic = k % 2 == 1
        # Giữ bookmarkEnd ở cuối đoạn sau khi thêm run.
        for end in p._p.findall(qn("w:bookmarkEnd")):
            p._p.append(end)
        pf = p.paragraph_format
        pf.left_indent = Cm(1.0)
        pf.first_line_indent = Cm(-1.0)

    add_heading1_new_page("Phụ lục", bookmark="phu_luc")
    add_styled(
        "Phụ lục gồm: A — danh mục công cụ; B — kịch bản hội thoại mẫu; C — ảnh giao diện; "
        "D — cấu hình môi trường (không chứa bí mật); E — tái lập số liệu thực nghiệm; "
        "F — bảng thuật ngữ Anh – Việt. Ma trận đối chiếu yêu cầu đầy đủ không được in lại vì đã có trong "
        "Bảng 4.10 (yêu cầu – thiết kế) và Bảng 5.6 (thiết kế – hiện thực).",
        "Normal",
        first_line_indent=True,
    )

    # ---- Phụ lục A: danh mục công cụ ----
    add_styled("Phụ lục A. Danh mục công cụ của trợ lý giọng nói", "Heading 2", first_line_indent=False)
    add_styled(APPENDIX_A_INTRO, "Normal", first_line_indent=True)
    add_table_caption("Bảng A.1. Danh mục công cụ gói tiếng Việt theo nhóm chức năng (48 công cụ)")
    add_bordered_table(
        [["Nhóm", "Số", "Tên công cụ"]]
        + [[g, str(len(ns)), ", ".join(ns)] for g, ns in APPENDIX_A_GROUPS]
    )
    add_styled(
        "Các công cụ có tiền tố find_/select_/confirm_ là các bước của quy trình xác nhận hai bước trước khi thực hiện "
        "cuộc gọi hoặc gửi tin nhắn thật. Mô tả đầy đủ của từng công cụ nằm trong lược đồ công cụ của mã nguồn (mục 5.2).",
        "Normal", first_line_indent=True,
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
        "Các ảnh dưới đây minh họa giao diện nguyên mẫu tại thời điểm chụp. Thông tin định danh "
        "trong ảnh (số điện thoại, thư điện tử, biển số xe…) thuộc các tài khoản thử nghiệm nội bộ "
        "và có thể được che trực tiếp trên bản DOCX trước khi in.",
        "Normal",
        first_line_indent=True,
    )
    for i in range(0, len(APPENDIX_C_PHONE), 3):
        chunk = APPENDIX_C_PHONE[i:i + 3]
        add_figure_row([p for p, _ in chunk], cell_w_cm=ROW_CELL_W_CM, captions=[c for _, c in chunk])
    for i in range(0, len(APPENDIX_C_WEB), 2):
        chunk = APPENDIX_C_WEB[i:i + 2]
        add_figure_row([p for p, _ in chunk], cell_w_cm=7.2, captions=[c for _, c in chunk])
    add_styled(APPENDIX_C_BACKUP_LINK, "Normal", first_line_indent=True)

    # ---- Phụ lục D: cấu hình môi trường ----
    add_styled("Phụ lục D. Cấu hình môi trường triển khai", "Heading 2", first_line_indent=False)
    add_styled(APPENDIX_D_INTRO, "Normal", first_line_indent=True)
    add_table_caption("Bảng D.1. Cấu hình chính của tác nhân hội thoại")
    add_bordered_table(
        [["Biến", "Ý nghĩa", "Giá trị"]] + [list(row) for row in APPENDIX_D_ENV]
    )
    add_styled(
        "Luận văn không công bố khóa API, token LiveKit, mật khẩu hay đường dẫn tới tệp thông tin xác thực.",
        "Normal",
        first_line_indent=True,
        italic=True,
    )

    # ---- Phụ lục E: tái lập số liệu (bản 200 trang là Phụ lục F; ma trận đối chiếu E cũ đã bỏ) ----
    add_styled("Phụ lục E. Tái lập số liệu thực nghiệm", "Heading 2", first_line_indent=False)
    add_styled(APPENDIX_F_INTRO.replace("Bảng F.1", "Bảng E.1"), "Normal", first_line_indent=True)
    add_table_caption("Bảng E.1. Tái lập số liệu thực nghiệm")
    add_bordered_table(
        [["Số liệu", "Script hoặc lệnh", "Dữ liệu đầu vào", "Kết quả trong luận văn"]]
        + [list(row) for row in APPENDIX_F_ROWS]
    )
    add_styled("", "Normal", first_line_indent=False, space_after=6)

    # ---- Phụ lục G: thuật ngữ ----
    add_styled("Phụ lục F. Bảng thuật ngữ Anh – Việt", "Heading 2", first_line_indent=False)
    add_styled(
        "Bảng F.1 liệt kê các thuật ngữ chuyên môn xuất hiện trong luận văn cùng cách dịch sang tiếng Việt. Nguồn "
        "định nghĩa được dẫn ở lần dùng đầu tiên trong thân bài; tại đó, thuật ngữ tiếng Việt được ghi kèm thuật ngữ gốc trong ngoặc đơn.",
        "Normal",
        first_line_indent=True,
    )
    add_table_caption("Bảng F.1. Bảng thuật ngữ Anh – Việt")
    # Chỉ giữ thuật ngữ gốc (tiếng Anh) thật sự xuất hiện trong thân bài: bảng này giải nghĩa từ gốc được
    # ghi trong ngoặc đơn ở lần dùng đầu; thuật ngữ chỉ còn bản dịch tiếng Việt thì không cần tra.
    _lower_text = _chapter_text.lower()
    _used_terms = [
        r for r in APPENDIX_G_TERMS
        if r[0].split("(")[0].strip().lower() in _lower_text
    ]
    add_bordered_table([["Thuật ngữ gốc", "Tiếng Việt"]] + [[r[0], r[1]] for r in sorted(_used_terms, key=lambda r: r[0].lower())])

    drop_orphan_images(new)
    new.save(str(OUT))
    return OUT


if __name__ == "__main__":
    out = build()
    print("Wrote", out)
