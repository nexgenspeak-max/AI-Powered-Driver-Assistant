import json
import logging

from livekit import rtc
from livekit.agents import RunContext, function_tool
from app.voicebot.processors import context_store

from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.en.constants import ERR_CONTACT_RPC_FAILED
from app.voicebot.processors.tool_response_builders import build_contact_find_response

logger = logging.getLogger("llm-orchestrator.en.tools.find_contact")

MAX_SPOKEN_MATCHES = 5


def _driver_participant(room: rtc.Room) -> rtc.RemoteParticipant | None:
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
                "Who would you like to call? Please say the contact name.",
                tool="find_contact",
                lang="en",
            ),
        )

    job_ctx = context.userdata.get("_job_ctx")
    room = job_ctx.room if job_ctx else None
    driver = _driver_participant(room) if room else None
    if not driver:
        logger.error("find_contact — no driver participant in room")
        return await context_store.speak_and_stop(
            context.session,
                build_contact_find_response(ERR_CONTACT_RPC_FAILED, tool="find_contact", lang="en"),
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
                build_contact_find_response(ERR_CONTACT_RPC_FAILED, tool="find_contact", lang="en"),
        )

    try:
        parsed = json.loads(response)
    except (TypeError, ValueError):
        logger.error("find_contact — malformed RPC response: %r", response)
        return await context_store.speak_and_stop(
            context.session,
                build_contact_find_response(ERR_CONTACT_RPC_FAILED, tool="find_contact", lang="en"),
        )

    if parsed.get("error"):
        logger.warning("find_contact — client reported error: %s", parsed["error"])
        return await context_store.speak_and_stop(
            context.session,
                build_contact_find_response(ERR_CONTACT_RPC_FAILED, tool="find_contact", lang="en"),
        )

    matches = parsed.get("matches") or []

    if not matches:
        return await context_store.speak_and_stop(
            context.session,
                build_contact_find_response(
                f"I couldn't find {contact_name} in your contacts.",
                tool="find_contact",
                lang="en",
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
                f"I found {match.get('name', contact_name)}. Is that who you want to call?",
                tool="find_contact",
                lang="en",
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
            f"I found several contacts named {contact_name}: {names}. Who should I call?",
            tool="find_contact",
            lang="en",
            matches=limited,
        ),
    )
