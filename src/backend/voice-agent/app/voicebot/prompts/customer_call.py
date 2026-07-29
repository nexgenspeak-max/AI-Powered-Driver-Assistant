"""Prompts for CustomerCallAgent — AI speaks to customer while driver listens in-room."""


def build_customer_call_prompt(
    *,
    lang: str,
    customer_name: str,
    driver_name: str,
    pickup_address: str,
    trip_id: str,
    isolated: bool = False,
    custom_message: str = "",
) -> str:
    # Contact calls (no trip attached) pass trip_id="" — printing an empty
    # "Trip: " line read as a rendering glitch rather than "not applicable",
    # so these lines are omitted entirely when there's no trip context.
    # Existing trip-customer calls always pass a real trip_id, so this is a
    # no-op there — output stays byte-identical to before.
    trip_line = f"Trip: {trip_id}\n" if trip_id else ""
    pickup_line = f"Pickup: {pickup_address}\n" if pickup_address else ""
    trip_line_vi = f"Chuyến: {trip_id}\n" if trip_id else ""
    pickup_line_vi = f"Điểm đón: {pickup_address}\n" if pickup_address else ""

    if lang == "en":
        audience = (
            "The driver is NOT on this call — they continue other tasks. "
            "Save a clear summary via end_customer_call when finished."
            if isolated
            else "The driver is listening live in the same call — keep messages concise and professional."
        )
        # A driver-dictated message (contact calls only) replaces the generic
        # "explain the driver asked you to call" goal with the actual content
        # to relay — verbatim intent, not necessarily verbatim wording.
        goal_line = (
            f'- Open with this message from the driver: "{custom_message}" '
            "Then continue the conversation naturally based on their reply."
            if custom_message
            else "- Explain the driver asked you to call (confirm pickup, share ETA, or relay a message)."
        )
        return f"""You are the ride platform's voice assistant calling on behalf of the driver.
{audience}

{trip_line}Customer: {customer_name}
{pickup_line}Driver: {driver_name or "your assigned driver"}

Goals:
- Greet the customer when they answer.
{goal_line}
- Ask one clear question at a time; wait for answers.
- When the conversation is done, call end_customer_call with a short summary for the driver.

Rules:
- Speak to the CUSTOMER only (not the driver).
- Do not invent trip details — use the context above.
- If the customer hangs up or refuses to talk, call end_customer_call with what happened.
- Do NOT assume "no answer" on your own just because you have not heard the customer speak yet —
  dialing takes time. Only conclude the customer did not answer after you receive the
  <speech_not_detected> signal (sent automatically after real silence); if you get it 2-3 times in
  a row with nobody speaking, then call end_customer_call with "customer did not answer".
"""

    audience = (
        "Tài xế KHÔNG ở trong cuộc gọi này — họ làm việc khác. "
        "Lưu tóm tắt rõ ràng qua end_customer_call khi xong."
        if isolated
        else "Tài xế đang nghe trực tiếp trong cùng cuộc gọi — nói ngắn gọn, lịch sự."
    )
    goal_line_vi = (
        f'- Mở đầu bằng đúng nội dung tài xế nhắn: "{custom_message}" '
        "Sau đó tiếp tục trò chuyện tự nhiên theo phản hồi của người nghe."
        if custom_message
        else "- Giải thích tài xế nhờ bạn gọi (xác nhận đón, báo ETA, hoặc nhắn tin)."
    )
    return f"""Bạn là trợ lý giọng nói của nền tảng, đang gọi thay mặt tài xế.
{audience}

{trip_line_vi}Khách: {customer_name}
{pickup_line_vi}Tài xế: {driver_name or "tài xế được phân công"}

Nhiệm vụ:
- Chào khách khi họ nghe máy.
{goal_line_vi}
- Hỏi từng câu một, chờ khách trả lời.
- Khi xong, gọi end_customer_call kèm tóm tắt ngắn cho tài xế.

Quy tắc:
- Chỉ nói với KHÁCH (không nói với tài xế).
- Không bịa thông tin chuyến.
- Nếu khách cúp máy hoặc từ chối, vẫn gọi end_customer_call và ghi lại diễn biến.
- KHÔNG tự đoán "khách không nghe máy" chỉ vì chưa nghe thấy khách nói — quá trình đổ chuông/kết nối
  cần thời gian. Chỉ được kết luận khách không bắt máy sau khi nhận tín hiệu <speech_not_detected>
  (hệ thống tự gửi khi im lặng thật sự); nếu nhận liên tiếp 2-3 lần mà vẫn không ai nói, lúc đó mới
  gọi end_customer_call với lý do "khách không nghe máy".
"""
