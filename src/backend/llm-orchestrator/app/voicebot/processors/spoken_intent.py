"""One driver turn: promised-action safety, then the LLM with tools.

Phrase lists live in ``intent_classify``. This module does not pick a tool
from the transcript. If the bot already promised a destructive action and the
driver confirms, that action runs here. Every other utterance goes to the LLM
(``tool_choice`` auto) with the session context and the agent tool schema.
Late audio uses ``turn_filler`` at the 2s speech-to-first-audio bar.
"""
from __future__ import annotations

import asyncio
import logging
from types import SimpleNamespace
from typing import Any

from livekit.agents import Agent, NOT_GIVEN, StopResponse
from livekit.agents.utils import is_given

from app.agent.turn_metrics import mark_user_stopped
from app.devlog import event
from app.voicebot.processors import context_store, pending_action
from app.voicebot.processors.call_mode import resolve_call_mode
from app.voicebot.processors.chat_window import MAX_CHAT_ITEMS, cap_chat_context
from app.voicebot.processors.intent_classify import (
    _earnings_period_from_text,
    _norm,
    classify_driver_intent,
    is_stt_tail_fragment,
    needs_tool_llm,
    parse_trip_index,
)
from app.voicebot.processors.turn_filler import schedule_turn_filler

logger = logging.getLogger("llm-orchestrator.spoken_intent")

__all__ = [
    "apply_auto_tool_choice",
    "attach_spoken_intent_preemptive_cancel",
    "call_tool_arguments",
    "classify_driver_intent",
    "driver_text_input_cb",
    "handle_driver_utterance",
    "is_stt_tail_fragment",
    "needs_tool_llm",
    "parse_trip_index",
    "route_full_llm",
    "SpokenIntentMixin",
    "_earnings_period_from_text",
]


def apply_auto_tool_choice(model_settings: Any) -> None:
    """Leave an explicit choice alone. Unset means the model may call a tool or answer."""
    if model_settings is None:
        return
    if not is_given(getattr(model_settings, "tool_choice", NOT_GIVEN)):
        model_settings.tool_choice = "auto"


def route_full_llm(session: Any, text: str, *, lang: str, hint: str | None = None) -> None:
    """Single turn path: LLM with agent tools (no tool-less chitchat fork)."""
    mark_user_stopped(session, if_unset=True)
    schedule_turn_filler(session, lang=lang)
    kwargs: dict[str, Any] = {"user_input": text, "tool_choice": "auto"}
    if hint and hint.strip():
        kwargs["instructions"] = hint.strip()
    session.generate_reply(**kwargs)


def route_conversational_llm(session: Any, text: str, lang: str) -> None:
    """Deprecated: tool-less chitchat fork — redirects to full LLM+tools."""
    route_full_llm(session, text, lang=lang)


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

    default_mode = "agent"
    if userdata is not None:
        default_mode = context_store.get_default_customer_call_mode(userdata)
    args["mode"] = resolve_call_mode(text, lang=lang, default_mode=default_mode)
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


async def _log_driver_turn(userdata: dict, text: str) -> None:
    """Fast-path skips RoomIO chat events — log driver turns for conv transcript."""
    clean = (text or "").strip()
    if not clean:
        return
    conv = userdata.get("_conv_service")
    if conv is not None:
        conv.append_labeled_turn(clean, speaker="driver", role="user")


async def _speak_declined(session: Any, lang: str) -> None:
    spoken = "Okay, I won't do that." if lang == "en" else "Đã hủy thao tác."
    await context_store.speak_and_stop(session, spoken)


