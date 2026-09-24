#!/usr/bin/env python3
"""Build Assignment/LUAN_VAN_THAC_SI_FINAL.docx — clean thesis, no old chapters mixed in.

Stylesheet locked (chuẩn thực tế VN kiểu UIT/UEH — thesis_mse_docx_rules):
  A4; TNR Unicode; body 13 black justify 1.5; H1 15 bold center; H2/H3 13 bold;
  caption 12 bold; table 11; margins T/B 2.5 L 3.5 R 2 cm; refs/table line 1.0;
  TOC field; bordered tables; cite→bookmark hyperlinks.
"""
from __future__ import annotations

import shutil
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
FIG_MAX_H_CM = 19.0


def clean_inline(text: str) -> str:
    """Strip leftover Markdown inline syntax so it doesn't show up literally in the DOCX.

    Removes bold/italic asterisks and inline-code backticks; a leading blockquote
    marker is handled by the caller. Emphasis is dropped (single run per paragraph),
    but quoted text keeps its surrounding quotation marks.
    """
    return text.replace("**", "").replace("*", "").replace("`", "")


def figure_width_cm(img_path: Path) -> float:
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
    width = min(FIG_MAX_W_CM, aspect * FIG_MAX_H_CM)
    return round(width, 2)


CONCLUSION_PARAS = [
    "Luận văn đã đi trọn quy trình thiết kế – xây dựng – đánh giá cho một trợ lý AI bằng "
    "giọng nói hỗ trợ tài xế xe công nghệ. Từ phân tích hành vi tài xế khi đang "
    "chạy xe (Chương 3), luận văn đề xuất kiến trúc tách tầng hội thoại AI khỏi tầng nghiệp vụ, "
    "một đường xử lý STT → LLM kèm công cụ → TTS cùng câu giữ chỗ khoảng hai giây và phân loại "
    "phiên theo ngữ cảnh (Chương 4), rồi hiện thực thành nguyên mẫu chạy được đầu cuối trên nền "
    "WebRTC và SIP cùng dịch vụ quản lý chuyến thật (Chương 5).",
    "Về mặt đánh giá (Chương 6), số liệu trích từ nhật ký phiên khi còn thử nghiệm đường tắt "
    "(n = 341 lượt, một nhà cung cấp mô hình) cho thấy đường tắt khi đó bám ngưỡng P95 ≤ 2 giây "
    "(P95 ≈ 2,0 giây), trong khi đường đủ qua mô hình ngôn ngữ chưa đạt (P95 ≈ 3,8 giây) với "
    "chi phí trội ở thời gian sinh token đầu. Thiết kế hiện tại đã chuyển sang một đường duy nhất: "
    "mọi câu quen thuộc cũng trả LLM TTFT; câu giữ chỗ khoảng hai giây che khoảng chờ; nạp ngữ "
    "cảnh trước vẫn rút ngắn phần thân công cụ. Luồng phía khách và danh mục kiểm tra bảo mật, "
    "vị trí đều đạt trên bộ kiểm thử tự động.",
    "Trả lời các câu hỏi nghiên cứu: RQ1 được minh chứng qua kiến trúc và mã nguồn hoạt động; "
    "RQ2, RQ3 và RQ4 đều đã có số liệu sơ bộ từ nhật ký phiên và bộ kiểm thử (độ trễ theo nhóm "
    "xử lý của đợt A/B cũ, WER hai điều kiện âm thanh, độ đúng gọi công cụ chấm tay), nhưng ở "
    "quy mô mẫu nhỏ và một người chấm; cần một đợt đo lại trên thiết kế một đường + câu giữ chỗ, "
    "có gắn nhãn use case, kịch bản mù và nhiều người đọc để kết luận định lượng đầy đủ.",
    "Hạn chế chính: quy mô đo còn nhỏ và thực hiện trong môi trường phát triển/thử nghiệm; chưa "
    "khảo sát trên đường thật; phụ thuộc mô hình STT/LLM/TTS của bên thứ ba; chưa huấn luyện lại "
    "mô hình nền tảng cho tiếng Việt trong khoang xe; số liệu P95 theo đường tắt phản ánh phiên "
    "bản trước khi tắt tự gọi công cụ theo ý định nói.",
    "Hướng phát triển: (1) tổ chức đợt đo chính thức trên thiết kế một đường + câu giữ chỗ, có "
    "gắn nhãn use case và nhiều mức nhiễu để củng cố và mở rộng số liệu ở Bảng 6.3–6.7; "
    "(2) rút gọn lời nhắc hệ thống và giảm số vòng công cụ để kéo P95 cảm nhận về dưới ngưỡng; "
    "(3) thử mô hình ngôn ngữ có độ trễ token đầu thấp hơn hoặc kỹ thuật suy luận suy đoán; "
    "(4) bổ sung ngôn ngữ và giọng vùng miền; (5) thử nghiệm thực địa có kiểm soát an toàn để "
    "đo tác động đến thao tác tay – mắt khi lái.",
]

