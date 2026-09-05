import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.en.constants import ERR_SMS_SEND_FAILED
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_reply import contact_sms_actions, trip_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("voice-agent.en.tools.send_sms_to_customer")


@function_tool(raw_schema=raw_schema["send_sms_to_customer"])
async def send_sms_to_customer(raw_arguments: dict, context: RunContext) -> str:
    message = (raw_arguments.get("message") or "").strip()
    actions = contact_sms_actions(lang="en") + trip_actions(lang="en")
    if not message:
        return await context_store.speak_and_stop(
            context.session,
                build_mutation_response(
                "What would you like to text the customer?",
                tool="send_sms_to_customer",
                lang="en",
                action=actions,
            ),
        )

    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    if not trip:
        return await context_store.speak_and_stop(
            context.session,
                build_mutation_response(
                "No active trip to text the customer.",
                tool="send_sms_to_customer",
                lang="en",
                action=trip_actions(lang="en"),
            ),
        )

    trip_id = trip["trip_id"]
    customer = trip.get("customer_name", "the customer")

    try:
        await backend_api.send_sms(message, trip_id=trip_id)
    except Exception:
        logger.error("send_sms_to_customer API failed", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
                build_mutation_response(
                ERR_SMS_SEND_FAILED,
                tool="send_sms_to_customer",
                lang="en",
                action=actions,
            ),
        )

    return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
            f"Text sent to {customer}.",
            tool="send_sms_to_customer",
            lang="en",
            knowledge=[f"trip_id: {trip_id}", f"customer: {customer}"],
            action=actions,
        ),
    )
