"""Delivery-order helpers for voice tools (list + call + status updates)."""
from __future__ import annotations

from app.voicebot.processors import context_store
from app.voicebot.processors.custom_call import normalize_vn_phone
from app.voicebot.processors.trip_format import short_address
from app.voicebot.prompts.tool_response import ToolResponse

# Mirrors driver-app DELIVERY_ACTIVE_STATUSES
ACTIVE_STATUSES = frozenset({"pending", "picked_up", "delivering", "redelivery"})
OUT_FOR_DELIVERY = frozenset({"delivering", "redelivery"})

# Mirrors trip-service routes/deliveryOrders.ts ALLOWED_TRANSITIONS
ALLOWED_TRANSITIONS: dict[str, frozenset[str]] = {
    "pending": frozenset({"picked_up"}),
    "picked_up": frozenset({"delivering"}),
    "delivering": frozenset({"delivered", "redelivery", "returned"}),
    "redelivery": frozenset({"delivering", "returned"}),
    "delivered": frozenset(),
    "returned": frozenset(),
}

_STATUS_VI = {
    "pending": "chờ lấy",
    "picked_up": "đã lấy",
    "delivering": "đang giao",
    "redelivery": "giao lại",
    "delivered": "đã giao",
    "returned": "đã trả",
}
_STATUS_EN = {
    "pending": "pending pickup",
    "picked_up": "picked up",
    "delivering": "out for delivery",
    "redelivery": "redelivery",
    "delivered": "delivered",
    "returned": "returned",
}


def status_label(status: str, *, lang: str) -> str:
    table = _STATUS_EN if lang == "en" else _STATUS_VI
    return table.get(status, status)


def get_delivery_orders(userdata: dict) -> list[dict]:
    return list(context_store.get(userdata, "delivery_orders", []) or [])


def get_active_delivery_orders(userdata: dict) -> list[dict]:
    return [o for o in get_delivery_orders(userdata) if o.get("status") in ACTIVE_STATUSES]


def patch_delivery_order(userdata: dict, order_id: str, **fields) -> None:
    orders = get_delivery_orders(userdata)
    for order in orders:
        if order.get("order_id") == order_id:
            order.update(fields)
            break
    ctx = userdata.setdefault("context", {})
    if isinstance(ctx, dict):
        ctx["delivery_orders"] = orders


def delivery_status_from_text(text: str, lang: str) -> str | None:
    """Map clear driver phrases → target status (API lowercase)."""
    t = text.lower().strip()
    if lang == "en":
        if any(p in t for p in ("mark returned", "return the parcel", "return to sender")):
            return "returned"
        if any(p in t for p in ("redeliver", "retry delivery", "deliver again")):
            return "redelivery"
        if any(
            p in t
            for p in ("delivered", "delivery complete", "finished delivery", "done delivering")
        ):
            return "delivered"
        if any(p in t for p in ("out for delivery", "start delivering", "on the way to deliver")):
            return "delivering"
        if any(p in t for p in ("picked up", "picked up the parcel", "got the package")):
            return "picked_up"
        return None
    if any(p in t for p in ("trả hàng", "trả đơn", "trả lại người gửi", "trả về")):
        return "returned"
    if any(p in t for p in ("giao lại", "giao lại lần", "thử giao lại")):
        return "redelivery"
    if any(
        p in t
        for p in (
            "đã giao xong",
            "giao xong",
            "đã giao",
            "giao rồi",
            "giao thành công",
            "hoàn thành đơn",
            "xong đơn",
        )
    ):
        return "delivered"
    if any(p in t for p in ("bắt đầu giao", "đi giao", "mang đi giao")):
        return "delivering"
    if any(
        p in t
        for p in ("đã lấy hàng", "lấy hàng xong", "đã lấy", "nhận hàng xong", "đã nhận hàng")
    ):
        return "picked_up"
    return None