APPENDIX_A_INTRO = (
    "Bảng A.1 liệt kê toàn bộ công cụ (function tool) mà trợ lý giọng nói có thể gọi ở gói ngôn "
    "ngữ tiếng Việt tại thời điểm viết luận văn: 46 công cụ, trong đó khoảng 40 phục vụ tài xế "
    "và phần còn lại phục vụ luồng khách. Gói tiếng Anh có tập công cụ đối xứng. Mô tả rút gọn từ "
    "schema trong tệp app/voicebot/locales/vn/tools_definition.py của mã nguồn."
)

APPENDIX_A_TOOLS = [
    ("check_upcoming_trips", "Đếm/liệt kê chuyến theo phạm vi; mặc định chỉ nói số chuyến rồi hỏi chi tiết chuyến nào."),
    ("create_walkup_trip", "Tài xế tự tạo chuyến đón đường; vào thẳng trạng thái đang chạy."),
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
    ("get_bonus_info", "Xem các chương trình thưởng và vùng tăng giá đang hoạt động."),
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
        "Kịch bản B.2 — Nhận chuyến qua cuộc gọi đề nghị (phiên SIP, tập công cụ hẹp)",
        [
            "Trợ lý: Có chuyến mới đón tại 88 Pasteur, Quận 3. Bạn có nhận chuyến này không?",
            "Tài xế: Xác nhận nhận chuyến.  [LLM + công cụ — confirm_trip]",
            "Trợ lý: Đã nhận chuyến. Chúc bạn đi đường an toàn.",
        ],
    ),
]

APPENDIX_D_INTRO = (
    "Bảng D.1 tóm tắt các biến môi trường chính để chạy llm-orchestrator. Giá trị nhạy cảm (khóa API, "
    "token, mật khẩu, đường dẫn credential) không đưa vào luận văn; xem tệp mẫu "
    "envs/.env.example trong mã nguồn. Cột cuối ghi giá trị dùng cho số liệu Chương 6."
)

APPENDIX_D_ENV = [
    ("VOICE_AGENT_LANG", "Gói ngôn ngữ trợ lý", "vn (lựa chọn: vn / en)"),
    ("STT_PROVIDER", "Nhà cung cấp nhận dạng giọng nói", "google (lựa chọn: openai / deepgram / inference)"),
    ("GOOGLE_STT_MODEL", "Mô hình STT của Google", "chirp_3"),
    ("STT_LANGUAGE", "Ngôn ngữ nhận dạng (BCP-47)", "vi-VN"),
    ("LLM_PROVIDER", "Nhà cung cấp mô hình ngôn ngữ", "openai (lựa chọn: anthropic / google / kimi)"),
    ("LLM_MODEL", "Mô hình ngôn ngữ", "gpt-5.6-luna"),
    ("TTS_PROVIDER", "Nhà cung cấp tổng hợp giọng nói", "google (lựa chọn: elevenlabs / gemini / openai)"),
    ("GOOGLE_TTS_VOICE", "Giọng đọc tiếng Việt", "vi-VN-Chirp3-HD-Kore"),
    ("GOOGLE_TTS_SPEAKING_RATE", "Tốc độ đọc", "0,95 (chậm nhẹ cho số và địa chỉ rõ hơn)"),
    ("GOOGLE_TTS_PITCH", "Cao độ giọng", "-2,0 (sắc thái xuống nhẹ giọng Bắc)"),
    ("LIVEKIT_URL", "Địa chỉ LiveKit Cloud", "wss://<tên-project>.livekit.cloud"),
]

