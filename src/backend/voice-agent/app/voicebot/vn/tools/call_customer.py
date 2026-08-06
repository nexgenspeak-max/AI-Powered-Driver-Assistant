import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_ACTIVE_DRIVER
from app.voicebot.processors import context_store, customer_call
from app.voicebot.processors.trip_format import short_address

logger = logging.getLogger("voice-agent.vn.tools.call_customer")


@function_tool(raw_schema=raw_schema["call_customer"])
async def call_customer(raw_arguments: dict, context: RunContext):
    mode = raw_arguments.get("mode", "bridge")
    trip_index = raw_arguments.get("trip_index")

    trips = context_store.get_callable_trips(context.userdata)
    if not trips:
        # Fallback for the rare case current_trip exists but isn't picked up
        # by the stricter "in progress" filter above (e.g. stale/edge-case
        # status) — keeps the old single-trip behavior working either way.
        current = context_store.get_current_trip(context.userdata)
        if not current:
            return ERR_NO_ACTIVE_DRIVER
        trips = [current]

    if len(trips) == 1:
        target = trips[0]
    elif trip_index is not None:
        idx = int(trip_index) - 1
        if idx < 0 or idx >= len(trips):
            return f"Anh/chị chỉ có {len(trips)} chuyến. Vui lòng chọn từ 1 đến {len(trips)}."
        target = trips[idx]
    else:
        # Multiple trips, driver hasn't said which one yet — ask, don't guess.
        lines = [
            f"{i}. khách {t.get('customer_name') or 'không rõ tên'} (đón {short_address(t.get('pickup_address', ''), 30)})"
            for i, t in enumerate(trips, 1)
        ]
        return (
            "Anh/chị đang có nhiều chuyến, muốn gọi cho khách nào: "
            + "; ".join(lines)
            + "? Anh/chị nói số thứ tự hoặc tên khách giúp tôi."
        )

    if mode == "agent":
        return await customer_call.start_in_room_agent_call(context, target, lang="vn")
    if mode == "bridge":
        return await customer_call.start_in_room_bridge_call(context, target, lang="vn")
    if mode == "background":
        return await customer_call.start_background_call(context, target, lang="vn")

    return "Chế độ gọi không hợp lệ. Chọn agent hoặc bridge."