def resolve_order_for_status(
    userdata: dict,
    *,
    status: str,
    order_index: int | None = None,
    lang: str = "vn",
) -> dict | str:
    """Pick an order to update, or a spoken error/disambiguation string."""
    orders = get_delivery_orders(userdata)
    if not orders:
        return (
            "You don't have any delivery orders."
            if lang == "en"
            else "Bạn không có đơn hàng nào."
        )

    target = (status or "").strip().lower()
    active = get_active_delivery_orders(userdata)
    pool = active if active else orders

    if order_index is not None:
        try:
            idx = int(order_index)
        except (TypeError, ValueError):
            idx = 0
        if idx < 1 or idx > len(pool):
            return (
                f"Pick an order from 1 to {len(pool)}."
                if lang == "en"
                else f"Chọn đơn từ 1 đến {len(pool)}."
            )
        order = pool[idx - 1]
        cur = str(order.get("status") or "")
        if target not in ALLOWED_TRANSITIONS.get(cur, frozenset()):
            return (
                f"Can't mark order {idx} as {status_label(target, lang=lang)} "
                f"from {status_label(cur, lang=lang)}."
                if lang == "en"
                else (
                    f"Không chuyển đơn {idx} sang {status_label(target, lang=lang)} "
                    f"từ trạng thái {status_label(cur, lang=lang)}."
                )
            )
        return {"order": order, "order_index": idx}

    eligible = [
        (i + 1, o)
        for i, o in enumerate(pool)
        if target in ALLOWED_TRANSITIONS.get(str(o.get("status") or ""), frozenset())
    ]
    if not eligible:
        return (
            f"No delivery order can move to {status_label(target, lang=lang)} right now."
            if lang == "en"
            else f"Hiện không có đơn nào chuyển sang {status_label(target, lang=lang)} được."
        )
    if len(eligible) > 1:
        lines = [_one_line(o, i, "en" if lang == "en" else "vi") for i, o in eligible[:5]]
        if lang == "en":
            return "Several orders match — which one? Say order 1, 2, … " + "; ".join(lines)
        return "Có nhiều đơn phù hợp — chọn đơn nào? Nói đơn 1, 2, … " + "; ".join(lines)
    idx, order = eligible[0]
    return {"order": order, "order_index": idx}


def maybe_arm_delivered_pending(userdata: dict, orders: list[dict], *, lang: str) -> str:
    """If exactly one out-for-delivery order, ask and arm pending confirm → delivered."""
    out = [(i + 1, o) for i, o in enumerate(orders) if o.get("status") in OUT_FOR_DELIVERY]
    if len(out) != 1:
        return ""
    idx, order = out[0]
    name = order.get("recipient_name") or ("recipient" if lang == "en" else "người nhận")
    context_store.set_pending_driver_action(
        userdata,
        "update_delivery_order_status",
        {"status": "delivered", "order_index": idx},
        source="ask_delivered",
    )
    if lang == "en":
        return f" Order {idx} to {name} is out for delivery — is it delivered yet?"
    return f" Đơn {idx} tới {name} đang giao — giao xong chưa?"


def format_delivery_orders_reply(
    userdata: dict, raw_arguments: dict, *, lang: str
) -> ToolResponse | str:
    active_only = raw_arguments.get("active_only", True)
    orders = get_active_delivery_orders(userdata) if active_only else get_delivery_orders(userdata)
    order_index = raw_arguments.get("order_index")
    list_all = bool(raw_arguments.get("list_all"))

    if not orders:
        return (
            "You don't have any active delivery orders."
            if lang == "en"
            else "Bạn không có đơn hàng đang giao nào."
        )

    if order_index is not None:
        try:
            idx = int(order_index)
        except (TypeError, ValueError):
            idx = 0
        if idx < 1 or idx > len(orders):
            return (
                f"I only see {len(orders)} delivery order(s) — pick a number from 1 to {len(orders)}."
                if lang == "en"
                else f"Chỉ có {len(orders)} đơn — chọn số từ 1 đến {len(orders)}."
            )
        detail = _detail(orders[idx - 1], idx, lang=lang)
        ask = maybe_arm_delivered_pending(userdata, [orders[idx - 1]], lang=lang)
        if ask:
            detail.response_knowledge += ask
        return detail

    if list_all:
        reply = _list_all(orders, lang=lang)
        ask = maybe_arm_delivered_pending(userdata, orders, lang=lang)
        if ask:
            reply.response_knowledge += ask
        return reply

    n = len(orders)
    if lang == "en":
        spoken = (
            f"You have {n} active delivery order."
            if n == 1
            else f"You have {n} active delivery orders. Which one — say order 1, 2, …?"
        )
    else:
        spoken = (
            f"Bạn còn {n} đơn hàng đang giao."
            if n == 1
            else f"Bạn còn {n} đơn hàng đang giao. Muốn nghe đơn nào — nói đơn 1, 2, …?"
        )
    ask = maybe_arm_delivered_pending(userdata, orders, lang=lang)
    spoken += ask
    return ToolResponse(
        tool="check_delivery_orders",
        lang="en" if lang == "en" else "vi",
        knowledge_data=[f"count: {n}"],
        response_rules=["Chỉ nói số đơn; chi tiết khi có order_index"],
        response_knowledge=spoken,
        follow_up_knowledge=[_one_line(o, i, lang) for i, o in enumerate(orders[:5], 1)],
        action_knowledge=[],
    )


