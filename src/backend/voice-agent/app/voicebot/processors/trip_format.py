"""Format trip data for voice responses — short addresses, fare, list/detail."""
from __future__ import annotations

BASE_FARE = 15_000
FARE_PER_KM = 12_000
MAX_LIST = 5


def estimated_fare(trip: dict) -> int:
    if trip.get("estimated_fare") is not None:
        return int(trip["estimated_fare"])
    km = float(trip.get("distance_km") or 0)
    return round(BASE_FARE + km * FARE_PER_KM)


def fmt_money(amount: int, lang: str) -> str:
    # Always the exact figure — "X nghìn"/"X.Y triệu" shorthand used to round/
    # truncate (e.g. 15.500đ -> "15 nghìn đ" silently drops the 500), and the
    # driver needs the real fare read out, not an approximation.
    if lang == "en":
        return f"{amount:,} VND"
    return f"{amount:,}".replace(",", ".") + "đ"


def short_address(address: str, max_len: int = 48) -> str:
    if not address:
        return ""
    text = address.strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 3].rstrip() + "..."


def format_route_order(route: dict, lang: str = "vi") -> str:
    """Spoken summary of a multi-stop optimized visiting order — WHERE to go
    in what order, WHO at each stop, and the distance/ETA hop from the
    previous stop. Mirrors format_trip_list's numbered-line cadence. route
    is context_store.get_optimized_route()'s return shape; caller should
    have already handled route is None (nothing to report) before calling."""
    stops = route.get("stops") or []
    if not stops:
        return (
            "Hiện bạn không có nhiều điểm dừng cần sắp xếp."
            if lang != "en" else
            "You don't have multiple stops to order right now."
        )

    lines = []
    for i, s in enumerate(stops, 1):
        is_pickup = s.get("kind") == "pickup"
        addr = short_address(s.get("address", ""), 40)
        customer = s.get("customer_name") or ("khách" if lang != "en" else "the customer")
        dist_km = round((s.get("distance_m") or 0) / 1000, 1)
        eta = s.get("eta_minutes")
        if lang == "en":
            verb = "pick up" if is_pickup else "drop off"
            lines.append(f"{i}. {verb} {customer} at {addr} ({dist_km} km, about {eta} min from the previous stop)")
        else:
            verb = "đón" if is_pickup else "trả"
            lines.append(f"{i}. {verb} khách {customer} tại {addr} ({dist_km} km, khoảng {eta} phút từ điểm trước)")

    header = (
        f"You have {len(stops)} stops, optimal order is"
        if lang == "en" else
        f"Bạn có {len(stops)} điểm dừng, thứ tự tối ưu là"
    )
    source_note = ""
    if route.get("source") == "haversine_fallback":
        source_note = (
            " (estimated as-the-crow-flies, no live traffic data)"
            if lang == "en" else
            " (ước tính theo đường chim bay, chưa có dữ liệu giao thông thực tế)"
        )
    return header + ": " + "; ".join(lines) + "." + source_note


def build_outbound_nav_info(trip: dict, lang: str) -> str:
    """Navigation/fare lines for outbound trip notification prompts."""
    lines: list[str] = []
    fare_label = "Estimated fare" if lang == "en" else "Giá ước tính"
    lines.append(f"- {fare_label}: {fmt_money(estimated_fare(trip), lang)}")

    eta = trip.get("eta_minutes")
    distance = trip.get("distance_km")
    if eta:
        if lang == "en":
            lines.append(f"- Distance: {distance} km, estimated {eta} minutes")
        else:
            lines.append(f"- Quãng đường: {distance} km, dự kiến {eta} phút")

    traffic = trip.get("traffic_note")
    if traffic:
        label = "Traffic" if lang == "en" else "Giao thông"
        lines.append(f"- {label}: {traffic}")

    route = trip.get("route_summary")
    if route:
        label = "Route" if lang == "en" else "Tuyến đường"
        lines.append(f"- {label}: {route}")

    return "\n".join(lines)


