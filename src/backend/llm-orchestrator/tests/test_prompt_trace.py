"""Per-session prompt trace JSONL — contract read by ops-service."""
import asyncio
import json
import os
import time
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from livekit.agents import function_tool
from livekit.agents.llm import (
    ChatChunk,
    ChatContext,
    ChoiceDelta,
    FunctionCall,
    FunctionCallOutput,
    FunctionToolCall,
)
from livekit.agents.metrics import EOUMetrics, LLMMetrics, TTSMetrics

from app.services.logger import context as log_context
from app.services.prompt_trace import (
    PromptTraceWriter,
    current_writer,
    start_prompt_trace,
    stop_prompt_trace,
    store,
    trace_llm_node,
)
from app.services.prompt_trace.serialize import serialize_chat_items, serialize_tools
from app.services.prompt_trace.writer import MAX_FIELD_CHARS, sanitize_room

# Contract read by ops-service — every row has COMMON plus its kind's payload keys.
COMMON = {"v", "ts", "room", "seq", "turn", "kind"}
PAYLOAD = {
    "session_start": {"mode", "lang", "agent", "participant", "model", "stt", "tts"},
    "user": {"text", "language"},
    "llm_request": {"call", "model", "tool_choice", "messages", "tools"},
    "llm_response": {"call", "text", "tool_calls", "duration_ms", "ttft_ms", "error"},
    "llm_metrics": {"prompt_tokens", "completion_tokens", "ttft_ms", "duration_ms", "request_id"},
    "tool": {"name", "arguments", "output", "is_error", "call_id", "duration_ms"},
    "speech": {"role", "text", "interrupted", "source"},
    "turn_metrics": {"eou_ms", "llm_ttft_ms", "tts_ttfb_ms", "total_ms", "slow"},
    "op": {"name", "ok", "fields"},
    "error": {"where", "message"},
    "session_end": {"duration_ms", "reason"},
}


def _assert_contract(row):
    assert set(row) == COMMON | PAYLOAD[row["kind"]], row["kind"]
    assert row["v"] == 1


def _lines(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]


class _FakeSession:
    def __init__(self, userdata=None) -> None:
        self.userdata = userdata if userdata is not None else {}
        self.handlers: dict[str, object] = {}

    def on(self, name: str):
        def deco(fn):
            self.handlers[name] = fn
            return fn

        return deco

    def emit(self, name: str, ev) -> None:
        self.handlers[name](ev)


def _settings(env="local", enabled=True, directory="logs/traces", retention_days=7):
    return SimpleNamespace(
        env=env,
        prompt_trace_enabled=enabled,
        prompt_trace_dir=directory,
        prompt_trace_retention_days=retention_days,
    )


@pytest.fixture(autouse=True)
def _isolate_trace_state():
    store._ROOM_WRITERS.clear()
    log_context.clear()
    yield
    store._ROOM_WRITERS.clear()
    log_context.clear()


# ── writer ───────────────────────────────────────────────────────────────────


def test_sanitize_room_replaces_unsafe_chars():
    assert sanitize_room("driver-+8490/12 3_x.y") == "driver-_8490_12_3_x.y"
    assert sanitize_room("../etc/passwd") == ".._etc_passwd"


def test_writer_numbers_seq_and_turn(tmp_path):
    writer = PromptTraceWriter.open("driver-+849/1", tmp_path)
    assert writer is not None
    writer.emit("session_start", mode="driver", lang="vn", agent="DriverAgent")
    writer.emit("user", text="xin chào", language="vi")
    writer.emit("llm_request", call=1)
    writer.emit("user", text="chuyến tiếp", language=None)

    path = tmp_path / "driver-_849_1.jsonl"
    rows = _lines(path)
    assert [r["seq"] for r in rows] == [1, 2, 3, 4]
    assert [r["turn"] for r in rows] == [0, 1, 1, 2]
    assert all(r["v"] == 1 and r["room"] == "driver-+849/1" for r in rows)
    assert all(isinstance(r["ts"], float) for r in rows)
    assert rows[1]["text"] == "xin chào"
    assert "xin chào" in path.read_text(encoding="utf-8")  # ensure_ascii=False


