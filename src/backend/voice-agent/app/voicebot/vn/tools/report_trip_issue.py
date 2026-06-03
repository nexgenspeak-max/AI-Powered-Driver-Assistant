import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.report_trip_issue")

_ISSUE_LABELS = {
    "safety_concern":          "lo ngại an toàn",
    "vehicle_damage":          "hư hỏng xe",
    "inappropriate_behavior":  "hành vi không phù hợp",
    "wrong_address":           "địa chỉ sai",
    "other":                   "vấn đề khác",
}


@function_tool(raw_schema=raw_schema["report_trip_issue"])
async def report_trip_issue(raw_arguments: dict, context: RunContext) -> str:
    issue_type  = raw_arguments.get("issue_type", "other")
    description = raw_arguments.get("description") or ""
    driver_phone = context.userdata["driver_phone"]

    try:
        current = await backend_api.get_current_trip(driver_phone)
    except Exception:
        return "Không thể tìm thấy chuyến đi lúc này."

    if not current:
        return "Không có chuyến đang hoạt động để báo cáo."

    try:
        await backend_api.report_trip_issue(
            trip_id=current["trip_id"],
            driver_phone=driver_phone,
            issue_type=issue_type,
            description=description,
        )
    except Exception:
        logger.error("report_trip_issue failed", exc_info=True)
        return "Không thể gửi báo cáo lúc này. Vui lòng thử lại."

    label = _ISSUE_LABELS.get(issue_type, issue_type)
    return (
        f"Đã ghi nhận báo cáo sự cố: {label}. "
        "Đội hỗ trợ sẽ xem xét và liên hệ nếu cần thêm thông tin."
    )