def format_traffic_info(trip: dict, lang: str = "vi") -> str:
    """Traffic / route summary for voice — reads prefetched Google Maps data."""
    traffic = (trip.get("traffic_note") or "").strip()
    route = (trip.get("route_summary") or "").strip()
    eta = trip.get("eta_minutes")
    km = trip.get("distance_km")
    pickup = short_address(trip.get("pickup_address", ""), 40)
    dropoff = short_address(trip.get("dropoff_address", ""), 40)

    if not traffic and not route and not eta:
        if lang == "en":
            return (
                "No live traffic data for this trip yet. "
                "Use Google Maps or Waze for turn-by-turn navigation."
            )
        return (
            "Chưa có dữ liệu giao thông cho chuyến này. "
            "Bạn dùng Google Maps hoặc Waze để xem đường chi tiết."
        )

    if lang == "en":
        msg = f"Route {pickup} to {dropoff}."
        if traffic:
            msg += f" Traffic: {traffic}."
        elif eta:
            msg += " Traffic looks normal."
        if route:
            msg += f" Via {route}."
        if eta:
            msg += f" Estimated {eta} minutes"
            if km:
                msg += f", {km} km"
            msg += "."
        return msg

    msg = f"Tuyến {pickup} đến {dropoff}."
    if traffic:
        msg += f" {traffic}."
    elif eta:
        msg += " Giao thông bình thường."
    if route:
        msg += f" Đi qua {route}."
    if eta:
        msg += f" Dự kiến {eta} phút"
        if km:
            msg += f", {km} km"
        msg += "."
    return msg


_UNCONFIRMED_STATUSES = ("pending", "notified", "calling")

# Spoken-language status — a driver has no idea what "notified" or
# "arrived_pickup" means read out loud; describe where the trip actually is
# in the pickup→dropoff sequence instead of the raw backend status code.
_STATUS_PHRASES_VI = {
    "pending": "vừa được tạo, đang chờ hệ thống liên hệ",
    "notified": "chưa xác nhận, đang chờ bạn đồng ý",
    "calling": "chưa xác nhận, đang chờ bạn đồng ý",
    "confirmed": "đã xác nhận, đang trên đường đến điểm đón",
    "arrived_pickup": "đã đến điểm đón, đang chờ đón khách",
    "picked_up": "đã đón khách, đang trên đường đến điểm trả",
    "completed": "đã hoàn thành",
}
_STATUS_PHRASES_EN = {
    "pending": "just created, waiting to be assigned",
    "notified": "not yet confirmed, awaiting your response",
    "calling": "not yet confirmed, awaiting your response",
    "confirmed": "confirmed, on the way to pickup",
    "arrived_pickup": "arrived at pickup, waiting for the customer",
    "picked_up": "customer picked up, on the way to dropoff",
    "completed": "completed",
}


def status_phrase(status: str, lang: str = "vi") -> str:
    phrases = _STATUS_PHRASES_EN if lang == "en" else _STATUS_PHRASES_VI
    return phrases.get(status, status)


def _needs_schedule_confirm(trip: dict) -> bool:
    """A trip is an unconfirmed scheduled pickup if it has a pickup_time and isn't accepted yet."""
    return bool(trip.get("pickup_time")) and trip.get("status") in _UNCONFIRMED_STATUSES


def _schedule_confirm_prompt(index: int, time: str, lang: str) -> str:
    if lang == "en":
        return (
            f" Trip {index} is a scheduled pickup at {time} awaiting your confirmation."
            " Would you like to confirm it?"
        )
    return (
        f" Chuyến {index} là chuyến hẹn giờ lúc {time}, đang chờ bạn xác nhận."
        " Bạn có muốn xác nhận nhận chuyến này không?"
    )


def format_customer_phone(trip: dict, lang: str = "vi") -> str:
    """Read the number saved on the trip — the driver already sees it in the app."""
    name = trip.get("customer_name") or ("khách" if lang != "en" else "the customer")
    phone = (trip.get("customer_phone") or "").strip()
    if not phone:
        if lang == "en":
            return f"No customer phone is saved on {name}'s trip in the app."
        return f"Chuyến của khách {name} chưa có số điện thoại trên ứng dụng."
    if lang == "en":
        return f"{name}'s number in the app is {phone}."
    return f"Số điện thoại của khách {name} trên ứng dụng là {phone}."


