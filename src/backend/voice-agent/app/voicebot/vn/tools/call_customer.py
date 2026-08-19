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
    message = (raw_arguments.get("message") or "").strip()

    trips = context_store.get_callable_trips(context.userdata)
    if not trips:
        # Fallback for the rare case current_trip exists but isn't picked up
        # by the stricter "in progress" filter above (e.g. stale/edge-case
        # status) — keeps the old single-trip behavior working either way.
        current = context_store.get_current_trip(context.userdata)
        if not current:
            return ERR_NO_ACTIVE_DRIVER
        trips = [current]

    # One-shot: which trip a just-delivered proximity nudge was about, if
    # any (see agent.py/session.py's set_last_nudge_trip). Read unconditionally
    # so it never lingers to wrongly auto-resolve some later, unrelated
    # disambiguation — only actually used below when trips are ambiguous.
    nudge_trip_id = context_store.pop_last_nudge_trip(context.userdata)

    if len(trips) == 1:
        target = trips[0]
    elif trip_index is not None:
        idx = int(trip_index) - 1
        if idx < 0 or idx >= len(trips):
            return f"Anh/chị chỉ có {len(trips)} chuyến. Vui lòng chọn từ 1 đến {len(trips)}."
        target = trips[idx]
    elif nudge_trip_id and any(t.get("trip_id") == nudge_trip_id for t in trips):
        # Driver said yes right after "muốn tôi gọi báo khách không" — the
        # trip is already known from the nudge, don't re-ask which customer.
        target = next(t for t in trips if t.get("trip_id") == nudge_trip_id)
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
        return await customer_call.start_in_room_agent_call(context, target, lang="vn", custom_message=message)
    if mode == "bridge":
        return await customer_call.start_in_room_bridge_call(context, target, lang="vn")
    if mode == "background":
        return await customer_call.start_background_call(context, target, lang="vn")

    return "Chế độ gọi không hợp lệ. Chọn agent hoặc bridge."
