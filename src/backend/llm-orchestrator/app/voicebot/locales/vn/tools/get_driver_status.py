"""Trạng thái nhận chuyến hiện tại (online/offline) và tên hồ sơ — đọc từ ngữ cảnh.

Khác set_driver_status (đổi trạng thái), công cụ này chỉ trả lời "tôi đang
online chưa". Dữ liệu là context["driver"] từ prefetch; sau khi
set_driver_status đổi trạng thái, context_store đã cập nhật ô này.
"""
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.prompts.tool_response import ToolResponse


def build_driver_status_response(driver: dict | None, lang: str = "vi") -> ToolResponse:
    driver = driver if isinstance(driver, dict) else {}
    status = str(driver.get("status") or "").strip().lower()
    name = str(driver.get("name") or "").strip()
    online = status == "online"
    if not status:
        return ToolResponse.simple(
            tool="get_driver_status",
            spoken="Chưa có dữ liệu trạng thái của bạn." if lang != "en" else "No status data available yet.",
            lang=lang,
        )
    if lang == "en":
        spoken = "You are online and receiving trips." if online else "You are offline, not receiving trips."
        follow = ["Say 'go online' or 'go offline' to change it"]
    else:
        spoken = "Bạn đang online, sẵn sàng nhận chuyến." if online else "Bạn đang offline, chưa nhận chuyến."
        follow = ["Nói 'bật nhận chuyến' hoặc 'tắt nhận chuyến' để đổi"]
    return ToolResponse(
        tool="get_driver_status",
        lang=lang,
        knowledge_data=[f"status: {status}", f"name: {name}"],
        response_rules=["Chỉ nói trạng thái hiện tại; muốn đổi thì dùng set_driver_status" if lang != "en"
                        else "Only state the current status; use set_driver_status to change it"],
        response_knowledge=spoken,
        follow_up_knowledge=follow,
    )


@function_tool(raw_schema=raw_schema["get_driver_status"])
async def get_driver_status(raw_arguments: dict, context: RunContext) -> str:
    driver = context_store.get(context.userdata, "driver", {}) or {}
    reply = build_driver_status_response(driver, lang="vi")
    context_store.set_last_tool_response(context.userdata, reply)
    await context_store.speak_reply(context.session, reply, lang="vi")
