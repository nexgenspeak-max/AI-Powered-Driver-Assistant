import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.en.tools.get_bonus_info")


@function_tool(raw_schema=raw_schema["get_bonus_info"])
async def get_bonus_info(raw_arguments: dict, context: RunContext) -> str:
    bonuses = context_store.get(context.userdata, "active_bonuses", [])
    if not bonuses:
        return "There are no active bonus or surge programs right now."

    lines = []
    for b in bonuses:
        desc = b.get("description", "")
        amount = b.get("amount", "")
        expire = b.get("expires_at", "")
        line = desc
        if amount:
            line += f" (+{amount})"
        if expire:
            line += f" (expires {expire})"
        lines.append(line)

    return "Active bonuses: " + "; ".join(lines) + "."