def test_writer_truncates_long_strings_recursively(tmp_path):
    writer = PromptTraceWriter.open("r1", tmp_path)
    big = "a" * (MAX_FIELD_CHARS + 50)
    writer.emit("llm_request", messages=[{"content": big}], note=big)
    row = _lines(tmp_path / "r1.jsonl")[0]
    assert row["note"] == "a" * MAX_FIELD_CHARS + "…[truncated]"
    assert row["messages"][0]["content"].endswith("…[truncated]")


def test_writer_never_raises_on_unwritable_dir(tmp_path):
    blocker = tmp_path / "file"
    blocker.write_text("x")
    writer = PromptTraceWriter.open("r1", blocker / "sub")
    if writer is not None:
        writer.emit("user", text="x")  # must not raise


def test_writer_llm_call_counter(tmp_path):
    writer = PromptTraceWriter.open("r1", tmp_path)
    assert writer.next_llm_call() == 1
    assert writer.next_llm_call() == 2


# ── gating ───────────────────────────────────────────────────────────────────


def test_start_disabled_outside_local_dev(tmp_path):
    session = _FakeSession()
    with patch(
        "app.services.prompt_trace.get_settings",
        return_value=_settings(env="production", directory=str(tmp_path)),
    ):
        assert start_prompt_trace(session, room="r1", mode="driver", lang="vn") is None
    assert current_writer(session) is None
    assert list(tmp_path.iterdir()) == []


def test_start_disabled_by_flag(tmp_path):
    session = _FakeSession()
    with patch(
        "app.services.prompt_trace.get_settings",
        return_value=_settings(enabled=False, directory=str(tmp_path)),
    ):
        assert start_prompt_trace(session, room="r1", mode="driver", lang="vn") is None


def test_start_enabled_writes_session_start_and_hooks(tmp_path):
    session = _FakeSession()
    with patch(
        "app.services.prompt_trace.get_settings",
        return_value=_settings(env="dev", directory=str(tmp_path)),
    ):
        writer = start_prompt_trace(
            session, room="driver-1", mode="driver", lang="vn", agent="DriverAgent"
        )
    assert writer is not None
    assert current_writer(session) is writer

    session.emit(
        "user_input_transcribed",
        SimpleNamespace(transcript="partial", is_final=False, language="vi"),
    )
    session.emit(
        "user_input_transcribed",
        SimpleNamespace(transcript="chuyến tiếp theo", is_final=True, language="vi"),
    )
    ctx = ChatContext.empty()
    assistant = ctx.add_message(role="assistant", content="Chuyến lúc 9h.")
    session.emit("conversation_item_added", SimpleNamespace(item=assistant))
    user_item = ctx.add_message(role="user", content="ignored")
    session.emit("conversation_item_added", SimpleNamespace(item=user_item))
    session.emit(
        "function_tools_executed",
        SimpleNamespace(
            function_calls=[
                FunctionCall(call_id="c1", name="check_upcoming_trips", arguments="{}")
            ],
            function_call_outputs=[
                FunctionCallOutput(
                    call_id="c1", name="check_upcoming_trips", output="[]", is_error=False
                )
            ],
        ),
    )
    session.emit(
        "metrics_collected",
        SimpleNamespace(
            metrics=LLMMetrics(
                label="x", request_id="req1", timestamp=0.0, duration=1.5, ttft=0.4,
                cancelled=False, completion_tokens=10, prompt_tokens=900,
                prompt_cached_tokens=0, total_tokens=910, tokens_per_second=6.0,
            )
        ),
    )
    session.emit("close", SimpleNamespace(reason="user_initiated"))

    rows = _lines(tmp_path / "driver-1.jsonl")
    kinds = [r["kind"] for r in rows]
    assert kinds == ["session_start", "user", "speech", "tool", "llm_metrics", "session_end"]
    assert rows[0]["agent"] == "DriverAgent"
    assert rows[0]["mode"] == "driver" and rows[0]["lang"] == "vn"
    assert rows[1]["text"] == "chuyến tiếp theo" and rows[1]["turn"] == 1
    assert rows[2]["role"] == "assistant" and rows[2]["text"] == "Chuyến lúc 9h."
    assert rows[2]["interrupted"] is False
    assert rows[3]["name"] == "check_upcoming_trips" and rows[3]["output"] == "[]"
    assert rows[3]["is_error"] is False and rows[3]["call_id"] == "c1"
    assert rows[3]["arguments"] == "{}"
    assert rows[4]["prompt_tokens"] == 900 and rows[4]["request_id"] == "req1"
    assert rows[4]["completion_tokens"] == 10
    assert rows[4]["ttft_ms"] == 400.0 and rows[4]["duration_ms"] == 1500.0
    assert rows[5]["duration_ms"] >= 0
    assert rows[5]["reason"] == "user_initiated"
    for row in rows:
        _assert_contract(row)
    assert store.writer_for_room("driver-1") is None  # close unregisters ops routing


