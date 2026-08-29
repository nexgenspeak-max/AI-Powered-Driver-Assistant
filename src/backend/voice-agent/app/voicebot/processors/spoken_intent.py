"""Skip the LLM when STT already names a driver tool.

Luna TTFT on the full prompt is 1.2–3.5s. Confirm/reject/call/upcoming/current
can run the same tool handlers and StopResponse before that wait.

Ambiguous yes/ok still goes to the LLM. Reject wins over confirm.
"""
from __future__ import annotations

import asyncio
import logging
import re
import unicodedata
from types import SimpleNamespace
from typing import Any, Literal

from livekit.agents import Agent, StopResponse

from app.agent.turn_metrics import mark_user_stopped
from app.devlog import event
from app.voicebot.processors import context_store
from app.voicebot.processors.chat_window import MAX_CHAT_ITEMS, cap_chat_context
from app.voicebot.processors.conversational_ack import conversational_ack_reply
from app.voicebot.processors.driving_advice import driving_advice_reply
from app.voicebot.processors import pending_action
from app.voicebot.processors.trip_format import format_primary_customer_phone

logger = logging.getLogger("voice-agent.spoken_intent")

Intent = Literal[
    "confirm",
    "reject",
    "call_customer",
    "upcoming",
    "current",
    "customer_phone",
    "earnings",
    "driving_advice",
    "conversational_ack",
]

_CONFIRM_VN = (
    "xác nhận nhận chuyến",
    "xác nhận chuyến",
    "nhận chuyến",
    "xác nhận nhận",
)
_REJECT_VN = (
    "từ chối chuyến",
    "từ chối nhận",
    "không nhận chuyến",
    "không nhận",
    "tôi bận",
    "từ chối",
)
_CALL_VN = (
    "gọi khách",
    "gọi cho khách",
    "gọi giúp",
    "nhấc máy gọi",
    "nói chuyện với khách",
)
_PHONE_VN = (
    "số điện thoại khách",
    "số của khách",
    "số khách",
    "đọc số khách",
    "số điện thoại",
)
_PHONE_EN = (
    "customer number",
    "customers number",
    "customer phone",
    "rider number",
    "riders number",
    "rider phone",
    "whats the number",
)
_UPCOMING_VN = (
    "chuyến sắp tới",
    "các chuyến sắp",
    "có chuyến nào",
    "danh sách chuyến",
    "lịch chuyến",
    "lịch trình",
    "lịch hôm nay",
    "chuyến tiếp theo",
    "mấy chuyến",
    "bao nhiêu chuyến",
    "có bao nhiêu chuyến",
)
_EARNINGS_VN = (
    "thu nhập",
    "kiếm được",
    "kiếm bao nhiêu",
    "thu nhập hôm nay",
)
_EARNINGS_EN = ("earnings", "how much did i make", "today's earnings")
_CURRENT_VN = (
    "chuyến hiện tại",
    "chuyến đang chạy",
    "chuyến hiện giờ",
    "chuyến hiện tại của tôi",
)

_CONFIRM_EN = (
    "confirm the trip",
    "confirm trip",
    "accept the trip",
    "i'll take it",
    "ill take it",
    "i will take it",
)
_REJECT_EN = (
    "reject the trip",
    "reject trip",
    "decline the trip",
    "i won't take it",
    "do not take it",
)
_CALL_EN = ("call the customer", "call customer", "phone the customer")
_UPCOMING_EN = ("upcoming trips", "my trips", "what trips", "how many trips")
_CURRENT_EN = ("current trip", "this trip", "active trip")

_CONFIRM_BLOCK_VN = ("chưa xác nhận", "không xác nhận", "hủy xác nhận")
_CONFIRM_BLOCK_EN = ("dont confirm", "do not confirm", "not confirming")

