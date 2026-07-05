import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_NO_ACTIVE_CANCEL
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.en.tools.request_cancel_trip")


@function_tool(raw_schema=raw_schema["request_cancel_trip"])
async def request_cancel_trip(raw_arguments: dict, context: RunContext) -> str:
    current = context_store.get_current_trip(context.userdata)
    if not current:
        return ERR_NO_ACTIVE_CANCEL
    context.userdata["pending_cancel_trip_id"] = current["trip_id"]
    customer = current.get("customer_name", "the customer")
    pickup_time = current.get("pickup_time", "")
    return (
        f"Are you sure you want to cancel the trip with {customer}"
        + (f" at {pickup_time}" if pickup_time else "")
        + "? Say 'yes' to confirm cancellation."
    )