# ── serialize ────────────────────────────────────────────────────────────────


def test_serialize_chat_items_all_types():
    ctx = ChatContext.empty()
    ctx.add_message(role="system", content="Bạn là trợ lý.")
    ctx.add_message(role="user", content=["Chuyến", "tiếp"])
    ctx.add_message(role="assistant", content="Để tôi xem.")
    ctx.items.append(FunctionCall(call_id="c1", name="get_my_trip", arguments='{"a":1}'))
    ctx.items.append(
        FunctionCallOutput(call_id="c1", name="get_my_trip", output="ok", is_error=False)
    )

    msgs = serialize_chat_items(ctx.items)
    assert msgs[0] == {
        "type": "message", "role": "system", "content": "Bạn là trợ lý.",
        "name": None, "call_id": None,
    }
    assert msgs[1]["content"] == "Chuyến\ntiếp"
    assert msgs[2]["role"] == "assistant"
    assert msgs[3] == {
        "type": "function_call", "role": None, "content": '{"a":1}',
        "name": "get_my_trip", "call_id": "c1",
    }
    assert msgs[4] == {
        "type": "function_call_output", "role": None, "content": "ok",
        "name": "get_my_trip", "call_id": "c1",
    }


def test_serialize_tools_function_and_raw():
    @function_tool
    async def get_my_trip(trip_id: str) -> str:
        """Lấy chuyến của tài xế."""
        return ""

    @function_tool(
        raw_schema={
            "name": "raw_tool",
            "description": "raw desc",
            "parameters": {"type": "object", "properties": {}},
        }
    )
    async def raw_tool(raw_arguments: dict) -> str:
        return ""

    tools = serialize_tools([get_my_trip, raw_tool])
    assert tools[0]["name"] == "get_my_trip"
    assert tools[0]["description"] == "Lấy chuyến của tài xế."
    assert "trip_id" in tools[0]["parameters"]["properties"]
    assert tools[1] == {
        "name": "raw_tool",
        "description": "raw desc",
        "parameters": {"type": "object", "properties": {}},
    }


# ── llm_node wrapper ─────────────────────────────────────────────────────────


def _chunks():
    return [
        ChatChunk(id="1", delta=ChoiceDelta(role="assistant", content="Xin ")),
        ChatChunk(id="1", delta=ChoiceDelta(content="chào")),
        ChatChunk(
            id="1",
            delta=ChoiceDelta(
                tool_calls=[FunctionToolCall(name="get_my_trip", arguments="{}", call_id="c9")]
            ),
        ),
        "!",
    ]


async def _gen(items):
    for item in items:
        yield item


def _fake_agent(session):
    return SimpleNamespace(
        session=session,
        _get_activity_or_raise=lambda: SimpleNamespace(llm=SimpleNamespace(model="gpt-4o-mini")),
    )


