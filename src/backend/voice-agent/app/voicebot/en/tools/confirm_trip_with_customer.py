import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.en.tools.confirm_trip_with_customer")


@function_tool(raw_schema=raw_schema["confirm_trip_with_customer"])
async def confirm_trip_with_customer(raw_arguments: dict, context: RunContext) -> str:
    current = context_store.get_current_trip(context.userdata)
    if not current:
        return "No active trip to confirm with the customer."

    trip_id = current["trip_id"]
    customer = current.get("customer_name", "the customer")

    async def _sync() -> None:
        try:
            await backend_api.confirm_trip_with_customer(trip_id)
        except Exception:
            logger.error("confirm_trip_with_customer API failed", exc_info=True)

    context_store.schedule_sync(_sync())
    return f"Confirmation message sent to {customer}."
