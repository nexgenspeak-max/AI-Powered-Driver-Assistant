"""Intent classify + one-path LLM routing."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from app.voicebot.processors import context_store
from app.voicebot.processors.spoken_intent import (
    classify_driver_intent,
    handle_driver_utterance,
    needs_tool_llm,
)


def test_vn_confirm_phrases():
    assert classify_driver_intent("Xác nhận nhận chuyến", "vn") == "confirm"
    assert classify_driver_intent("nhận chuyến", "vn") == "confirm"
    assert classify_driver_intent("xác nhận", "vn") == "confirm"
    assert classify_driver_intent("xác nhận chuyến.", "vn") is None
    assert classify_driver_intent("xác nhận chuyến sắp tới", "vn") == "upcoming"


def test_vn_earnings_period_routing():
    from app.voicebot.processors.spoken_intent import _earnings_period_from_text

    assert _earnings_period_from_text("hôm nay kiếm bao nhiêu", "vn") == "today"
    assert _earnings_period_from_text("tuần này thu nhập", "vn") == "week"
    assert _earnings_period_from_text("tháng này doanh thu", "vn") == "month"
    assert _earnings_period_from_text("tháng vừa rồi thu nhập", "vn") == "month"
    assert _earnings_period_from_text("từ khi bắt đầu kiếm bao nhiêu", "vn") == "lifetime"
    assert _earnings_period_from_text("toàn bộ thu nhập", "vn") == "lifetime"
    assert _earnings_period_from_text("1 năm qua", "vn") == "lifetime"
    assert _earnings_period_from_text("all-time earnings", "en") == "lifetime"


def test_vn_trip_history_intent():
    assert classify_driver_intent("chuyến hoàn thành hôm nay", "vn") == "trip_history"
    assert classify_driver_intent("chuyến bị hủy hôm nay", "vn") == "trip_history"
    assert classify_driver_intent("thu nhập tuần này", "vn") == "earnings"


def test_vn_reject_wins_over_confirm_substring():
    assert classify_driver_intent("không nhận chuyến", "vn") == "reject"
    assert classify_driver_intent("từ chối", "vn") == "reject"


def test_vn_does_not_confirm_negations_or_smalltalk():
    assert classify_driver_intent("chưa xác nhận", "vn") is None
    assert classify_driver_intent("anh khỏe không", "vn") is None
    assert classify_driver_intent("ok", "vn") == "conversational_ack"
    assert classify_driver_intent("cảm ơn nhé", "vn") == "conversational_ack"
    assert classify_driver_intent("khách đang chạy", "vn") is None
    assert classify_driver_intent("Thế thôi, cảm ơn, không có gì.", "vn") == "end_conversation"
    assert classify_driver_intent("tắt máy tắt máy", "vn") == "end_conversation"
    assert classify_driver_intent("Ok, bây giờ thì tôi cần", "vn") is None


def test_vn_schedule_kiem_tra_trinh():
    assert classify_driver_intent("Tôi muốn kiểm tra trình hôm nay", "vn") == "upcoming"


def test_needs_tool_llm_for_trip_data_not_chitchat():
    assert needs_tool_llm("Anh khỏe không", "vn") is False
    assert needs_tool_llm("thu nhập hôm nay", "vn") is True
    assert needs_tool_llm("how are you", "en") is False
    assert needs_tool_llm("my upcoming trips", "en") is True


async def test_driver_text_input_cb_uses_full_llm_for_chitchat():
    sess = MagicMock()
    sess.userdata = {"driver_phone": "0900111000"}
    sess._claim_user_turn = MagicMock()
    sess._claim_user_turn.return_value.__aenter__ = AsyncMock(return_value=None)
    sess._claim_user_turn.return_value.__aexit__ = AsyncMock(return_value=None)
    sess.interrupt = AsyncMock()
    agent = MagicMock()
    agent._spoken_intent_lang = "vn"
    sess.current_agent = agent

    from app.voicebot.processors.spoken_intent import driver_text_input_cb

    ev = SimpleNamespace(text="Anh khỏe không")
    await driver_text_input_cb(sess, ev)
    sess.generate_reply.assert_called_once()
    kwargs = sess.generate_reply.call_args.kwargs
    assert "tools" not in kwargs or kwargs.get("tools") is None
    assert kwargs.get("tool_choice") == "auto"


def test_apply_auto_tool_choice_fills_unset_and_keeps_explicit_none():
    from livekit.agents import NOT_GIVEN

    from app.voicebot.processors.spoken_intent import apply_auto_tool_choice

    unset = SimpleNamespace(tool_choice=NOT_GIVEN)
    apply_auto_tool_choice(unset)
    assert unset.tool_choice == "auto"

    forced = SimpleNamespace(tool_choice="none")
    apply_auto_tool_choice(forced)
    assert forced.tool_choice == "none"


async def test_voice_turn_completed_defers_to_agent_llm():
    """Voice STT path: no StopResponse / no tool-less fork — Agent continues with tools."""
    from app.voicebot.processors.spoken_intent import SpokenIntentMixin

    class _Agent(SpokenIntentMixin):
        def __init__(self) -> None:
            self.session = MagicMock()
            self.session.userdata = {}
            self._spoken_intent_lang = "vn"

    agent = _Agent()
    agent.session.generate_reply = MagicMock()
    turn_ctx = MagicMock()
    message = SimpleNamespace(text_content="Anh khỏe không")
    await agent.on_user_turn_completed(turn_ctx, message)
    agent.session.generate_reply.assert_not_called()


def test_vn_schedule_phrases_route_to_upcoming():
    assert classify_driver_intent("lịch trình của tôi hôm nay", "vn") == "upcoming"
    assert classify_driver_intent("Lịch trình hôm nay đâu?", "vn") == "upcoming"
    assert needs_tool_llm("lịch trình của tôi hôm nay", "vn") is True


def test_vn_earnings_fast_path():
    assert classify_driver_intent("thu nhập đi", "vn") == "earnings"
    assert classify_driver_intent("hôm nay kiếm được bao nhiêu", "vn") == "earnings"


async def test_schedule_utterance_defers_to_llm_not_auto_tool():
    userdata: dict = {"driver_phone": "0900111000"}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {"trip_id": "t1", "status": "notified", "customer_name": "A"},
                {"trip_id": "t2", "status": "notified", "customer_name": "B"},
                {"trip_id": "t3", "status": "notified", "customer_name": "C"},
            ],
            "active_trip": None,
        },
    )
    session = MagicMock()
    session.userdata = userdata
    session.say = AsyncMock()
    message = SimpleNamespace(text_content="lịch trình của tôi hôm nay")
    await handle_driver_utterance(session, message, lang="vn")
    session.say.assert_not_called()


def test_vn_call_upcoming_current():
    from app.voicebot.processors.spoken_intent import call_tool_arguments, parse_trip_index

    live = "Bạn gọi giúp tôi bảo là tôi sắp đến nơi rồi."
    assert classify_driver_intent(live, "vn") == "call_customer"
    args = call_tool_arguments(live)
    assert args["mode"] == "agent"
    assert "sắp đến nơi" in args["message"]
    assert parse_trip_index("Tôi muốn nghe chuyến số 1") == 1
    assert classify_driver_intent("Tôi muốn nghe chuyến số 1", "vn") == "upcoming"
    msg_args = call_tool_arguments(
        "Cũng được, bạn gọi cho khách báo khách giúp tôi là khoảng 2 tiếng nữa tôi sẽ đến nơi."
    )
    assert msg_args["mode"] == "agent"
    assert "2 tiếng" in msg_args["message"]
    assert call_tool_arguments("gọi khách giúp tôi")["mode"] == "agent"
    assert call_tool_arguments("gọi khách để tôi nói")["mode"] == "bridge"
    assert classify_driver_intent("gọi cho Trương Bá Chính", "vn") == "call_customer"
    assert classify_driver_intent("chuyến sắp tới", "vn") == "upcoming"
    assert classify_driver_intent("chuyến hiện tại", "vn") == "current"


def test_vn_reads_customer_phone_instead_of_calling():
    assert classify_driver_intent("số điện thoại khách", "vn") == "customer_phone"
    assert classify_driver_intent("đọc số khách giúp tôi", "vn") == "customer_phone"
    assert classify_driver_intent("trùng 39 là số điện thoại tên là", "vn") == "customer_phone"
    assert classify_driver_intent("what's the customer's number", "en") == "customer_phone"


def test_vn_call_does_not_fire_on_questions_or_fragments():
    assert classify_driver_intent("Alo, bạn gọi cho", "vn") is None
    assert classify_driver_intent("gọi cho tôi số 0900000001", "vn") is None
    assert classify_driver_intent("gì? À bạn gọi cho tôi số 0900000001", "vn") is None


def test_stt_tail_fragment_dropped():
    from app.voicebot.processors.spoken_intent import is_stt_tail_fragment

    assert is_stt_tail_fragment("của tôi", "vn")
    assert is_stt_tail_fragment("của em", "vn")
    assert is_stt_tail_fragment("uh huh", "en")
    assert not is_stt_tail_fragment("Tôi muốn kiểm tra lịch trình hôm nay.", "vn")
    assert not is_stt_tail_fragment("Bảy chuyến nào nhỉ?", "vn")


def test_en_confirm_and_reject():
    assert classify_driver_intent("Confirm the trip", "en") == "confirm"
    assert classify_driver_intent("I'll take it", "en") == "confirm"
    assert classify_driver_intent("reject the trip", "en") == "reject"
    assert classify_driver_intent("yes", "en") is None


async def test_handle_confirm_does_not_auto_patch():
    userdata: dict = {"driver_phone": "0900111000"}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {
                    "trip_id": "9973e7ba-796c-4564-b0f7-b00a88670d75",
                    "status": "notified",
                    "customer_name": "An",
                }
            ],
            "active_trip": None,
        },
    )
    session = MagicMock()
    session.userdata = userdata
    session.say = AsyncMock()
    message = SimpleNamespace(text_content="Xác nhận nhận chuyến")
    await handle_driver_utterance(session, message, lang="vn")
    session.say.assert_not_called()
    current = context_store.get_current_trip(userdata)
    assert current is None or current.get("status") != "confirmed"


async def test_driver_text_input_cb_uses_llm_for_familiar_intent():
    userdata: dict = {"driver_phone": "0900111000"}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": {
                "trip_id": "t1",
                "status": "confirmed",
                "customer_name": "Trương Bá Chính",
                "customer_phone": "0912012903",
            },
            "upcoming_trips": [],
            "active_trip": None,
        },
    )
    sess = MagicMock()
    sess.userdata = userdata
    sess._claim_user_turn = MagicMock()
    sess._claim_user_turn.return_value.__aenter__ = AsyncMock(return_value=None)
    sess._claim_user_turn.return_value.__aexit__ = AsyncMock(return_value=None)
    sess.interrupt = AsyncMock()
    sess.say = AsyncMock()
    sess.generate_reply = MagicMock()
    agent = MagicMock()
    agent._spoken_intent_lang = "vn"
    sess.current_agent = agent

    from app.voicebot.processors.spoken_intent import driver_text_input_cb

    ev = SimpleNamespace(text="số điện thoại khách")
    await driver_text_input_cb(sess, ev)
    sess.say.assert_not_called()
    sess.generate_reply.assert_called_once()
    assert sess.generate_reply.call_args.kwargs["user_input"] == "số điện thoại khách"


def test_vn_driving_advice_matches_without_trip_hijack():
    assert classify_driver_intent("Chờ khách lâu quá tôi nên làm gì", "vn") == "driving_advice"
    assert classify_driver_intent("Đi cao tốc cần lưu ý gì", "vn") == "driving_advice"
    assert classify_driver_intent("xác nhận chuyến sắp tới", "vn") == "upcoming"


async def test_handle_driving_advice_defers_to_llm():
    session = MagicMock()
    session.userdata = {"driver_phone": "0900111000"}
    session.say = AsyncMock()
    message = SimpleNamespace(text_content="Chờ khách lâu quá tôi nên làm gì")
    await handle_driver_utterance(session, message, lang="vn")
    session.say.assert_not_called()


async def test_handle_phone_lookup_defers_to_llm():
    userdata: dict = {"driver_phone": "0900111000"}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": {
                "trip_id": "t1",
                "status": "confirmed",
                "customer_name": "Trương Bá Chính",
                "customer_phone": "0912012903",
            },
            "upcoming_trips": [],
            "active_trip": None,
        },
    )
    session = MagicMock()
    session.userdata = userdata
    session.say = AsyncMock()
    message = SimpleNamespace(text_content="số điện thoại khách")
    await handle_driver_utterance(session, message, lang="vn")
    session.say.assert_not_called()


def test_handle_trip_lookup_by_address_classifies():
    userdata: dict = {"driver_phone": "0900000001", "context": {}}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {
                    "trip_id": "t-nexgen",
                    "status": "confirmed",
                    "customer_name": "NexGen Speak",
                    "pickup_address": "Lotte 54 Liễu Giai, Ba Đình, Hà Nội",
                }
            ],
            "active_trip": None,
        },
    )
    query = "Tôi có một chuyến đón khách ở Liễu Giai là chuyến nào nhỉ?"
    assert classify_driver_intent(query, "vn", userdata) == "trip_lookup"


def test_end_conversation_classifies():
    assert classify_driver_intent("tắt máy", "vn") == "end_conversation"


async def test_conversational_ack_defers_to_llm_without_pending():
    from app.voicebot.processors.spoken_intent import SpokenIntentMixin

    class _Agent(SpokenIntentMixin):
        def __init__(self) -> None:
            self.session = MagicMock()
            self.session.userdata = {}
            self.session.say = AsyncMock()
            self._spoken_intent_lang = "vn"

    agent = _Agent()
    turn_ctx = MagicMock()
    message = SimpleNamespace(text_content="ok")
    await agent.on_user_turn_completed(turn_ctx, message)
    agent.session.say.assert_not_called()
    agent.session.generate_reply.assert_not_called()


async def test_preemptive_cancel_skips_plain_ack_without_pending():
    import asyncio

    from app.voicebot.processors.spoken_intent import attach_spoken_intent_preemptive_cancel

    session = MagicMock()
    session.userdata = {}
    session.interrupt = AsyncMock()
    handlers: dict[str, object] = {}

    def _on(event: str):
        def _register(fn):
            handlers[event] = fn
            return fn

        return _register

    session.on = _on
    attach_spoken_intent_preemptive_cancel(session, lang="vn", mode="driver")
    handler = handlers["user_input_transcribed"]
    handler(SimpleNamespace(is_final=True, transcript="Ok."))
    await asyncio.sleep(0)
    session.interrupt.assert_not_called()


async def test_preemptive_cancel_interrupts_on_pending_execute():
    import asyncio

    from app.voicebot.processors import pending_action
    from app.voicebot.processors.spoken_intent import attach_spoken_intent_preemptive_cancel

    session = MagicMock()
    session.userdata = {"driver_phone": "0900111000", "context": {}}
    context_store.set_pending_driver_action(
        session.userdata, "upcoming", {"scope": "all"}
    )
    assert pending_action.should_execute(session.userdata, "Ok.", "vn")
    session.interrupt = AsyncMock()
    handlers: dict[str, object] = {}

    def _on(event: str):
        def _register(fn):
            handlers[event] = fn
            return fn

        return _register

    session.on = _on
    attach_spoken_intent_preemptive_cancel(session, lang="vn", mode="driver")
    handler = handlers["user_input_transcribed"]
    handler(SimpleNamespace(is_final=True, transcript="Ok."))
    await asyncio.sleep(0)
    session.interrupt.assert_awaited_once()


def test_call_tool_arguments_uses_target_trip_index():
    from app.voicebot.processors.spoken_intent import call_tool_arguments

    userdata: dict = {"driver_phone": "0900111000", "context": {}}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {
                    "trip_id": "t1",
                    "status": "confirmed",
                    "customer_name": "NexGen Speak",
                    "customer_phone": "+84901111111",
                    "pickup_address": "123 Lê Lợi",
                },
                {
                    "trip_id": "t2",
                    "status": "confirmed",
                    "customer_name": "Bob",
                    "customer_phone": "+84902222222",
                    "pickup_address": "456 Nguyễn Huệ",
                },
            ],
            "active_trip": None,
        },
    )
    context_store.match_callable_trip_by_text(userdata, "Chuyến NexGen Speak đón lúc 12 giờ 30")
    args = call_tool_arguments("Thế gọi cho khách giúp tôi.", lang="vn", userdata=userdata)
    assert args.get("trip_index") == 1
    resolved = context_store.resolve_call_target(userdata, trip_index=1, lang="vi")
    assert isinstance(resolved, dict)
    assert resolved["customer_name"] == "NexGen Speak"


async def test_call_customer_intent_defers_without_auto_tool():
    userdata: dict = {"driver_phone": "0900111000", "context": {}}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {
                    "trip_id": "t1",
                    "status": "confirmed",
                    "customer_name": "A",
                    "customer_phone": "+84901111111",
                    "pickup_address": "123 Lê Lợi",
                },
            ],
            "active_trip": None,
        },
    )
    session = MagicMock()
    session.userdata = userdata
    session.say = AsyncMock()
    message = SimpleNamespace(text_content="gọi cho khách giúp tôi.")
    await handle_driver_utterance(session, message, lang="vn")
    session.say.assert_not_called()


def test_preemptive_cancel_skipped_for_customer_mode():
    from app.voicebot.processors.spoken_intent import attach_spoken_intent_preemptive_cancel

    session = MagicMock()
    handlers: dict[str, object] = {}

    def _on(event: str):
        def _register(fn):
            handlers[event] = fn
            return fn

        return _register

    session.on = _on
    attach_spoken_intent_preemptive_cancel(session, lang="vn", mode="customer")
    assert "user_input_transcribed" not in handlers
