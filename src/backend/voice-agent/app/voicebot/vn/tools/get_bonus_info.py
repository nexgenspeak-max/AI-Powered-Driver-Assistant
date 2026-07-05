import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.vn.tools.get_bonus_info")


@function_tool(raw_schema=raw_schema["get_bonus_info"])
async def get_bonus_info(raw_arguments: dict, context: RunContext) -> str:
    bonuses = context_store.get(context.userdata, "active_bonuses", [])
    if not bonuses:
        return "Hiện không có chương trình thưởng hay vùng tăng giá nào đang hoạt động."

    lines = []
    for b in bonuses:
        desc = b.get("description", "")
        amount = b.get("amount", "")
        expire = b.get("expires_at", "")
        line = desc
        if amount:
            line += f" (+{amount})"
        if expire:
            line += f" (hết hạn {expire})"
        lines.append(line)

    return "Thưởng đang hoạt động: " + "; ".join(lines) + "."
