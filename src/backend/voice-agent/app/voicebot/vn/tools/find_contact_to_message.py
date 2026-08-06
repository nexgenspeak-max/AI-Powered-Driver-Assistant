import json
import logging

from livekit import rtc
from livekit.agents import RunContext, function_tool

from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_CONTACT_RPC_FAILED

logger = logging.getLogger("voice-agent.vn.tools.find_contact_to_message")

MAX_SPOKEN_MATCHES = 5


def _driver_participant(room: rtc.Room) -> rtc.RemoteParticipant | None:
    for p in room.remote_participants.values():
        if p.kind == rtc.ParticipantKind.PARTICIPANT_KIND_STANDARD:
            return p
    return None


@function_tool(raw_schema=raw_schema["find_contact_to_message"])
async def find_contact_to_message(raw_arguments: dict, context: RunContext) -> str:
    contact_name = (raw_arguments.get("contact_name") or "").strip()
    context.userdata["pending_contact_sms"] = None
    context.userdata["pending_contact_sms_matches"] = None

    if not contact_name:
        return "Anh/chị muốn nhắn tin cho ai? Đọc giúp tôi tên người cần nhắn."

    job_ctx = context.userdata.get("_job_ctx")
    room = job_ctx.room if job_ctx else None
    driver = _driver_participant(room) if room else None
    if not driver:
        logger.error("find_contact_to_message — no driver participant in room")
        return ERR_CONTACT_RPC_FAILED

    try:
        response = await room.local_participant.perform_rpc(
            destination_identity=driver.identity,
            method="search_contacts",
            payload=json.dumps({"query": contact_name}),
            response_timeout=8.0,
        )
    except rtc.RpcError:
        logger.error("find_contact_to_message — perform_rpc failed", exc_info=True)
        return ERR_CONTACT_RPC_FAILED

    try:
        parsed = json.loads(response)
    except (TypeError, ValueError):
        logger.error("find_contact_to_message — malformed RPC response: %r", response)
        return ERR_CONTACT_RPC_FAILED

    if parsed.get("error"):
        logger.warning("find_contact_to_message — client reported error: %s", parsed["error"])
        return ERR_CONTACT_RPC_FAILED

    matches = parsed.get("matches") or []

    if not matches:
        return f"Không tìm thấy {contact_name} trong danh bạ."

    if len(matches) == 1:
        match = matches[0]
        context.userdata["pending_contact_sms"] = {
            "name": match.get("name", contact_name),
            "phone_number": match.get("phone_number", ""),
        }
        return f"Tôi tìm thấy {match.get('name', contact_name)}. Có đúng người anh/chị muốn nhắn tin không? Anh/chị muốn nhắn nội dung gì?"

    limited = matches[:MAX_SPOKEN_MATCHES]
    context.userdata["pending_contact_sms_matches"] = [
        {"name": m.get("name", ""), "phone_number": m.get("phone_number", "")} for m in limited
    ]
    names = ", ".join(m.get("name", "") for m in limited)
    return f"Tôi tìm thấy nhiều người tên {contact_name}: {names}. Anh/chị muốn nhắn tin cho ai?"