def format_primary_customer_phone(trips: list[dict], lang: str = "vi") -> str:
    """One number for a direct phone lookup — the active/upcoming trip first."""
    if not trips:
        return format_customer_phones([], lang)
    return format_customer_phone(trips[0], lang)


def format_customer_phones(trips: list[dict], lang: str = "vi") -> str:
    shown = [t for t in trips if t.get("customer_name") or t.get("customer_phone")][:MAX_LIST]
    if not shown:
        if lang == "en":
            return "I don't have a customer phone on any loaded trip."
        return "Tôi chưa thấy số điện thoại khách trên các chuyến đã tải."
    return " ".join(format_customer_phone(t, lang) for t in shown)


def format_trip_existence(trip: dict, lang: str = "vi") -> str:
    """Yes/no trip presence — customer name only, details on follow-up."""
    customer = trip.get("customer_name", "khách" if lang == "vi" else "customer")
    if lang == "en":
        return f"You have a trip with {customer}."
    return f"Bạn có chuyến với {customer}."


def format_trip_detail(trip: dict, index: int, lang: str = "vi") -> str:
    """One-line trip pick — customer + pickup; fare/phone/status in FollowUpKnowledge."""
    pickup = short_address(trip.get("pickup_address", ""), 36)
    customer = trip.get("customer_name", "khách" if lang == "vi" else "customer")
    time = (trip.get("pickup_time") or "").strip()
    if lang == "en":
        msg = f"Trip {index} with {customer}, pickup at {pickup}."
        if time:
            msg += f" Pickup time {time}."
        if _needs_schedule_confirm(trip):
            msg += _schedule_confirm_prompt(index, time, lang)
        return msg
    msg = f"Chuyến {index} với {customer}, đón tại {pickup}."
    if time:
        msg += f" Giờ đón {time}."
    if _needs_schedule_confirm(trip):
        msg += _schedule_confirm_prompt(index, time, lang)
    return msg


def format_trip_brief(trip: dict, index: int, lang: str = "vi") -> str:
    """Compact list row — name (+ optional pickup time) for FollowUpKnowledge."""
    time = (trip.get("pickup_time") or "").strip()
    customer = trip.get("customer_name", "khách" if lang == "vi" else "customer")
    if lang == "en":
        msg = f"{index}. {customer}"
        if time:
            msg += f", {time}"
        return msg
    msg = f"{index}. {customer}"
    if time:
        msg += f", {time}"
    return msg


def format_trip_count_summary(
    trips: list[dict],
    lang: str = "vi",
    *,
    scope_label: str | None = None,
) -> str:
    """Spoken count-first reply — one fact, then wait for follow-up."""
    n = len(trips)
    if n == 0:
        return ""
    if n == 1:
        return format_trip_existence(trips[0], lang)

    if lang == "en":
        if scope_label:
            return f"You have {n} trips {scope_label}."
        return f"You have {n} upcoming trips."

    if scope_label:
        return f"Bạn có {n} chuyến {scope_label}."
    return f"Bạn có {n} chuyến sắp tới."


def format_trip_list(trips: list[dict], lang: str = "vi") -> str:
    shown = trips[:MAX_LIST]
    if not shown:
        return ""

    if len(shown) == 1:
        return format_trip_existence(shown[0], lang)

    if lang == "en":
        header = f"You have {len(trips)} trips"
        if len(trips) > MAX_LIST:
            header += f", first {MAX_LIST}"
    else:
        header = f"Bạn có {len(trips)} chuyến"
        if len(trips) > MAX_LIST:
            header += f", {MAX_LIST} chuyến gần nhất"

    lines = [format_trip_brief(t, i, lang) for i, t in enumerate(shown, 1)]
    return header + ": " + ", ".join(lines) + "."