# Phụ lục C — thư viện ảnh giao diện (ảnh gốc; xử lý che thông tin trực tiếp trên DOCX nếu cần)
APPENDIX_C_FIGURES = [
    ("thesis_screenshots/register.jpg", "Hình C.1. Màn hình đăng ký trở thành tài xế trên ứng dụng Czen Driver."),
    ("thesis_screenshots/trolyczen2.jpg", "Hình C.2. Biểu tượng trợ lý giọng nói ở trạng thái đang kết nối."),
    ("thesis_screenshots/caidattroly.jpg", "Hình C.3. Cài đặt trợ lý: chọn ngôn ngữ và chế độ gọi khách mặc định (AI gọi hộ / tài xế nói trực tiếp)."),
    ("thesis_screenshots/caidattroly2.jpg", "Hình C.4. Cài đặt trợ lý: kích hoạt rảnh tay bằng từ khóa đánh thức và các tùy chọn nhắc khách."),
    ("thesis_screenshots/mapdetails.jpg", "Hình C.5. Điều hướng dẫn đường trên bản đồ: thông báo rẽ, khoảng cách và thời gian còn lại."),
    ("thesis_screenshots/chuyendidangchay.jpg", "Hình C.6. Gợi ý lộ trình tối ưu cho nhiều điểm đón/trả trong danh sách chuyến đang chạy."),
    ("thesis_screenshots/themchuyen2.jpg", "Hình C.7. Tài xế tự tạo chuyến cho khách vãng lai, kèm các yêu cầu đặc biệt (hàng cồng kềnh, đi cùng trẻ em)."),
    ("thesis_screenshots/profile.jpg", "Hình C.8. Màn hình hồ sơ tài xế và các chỉ số vận hành (đánh giá, số chuyến, tỷ lệ nhận/hoàn thành)."),
    ("thesis_screenshots/thunhap.jpg", "Hình C.9. Màn hình thu nhập theo kỳ và chi tiết cước từng chuyến đã hoàn thành."),
    ("thesis_screenshots/admin/bangchuyen.png", "Hình C.10. Trang quản trị: bảng điều phối chuyến, lọc trạng thái và gán tài xế."),
    ("thesis_screenshots/admin/taochuyen.png", "Hình C.11. Trang quản trị: tạo chuyến thử nghiệm và thông báo cho tài xế được gán."),
    ("thesis_screenshots/admin/taixe.png", "Hình C.12. Trang quản trị: danh sách tài xế, trạng thái trực tuyến và khóa tài khoản."),
    ("thesis_screenshots/admin/khachhang.png", "Hình C.13. Trang quản trị: danh sách khách hàng và trạng thái tài khoản."),
    ("thesis_screenshots/admin/nhatkicuocgoi.png", "Hình C.14. Trang quản trị: nhật ký cuộc gọi kèm tóm tắt nội dung hội thoại."),
    ("thesis_screenshots/superadmin/tongquan2.png", "Hình C.15. Super Admin: tổng quan sức khỏe các dịch vụ backend (6/6 hoạt động)."),
    ("thesis_screenshots/superadmin/config.png", "Hình C.16. Super Admin: cấu hình chuỗi STT–LLM–TTS của llm-orchestrator theo gói ngôn ngữ."),
    ("thesis_screenshots/superadmin/logs.png", "Hình C.17. Super Admin: nhật ký log thời gian thực, dùng để đo độ trễ tổng hợp giọng nói (ttfb)."),
    ("thesis_screenshots/superadmin/cuocgoi.png", "Hình C.18. Super Admin: bản ghi và tóm tắt cuộc gọi tổng hợp qua ops-service."),
]
# Style/section template. Prefer the original GVHD source if present; else reuse FINAL
# via a temp copy so we never open+overwrite the same path.
_SRC_PRIMARY = ROOT / "LUẬN VĂN THẠC SĨ _ TRƯƠNG BÁ CHÍNH.docx"
OUT = ROOT / "LUAN_VAN_THAC_SI_FINAL.docx"
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
        "ref_iihs_distracted",
        "Insurance Institute for Highway Safety. (n.d.). Distracted driving. "
        "https://www.iihs.org/research-areas/distracted-driving",
        "Insurance Institute for Highway Safety, n.d.",
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
        "ref_schick2023",
        "Schick, T., Dwivedi-Yu, J., Dessì, R., Raileanu, R., Lomeli, M., Hambro, E., "
        "Zettlemoyer, L., Cancedda, N., & Scialom, T. (2023). "
        "Toolformer: Language Models Can Teach Themselves to Use Tools. "
        "arXiv:2302.04761. https://arxiv.org/abs/2302.04761",
        "Schick et al., 2023",
    ),
]