def _one_line(order: dict, idx: int, lang: str) -> str:
    name = order.get("recipient_name") or ("recipient" if lang == "en" else "người nhận")
    addr = short_address(order.get("recipient_address", ""), 28)
    st = order.get("status") or ""
    label = (_STATUS_EN if lang == "en" else _STATUS_VI).get(st, st)
    return f"{idx}. {name} — {addr} — {label}"


def _detail(order: dict, idx: int, *, lang: str) -> ToolResponse:
    name = order.get("recipient_name") or ("the recipient" if lang == "en" else "người nhận")
    addr = order.get("recipient_address") or ""
    sender = order.get("sender_phone") or ""
    recip_phone = order.get("recipient_phone") or ""
    st = order.get("status") or ""
    label = (_STATUS_EN if lang == "en" else _STATUS_VI).get(st, st)
    if lang == "en":
        spoken = (
            f"Order {idx}: {label}. Deliver to {name} at {addr}. "
            f"Recipient {recip_phone or 'unknown'}. Sender {sender or 'unknown'}."
        )
    else:
        spoken = (
            f"Đơn {idx}: {label}. Giao cho {name} tại {addr}. "
            f"SĐT nhận {recip_phone or 'chưa có'}. SĐT gửi {sender or 'chưa có'}."
        )
    return ToolResponse(
        tool="check_delivery_orders",
        lang="en" if lang == "en" else "vi",
        knowledge_data=[f"order_id: {order.get('order_id')}"],
        response_rules=["Nói ngắn gọn một đơn"],
        response_knowledge=spoken,
        follow_up_knowledge=[],
        action_knowledge=[],
    )


def _list_all(orders: list[dict], *, lang: str) -> ToolResponse:
    lines = [_one_line(o, i, lang) for i, o in enumerate(orders[:8], 1)]
    spoken = " ".join(lines)
    return ToolResponse(
        tool="check_delivery_orders",
        lang="en" if lang == "en" else "vi",
        knowledge_data=lines,
        response_rules=["Đọc từng đơn ngắn"],
        response_knowledge=spoken,
        follow_up_knowledge=[],
        action_knowledge=[],
    )


def resolve_delivery_call_target(
    userdata: dict,
    *,
    party: str,
    order_index: int | None = None,
    lang: str = "vn",
) -> dict | str | None:
    """Return {phone, display_name, order} or a spoken disambiguation/error string."""
    orders = get_active_delivery_orders(userdata)
    if not orders:
        return (
            "You don't have an active delivery order to call."
            if lang == "en"
            else "Không có đơn hàng đang giao để gọi."
        )

    party_key = (party or "recipient").strip().lower()
    if party_key in ("sender", "shipper", "người gửi", "người giao", "ben gui", "bên gửi"):
        party_key = "sender"
    else:
        party_key = "recipient"

    if order_index is None and len(orders) > 1:
        lines = [_one_line(o, i, "en" if lang == "en" else "vi") for i, o in enumerate(orders[:5], 1)]
        if lang == "en":
            return "You have several delivery orders. Which one — say order 1, 2, …? " + "; ".join(lines)
        return "Bạn có nhiều đơn. Gọi đơn nào — nói đơn 1, 2, …? " + "; ".join(lines)

    idx = int(order_index) if order_index is not None else 1
    if idx < 1 or idx > len(orders):
        return (
            f"Pick a delivery order from 1 to {len(orders)}."
            if lang == "en"
            else f"Chọn đơn từ 1 đến {len(orders)}."
        )

    order = orders[idx - 1]
    if party_key == "sender":
        phone = (order.get("sender_phone") or "").strip()
        display = "sender" if lang == "en" else "người gửi"
    else:
        phone = (order.get("recipient_phone") or "").strip()
        display = order.get("recipient_name") or ("recipient" if lang == "en" else "người nhận")

    if not phone:
        return (
            f"No phone number on file for the {display}."
            if lang == "en"
            else f"Đơn này chưa có số điện thoại {display}."
        )

    driver = normalize_vn_phone(str(userdata.get("driver_phone") or ""))
    if driver and normalize_vn_phone(phone) == driver:
        return (
            "That number is your own phone — I won't call it."
            if lang == "en"
            else "Đó là số của bạn — em không gọi được."
        )

    return {"phone": phone, "display_name": display, "order": order, "party": party_key}