_TOOL_LLM_HINTS_VN = (
    "chuyến",
    "thu nhập",
    "kiếm",
    "thống kê",
    "thưởng",
    "bonus",
    "gọi",
    "sms",
    "nhắn",
    "hủy",
    "lộ trình",
    "tắc đường",
    "giao thông",
    "vị trí",
    "ứng dụng",
    "app",
    "nhắc nhở",
    "xác nhận",
    "từ chối",
    "khách",
    "tài xế",
    "đón",
    "trả",
    "faq",
    "hướng dẫn",
    "làm mới",
    "cập nhật",
    "lịch",
    "lịch trình",
    "đến nơi",
    "lên xe",
    "xong chuyến",
    "chờ thêm",
    "gia hạn",
    "đánh giá",
    "rating",
    "nghỉ",
    "offline",
    "báo cáo",
    "sự cố",
    "vắng",
    "giúp gì",
    "điểm đón",
)
_TOOL_LLM_HINTS_EN = (
    "trip",
    "earnings",
    "bonus",
    "call",
    "sms",
    "text",
    "cancel",
    "route",
    "traffic",
    "location",
    "app",
    "reminder",
    "confirm",
    "reject",
    "customer",
    "driver",
    "refresh",
    "update",
)


def _norm(text: str) -> str:
    folded = unicodedata.normalize("NFC", text).lower().strip()
    folded = folded.replace("'", "").replace("’", "")
    folded = re.sub(r"[.!?…,;:“”]+", " ", folded)
    return re.sub(r"\s+", " ", folded).strip()


def parse_trip_index(text: str) -> int | None:
    """Follow-up: 'chuyến số 1', 'chuyến 1', 'số 2', bare '3'."""
    t = _norm(text)
    m = re.search(r"(?:chuyến|trip)\s*(?:số|thứ|number)?\s*(\d+)", t)
    if m:
        return int(m.group(1))
    m = re.search(r"(?:số|thứ)\s*(\d+)", t)
    if m:
        idx = int(m.group(1))
        if idx <= 99:
            return idx
    if re.fullmatch(r"\d+", t):
        return int(t)
    return None


def _is_phone_lookup(t: str, lang: str) -> bool:
    """Driver asked to hear the number, not to place a call."""
    needles = _PHONE_EN if lang == "en" else _PHONE_VN
    if not any(p in t for p in needles):
        return False
    if lang == "en":
        return not any(p in t for p in _CALL_EN)
    return not any(p in t for p in ("gọi khách", "gọi giúp"))


def _is_call_request(t: str, lang: str) -> bool:
    if lang == "en":
        return any(p in t for p in _CALL_EN)
    if any(p in t for p in _CALL_VN):
        return True
    if "gọi cho" not in t:
        return False
    rest = t.split("gọi cho", 1)[1].strip()
    if not rest or rest.startswith("tôi") or rest in {"ai", "ai đó"}:
        return False
    return len(rest) >= 3


def classify_driver_intent(text: str, lang: str) -> Intent | None:
    """Return a tool intent when the transcript is unambiguous, else None."""
    t = _norm(text)
    if not t:
        return None
    if lang == "en":
        if any(p in t for p in _CONFIRM_BLOCK_EN):
            return None
        if any(p in t for p in _REJECT_EN):
            return "reject"
        if any(p in t for p in _CONFIRM_EN):
            return "confirm"
        if _is_phone_lookup(t, "en"):
            return "customer_phone"
        if _is_call_request(t, "en"):
            return "call_customer"
        if any(p in t for p in _UPCOMING_EN):
            return "upcoming"
        if any(p in t for p in _EARNINGS_EN):
            return "earnings"
        if any(p in t for p in _CURRENT_EN):
            return "current"
        return None
    if any(p in t for p in _CONFIRM_BLOCK_VN):
        return None
    if any(p in t for p in _REJECT_VN):
        return "reject"
    if any(p in t for p in _CONFIRM_VN) or t in {"xác nhận", "confirm"}:
        return "confirm"
    if _is_phone_lookup(t, "vn"):
        return "customer_phone"
    if _is_call_request(t, "vn"):
        return "call_customer"
    if any(p in t for p in _UPCOMING_VN):
        return "upcoming"
    if parse_trip_index(text) is not None:
        return "upcoming"
    if any(p in t for p in _EARNINGS_VN):
        return "earnings"
    if any(p in t for p in _CURRENT_VN):
        return "current"
    if driving_advice_reply(text, lang):
        return "driving_advice"
    if conversational_ack_reply(text, lang):
        return "conversational_ack"
    return None


