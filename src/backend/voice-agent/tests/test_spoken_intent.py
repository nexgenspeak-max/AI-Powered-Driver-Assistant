"""STT confirm/reject phrases skip the LLM (spoken <2s budget)."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.processors.spoken_intent import (
    classify_driver_intent,
    handle_driver_utterance,
    needs_tool_llm,
)


def test_vn_confirm_phrases():
    assert classify_driver_intent("Xác nhận nhận chuyến", "vn") == "confirm"
    assert classify_driver_intent("xác nhận chuyến.", "vn") == "confirm"
    assert classify_driver_intent("nhận chuyến", "vn") == "confirm"
    assert classify_driver_intent("xác nhận", "vn") == "confirm"


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


async def test_driver_text_input_cb_uses_toolless_llm_for_chitchat():
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
    assert kwargs["tools"] == []
    assert kwargs["tool_choice"] == "none"


async def test_voice_turn_completed_uses_toolless_llm_for_chitchat():
    """Voice STT path: on_user_turn_completed mirrors chat tool-less chitchat."""
    from app.voicebot.processors.spoken_intent import SpokenIntentMixin

    class _Agent(SpokenIntentMixin):
        def __init__(self) -> None:
            self.session = MagicMock()
            self._spoken_intent_lang = "vn"

    agent = _Agent()
    agent.session.generate_reply = MagicMock()
    turn_ctx = MagicMock()
    message = SimpleNamespace(text_content="Anh khỏe không")
    try:
        await agent.on_user_turn_completed(turn_ctx, message)
    except StopResponse:
        pass
    else:
        raise AssertionError("voice chitchat must StopResponse after toolless LLM")
    kwargs = agent.session.generate_reply.call_args.kwargs
    assert kwargs["tools"] == []
    assert kwargs["tool_choice"] == "none"


def test_vn_schedule_phrases_route_to_upcoming():
    assert classify_driver_intent("lịch trình của tôi hôm nay", "vn") == "upcoming"
    assert classify_driver_intent("Lịch trình hôm nay đâu?", "vn") == "upcoming"
    assert needs_tool_llm("lịch trình của tôi hôm nay", "vn") is True


def test_vn_earnings_fast_path():
    assert classify_driver_intent("thu nhập đi", "vn") == "earnings"
    assert classify_driver_intent("hôm nay kiếm được bao nhiêu", "vn") == "earnings"


async def test_schedule_utterance_speaks_trip_count_not_llm_excuse():
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
    try:
        await handle_driver_utterance(session, message, lang="vn")
    except StopResponse:
        pass
    spoken = session.say.await_args.args[0]
    assert "3 chuyến" in spoken
    assert "chưa" not in spoken.lower() or "chưa có chuyến" in spoken.lower()


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
    assert classify_driver_intent("gọi cho tôi số 0888887798", "vn") is None
    assert classify_driver_intent("gì? À bạn gọi cho tôi số 0888887798", "vn") is None


def test_en_confirm_and_reject():
    assert classify_driver_intent("Confirm the trip", "en") == "confirm"
    assert classify_driver_intent("I'll take it", "en") == "confirm"
    assert classify_driver_intent("reject the trip", "en") == "reject"
    assert classify_driver_intent("yes", "en") is None


async def test_handle_confirm_utterance_patches_and_stops():
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
    updated = {
        "trip_id": "9973e7ba-796c-4564-b0f7-b00a88670d75",
        "status": "confirmed",
        "customer_name": "An",
    }
    with patch(
        "app.voicebot.processors.confirm_trip_flow.backend_api.update_trip_status",
        new_callable=AsyncMock,
        return_value=updated,
    ):
        try:
            await handle_driver_utterance(session, message, lang="vn")
        except StopResponse:
            pass
        else:
            raise AssertionError("confirm fast-path must StopResponse")
    current = context_store.get_current_trip(userdata)
    assert current is not None
    assert current["status"] == "confirmed"
    session.say.assert_awaited()


async def test_driver_text_input_cb_runs_spoken_intent_before_llm():
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
    sess.generate_reply.assert_not_called()
    sess.say.assert_awaited()
    spoken = sess.say.await_args.args[0]
    assert "0912012903" in spoken


def test_vn_driving_advice_matches_without_trip_hijack():
    assert classify_driver_intent("Chờ khách lâu quá tôi nên làm gì", "vn") == "driving_advice"
    assert classify_driver_intent("Đi cao tốc cần lưu ý gì", "vn") == "driving_advice"
    assert classify_driver_intent("xác nhận chuyến sắp tới", "vn") == "confirm"


async def test_handle_driving_advice_speaks_and_stops():
    session = MagicMock()
    session.userdata = {"driver_phone": "0900111000"}
    session.say = AsyncMock()
    message = SimpleNamespace(text_content="Chờ khách lâu quá tôi nên làm gì")
    try:
        await handle_driver_utterance(session, message, lang="vn")
    except StopResponse:
        pass
    else:
        raise AssertionError("driving_advice must StopResponse")
    spoken = session.say.await_args.args[0]
    assert "điểm đón" in spoken
    assert "không xuất hiện" in spoken


async def test_handle_phone_lookup_speaks_number_from_app():
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
    try:
        await handle_driver_utterance(session, message, lang="vn")
    except StopResponse:
        pass
    else:
        raise AssertionError("phone lookup must StopResponse")
    spoken = session.say.await_args.args[0]
    assert "0912012903" in spoken
    assert "Trương Bá Chính" in spoken


def test_handle_trip_lookup_by_address():
    import asyncio

    async def _run():
        userdata: dict = {"driver_phone": "0888887798", "context": {}}
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
                        "scheduled_pickup": "2026-08-30T12:30:00",
                    },
                ],
                "active_trip": None,
            },
        )
        session = MagicMock()
        session.userdata = userdata
        session.say = AsyncMock()
        message = SimpleNamespace(
            text_content="Tôi có một chuyến đón khách ở Liễu Giai là chuyến nào nhỉ?"
        )
        try:
            await handle_driver_utterance(session, message, lang="vn")
        except StopResponse:
            pass
        spoken = session.say.await_args.args[0]
        assert "NexGen Speak" in spoken
        assert "Liễu Giai" in spoken or "Lotte" in spoken

    asyncio.run(_run())


def test_handle_end_conversation_fast_path():
    import asyncio

    async def _run():
        userdata: dict = {"driver_phone": "0888887798", "context": {}}
        session = MagicMock()
        session.userdata = userdata
        session.say = AsyncMock()
        message = SimpleNamespace(text_content="tắt máy tắt máy")

        with patch(
            "app.voicebot.vn.tools.end_conversation.end_conversation.__wrapped__",
            new=AsyncMock(),
        ) as mock_end:
            try:
                await handle_driver_utterance(session, message, lang="vn")
            except StopResponse:
                pass
            else:
                raise AssertionError("end_conversation must StopResponse")
            mock_end.assert_awaited_once()
            assert mock_end.call_args.args[0] == {}

    asyncio.run(_run())


async def test_conversational_ack_stop_response_on_voice_turn():
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
    try:
        await agent.on_user_turn_completed(turn_ctx, message)
    except StopResponse:
        pass
    else:
        raise AssertionError("conversational_ack must StopResponse on voice turn")
    agent.session.generate_reply.assert_not_called()


async def test_preemptive_cancel_interrupts_on_spoken_intent_final():
    import asyncio

    from app.voicebot.processors.spoken_intent import attach_spoken_intent_preemptive_cancel

    session = MagicMock()
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


async def test_call_customer_fast_path_speaks_natural_not_xml():
    from app.voicebot.processors import tool_reply
    from app.voicebot.prompts.tool_response import ToolResponse
    from app.voicebot.testing.conversation_quality import assert_no_raw_template

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
                {
                    "trip_id": "t2",
                    "status": "confirmed",
                    "customer_name": "B",
                    "customer_phone": "+84902222222",
                    "pickup_address": "456 Nguyễn Huệ",
                },
            ],
            "active_trip": None,
        },
    )
    template = tool_reply.as_llm(
        userdata,
        tool_reply.R(
            "call_customer",
            "Bạn đang có nhiều chuyến, muốn gọi khách nào?",
            lang="vi",
            follow_up=["Chọn số thứ tự hoặc tên khách"],
        ),
    )
    assert ToolResponse.is_template(template)
    session = MagicMock()
    session.userdata = userdata
    session.say = AsyncMock()
    message = SimpleNamespace(text_content="gọi cho khách giúp tôi.")
    try:
        await handle_driver_utterance(session, message, lang="vn")
    except StopResponse:
        pass
    spoken = session.say.await_args.args[0]
    assert_no_raw_template(spoken)
    assert "nhiều chuyến" in spoken


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
