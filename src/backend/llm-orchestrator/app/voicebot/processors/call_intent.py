"""Gate for outward-facing calls: never dial a customer on a vague request.

Live session 2026-10-18 (driver 0888…798): the driver said only "cần lắm…
ngay lúc này", the bot replied with a menu question, the talk moved on to
traffic, and the driver's "Ok." about the traffic answer dialled the
customer. A call is outward-facing and can't be taken back, so the
call_customer tool now carries an `intent_clarity` the LLM must fill:
anything but "explicit" asks the driver first and arms a pending action
that only an immediate yes executes (see pending_action.expire_stale).
"""
from __future__ import annotations

import logging
import re
from typing import Any

from app.voicebot.processors import context_store

logger = logging.getLogger("llm-orchestrator.call_intent")

EXPLICIT = "explicit"


def is_explicit(raw_arguments: dict) -> bool:
    """Missing / unknown counts as ambiguous — the safe side for a real call."""
    return str(raw_arguments.get("intent_clarity") or "").strip().lower() == EXPLICIT


# Thinking aloud, not asking. Live 2026-10-18: "Hay là gọi khách nhỉ?" came
# back from the LLM as intent_clarity=explicit and the customer was dialled.
_HEDGES_VN = re.compile(
    r"\b(hay là|hay mình|có nên|nên gọi .*không|chắc là|không biết (có )?nên|"
    r"để xem|hay thôi|có cần gọi)\b|\bnhỉ\b|\bnhể\b|\bta\s*\?",
    re.IGNORECASE,
)
_HEDGES_EN = re.compile(
    r"\b(maybe|should i|should we|perhaps|i wonder|might as well|not sure)\b",
    re.IGNORECASE,
)


def is_hedged(utterance: str, lang: str = "vn") -> bool:
    """True when the driver's own words only muse about calling."""
    text = (utterance or "").strip()
    if not text:
        return False
    pattern = _HEDGES_EN if lang == "en" else _HEDGES_VN
    return bool(pattern.search(text))


def should_confirm(raw_arguments: dict, utterance: str, lang: str = "vn") -> bool:
    """Ask first unless the LLM marked it explicit AND the words aren't a hedge."""
    return not is_explicit(raw_arguments) or is_hedged(utterance, lang)


def _trip_index_of(userdata: dict, target: dict) -> int | None:
    trips = context_store.get_callable_trips(userdata)
    if len(trips) <= 1:
        return None
    tid = target.get("trip_id")
    for i, t in enumerate(trips, start=1):
        if t.get("trip_id") == tid:
            return i
    return None


def confirm_question(target: dict, lang: str) -> str:
    name = (target.get("customer_name") or "").strip()
    if lang == "en":
        return f"Do you want me to call {name}?" if name else "Do you want me to call the customer?"
    return f"Bạn muốn mình gọi cho {name} không?" if name else "Bạn muốn mình gọi cho khách không?"


async def ask_before_calling(
    context: Any,
    target: dict,
    *,
    mode: str,
    message: str,
    lang: str,
) -> Any:
    """Speak a yes/no question and arm the exact call it describes."""
    args: dict = {"mode": mode, "intent_clarity": EXPLICIT}
    idx = _trip_index_of(context.userdata, target)
    if idx is not None:
        args["trip_index"] = idx
    if message:
        args["message"] = message
    question = confirm_question(target, lang)
    context_store.set_pending_driver_action(
        context.userdata, "call_customer", args, source=question
    )
    logger.info(
        "call_customer gated intent=ambiguous trip=%s mode=%s",
        str(target.get("trip_id") or "-")[:8],
        mode,
    )
    return await context_store.speak_and_stop(context.session, question)
