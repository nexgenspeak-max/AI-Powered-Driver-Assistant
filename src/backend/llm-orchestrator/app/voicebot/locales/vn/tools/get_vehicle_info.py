"""Xe của tài xế (loại, biển số, tên xe) — đọc từ ngữ cảnh đã tải sẵn (driver).

Các trường vehicle_type / vehicle_plate / vehicle_name do identity-service trả
về trong GET /drivers/me/context, nên công cụ không gọi mạng. Thiếu trường nào
thì bỏ qua trường đó; thiếu cả ba thì nói chưa có dữ liệu, không đoán.
"""
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.prompts.tool_response import ToolResponse


def build_vehicle_response(driver: dict, lang: str = "vi") -> ToolResponse:
    driver = driver if isinstance(driver, dict) else {}
    vtype = str(driver.get("vehicle_type") or "").strip()
    plate = str(driver.get("vehicle_plate") or "").strip()
    vname = str(driver.get("vehicle_name") or "").strip()
    if not (vtype or plate or vname):
        return ToolResponse.simple(
            tool="get_vehicle_info",
            spoken="Chưa có dữ liệu xe trong tài khoản của bạn. Bạn kiểm tra mục Hồ sơ trong ứng dụng nhé."
            if lang != "en"
            else "There is no vehicle on your account yet. Please check the Profile screen in the app.",
            lang=lang,
        )
    if lang == "en":
        parts = []
        if vname:
            parts.append(vname)
        if vtype:
            parts.append(f"type {vtype}")
        if plate:
            parts.append(f"plate {plate}")
        spoken = "Your registered vehicle: " + ", ".join(parts) + "."
        rule = "Read only the vehicle fields present; do not guess a plate or model"
    else:
        parts = []
        if vname:
            parts.append(f"xe {vname}")
        if vtype:
            parts.append(f"loại {vtype}")
        if plate:
            parts.append(f"biển số {plate}")
        spoken = "Xe bạn đăng ký: " + ", ".join(parts) + "."
        rule = "Chỉ đọc các trường xe có sẵn; không đoán biển số hay dòng xe"
    return ToolResponse(
        tool="get_vehicle_info",
        lang=lang,
        knowledge_data=[
            f"vehicle_name: {vname or '-'}",
            f"vehicle_type: {vtype or '-'}",
            f"vehicle_plate: {plate or '-'}",
        ],
        response_rules=[rule],
        response_knowledge=spoken,
    )


@function_tool(raw_schema=raw_schema["get_vehicle_info"])
async def get_vehicle_info(raw_arguments: dict, context: RunContext) -> str:
    driver = context_store.get(context.userdata, "driver", {}) or {}
    reply = build_vehicle_response(driver, lang="vi")
    context_store.set_last_tool_response(context.userdata, reply)
    await context_store.speak_reply(context.session, reply, lang="vi")
