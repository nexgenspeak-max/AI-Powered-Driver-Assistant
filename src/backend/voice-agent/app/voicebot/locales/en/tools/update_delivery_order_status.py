import logging

from livekit.agents import RunContext, function_tool

from app.services import backend_api
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.processors.delivery_orders import (
    get_delivery_orders,
    patch_delivery_order,
    resolve_order_for_status,
    status_label,
)
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("voice-agent.en.tools.update_delivery_order_status")


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


@function_tool(raw_schema=raw_schema["update_delivery_order_status"])
async def update_delivery_order_status(raw_arguments: dict, context: RunContext) -> str:
    await _ensure_orders(context.userdata)
    status = (raw_arguments.get("status") or "").strip().lower()
    order_index = raw_arguments.get("order_index")
    actions = [
        "Picked up: update_delivery_order_status(status=picked_up)",
        "Out for delivery: update_delivery_order_status(status=delivering)",
        "Delivered: update_delivery_order_status(status=delivered)",
        "Redeliver / return: status=redelivery|returned",
    ]

    if status not in (
        "picked_up",
        "delivering",
        "delivered",
        "redelivery",
        "returned",
    ):
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                "That delivery status isn't valid.",
                tool="update_delivery_order_status",
                lang="en",
                action=actions,
            ),
        )

    resolved = resolve_order_for_status(
        context.userdata, status=status, order_index=order_index, lang="en"
    )
    if isinstance(resolved, str):
        return await context_store.speak_and_stop(context.session, resolved)

    order = resolved["order"]
    order_id = order["order_id"]
    idx = resolved["order_index"]
    label = status_label(status, lang="en")

    try:
        updated = await backend_api.update_delivery_order_status(order_id, status)
    except Exception:
        logger.error("update_delivery_order_status failed order=%s", order_id, exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                "Couldn't update the delivery status right now.",
                tool="update_delivery_order_status",
                lang="en",
                action=actions,
            ),
        )

    patch_delivery_order(
        context.userdata,
        order_id,
        **{k: v for k, v in updated.items() if k != "order_id"},
    )
    context_store.clear_pending_driver_action(context.userdata)
    name = order.get("recipient_name") or "the recipient"
    return await context_store.speak_and_stop(
        context.session,
        build_mutation_response(
            f"Order {idx} ({name}) marked {label}.",
            tool="update_delivery_order_status",
            lang="en",
            knowledge=[f"order_id: {order_id}", f"status: {status}"],
            action=actions,
        ),
    )
