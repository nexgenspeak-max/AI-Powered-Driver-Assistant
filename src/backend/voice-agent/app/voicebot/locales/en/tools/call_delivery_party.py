import logging

from livekit.agents import RunContext, function_tool

from app.services import backend_api
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.processors import contact_call, context_store, custom_call
from app.voicebot.processors.delivery_orders import get_delivery_orders, resolve_delivery_call_target

logger = logging.getLogger("voice-agent.en.tools.call_delivery_party")


async def _ensure_orders(userdata: dict) -> None:
    if get_delivery_orders(userdata):
        return
    phone = userdata.get("driver_phone") or ""
    if not phone:
        return
    try:
        orders = await backend_api.list_delivery_orders(phone)
    except Exception:
        logger.exception("list_delivery_orders failed")
        return
    ctx = userdata.setdefault("context", {})
    if isinstance(ctx, dict):
        ctx["delivery_orders"] = orders


async def _speak_or_handoff(context: RunContext, result):
    if isinstance(result, tuple):
        return result
    if isinstance(result, str) and result.strip():
        return await context_store.speak_and_stop(context.session, result)
    return result


@function_tool(raw_schema=raw_schema["call_delivery_party"])
async def call_delivery_party(raw_arguments: dict, context: RunContext):
    await _ensure_orders(context.userdata)
    party = (raw_arguments.get("party") or "recipient").strip().lower()
    order_index = raw_arguments.get("order_index")
    mode = raw_arguments.get("mode") or context_store.get_default_customer_call_mode(context.userdata)
    message = (raw_arguments.get("message") or "").strip()

    resolved = resolve_delivery_call_target(
        context.userdata,
        party=party,
        order_index=order_index,
        lang="en",
    )
    if resolved is None:
        return await context_store.speak_and_stop(
            context.session, "No delivery order to call."
        )
    if isinstance(resolved, str):
        return await context_store.speak_and_stop(context.session, resolved)

    phone = resolved["phone"]
    name = resolved["display_name"]
    if mode == "bridge":
        return await _speak_or_handoff(
            context,
            await custom_call.start_bridge_call_to_number(
                context, phone, contact_name=name, lang="en"
            ),
        )
    return await _speak_or_handoff(
        context,
        await contact_call.start_agent_call_to_contact(
            context, phone, contact_name=name, custom_message=message, lang="en"
        ),
    )
