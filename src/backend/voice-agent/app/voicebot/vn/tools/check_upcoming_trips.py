import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_UPCOMING
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import format_trip_detail, format_trip_list

logger = logging.getLogger("voice-agent.vn.tools.check_upcoming_trips")

# "Đang chạy" = tài xế đã nhận và đang thực hiện (gồm 2 giai đoạn con: chưa đón/đã đón khách);
# "đang chờ xác nhận" = đã gọi tài xế, chờ tài xế trả lời (chưa nhận/chưa từ chối); "mới tạo" =
# chuyến vừa tạo, hệ thống chưa kịp gọi tài xế — rất hiếm gặp trên thực tế vì trip-service tự
# chuyển 'pending' sang 'notified' ngay sau khi tạo, chỉ tồn tại thoáng qua hoặc khi dispatch bị
# lỗi (đây chính là trạng thái từng "biến mất" khỏi driver-app dashboard trước khi
# PENDING_STATUSES ở đó được sửa — giữ tách riêng để có thể truy vấn/gỡ lỗi trực tiếp qua giọng
# nói). Các nhóm này khớp đúng theo status thật, hợp lại đúng bằng trip-service's
# DRIVER_ACTIVE_STATUSES.
IN_PROGRESS_STATUSES = ("confirmed", "arrived_pickup", "picked_up")
NOT_PICKED_UP_STATUSES = ("confirmed", "arrived_pickup")
PICKED_UP_STATUSES = ("picked_up",)
AWAITING_CONFIRMATION_STATUSES = ("notified", "calling")
NEW_STATUSES = ("pending",)

_SCOPE_LABELS_VI = {
    "in_progress": "đang chạy",
    "not_picked_up": "đang chạy nhưng chưa đón khách",
    "picked_up": "đã đón khách",
    "awaiting_confirmation": "đang chờ xác nhận",
    "new": "mới tạo",
}


@function_tool(raw_schema=raw_schema["check_upcoming_trips"])
async def check_upcoming_trips(raw_arguments: dict, context: RunContext) -> str:
    # context_store's prefetched data is a one-time snapshot taken at
    # session start — a trip a customer books mid-session never appears in
    # it (confirmed live: driver had 2 trips, this tool only reported 1
    # because the 2nd was booked after prefetch). This is the driver
    # explicitly asking to check, so re-fetch live instead of trusting the
    # cache; update the cache too so a follow-up trip_index lookup in the
    # same/next turn stays consistent with what was just read out. Falls
    # back to the cached snapshot if the live call fails, same as before.
    driver_phone = context.userdata.get("driver_phone", "")
    if driver_phone:
        try:
            fresh = await backend_api.get_upcoming_trips(driver_phone)
            context_store.set_upcoming_trips(context.userdata, fresh)
        except Exception:
            logger.warning("check_upcoming_trips — live refresh failed, using cached data", exc_info=True)

    trips = context_store.get_schedule_trips(context.userdata)
    if not trips:
        return ERR_NO_UPCOMING

    all_trips = trips  # full schedule before scope filtering — used for the cross-notice below
    scope = raw_arguments.get("scope") or "all"
    if scope == "in_progress":
        trips = [t for t in all_trips if t.get("status") in IN_PROGRESS_STATUSES]
    elif scope == "not_picked_up":
        trips = [t for t in all_trips if t.get("status") in NOT_PICKED_UP_STATUSES]
    elif scope == "picked_up":
        trips = [t for t in all_trips if t.get("status") in PICKED_UP_STATUSES]
    elif scope == "awaiting_confirmation":
        trips = [t for t in all_trips if t.get("status") in AWAITING_CONFIRMATION_STATUSES]
    elif scope == "new":
        trips = [t for t in all_trips if t.get("status") in NEW_STATUSES]
    if not trips:
        label = _SCOPE_LABELS_VI.get(scope)
        return f"Anh/chị không có chuyến nào {label}." if label else ERR_NO_UPCOMING

    # Tài xế chỉ hỏi chuyến đang chạy (dù hỏi chung hay hỏi riêng đã đón/chưa đón khách), nhưng
    # nếu còn chuyến khác đang chờ xác nhận thì vẫn phải chủ động báo — không để tài xế phải hỏi
    # lại mới biết có chuyến mới đang chờ đồng ý.
    awaiting_note = ""
    if scope in ("in_progress", "not_picked_up", "picked_up"):
        awaiting_count = sum(1 for t in all_trips if t.get("status") in AWAITING_CONFIRMATION_STATUSES)
        if awaiting_count:
            awaiting_note = (
                f" Ngoài ra anh/chị còn {awaiting_count} chuyến đang chờ xác nhận"
                " — anh/chị có muốn nghe không?"
            )

    trip_index = raw_arguments.get("trip_index")
    if trip_index is not None:
        idx = int(trip_index)
        if idx < 1 or idx > len(trips):
            return f"Anh/chị chỉ có {len(trips)} chuyến. Vui lòng chọn từ 1 đến {len(trips)}."
        return format_trip_detail(trips[idx - 1], idx, lang="vi") + awaiting_note

    return format_trip_list(trips, lang="vi") + awaiting_note
