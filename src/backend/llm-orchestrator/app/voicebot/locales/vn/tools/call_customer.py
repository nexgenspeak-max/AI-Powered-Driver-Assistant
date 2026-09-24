import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import ERR_NO_ACTIVE_DRIVER
from app.voicebot.processors import context_store, customer_call
from app.voicebot.processors.tool_response_builders import build_mutation_response
from app.voicebot.processors.tool_reply import R, trip_actions

logger = logging.getLogger("llm-orchestrator.vn.tools.call_customer")


def _call_customer_actions(trip_count: int) -> list[str]:
    actions = [
        "Mặc định AI gọi hộ (tài xế nghe live, có thể chen vào): call_customer(mode=agent)",
        "Chỉ khi tài xế nói trực tiếp: call_customer(mode=bridge)",
    ]
    for i in range(1, trip_count + 1):
        actions.append(f"Gọi chuyến {i}: call_customer(trip_index={i}, mode=agent|bridge)")
    return actions + trip_actions(lang="vi")


async def _speak_or_handoff(context: RunContext, result):
    """Errors are spoken + StopResponse; agent/bridge handoff tuples pass through."""
    if isinstance(result, tuple):
        return result
    if isinstance(result, str) and result.strip():
        return await context_store.speak_and_stop(context.session, result)
    return result


@function_tool(raw_schema=raw_schema["call_customer"])
async def call_customer(raw_arguments: dict, context: RunContext):
    mode = raw_arguments.get("mode") or context_store.get_default_customer_call_mode(context.userdata)
    trip_index = raw_arguments.get("trip_index")
    message = (raw_arguments.get("message") or "").strip()

    nudge_trip_id = context_store.pop_last_nudge_trip(context.userdata)
    utterance = context_store.pop_pending_call_utterance(context.userdata)
    resolved = context_store.resolve_call_target(
        context.userdata,
        trip_index=trip_index,
        nudge_trip_id=nudge_trip_id,
        utterance=utterance,
        lang="vi",
    )
    trip_count = len(context_store.get_callable_trips(context.userdata))
    actions = _call_customer_actions(trip_count)

    if resolved is None:
        return await context_store.speak_and_stop(
            context.session,
                build_mutation_response(
                ERR_NO_ACTIVE_DRIVER,
                tool="call_customer",
                lang="vi",
                action=actions,
            ),
        )
    if isinstance(resolved, str):
        return await context_store.speak_and_stop(
            context.session,
                R(
                "call_customer",
                resolved,
                lang="vi",
                follow_up=["Chọn số thứ tự hoặc tên khách để gọi"],
                action=actions,
            ),
        )

    target = resolved
    if mode == "agent":
        return await _speak_or_handoff(
            context,
            await customer_call.start_in_room_agent_call(
                context, target, lang="vn", custom_message=message
            ),
        )
    if mode == "bridge":
        return await _speak_or_handoff(
            context,
            await customer_call.start_in_room_bridge_call(context, target, lang="vn"),
        )
    if mode == "background":
        return await _speak_or_handoff(
            context,
            await customer_call.start_background_call(context, target, lang="vn"),
        )

    return await context_store.speak_and_stop(
        context.session,
        build_mutation_response(
            "Chế độ gọi không hợp lệ. Dùng agent (AI gọi hộ) hoặc bridge (tài xế nói trực tiếp).",
            tool="call_customer",
            lang="vi",
            action=actions,
        ),
    )