def needs_tool_llm(text: str, lang: str) -> bool:
    """Trip/app/data utterances keep the full tool schema; chitchat drops it for TTFT."""
    t = _norm(text)
    if not t:
        return False
    hints = _TOOL_LLM_HINTS_EN if lang == "en" else _TOOL_LLM_HINTS_VN
    return any(h in t for h in hints)


def route_conversational_llm(session: Any, text: str, lang: str) -> None:
    """Small-talk Luna turn without ~4k tokens of tool JSON."""
    mark_user_stopped(session)
    if lang == "en":
        from app.voicebot.en.constants import CONVERSATIONAL_LLM_INSTRUCTIONS
    else:
        from app.voicebot.vn.constants import CONVERSATIONAL_LLM_INSTRUCTIONS
    session.generate_reply(
        user_input=text,
        tools=[],
        tool_choice="none",
        instructions=CONVERSATIONAL_LLM_INSTRUCTIONS,
    )


from app.voicebot.processors.call_mode import resolve_call_mode


def call_tool_arguments(text: str, lang: str = "vn", userdata: dict | None = None) -> dict:
    """Pull call mode + custom message + trip context from driver utterance."""
    t = _norm(text)
    raw = text.strip()
    args: dict = {}
    message_seps = (
        "bảo là",
        "báo là",
        "báo khách là",
        "bảo khách là",
        "báo khách",
        "bảo khách",
        "nói là",
        "tell them",
        "tell the customer",
    )
    for sep in message_seps:
        idx = t.find(sep)
        if idx < 0:
            continue
        raw_lower = raw.lower()
        raw_idx = raw_lower.find(sep)
        if raw_idx < 0:
            continue
        msg = raw[raw_idx + len(sep):].strip()
        if msg.lower().startswith("là "):
            msg = msg[3:].strip()
        if msg:
            args["message"] = msg
        break

    args["mode"] = resolve_call_mode(text, lang=lang)
    if args.get("message") and args["mode"] != "bridge":
        args["mode"] = "agent"
    if userdata is not None:
        idx = parse_trip_index(text)
        if idx is None:
            idx = context_store.get_target_trip_index(userdata)
        if idx is None:
            last = userdata.get("context", {}).get("_last_tool_response") or {}
            for blob in (last.get("spoken") or "", *(last.get("follow_up") or [])):
                if context_store.match_callable_trip_by_text(userdata, blob):
                    idx = context_store.get_target_trip_index(userdata)
                    break
        if idx is not None:
            args["trip_index"] = idx
    return args


def _tool(lang: str, vn_path: str, en_path: str, name: str):
    if lang == "en":
        mod = __import__(en_path, fromlist=[name])
    else:
        mod = __import__(vn_path, fromlist=[name])
    return getattr(mod, name)


async def _apply_call_customer_result(session: Any, result: Any) -> None:
    """Speak disambiguation, or hand off to CustomerCallAgent on fast path."""
    if isinstance(result, tuple) and len(result) == 2:
        agent, handoff_msg = result
        if isinstance(agent, Agent):
            update = getattr(session, "update_agent", None)
            if callable(update):
                update(agent)
            if isinstance(handoff_msg, str) and handoff_msg.strip():
                await context_store.speak_and_stop(session, handoff_msg)
                return
            raise StopResponse()
    if isinstance(result, str) and result.strip():
        await context_store.speak_and_stop(session, result)


async def _execute_pending_action(session: Any, userdata: dict, *, lang: str) -> None:
    pending = context_store.pop_pending_driver_action(userdata)
    if not pending:
        return
    intent = pending.get("intent")
    args = dict(pending.get("args") or {})
    ctx = SimpleNamespace(session=session, userdata=userdata)
    event("pending_action", ok=True, intent=intent or "-", lang=lang)
    logger.info("pending_action execute intent=%s args=%s", intent, args)

    if intent == "call_customer":
        fn = _tool(lang, "app.voicebot.vn.tools.call_customer", "app.voicebot.en.tools.call_customer", "call_customer")
        utterance = context_store.get_last_driver_utterance(userdata) or pending.get("source") or ""
        context_store.set_pending_call_utterance(userdata, utterance)
        result = await fn.__wrapped__(args, ctx)
        await _apply_call_customer_result(session, result)
        return
    if intent == "upcoming":
        fn = _tool(
            lang,
            "app.voicebot.vn.tools.check_upcoming_trips",
            "app.voicebot.en.tools.check_upcoming_trips",
            "check_upcoming_trips",
        )
        await fn.__wrapped__(args, ctx)
        return
    logger.warning("pending_action unknown intent=%s", intent)


