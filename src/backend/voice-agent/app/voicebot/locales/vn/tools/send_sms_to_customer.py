import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import ERR_SMS_SEND_FAILED
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_reply import contact_sms_actions, trip_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("voice-agent.vn.tools.send_sms_to_customer")


@function_tool(raw_schema=raw_schema["send_sms_to_customer"])
async def send_sms_to_customer(raw_arguments: dict, context: RunContext) -> str:
    message = (raw_arguments.get("message") or "").strip()
    actions = contact_sms_actions(lang="vi") + trip_actions(lang="vi")
    if not message:
        return await context_store.speak_and_stop(
            context.session,
                build_mutation_response(
                "Bạn muốn nhắn nội dung gì cho khách?",
                tool="send_sms_to_customer",
                lang="vi",
                action=actions,
            ),
        )

    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    if not trip:
        return await context_store.speak_and_stop(
            context.session,
                build_mutation_response(
                "Không có chuyến đang hoạt động để nhắn tin cho khách.",
                tool="send_sms_to_customer",
                lang="vi",
                action=trip_actions(lang="vi"),
            ),
        )

    trip_id = trip["trip_id"]
    customer = trip.get("customer_name", "khách hàng")

    # Awaited (not schedule_sync's fire-and-forget) — unlike
    # confirm_trip_with_customer's canned message, a real SMS-send failure
    # here (e.g. Twilio geo-permission rejection) must reach the driver
    # instead of being silently logged while the AI claims success.
    try:
        await backend_api.send_sms(message, trip_id=trip_id)
    except Exception:
        logger.error("send_sms_to_customer API failed", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
                build_mutation_response(
                ERR_SMS_SEND_FAILED,
                tool="send_sms_to_customer",
                lang="vi",
                action=actions,
            ),
        )

    return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
            f"Đã gửi tin nhắn cho {customer}.",
            tool="send_sms_to_customer",
            lang="vi",
            knowledge=[f"trip_id: {trip_id}", f"customer: {customer}"],
            action=actions,
        ),
    )
