import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.processors import call_status

logger = logging.getLogger("voice-agent.en.tools.check_customer_call_status")


@function_tool(raw_schema=raw_schema["check_customer_call_status"])
async def check_customer_call_status(raw_arguments: dict, context: RunContext) -> str:
    return await call_status.check_call_status(context.userdata, lang="en")