def test_trace_llm_node_reyields_and_records(tmp_path):
    writer = PromptTraceWriter.open("r1", tmp_path)
    session = _FakeSession({"_prompt_trace": writer})
    agent = _fake_agent(session)
    ctx = ChatContext.empty()
    ctx.add_message(role="system", content="SYS")
    ctx.add_message(role="user", content="hỏi")
    items = _chunks()
    settings = SimpleNamespace(tool_choice="auto")

    async def run():
        out = []
        async for c in trace_llm_node(agent, ctx, [], settings, _gen(items)):
            out.append(c)
        return out

    out = asyncio.run(run())
    assert out == items
    assert all(a is b for a, b in zip(out, items))

    req, resp = _lines(tmp_path / "r1.jsonl")
    assert req["kind"] == "llm_request" and req["call"] == 1
    assert req["model"] == "gpt-4o-mini" and req["tool_choice"] == "auto"
    assert [m["content"] for m in req["messages"]] == ["SYS", "hỏi"]
    assert req["tools"] == []
    assert resp["kind"] == "llm_response" and resp["call"] == 1
    assert resp["text"] == "Xin chào!"
    assert resp["tool_calls"] == [{"name": "get_my_trip", "arguments": "{}", "call_id": "c9"}]
    assert resp["error"] is None
    assert resp["duration_ms"] >= 0 and resp["ttft_ms"] is not None


def test_trace_llm_node_handles_awaitable_inner(tmp_path):
    writer = PromptTraceWriter.open("r1", tmp_path)
    agent = _fake_agent(_FakeSession({"_prompt_trace": writer}))

    async def coro():
        return _gen(["a", "b"])

    async def run():
        return [c async for c in trace_llm_node(agent, ChatContext.empty(), [], None, coro())]

    assert asyncio.run(run()) == ["a", "b"]
    resp = _lines(tmp_path / "r1.jsonl")[1]
    assert resp["text"] == "ab" and resp["tool_calls"] == []


def test_trace_llm_node_records_error_and_reraises(tmp_path):
    writer = PromptTraceWriter.open("r1", tmp_path)
    agent = _fake_agent(_FakeSession({"_prompt_trace": writer}))

    async def boom():
        yield "x"
        raise RuntimeError("provider down")

    async def run():
        async for _ in trace_llm_node(agent, ChatContext.empty(), [], None, boom()):
            pass

    try:
        asyncio.run(run())
    except RuntimeError as exc:
        assert str(exc) == "provider down"
    else:
        raise AssertionError("expected RuntimeError")
    resp = _lines(tmp_path / "r1.jsonl")[1]
    assert resp["text"] == "x" and "provider down" in resp["error"]


def test_trace_llm_node_closes_inner_on_cancel(tmp_path):
    writer = PromptTraceWriter.open("r1", tmp_path)
    agent = _fake_agent(_FakeSession({"_prompt_trace": writer}))
    closed = {"v": False}

    async def endless():
        try:
            while True:
                yield "x"
        finally:
            closed["v"] = True

    async def run():
        gen = trace_llm_node(agent, ChatContext.empty(), [], None, endless())
        await gen.__anext__()
        await gen.aclose()

    asyncio.run(run())
    assert closed["v"] is True
    resp = _lines(tmp_path / "r1.jsonl")[1]
    assert resp["error"] == "cancelled"


def test_mixin_passthrough_without_writer():
    from app.voicebot.processors.prompt_trace_mixin import PromptTraceMixin

    sentinel = object()

    class Base:
        def llm_node(self, chat_ctx, tools, model_settings):
            return sentinel

    class Agent(PromptTraceMixin, Base):
        session = _FakeSession({})

    assert Agent().llm_node(None, [], None) is sentinel