async def _try_interrupt(session: Any, *, reason: str) -> None:
    interrupt = getattr(session, "interrupt", None)
    if not callable(interrupt):
        return
    try:
        result = interrupt()
        if asyncio.iscoroutine(result):
            await result
    except RuntimeError:
        logger.debug("interrupt skipped before %s", reason)


async def handle_driver_utterance(session: Any, message: Any, *, lang: str) -> None:
    """Run a matched tool. Raises StopResponse when the tool speaks."""
    text = getattr(message, "text_content", None) or ""
    userdata = getattr(session, "userdata", None)
    if not isinstance(userdata, dict):
        return

    if pending_action.should_execute(userdata, text, lang):
        await _try_interrupt(session, reason="pending_action")
        await _execute_pending_action(session, userdata, lang=lang)
        return

    intent = classify_driver_intent(text, lang)
    if intent is None:
        return
    ctx = SimpleNamespace(session=session, userdata=userdata)
    event("spoken_intent", ok=True, intent=intent, lang=lang)
    logger.info("spoken_intent intent=%s lang=%s", intent, lang)

    if intent == "conversational_ack" and pending_action.has_pending(userdata):
        if pending_action.is_action_confirm(text, lang):
            await _try_interrupt(session, reason="pending_action")
            await _execute_pending_action(session, userdata, lang=lang)
            return

    if intent in ("confirm", "reject"):
        await _try_interrupt(session, reason=intent)

    if intent == "confirm":
        fn = _tool(lang, "app.voicebot.vn.tools.confirm_trip", "app.voicebot.en.tools.confirm_trip", "confirm_trip")
        await fn.__wrapped__({}, ctx)
        return
    if intent == "reject":
        fn = _tool(lang, "app.voicebot.vn.tools.reject_trip", "app.voicebot.en.tools.reject_trip", "reject_trip")
        await fn.__wrapped__({}, ctx)
        return
    if intent == "customer_phone":
        trips = context_store.get_schedule_trips(userdata)
        spoken = "en" if lang == "en" else "vi"
        await context_store.speak_and_stop(
            session, format_primary_customer_phone(trips, spoken)
        )
        return
    if intent == "call_customer":
        fn = _tool(lang, "app.voicebot.vn.tools.call_customer", "app.voicebot.en.tools.call_customer", "call_customer")
        context_store.set_pending_call_utterance(userdata, text)
        context_store.clear_pending_driver_action(userdata)
        result = await fn.__wrapped__(call_tool_arguments(text, lang=lang, userdata=userdata), ctx)
        await _apply_call_customer_result(session, result)
        return
    if intent == "upcoming":
        fn = _tool(
            lang,
            "app.voicebot.vn.tools.check_upcoming_trips",
            "app.voicebot.en.tools.check_upcoming_trips",
            "check_upcoming_trips",
        )
        args: dict = {"scope": "all"}
        idx = parse_trip_index(text)
        if idx is not None:
            args["trip_index"] = idx
        context_store.clear_pending_driver_action(userdata)
        await fn.__wrapped__(args, ctx)
        return
    if intent == "earnings":
        fn = _tool(
            lang,
            "app.voicebot.vn.tools.get_today_earnings",
            "app.voicebot.en.tools.get_today_earnings",
            "get_today_earnings",
        )
        await fn.__wrapped__({}, ctx)
        return
    if intent == "driving_advice":
        reply = driving_advice_reply(text, lang)
        if reply:
            await context_store.speak_and_stop(session, reply)
        return
    if intent == "conversational_ack":
        reply = conversational_ack_reply(text, lang)
        if reply:
            await context_store.speak_and_stop(session, reply)
        return
    fn = _tool(
        lang,
        "app.voicebot.vn.tools.get_current_trip_info",
        "app.voicebot.en.tools.get_current_trip_info",
        "get_current_trip_info",
    )
    await fn.__wrapped__({}, ctx)


