import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import ERR_CONFIRM_FAIL
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_reply import contact_sms_actions, trip_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("llm-orchestrator.vn.tools.confirm_trip_with_customer")


@function_tool(raw_schema=raw_schema["confirm_trip_with_customer"])
async def confirm_trip_with_customer(raw_arguments: dict, context: RunContext) -> str:
    actions = trip_actions(lang="vi") + contact_sms_actions(lang="vi")
    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    if not trip:
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                "Không có chuyến đang hoạt động để xác nhận.",
                tool="confirm_trip_with_customer",
                lang="vi",
                action=actions,
            ),
        )

    trip_id = trip["trip_id"]
    customer = trip.get("customer_name", "khách hàng")

    try:
        await backend_api.confirm_trip_with_customer(trip_id)
    except Exception:
        logger.error("confirm_trip_with_customer API failed", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                ERR_CONFIRM_FAIL,
                tool="confirm_trip_with_customer",
                lang="vi",
                action=actions,
            ),
        )

    return await context_store.speak_and_stop(
        context.session,
        build_mutation_response(
            f"Đã gửi tin nhắn xác nhận chuyến đi cho {customer}.",
            tool="confirm_trip_with_customer",
            lang="vi",
            knowledge=[f"trip_id: {trip_id}", f"customer: {customer}"],
            action=actions,
        ),
    )