@pytest.mark.parametrize("awaitable", [False, True])
def test_mixin_reyields_inner_chunks_unchanged(tmp_path, awaitable):
    from app.voicebot.processors.prompt_trace_mixin import PromptTraceMixin

    writer = PromptTraceWriter.open("r1", tmp_path)
    items = _chunks()

    class Base:
        def llm_node(self, chat_ctx, tools, model_settings):
            model_settings.tool_choice = "required"  # inner chain mutation is recorded

            async def wrap():
                return _gen(items)

            return wrap() if awaitable else _gen(items)

    class Agent(PromptTraceMixin, Base):
        session = _FakeSession({"_prompt_trace": writer})

        def _get_activity_or_raise(self):
            return SimpleNamespace(llm=SimpleNamespace(model="m"))

    settings = SimpleNamespace(tool_choice="auto")

    async def run():
        return [c async for c in Agent().llm_node(ChatContext.empty(), [], settings)]

    out = asyncio.run(run())
    assert len(out) == len(items) and all(a is b for a, b in zip(out, items))
    req, resp = _lines(tmp_path / "r1.jsonl")
    assert req["tool_choice"] == "required"
    _assert_contract(req)
    _assert_contract(resp)


def test_every_session_agent_class_traces_first():
    from app.voicebot.bridge_call_agent import BridgeCallAgent
    from app.voicebot.customer_bridge_call_agent import CustomerBridgeCallAgent
    from app.voicebot.customer_call_agent import CustomerCallAgent
    from app.voicebot.locales.en import agent as en_agent
    from app.voicebot.locales.vn import agent as vn_agent
    from app.voicebot.processors.prompt_trace_mixin import PromptTraceMixin

    classes = [
        vn_agent.DriverAgent, vn_agent.CustomerAgent,
        en_agent.DriverAgent, en_agent.CustomerAgent,
        CustomerCallAgent, BridgeCallAgent, CustomerBridgeCallAgent,
    ]
    for cls in classes:
        assert cls.__bases__[0] is PromptTraceMixin, cls


# ── session_start / speech source / close ────────────────────────────────────


def test_session_start_records_participant_and_providers(tmp_path):
    session = _FakeSession()
    session.llm = SimpleNamespace(model="gpt-4o-mini")
    session.stt = SimpleNamespace(provider="deepgram")
    session.tts = SimpleNamespace(provider="elevenlabs")
    with patch(
        "app.services.prompt_trace.get_settings",
        return_value=_settings(directory=str(tmp_path)),
    ):
        start_prompt_trace(
            session, room="customer-1", mode="customer", lang="en",
            agent="CustomerAgent", participant="customer-84901",
        )
    row = _lines(tmp_path / "customer-1.jsonl")[0]
    _assert_contract(row)
    assert row["participant"] == "customer-84901"
    assert (row["model"], row["stt"], row["tts"]) == ("gpt-4o-mini", "deepgram", "elevenlabs")


def test_speech_source_resolved_from_speech_created(tmp_path):
    session = _FakeSession()
    with patch(
        "app.services.prompt_trace.get_settings",
        return_value=_settings(directory=str(tmp_path)),
    ):
        start_prompt_trace(session, room="r1", mode="driver", lang="vn")
    ctx = ChatContext.empty()
    said = ctx.add_message(role="assistant", content="Dạ, chờ chút.")
    generated = ctx.add_message(role="assistant", content="Chuyến lúc 9h.")
    say_handle = SimpleNamespace(id="sp_1", chat_items=[said])
    llm_handle = SimpleNamespace(id="sp_2", chat_items=[])

    session.emit("speech_created", SimpleNamespace(speech_handle=say_handle, source="say"))
    session.emit(
        "speech_created", SimpleNamespace(speech_handle=llm_handle, source="generate_reply")
    )
    session.emit("conversation_item_added", SimpleNamespace(item=said))
    session.current_speech = llm_handle  # item not yet attached to the handle
    session.emit("conversation_item_added", SimpleNamespace(item=generated))
    session.current_speech = None
    unknown = ctx.add_message(role="assistant", content="?")
    session.emit("conversation_item_added", SimpleNamespace(item=unknown))

    speech = [r for r in _lines(tmp_path / "r1.jsonl") if r["kind"] == "speech"]
    assert [r["source"] for r in speech] == ["say", "llm", None]


