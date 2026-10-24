"""Thưởng / ưu đãi đang áp dụng — đọc từ ngữ cảnh đã tải sẵn (active_bonuses).

Dữ liệu đến từ GET /drivers/me/context (prefetch khi mở phiên), nên công cụ
không gọi mạng; không có endpoint làm mới riêng nên không đăng ký refresh.
"""
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.prompts.tool_response import ToolResponse


def build_bonuses_response(bonuses: list[dict], lang: str = "vi") -> ToolResponse:
    rows = [b for b in (bonuses or []) if isinstance(b, dict)]
    if not rows:
        return ToolResponse.simple(
            tool="get_active_bonuses",
            spoken="Hiện không có thưởng hay ưu đãi nào đang áp dụng." if lang != "en"
            else "There are no active bonuses or promotions right now.",
            lang=lang,
        )
    parts = []
    knowledge = []
    for b in rows:
        desc = str(b.get("description") or "").strip()
        amount = str(b.get("amount") or "").strip()
        expires = str(b.get("expires_at") or "").strip()
        knowledge.append(f"bonus: {desc} | amount: {amount} | expires: {expires}")
        if lang == "en":
            parts.append(f"{desc}, {amount}" + (f", until {expires}" if expires else ""))
        else:
            parts.append(f"{desc}, {amount}" + (f", đến {expires}" if expires else ""))
    if lang == "en":
        spoken = (f"There are {len(rows)} active bonuses: " if len(rows) > 1 else "One active bonus: ") + "; ".join(parts) + "."
        rule = "State each bonus with its amount and expiry; do not invent extra bonuses"
    else:
        spoken = (f"Đang có {len(rows)} ưu đãi: " if len(rows) > 1 else "Đang có một ưu đãi: ") + "; ".join(parts) + "."
        rule = "Đọc từng ưu đãi kèm mức và hạn; không bịa thêm ưu đãi"
    return ToolResponse(
        tool="get_active_bonuses",
        lang=lang,
        knowledge_data=knowledge,
        response_rules=[rule],
        response_knowledge=spoken,
    )


@function_tool(raw_schema=raw_schema["get_active_bonuses"])
async def get_active_bonuses(raw_arguments: dict, context: RunContext) -> str:
    bonuses = context_store.get(context.userdata, "active_bonuses", []) or []
    reply = build_bonuses_response(bonuses, lang="vi")
    context_store.set_last_tool_response(context.userdata, reply)
    await context_store.speak_reply(context.session, reply, lang="vi")
