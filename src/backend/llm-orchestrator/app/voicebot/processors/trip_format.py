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
    """Keep whole comma-separated address parts (building/street, xã/phường,
    tỉnh/thành — the current 2-tier VN address hierarchy), dropping
    trailing parts that don't fit, instead of slicing raw characters.

    A raw character-count cut can split mid-word — live session 2026-09-06:
    "...ba đình" (Ba Đình district) cut to "...ba đ..." and read/looked
    like "3D" to the driver. Comma-splitting also keeps the address a
    semantically complete unit (never half a district name) rather than an
    arbitrary character boundary.
    """
    if not address:
        return ""
    text = address.strip()
    if len(text) <= max_len:
        return text
    parts = [p.strip() for p in text.split(",") if p.strip()]
    kept: list[str] = []
    for part in parts:
        candidate = ", ".join(kept + [part])
        # Always keep at least the first part even if it alone overflows —
        # falls through to the word-boundary cut below instead of returning
        # an empty string.
        if len(candidate) + 3 > max_len and kept:
            break
        kept.append(part)
    result = ", ".join(kept)
    if len(kept) == len(parts) and len(result) <= max_len:
        return result
    if len(result) > max_len - 3:
        boundary = result.rfind(" ", 0, max_len - 3)
        result = result[:boundary if boundary > 0 else max_len - 3].rstrip()
    return result.rstrip(",") + "..."


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

    # Spoken form is deliberately short for a driver at the wheel: the FIRST
    # stop (where to go now) + the total count + the whole-route distance/ETA.
    # The full numbered order is handed to the LLM as FollowUpKnowledge (see
    # tool_response_builders.build_route_response / route_order_lines) so
    # "điểm thứ 2 là gì?" can be answered without re-calling the tool —
    # reading 5 stops × (address, km, minutes) aloud in one breath was the
    # old behaviour and nobody could retain it.
    first = stops[0]
    customer = first.get("customer_name") or ("khách" if lang != "en" else "the customer")
    addr = short_address(first.get("address", ""), 40)
    total_km = round(sum((s.get("distance_m") or 0) for s in stops) / 1000, 1)
    total_min = sum(int(s.get("eta_minutes") or 0) for s in stops)
    n = len(stops)

    if lang == "en":
        verb = "pick up" if first.get("kind") == "pickup" else "drop off"
        msg = f"Head to {addr} first to {verb} {customer}."
        if n > 1:
            msg += f" {n} stops in total, about {total_km} km and {total_min} minutes."
    else:
        verb = "đón" if first.get("kind") == "pickup" else "trả"
        msg = f"Đi {addr} trước để {verb} khách {customer}."
        if n > 1:
            msg += f" Tổng {n} điểm, khoảng {total_km} km, {total_min} phút."
    if route.get("source") == "haversine_fallback":
        msg += (
            " Estimated without live traffic."
            if lang == "en" else
            " Ước tính chưa có dữ liệu giao thông."
        )
    return msg


def route_order_lines(route: dict, lang: str = "vi") -> list[str]:
    """Numbered stop list (one line per stop) for FollowUpKnowledge — the
    detail format_route_order no longer reads aloud."""
    lines: list[str] = []
    for i, s in enumerate(route.get("stops") or [], 1):
        is_pickup = s.get("kind") == "pickup"
        addr = short_address(s.get("address", ""), 40)
        customer = s.get("customer_name") or ("khách" if lang != "en" else "the customer")
        dist_km = round((s.get("distance_m") or 0) / 1000, 1)
        eta = s.get("eta_minutes")
        if lang == "en":
            verb = "pick up" if is_pickup else "drop off"
            lines.append(f"stop {i}: {verb} {customer} at {addr} ({dist_km} km, ~{eta} min from previous)")
        else:
            verb = "đón" if is_pickup else "trả"
            lines.append(f"điểm {i}: {verb} khách {customer} tại {addr} ({dist_km} km, khoảng {eta} phút từ điểm trước)")
    return lines


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