def test_tool_duration_from_item_timestamps(tmp_path):
    session = _FakeSession()
    with patch(
        "app.services.prompt_trace.get_settings",
        return_value=_settings(directory=str(tmp_path)),
    ):
        start_prompt_trace(session, room="r1", mode="driver", lang="vn")
    call = FunctionCall(call_id="c1", name="get_my_trip", arguments="{}", created_at=100.0)
    out = FunctionCallOutput(
        call_id="c1", name="get_my_trip", output="ok", is_error=True, created_at=100.25
    )
    session.emit(
        "function_tools_executed",
        SimpleNamespace(function_calls=[call], function_call_outputs=[out]),
    )
    tool = _lines(tmp_path / "r1.jsonl")[1]
    _assert_contract(tool)
    assert tool["duration_ms"] == 250.0 and tool["is_error"] is True


def test_session_end_once_close_then_teardown(tmp_path):
    session = _FakeSession()
    with patch(
        "app.services.prompt_trace.get_settings",
        return_value=_settings(directory=str(tmp_path)),
    ):
        writer = start_prompt_trace(session, room="r1", mode="driver", lang="vn")
    session.emit("close", SimpleNamespace(reason=SimpleNamespace(value="participant_disconnected")))
    stop_prompt_trace(writer, "room_disconnected")
    stop_prompt_trace(None)
    ends = [r for r in _lines(tmp_path / "r1.jsonl") if r["kind"] == "session_end"]
    assert len(ends) == 1 and ends[0]["reason"] == "participant_disconnected"


def test_teardown_ends_when_close_never_fired(tmp_path):
    session = _FakeSession()
    with patch(
        "app.services.prompt_trace.get_settings",
        return_value=_settings(directory=str(tmp_path)),
    ):
        writer = start_prompt_trace(session, room="r1", mode="custcall", lang="vn")
    assert store.writer_for_room("r1") is writer
    stop_prompt_trace(writer, "room_disconnected")
    assert _lines(tmp_path / "r1.jsonl")[-1]["reason"] == "room_disconnected"
    assert store.writer_for_room("r1") is None


# ── devlog op hook ───────────────────────────────────────────────────────────


def test_devlog_event_appends_op_for_bound_room(tmp_path):
    from app.devlog import event

    writer = PromptTraceWriter.open("driver-9", tmp_path)
    store.register_room(writer)
    log_context.bind(room="driver-9")

    event("http", method="GET", path="/x", status=200, duration_ms=12.5, skipped=None)
    event("turn_filler", ok=False, error="TimeoutError", obj=object())
    event("llm_metrics", ttft_ms=300)  # excluded — covered by llm_metrics rows
    event("tts_metrics", ttfb_ms=200)

    rows = _lines(tmp_path / "driver-9.jsonl")
    assert [r["name"] for r in rows] == ["http", "turn_filler"]
    for row in rows:
        _assert_contract(row)
    assert rows[0]["ok"] is True
    assert rows[0]["fields"] == {"method": "GET", "path": "/x", "status": 200, "duration_ms": 12.5}
    assert rows[1]["ok"] is False and rows[1]["fields"]["error"] == "TimeoutError"
    assert isinstance(rows[1]["fields"]["obj"], str)


def test_devlog_event_ignores_unbound_or_other_rooms(tmp_path):
    from app.devlog import event

    writer = PromptTraceWriter.open("driver-9", tmp_path)
    store.register_room(writer)
    event("http", status=200)  # no room bound
    log_context.bind(room="driver-other")
    event("http", status=200)
    assert not (tmp_path / "driver-9.jsonl").exists()


def test_devlog_event_survives_broken_writer(tmp_path):
    from app.devlog import event

    class Boom(PromptTraceWriter):
        def emit(self, kind, **payload):
            raise RuntimeError("disk gone")

    store.register_room(Boom("driver-9", tmp_path / "x.jsonl"))
    log_context.bind(room="driver-9")
    event("http", status=200)  # must not raise