ABSTRACT_PARAS = [
    "Trong hoạt động vận tải hành khách bằng xe công nghệ, tài xế thường xuyên phải thực hiện nhiều nghiệp vụ trên điện thoại trong lúc điều khiển phương tiện, tiềm ẩn nguy cơ mất an toàn giao thông. Luận văn này đề xuất, thiết kế, triển khai và đánh giá một hệ thống trợ lý AI bằng giọng nói hỗ trợ tài xế xe công nghệ, cho phép tương tác rảnh tay để thực hiện các nghiệp vụ cốt lõi trong vận hành chuyến đi.",
    "Về phạm vi chức năng, hệ thống tập trung vào quản lý chuyến đi bằng giọng nói, hỗ trợ liên lạc/xác nhận với khách hàng, nhắc lịch và câu hỏi thường gặp, cùng cơ chế kích hoạt rảnh tay trên ứng dụng tài xế (từ khóa đánh thức). Ứng dụng và dịch vụ quản lý chuyến đóng vai trò nền tảng tích hợp, không nhằm xây dựng toàn bộ hệ thống quản lý vận tải hoàn chỉnh.",
    "Về kỹ thuật, giải pháp dựa trên kiến trúc nhiều dịch vụ nhỏ phối hợp (microservices) kết hợp truyền thông thời gian thực (WebRTC và SIP), chuỗi xử lý nhận dạng giọng nói – mô hình ngôn ngữ – tổng hợp giọng nói (STT–LLM–TTS) có thể thay nhà cung cấp, và cơ chế gọi công cụ (function calling) để thực thi nghiệp vụ qua giao diện lập trình ứng dụng (API). Điểm thiết kế trọng tâm hiện tại là một đường xử lý duy nhất STT → LLM kèm công cụ → TTS, kèm câu giữ chỗ ngắn khoảng hai giây khi phản hồi chưa kịp phát âm — câu giữ chỗ không chứa sự kiện chuyến hay số liệu. Nạp ngữ cảnh trước vẫn giúp rút ngắn phần thân công cụ. Hệ thống được đánh giá theo: (i) độ trễ phản hồi — thời gian từ khi tài xế dứt câu đến khi trợ lý bắt đầu nói, với ngưỡng định hướng phân vị 95 (P95) không vượt quá 2 giây; (ii) tỷ lệ lỗi từ khi nhận dạng giọng nói (Word Error Rate – WER); (iii) độ chính xác gọi công cụ; và (iv) tỷ lệ hoàn thành nghiệp vụ trên bộ kịch bản thử nghiệm.",
    "Kết quả trên nguyên mẫu, ở quy mô mẫu nhỏ trong môi trường thử nghiệm: một đợt A/B khi còn bật đường tắt (n = 341 lượt) cho thấy đường tắt khi đó bám ngưỡng (P95 khoảng 2,0 giây) còn đường đủ qua mô hình ngôn ngữ chưa đạt (P95 khoảng 3,8 giây), chi phí trội ở thời gian sinh token đầu. Thiết kế hiện hành đã tắt đường tắt tự gọi công cụ; mọi câu quen thuộc cũng trả chi phí TTFT của LLM, và câu giữ chỗ che khoảng chờ cảm nhận. Các quan sát sơ bộ về WER trong nhiễu và độ chính xác gọi công cụ được trình bày kèm phân tích lỗi; việc khẳng định định lượng đầy đủ cần một đợt đo lại trên thiết kế một đường + câu giữ chỗ, với kịch bản mù và nhiều người tham gia.",
    "Từ khóa: Trợ lý AI bằng giọng nói, tài xế xe công nghệ, STT, TTS, LLM, gọi công cụ, WebRTC, P95, WER.",
]

