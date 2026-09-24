import logging
import unicodedata

from livekit.agents import RunContext, function_tool
from app.voicebot.processors import context_store

from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.processors.tool_response_builders import build_contact_pick_response

logger = logging.getLogger("llm-orchestrator.en.tools.select_contact_match_for_sms")

_ORDINAL_WORDS = [
    ("first", 0), ("number 1", 0), ("#1", 0), ("one", 0),
    ("second", 1), ("number 2", 1), ("#2", 1), ("two", 1),
    ("third", 2), ("number 3", 2), ("#3", 2), ("three", 2),
    ("fourth", 3), ("number 4", 3), ("#4", 3), ("four", 3),
    ("fifth", 4), ("number 5", 4), ("#5", 4), ("five", 4),
]


def _fold(text: str) -> str:
    decomposed = unicodedata.normalize("NFD", text.lower())
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")


@function_tool(raw_schema=raw_schema["select_contact_match_for_sms"])
async def select_contact_match_for_sms(raw_arguments: dict, context: RunContext) -> str:
    selection = (raw_arguments.get("selection") or "").strip()
    matches = context.userdata.get("pending_contact_sms_matches") or []

    if not matches:
        return await context_store.speak_and_stop(
            context.session,
                build_contact_pick_response(
                "There's no list to pick from. Please say the contact name again.",
                tool="select_contact_match_for_sms",
                lang="en",
                for_sms=True,
            ),
        )

    if not selection:
        return await context_store.speak_and_stop(
            context.session,
                build_contact_pick_response(
                "Who in that list would you like to text?",
                tool="select_contact_match_for_sms",
                lang="en",
                for_sms=True,
            ),
        )

    folded_selection = _fold(selection)

    picked = None
    for phrase, index in _ORDINAL_WORDS:
        if phrase in folded_selection and index < len(matches):
            picked = matches[index]
            break

    if not picked:
        candidates = [
            m for m in matches
            if _fold(m.get("name", "")) in folded_selection
            or folded_selection in _fold(m.get("name", ""))
        ]
        if len(candidates) == 1:
            picked = candidates[0]

    if not picked:
        names = ", ".join(m.get("name", "") for m in matches)
        return await context_store.speak_and_stop(
            context.session,
                build_contact_pick_response(
                f"I'm not sure who you mean from: {names}. Please say the name more clearly.",
                tool="select_contact_match_for_sms",
                lang="en",
                for_sms=True,
            ),
        )

    context.userdata["pending_contact_sms_matches"] = None
    context.userdata["pending_contact_sms"] = {
        "name": picked.get("name", ""),
        "phone_number": picked.get("phone_number", ""),
    }
    return await context_store.speak_and_stop(
            context.session,
            build_contact_pick_response(
            f"I found {picked.get('name', '')}. "
            "Is that who you want to text? What should the message say?",
            tool="select_contact_match_for_sms",
            lang="en",
            for_sms=True,
        ),
    )
