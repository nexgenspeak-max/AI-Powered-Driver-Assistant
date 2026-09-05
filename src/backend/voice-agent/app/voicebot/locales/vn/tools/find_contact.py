import json
import logging

from livekit import rtc
from livekit.agents import RunContext, function_tool
from app.voicebot.processors import context_store

from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import ERR_CONTACT_RPC_FAILED
from app.voicebot.processors.tool_response_builders import build_contact_find_response

logger = logging.getLogger("voice-agent.vn.tools.find_contact")

MAX_SPOKEN_MATCHES = 5


def _driver_participant(room: rtc.Room) -> rtc.RemoteParticipant | None:
    # Not `f"driver-{phone}"` — the room name strips the `+` from the phone
    # (trip-service's `driver-${phone.replace('+','')}-${ts}`) but the LiveKit
    # token identity keeps it (`makeToken('driver-' + phone, ...)`), so a
    # hand-reconstructed identity can mismatch by that `+`. Finding the actual
    # connected standard participant sidesteps that entirely, and also
    # correctly ignores a SIP leg (kind SIP) if one is already in the room
    # from an earlier call.
    for p in room.remote_participants.values():
        if p.kind == rtc.ParticipantKind.PARTICIPANT_KIND_STANDARD:
            return p
    return None


@function_tool(raw_schema=raw_schema["find_contact"])
async def find_contact(raw_arguments: dict, context: RunContext) -> str:
    contact_name = (raw_arguments.get("contact_name") or "").strip()
    context.userdata["pending_contact_call"] = None
    context.userdata["pending_contact_matches"] = None

    if not contact_name:
        return await context_store.speak_and_stop(
            context.session,
                build_contact_find_response(
                "Bạn muốn gọi cho ai? Đọc giúp em tên người cần gọi.",
                tool="find_contact",
                lang="vi",
            ),
        )

    job_ctx = context.userdata.get("_job_ctx")
    room = job_ctx.room if job_ctx else None
    driver = _driver_participant(room) if room else None
    if not driver:
        logger.error("find_contact — no driver participant in room")
        return await context_store.speak_and_stop(
            context.session,
                build_contact_find_response(ERR_CONTACT_RPC_FAILED, tool="find_contact", lang="vi"),
        )

    try:
        response = await room.local_participant.perform_rpc(
            destination_identity=driver.identity,
            method="search_contacts",
            payload=json.dumps({"query": contact_name}),
            response_timeout=8.0,
        )
    except rtc.RpcError:
        logger.error("find_contact — perform_rpc failed", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
                build_contact_find_response(ERR_CONTACT_RPC_FAILED, tool="find_contact", lang="vi"),
        )

    try:
        parsed = json.loads(response)
    except (TypeError, ValueError):
        logger.error("find_contact — malformed RPC response: %r", response)
        return await context_store.speak_and_stop(
            context.session,
                build_contact_find_response(ERR_CONTACT_RPC_FAILED, tool="find_contact", lang="vi"),
        )

    if parsed.get("error"):
        logger.warning("find_contact — client reported error: %s", parsed["error"])
        return await context_store.speak_and_stop(
            context.session,
                build_contact_find_response(ERR_CONTACT_RPC_FAILED, tool="find_contact", lang="vi"),
        )

    matches = parsed.get("matches") or []

    if not matches:
        return await context_store.speak_and_stop(
            context.session,
                build_contact_find_response(
                f"Không tìm thấy {contact_name} trong danh bạ.",
                tool="find_contact",
                lang="vi",
            ),
        )

    if len(matches) == 1:
        match = matches[0]
        context.userdata["pending_contact_call"] = {
            "name": match.get("name", contact_name),
            "phone_number": match.get("phone_number", ""),
        }
        return await context_store.speak_and_stop(
            context.session,
                build_contact_find_response(
                f"Tôi tìm thấy {match.get('name', contact_name)}. Có đúng người bạn muốn gọi không?",
                tool="find_contact",
                lang="vi",
                matches=matches,
            ),
        )

    limited = matches[:MAX_SPOKEN_MATCHES]
    context.userdata["pending_contact_matches"] = [
        {"name": m.get("name", ""), "phone_number": m.get("phone_number", "")} for m in limited
    ]
    names = ", ".join(m.get("name", "") for m in limited)
    return await context_store.speak_and_stop(
            context.session,
            build_contact_find_response(
            f"Tôi tìm thấy nhiều người tên {contact_name}: {names}. Bạn muốn gọi ai?",
            tool="find_contact",
            lang="vi",
            matches=limited,
        ),
    )