# Danh mục viết tắt (EN) — chuẩn luận văn VN: ABC; lần đầu trong bài vẫn viết đủ + ngoặc
# Cột: viết tắt | tiếng Anh | tiếng Việt
ABBREVIATIONS_EN = [
    ("AI", "Artificial Intelligence", "Trí tuệ nhân tạo"),
    ("API", "Application Programming Interface", "Giao diện lập trình ứng dụng"),
    ("FAQ", "Frequently Asked Questions", "Câu hỏi thường gặp"),
    ("FR", "Functional Requirement", "Yêu cầu chức năng"),
    ("HTTP", "Hypertext Transfer Protocol", "Giao thức truyền siêu văn bản"),
    ("JWT", "JSON Web Token", "Mã thông báo web JSON (xác thực)"),
    ("LLM", "Large Language Model", "Mô hình ngôn ngữ lớn"),
    ("NFR", "Non-Functional Requirement", "Yêu cầu phi chức năng"),
    ("P95", "95th percentile", "Phân vị 95 — mốc độ trễ mà khoảng 95% lần đo không vượt quá"),
    ("PSTN", "Public Switched Telephone Network", "Mạng điện thoại công cộng"),
    ("RAG", "Retrieval-Augmented Generation", "Sinh câu trả lời có truy xuất tri thức"),
    ("RQ", "Research Question", "Câu hỏi nghiên cứu"),
    ("SIP", "Session Initiation Protocol", "Giao thức khởi tạo phiên thoại"),
    ("SMS", "Short Message Service", "Dịch vụ tin nhắn ngắn"),
    ("STT", "Speech-to-Text", "Nhận dạng giọng nói thành chữ"),
    ("TTS", "Text-to-Speech", "Tổng hợp giọng nói từ chữ"),
    ("UC", "Use Case", "Tình huống sử dụng"),
    ("VAD", "Voice Activity Detection", "Phát hiện hoạt động giọng nói"),
    ("WebRTC", "Web Real-Time Communication", "Truyền thông thời gian thực trên web/ứng dụng"),
    ("WER", "Word Error Rate", "Tỷ lệ lỗi từ khi nhận dạng giọng nói (so với câu đúng)"),
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
        p.paragraph_format.keep_with_next = True
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
        cols = len(data_rows[0])
        table = new.add_table(rows=len(data_rows), cols=cols)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl = table._tbl
        body.remove(tbl)
        insert_before_sect(tbl)
        tblPr = tbl.tblPr
        if tblPr is None:
            tblPr = OxmlElement("w:tblPr")
            tbl.insert(0, tblPr)
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
                cell.text = val
                set_cell_border(cell)
                if r_idx == 0:
                    shade_cell(cell)
                for p in cell.paragraphs:
                    p.paragraph_format.space_before = Pt(4)
                    p.paragraph_format.space_after = Pt(4)
                    p.paragraph_format.line_spacing = REF_LINE
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

    add_heading1_new_page("Lời cảm ơn", bookmark="loi_cam_on")
    for para in THANKS_PARAS:
        add_styled(para, "Normal", first_line_indent=True)

    add_heading1_new_page("Danh sách hình ảnh", bookmark="ds_hinh")
    for caption in [
        "Hình 4.1. Sơ đồ kiến trúc tổng thể (ứng dụng – LiveKit – llm-orchestrator – external-api-service / external-channel-service và dịch vụ liên quan)",
        "Hình 4.2. Chuỗi xử lý hội thoại một đường: STT → LLM kèm công cụ → TTS, kèm câu giữ chỗ khoảng hai giây",
        "Hình 5.1. Màn hình chào (landing) của ứng dụng tài xế Czen Driver",
        "Hình 5.2. Màn hình đăng nhập tài xế bằng số điện thoại và mật khẩu",
        "Hình 5.3. Màn hình bản đồ sau khi đăng nhập và bật trạng thái hoạt động",
        "Hình 5.4. Phiên trợ lý giọng nói — biểu tượng trợ lý ở trạng thái đang xử lý",
        "Hình 5.5. Hội thoại mẫu: tra cứu lịch trình và thông tin chuyến bằng giọng nói",
        "Hình 6.1. Độ trễ cảm nhận P50/P95 theo đường xử lý — đợt A/B khi còn đường tắt (n = 341 lượt, 2026-09-05..06)",
        "Hình 6.2. So sánh WER điều kiện yên tĩnh (3,1%) và nhiễu khoang xe giả lập (7,3%)",
    ]:
        add_styled(caption, "Normal", first_line_indent=False)
    for _p, caption in APPENDIX_C_FIGURES:
        add_styled(caption, "Normal", first_line_indent=False)

    add_heading1_new_page("Danh sách bảng", bookmark="ds_bang")
    for caption in [
        "Bảng 1.1. Chỉ mục ánh xạ mục tiêu nghiên cứu – câu hỏi nghiên cứu – chương trả lời",
        "Bảng 2.1. Các chỉ số đánh giá và ý nghĩa thực tiễn",
        "Bảng 3.1. Ba chế độ gọi khách (yêu cầu hành vi)",
        "Bảng 3.2. Thành phần hệ thống và ràng buộc tích hợp",
        "Bảng 3.3. Yêu cầu chức năng nhóm chuyến đi (FR-T)",
        "Bảng 3.4. Yêu cầu chức năng nhóm liên lạc khách (FR-C)",
        "Bảng 3.5. Yêu cầu chức năng cho chờ đón, sự cố, thu nhập, FAQ và ngôn ngữ",
        "Bảng 3.6. Việc ngoài lượt thoại công cụ: từ khóa đánh thức và kết thúc bridge",
        "Bảng 3.7. Ánh xạ nhóm yêu cầu chức năng sang dịch vụ",
        "Bảng 3.8. Use case cốt lõi",
        "Bảng 3.9. Nhóm NFR chuẩn, mã chi tiết và tính chất MSA liên quan",
        "Bảng 3.10. NFR nhìn từ trải nghiệm lái xe (bổ sung diễn giải)",
        "Bảng 3.11. Từ yêu cầu sang chỉ số",
        "Bảng 4.1. Vai trò từng phần (nhìn theo việc)",
        "Bảng 4.2. Các đường gọi chính",
        "Bảng 4.2a. So sánh các phương án kiến trúc đã cân nhắc",
        "Bảng 4.2b. Chuỗi bước mở phiên trong ứng dụng",
        "Bảng 4.3. Ba đường xử lý một câu nói",
        "Bảng 4.4. Loại phiên và tập việc mở",
        "Bảng 4.4b. Chuỗi bước gọi khách theo chế độ",
        "Bảng 4.5a. Nhóm năng lực hội thoại, API và FR",
        "Bảng 4.5b. Nội dung ngữ cảnh phiên",
        "Bảng 5.1. Công nghệ chính theo lớp",
        "Bảng 5.1b. Tổ chức mã nguồn theo thư mục dịch vụ",
        "Bảng 5.1c. Dấu hiệu phòng và chế độ agent tương ứng",
        "Bảng 5.2. Nhóm API external-api-service phục vụ hội thoại",
        "Bảng 5.3. Thành phần demo đầu cuối tối thiểu",
        "Bảng 5.4. Đối chiếu quyết định thiết kế và hiện thực",
        "Bảng 6.1. Môi trường thực nghiệm",
        "Bảng 6.2. Ánh xạ use case với chỉ số ưu tiên",
        "Bảng 6.3. Độ trễ phản hồi cảm nhận theo đường xử lý — đợt A/B khi còn đường tắt",
        "Bảng 6.4. Tách nút nghẽn độ trễ trong một lượt",
        "Bảng 6.5. WER theo điều kiện âm thanh",
        "Bảng 6.6. Độ đúng công cụ và hoàn thành UC",
        "Bảng 6.7. Phân loại lỗi quan sát",
        "Bảng 6.8. Danh mục kiểm tra trải nghiệm theo ngữ cảnh lái xe",
        "Bảng 6.9. Kết quả test case phía khách",
        "Bảng 6.10. Danh mục kiểm tra bảo mật và chia sẻ vị trí",
        "Bảng A.1. Danh mục công cụ gói tiếng Việt (46 công cụ)",
        "Bảng D.1. Biến môi trường chính của llm-orchestrator",
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
                add_figure_caption(clean_inline(s).strip())
                continue
            if s.startswith("![") and "](" in s and s.endswith(")"):
                # ![alt](relative/path.png)
                path = s.split("](", 1)[1][:-1]
                if "H4_2" in path:
                    width = 12.0
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
            elif s.startswith("- ") or (len(s) > 2 and s[0].isdigit() and s[1] == "."):
                add_styled(text, "Normal", first_line_indent=False)
            else:
                add_styled(text, "Normal", first_line_indent=True)

    for idx, md_path in enumerate(CHAPTER_MDS, start=1):
        render_chapter(md_path, bookmark=f"chuong_{idx}")

    add_heading1_new_page("Kết luận và hướng phát triển", bookmark="ket_luan")
    for para in CONCLUSION_PARAS:
        add_styled(para, "Normal", first_line_indent=True)

    add_heading1_new_page("Tài liệu tham khảo", bookmark="tai_lieu_tham_khao")
    add_styled(
        "Danh mục dưới đây gồm các nguồn đã trích dẫn trong Chương 1–2 (các chương sau chủ yếu đối chiếu hiện trạng hệ thống và kết quả tự đo). Click các trích dẫn trong bài để nhảy tới mục tương ứng.",
        "Normal",
        first_line_indent=True,
    )
    for n, (bm, ref, _label) in enumerate(REFERENCES, 1):
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
        "Phụ lục chứa thông tin bổ trợ để giữ thân bài gọn: A — danh mục công cụ; "
        "B — kịch bản thoại mẫu; C — ảnh giao diện; D — cấu hình môi trường (không chứa bí mật).",
        "Normal",
        first_line_indent=True,
    )

    # ---- Phụ lục A: danh mục công cụ ----
    add_styled("Phụ lục A. Danh mục công cụ của trợ lý giọng nói", "Heading 2", first_line_indent=False)
    add_styled(APPENDIX_A_INTRO, "Normal", first_line_indent=True)
    add_table_caption("Bảng A.1. Danh mục công cụ gói tiếng Việt (46 công cụ)")
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
        add_figure_caption(caption)
        if "H4_2" in rel_path:
            w = 12.0
        else:
            w = figure_width_cm(ROOT / rel_path)
        add_figure_image(rel_path, width_cm=w)
        add_styled("", "Normal", first_line_indent=False, space_after=4, line_spacing=1.0)

    # ---- Phụ lục D: cấu hình môi trường ----
    add_styled("Phụ lục D. Cấu hình môi trường triển khai", "Heading 2", first_line_indent=False)
    add_styled(APPENDIX_D_INTRO, "Normal", first_line_indent=True)
    add_table_caption("Bảng D.1. Biến môi trường chính của llm-orchestrator (giá trị Chương 6 in đậm)")
    add_bordered_table(
        [["Biến", "Ý nghĩa", "Giá trị"]] + [list(row) for row in APPENDIX_D_ENV]
    )
    add_styled(
        "Không đưa khóa API, token LiveKit, mật khẩu hay đường dẫn credential vào luận văn.",
        "Normal",
        first_line_indent=True,
        italic=True,
    )

    new.save(str(OUT))
    return OUT


if __name__ == "__main__":
    out = build()
    print("Wrote", out)