async def driver_text_input_cb(sess: Any, ev: Any) -> None:
    """Run spoken_intent for lk.chat — default RoomIO skips on_user_turn_completed."""
    mark_user_stopped(sess)
    lang = "vn"
    agent = getattr(sess, "current_agent", None)
    if agent is not None:
        lang = getattr(agent, "_spoken_intent_lang", "vn")

    async with sess._claim_user_turn():
        try:
            await sess.interrupt()
        except RuntimeError:
            logger.debug("interrupt skipped — current speech not interruptible")
        message = SimpleNamespace(text_content=ev.text)
        userdata = sess.userdata
        if isinstance(userdata, dict):
            context_store.set_last_driver_utterance(userdata, ev.text)
            pending_action.infer_from_driver_utterance(ev.text, userdata, lang=lang)
        intent = classify_driver_intent(ev.text, lang)
        try:
            await handle_driver_utterance(sess, message, lang=lang)
        except StopResponse:
            return
        if intent is not None:
            return
        if needs_tool_llm(ev.text, lang):
            hint = context_store.get_last_tool_response_hint(
                sess.userdata, "en" if lang == "en" else "vi"
            )
            if hint:
                sess.generate_reply(user_input=ev.text, instructions=hint.strip())
            else:
                sess.generate_reply(user_input=ev.text)
        else:
            route_conversational_llm(sess, ev.text, lang)


_DRIVER_PREEMPTIVE_MODES = frozenset({"driver", "outbound"})


def attach_spoken_intent_preemptive_cancel(
    session: Any,
    *,
    lang: str,
    mode: str,
) -> None:
    """Cancel preemptive LLM when final STT already names a fast-path intent."""
    if mode not in _DRIVER_PREEMPTIVE_MODES:
        return

    @session.on("user_input_transcribed")
    def _on_spoken_intent_stt(ev: Any) -> None:
        if not ev.is_final:
            return
        transcript = (getattr(ev, "transcript", None) or "").strip()
        if not transcript or classify_driver_intent(transcript, lang) is None:
            if not (isinstance(session.userdata, dict) and pending_action.should_execute(session.userdata, transcript, lang)):
                return
        asyncio.create_task(
            _try_interrupt(session, reason="spoken_intent_preemptive")
        )


class SpokenIntentMixin:
    """DriverAgent mixin — must stay before Agent in the MRO."""

    _spoken_intent_lang: str = "vn"

    async def on_user_turn_completed(self, turn_ctx: Any, new_message: Any) -> None:
        if cap_chat_context(turn_ctx):
            event("chat_window", ok=True, max_items=MAX_CHAT_ITEMS)
            logger.info("chat_window truncated max_items=%s", MAX_CHAT_ITEMS)
            update = getattr(self, "update_chat_ctx", None)
            if callable(update):
                await update(turn_ctx)
        text = getattr(new_message, "text_content", None) or ""
        userdata = self.session.userdata
        if isinstance(userdata, dict):
            context_store.set_last_driver_utterance(userdata, text)
            pending_action.infer_from_driver_utterance(
                text, userdata, lang=self._spoken_intent_lang
            )
        intent = classify_driver_intent(text, self._spoken_intent_lang)
        if intent is not None:
            await _try_interrupt(self.session, reason="spoken_intent_turn")
        elif needs_tool_llm(text, self._spoken_intent_lang):
            await _try_interrupt(self.session, reason="tool_llm_turn")
        try:
            await handle_driver_utterance(
                self.session, new_message, lang=self._spoken_intent_lang
            )
        except StopResponse:
            raise
        if intent is not None:
            raise StopResponse()
        if needs_tool_llm(text, self._spoken_intent_lang):
            hint = context_store.get_last_tool_response_hint(
                self.session.userdata,
                "en" if self._spoken_intent_lang == "en" else "vi",
            )
            if hint and hasattr(turn_ctx, "add_message"):
                turn_ctx.add_message(role="system", content=hint.strip())
            return
        route_conversational_llm(self.session, text, self._spoken_intent_lang)
        raise StopResponse()