# ── turn_metrics ─────────────────────────────────────────────────────────────


def test_turn_metrics_row_emitted_when_turn_completes(tmp_path):
    from app.agent import turn_metrics

    writer = PromptTraceWriter.open("r1", tmp_path)
    session = _FakeSession({"_prompt_trace": writer})
    turn_metrics.attach(session)

    def metrics(ev):
        session.emit("metrics_collected", SimpleNamespace(metrics=ev))

    metrics(EOUMetrics.model_construct(
        end_of_utterance_delay=0.5, transcription_delay=0.1, speech_id="s1",
    ))
    metrics(LLMMetrics.model_construct(
        ttft=1.2, duration=2.0, prompt_tokens=900, total_tokens=950, speech_id="s1",
    ))
    assert not (tmp_path / "r1.jsonl").exists()  # waits for TTS ttfb
    metrics(TTSMetrics.model_construct(ttfb=0.4, speech_id="s1"))

    rows = _lines(tmp_path / "r1.jsonl")
    assert len(rows) == 1
    row = rows[0]
    _assert_contract(row)
    assert row["kind"] == "turn_metrics"
    assert row["eou_ms"] == 500.0 and row["llm_ttft_ms"] == 1200.0
    assert row["tts_ttfb_ms"] == pytest.approx(400.0)
    assert row["total_ms"] == pytest.approx(2100.0) and row["slow"] is True


def test_turn_metrics_without_trace_is_noop():
    from app.agent import turn_metrics

    session = _FakeSession({})
    turn_metrics.attach(session)
    session.emit("metrics_collected", SimpleNamespace(metrics=LLMMetrics.model_construct(
        ttft=0.3, duration=1.0, prompt_tokens=900, total_tokens=950, speech_id="s1",
    )))
    session.emit("metrics_collected", SimpleNamespace(
        metrics=TTSMetrics.model_construct(ttfb=0.2, speech_id="s1")
    ))


# ── retention / seq resume / JSON safety ─────────────────────────────────────


def test_open_prunes_traces_older_than_retention(tmp_path):
    old = tmp_path / "driver-old.jsonl"
    fresh = tmp_path / "driver-fresh.jsonl"
    other = tmp_path / "notes.txt"
    for f in (old, fresh, other):
        f.write_text("{}\n")
    eight_days_ago = time.time() - 8 * 86400
    os.utime(old, (eight_days_ago, eight_days_ago))
    os.utime(other, (eight_days_ago, eight_days_ago))

    with patch(
        "app.services.prompt_trace.get_settings",
        return_value=_settings(directory=str(tmp_path), retention_days=7),
    ):
        start_prompt_trace(_FakeSession(), room="driver-new", mode="driver", lang="vn")

    assert not old.exists()
    assert fresh.exists() and other.exists()
    assert (tmp_path / "driver-new.jsonl").exists()


def test_retention_zero_keeps_everything(tmp_path):
    old = tmp_path / "driver-old.jsonl"
    old.write_text("{}\n")
    ancient = time.time() - 365 * 86400
    os.utime(old, (ancient, ancient))
    PromptTraceWriter.open("r1", tmp_path, retention_days=0)
    assert old.exists()


def test_reopened_room_keeps_seq_monotonic(tmp_path):
    first = PromptTraceWriter.open("trip-abc", tmp_path)
    first.emit("session_start", mode="driver")
    first.emit("llm_request", messages=[{"content": "x" * 100_000}])  # > tail block
    second = PromptTraceWriter.open("trip-abc", tmp_path)
    second.emit("session_start", mode="driver")
    assert [r["seq"] for r in _lines(tmp_path / "trip-abc.jsonl")] == [1, 2, 3]


