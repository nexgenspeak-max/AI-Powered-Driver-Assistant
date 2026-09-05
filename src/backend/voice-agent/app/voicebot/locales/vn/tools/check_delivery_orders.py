from livekit.agents import RunContext, function_tool

from app.services import backend_api
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.processors.delivery_orders import format_delivery_orders_reply, get_delivery_orders


async def _ensure_orders(userdata: dict) -> None:
    if get_delivery_orders(userdata):
        return
    phone = userdata.get("driver_phone") or ""
    if not phone:
        return
    try:
        orders = await backend_api.list_delivery_orders(phone)
    except Exception:
        return
    ctx = userdata.setdefault("context", {})
    if isinstance(ctx, dict):
        ctx["delivery_orders"] = orders


@function_tool(raw_schema=raw_schema["check_delivery_orders"])
async def check_delivery_orders(raw_arguments: dict, context: RunContext) -> str:
    await _ensure_orders(context.userdata)
    reply = format_delivery_orders_reply(context.userdata, raw_arguments, lang="vi")
    return await context_store.speak_and_stop(context.session, reply)
