"""Driver street-hail / walk-up: create a trip already in confirmed status."""
import logging

from livekit.agents import RunContext, function_tool

from app.services import backend_api
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_reply import trip_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response
from app.voicebot.processors.trip_format import short_address

logger = logging.getLogger("llm-orchestrator.vn.tools.create_walkup_trip")


def _as_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "có", "co")
    return bool(value)


@function_tool(raw_schema=raw_schema["create_walkup_trip"])
async def create_walkup_trip(raw_arguments: dict, context: RunContext) -> str:
    customer_phone = (raw_arguments.get("customer_phone") or "").strip()
    pickup_address = (raw_arguments.get("pickup_address") or "").strip()
    dropoff_address = (raw_arguments.get("dropoff_address") or "").strip()
    customer_name = (raw_arguments.get("customer_name") or "").strip()
    note = (raw_arguments.get("note") or "").strip()
    has_bulky_goods = _as_bool(raw_arguments.get("has_bulky_goods", False))
    with_children = _as_bool(raw_arguments.get("with_children", False))
    actions = trip_actions(lang="vi")
    driver_phone = (context.userdata.get("driver_phone") or "").strip()

    if not driver_phone:
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                "Không xác định được tài khoản tài xế. Vui lòng thử lại.",
                tool="create_walkup_trip",
                lang="vi",
                action=actions,
            ),
        )

    if not customer_phone or len(customer_phone) < 8:
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                "Cần số điện thoại khách để tự tạo chuyến.",
                tool="create_walkup_trip",
                lang="vi",
                action=actions,
            ),
        )
    if not pickup_address or not dropoff_address:
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                "Cần điểm đón và điểm trả để thêm chuyến.",
                tool="create_walkup_trip",
                lang="vi",
                action=actions,
            ),
        )

    try:
        trip = await backend_api.create_walkup_trip(
            driver_phone=driver_phone,
            customer_phone=customer_phone,
            pickup_address=pickup_address,
            dropoff_address=dropoff_address,
            customer_name=customer_name,
            note=note,
            has_bulky_goods=has_bulky_goods,
            with_children=with_children,
        )
    except Exception:
        logger.error("create_walkup_trip failed", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                "Không thêm được chuyến lúc này. Vui lòng thử lại.",
                tool="create_walkup_trip",
                lang="vi",
                action=actions,
            ),
        )

    context_store.add_driver_walkup_trip(context.userdata, trip)

    flags = []
    if has_bulky_goods:
        flags.append("có hàng cồng kềnh")
    if with_children:
        flags.append("có trẻ em")
    flag_bit = (" — " + ", ".join(flags)) if flags else ""
    who = customer_name or customer_phone
    spoken = (
        f"Đã tự tạo chuyến cho {who}, "
        f"đón {short_address(pickup_address)} đến {short_address(dropoff_address)}"
        f"{flag_bit}. Chuyến đã vào đang chạy."
    )
    return await context_store.speak_and_stop(
        context.session,
        build_mutation_response(
            spoken,
            tool="create_walkup_trip",
            lang="vi",
            knowledge=[f"trip_id: {trip.get('trip_id', '-')}"],
            action=actions,
        ),
    )