def test_non_finite_floats_become_null(tmp_path):
    writer = PromptTraceWriter.open("r1", tmp_path)
    writer.emit("op", name="x", ok=True, fields={"a": float("nan"), "b": float("inf")})
    raw = (tmp_path / "r1.jsonl").read_text()
    assert "NaN" not in raw and "Infinity" not in raw
    assert json.loads(raw)["fields"] == {"a": None, "b": None}


# ── smoke: one simulated session, no LiveKit ─────────────────────────────────


def test_smoke_simulated_session_jsonl(tmp_path):
    from app.agent import turn_metrics
    from app.devlog import event

    class Session(_FakeSession):
        """Multiple handlers per event, like the real EventEmitter."""

        def on(self, name):
            def deco(fn):
                self.handlers.setdefault(name, []).append(fn)
                return fn
            return deco

        def emit(self, name, ev):
            for fn in self.handlers.get(name, []):
                fn(ev)

    session = Session()
    session.llm = SimpleNamespace(model="gpt-4o-mini")
    log_context.bind(room="driver-84900-1")
    with patch(
        "app.services.prompt_trace.get_settings",
        return_value=_settings(directory=str(tmp_path)),
    ):
        writer = start_prompt_trace(
            session, room="driver-84900-1", mode="driver", lang="vn",
            agent="DriverAgent", participant="driver-84900",
        )
    turn_metrics.attach(session)
    agent = _fake_agent(session)

    session.emit("user_input_transcribed", SimpleNamespace(
        transcript="chuyến tiếp theo", is_final=True, language="vi",
    ))
    ctx = ChatContext.empty()
    ctx.add_message(role="system", content="Bạn là trợ lý tài xế.")
    ctx.add_message(role="user", content="chuyến tiếp theo")

    async def llm():
        return [c async for c in trace_llm_node(
            agent, ctx, [], SimpleNamespace(tool_choice="auto"), _gen(_chunks()),
        )]

    asyncio.run(llm())
    event("http", method="GET", path="/api/v1/drivers/me/trips", status=200, duration_ms=40.0)
    session.emit("function_tools_executed", SimpleNamespace(
        function_calls=[FunctionCall(call_id="c9", name="get_my_trip", arguments="{}")],
        function_call_outputs=[FunctionCallOutput(
            call_id="c9", name="get_my_trip", output='{"trip":"T1"}', is_error=False,
        )],
    ))
    handle = SimpleNamespace(id="sp_1", chat_items=[])
    session.emit("speech_created", SimpleNamespace(speech_handle=handle, source="generate_reply"))
    session.current_speech = handle
    reply = ctx.add_message(role="assistant", content="Chuyến lúc 9h.")
    session.emit("conversation_item_added", SimpleNamespace(item=reply))
    for m in (
        EOUMetrics.model_construct(
            end_of_utterance_delay=0.3, transcription_delay=0.1, speech_id="s",
        ),
        LLMMetrics.model_construct(
            ttft=0.5, duration=1.0, prompt_tokens=900, completion_tokens=12,
            total_tokens=912, request_id="req1", speech_id="s",
        ),
        TTSMetrics.model_construct(ttfb=0.2, speech_id="s"),
    ):
        session.emit("metrics_collected", SimpleNamespace(metrics=m))
    session.emit("close", SimpleNamespace(reason="user_initiated"))
    stop_prompt_trace(writer, "room_disconnected")

    text = (tmp_path / "driver-84900-1.jsonl").read_text(encoding="utf-8")
    rows = [json.loads(line) for line in text.splitlines()]  # every line parses
    for row in rows:
        _assert_contract(row)
    assert [r["kind"] for r in rows] == [
        "session_start", "user", "llm_request", "llm_response", "op", "tool",
        "speech", "llm_metrics", "turn_metrics", "session_end",
    ]
    assert [r["seq"] for r in rows] == list(range(1, len(rows) + 1))
    assert [r["turn"] for r in rows] == [0] + [1] * (len(rows) - 1)
    assert rows[6]["source"] == "llm"
    assert rows[-1]["reason"] == "user_initiated"
