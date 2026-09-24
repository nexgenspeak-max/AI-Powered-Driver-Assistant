import logging
import unicodedata

from livekit.agents import RunContext, function_tool
from app.voicebot.processors import context_store

from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.processors.tool_response_builders import build_contact_pick_response

logger = logging.getLogger("llm-orchestrator.vn.tools.select_contact_match")

# Ordinal phrases the driver might use instead of (or alongside) the name
# itself — "người đầu tiên", "số 2", "thứ ba". Index into the (already
# capped-at-5) pending_contact_matches list.
_ORDINAL_WORDS = [
    ("đầu tiên", 0), ("thứ nhất", 0), ("số 1", 0), ("số một", 0),
    ("thứ hai", 1), ("số 2", 1), ("số hai", 1),
    ("thứ ba", 2), ("số 3", 2), ("số ba", 2),
    ("thứ tư", 3), ("số 4", 3), ("số bốn", 3),
    ("thứ năm", 4), ("số 5", 4), ("số năm", 4),
]


def _fold(text: str) -> str:
    """Lowercase and strip Vietnamese diacritics for a loose, accent-insensitive compare."""
    decomposed = unicodedata.normalize("NFD", text.lower())
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")


@function_tool(raw_schema=raw_schema["select_contact_match"])
async def select_contact_match(raw_arguments: dict, context: RunContext) -> str:
    selection = (raw_arguments.get("selection") or "").strip()
    matches = context.userdata.get("pending_contact_matches") or []

    if not matches:
        return await context_store.speak_and_stop(
            context.session,
                build_contact_pick_response(
                "Không có danh sách người cần chọn. Bạn đọc lại tên cần gọi giúp em.",
                tool="select_contact_match",
                lang="vi",
            ),
        )

    if not selection:
        return await context_store.speak_and_stop(
            context.session,
                build_contact_pick_response(
                "Bạn muốn gọi ai trong danh sách vừa đọc?",
                tool="select_contact_match",
                lang="vi",
            ),
        )

    folded_selection = _fold(selection)

    picked = None
    for phrase, index in _ORDINAL_WORDS:
        if phrase in folded_selection and index < len(matches):
            picked = matches[index]
            break

    if not picked:
        candidates = [m for m in matches if _fold(m.get("name", "")) in folded_selection or folded_selection in _fold(m.get("name", ""))]
        if len(candidates) == 1:
            picked = candidates[0]

    if not picked:
        names = ", ".join(m.get("name", "") for m in matches)
        return await context_store.speak_and_stop(
            context.session,
                build_contact_pick_response(
                f"Tôi chưa rõ bạn muốn gọi ai trong số: {names}. Bạn nói rõ tên hơn giúp em.",
                tool="select_contact_match",
                lang="vi",
            ),
        )

    context.userdata["pending_contact_matches"] = None
    context.userdata["pending_contact_call"] = {
        "name": picked.get("name", ""),
        "phone_number": picked.get("phone_number", ""),
    }
    return await context_store.speak_and_stop(
            context.session,
            build_contact_pick_response(
            f"Tôi tìm thấy {picked.get('name', '')}. Có đúng người bạn muốn gọi không?",
            tool="select_contact_match",
            lang="vi",
        ),
    )