def _decline_confirmed_action(userdata: dict, text: str, lang: str) -> bool:
    pending = context_store.get_pending_driver_action(userdata)
    if not pending or pending.get("intent") not in ("cancel", "no_show"):
        return False
    if not pending_action.is_action_decline(text, lang):
        return False
    context_store.pop_pending_driver_action(userdata)
    userdata["pending_cancel_trip_id"] = None
    userdata["pending_no_show_trip_id"] = None
    return True


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
        fn = _tool(lang, "app.voicebot.locales.vn.tools.call_customer", "app.voicebot.locales.en.tools.call_customer", "call_customer")
        utterance = context_store.get_last_driver_utterance(userdata) or pending.get("source") or ""
        context_store.set_pending_call_utterance(userdata, utterance)
        result = await fn.__wrapped__(args, ctx)
        await _apply_call_customer_result(session, result)
        return
    if intent == "upcoming":
        fn = _tool(
            lang,
            "app.voicebot.locales.vn.tools.check_upcoming_trips",
            "app.voicebot.locales.en.tools.check_upcoming_trips",
            "check_upcoming_trips",
        )
        await fn.__wrapped__(args, ctx)
        return
    if intent == "earnings":
        period = str(args.get("period") or "today")
        if period in ("week", "month"):
            fn = _tool(
                lang,
                "app.voicebot.locales.vn.tools.get_earnings_summary",
                "app.voicebot.locales.en.tools.get_earnings_summary",
                "get_earnings_summary",
            )
            await fn.__wrapped__({"period": period}, ctx)
            return
        fn = _tool(
            lang,
            "app.voicebot.locales.vn.tools.get_today_earnings",
            "app.voicebot.locales.en.tools.get_today_earnings",
            "get_today_earnings",
        )
        await fn.__wrapped__({}, ctx)
        return
    if intent == "cancel":
        fn = _tool(
            lang,
            "app.voicebot.locales.vn.tools.confirm_cancel_trip",
            "app.voicebot.locales.en.tools.confirm_cancel_trip",
            "confirm_cancel_trip",
        )
        await fn.__wrapped__({}, ctx)
        return
    if intent == "no_show":
        fn = _tool(
            lang,
            "app.voicebot.locales.vn.tools.report_customer_no_show",
            "app.voicebot.locales.en.tools.report_customer_no_show",
            "commit_customer_no_show",
        )
        await fn(args, ctx)
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
    """Run a promised action when the driver confirms. Otherwise the LLM answers."""
    text = getattr(message, "text_content", None) or ""
    userdata = getattr(session, "userdata", None)
    if not isinstance(userdata, dict):
        return

    if _decline_confirmed_action(userdata, text, lang):
        await _log_driver_turn(userdata, text)
        await _try_interrupt(session, reason="pending_decline")
        await _speak_declined(session, lang)
        return

    if pending_action.should_execute(userdata, text, lang):
        await _log_driver_turn(userdata, text)
        await _try_interrupt(session, reason="pending_action")
        await _execute_pending_action(session, userdata, lang=lang)
        return

    if (
        classify_driver_intent(text, lang, userdata) == "conversational_ack"
        and pending_action.has_pending(userdata)
        and pending_action.is_action_confirm(text, lang)
    ):
        await _log_driver_turn(userdata, text)
        await _try_interrupt(session, reason="pending_action")
        await _execute_pending_action(session, userdata, lang=lang)


async def driver_text_input_cb(sess: Any, ev: Any) -> None:
    """lk.chat turn — pending_action then single LLM+tools path (RoomIO skips voice hook)."""
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
        try:
            await handle_driver_utterance(sess, message, lang=lang)
        except StopResponse:
            return
        if is_stt_tail_fragment(ev.text, lang):
            logger.debug("skip stt tail fragment (chat): %r", ev.text)
            return
        hint = None
        if isinstance(sess.userdata, dict):
            hint = context_store.get_last_tool_response_hint(
                sess.userdata, "en" if lang == "en" else "vi"
            )
        route_full_llm(sess, ev.text, lang=lang, hint=hint)


_DRIVER_PREEMPTIVE_MODES = frozenset({"driver", "outbound"})


def attach_spoken_intent_preemptive_cancel(
    session: Any,
    *,
    lang: str,
    mode: str,
) -> None:
    """Cancel preemptive LLM only when pending_action will run (not for classify matches)."""
    if mode not in _DRIVER_PREEMPTIVE_MODES:
        return

    @session.on("user_input_transcribed")
    def _on_spoken_intent_stt(ev: Any) -> None:
        if not ev.is_final:
            return
        transcript = (getattr(ev, "transcript", None) or "").strip()
        if not transcript:
            return
        userdata = session.userdata if isinstance(session.userdata, dict) else None
        if userdata is None or not pending_action.should_execute(userdata, transcript, lang):
            return
        asyncio.create_task(
            _try_interrupt(session, reason="pending_action_preemptive")
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
        lang = self._spoken_intent_lang
        if isinstance(userdata, dict):
            context_store.set_last_driver_utterance(userdata, text)
            pending_action.infer_from_driver_utterance(text, userdata, lang=lang)
        try:
            await handle_driver_utterance(self.session, new_message, lang=lang)
        except StopResponse:
            raise
        if is_stt_tail_fragment(text, lang):
            logger.debug("skip stt tail fragment: %r", text)
            raise StopResponse()
        hint = None
        if isinstance(userdata, dict):
            hint = context_store.get_last_tool_response_hint(
                userdata,
                "en" if lang == "en" else "vi",
            )
        if hint and hasattr(turn_ctx, "add_message"):
            turn_ctx.add_message(role="system", content=hint.strip())
        schedule_turn_filler(self.session, lang=lang)
        # Return without StopResponse → Agent continues with full tools.

    def llm_node(self, chat_ctx: Any, tools: list[Any], model_settings: Any):
        apply_auto_tool_choice(model_settings)
        return Agent.default.llm_node(self, chat_ctx, tools, model_settings)
