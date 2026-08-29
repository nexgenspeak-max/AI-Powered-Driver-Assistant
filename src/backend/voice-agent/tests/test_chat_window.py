"""Chat history cap keeps Luna prompt from growing past the 2s voice bar."""
from livekit.agents.llm import ChatContext

from app.voicebot.processors.chat_window import MAX_CHAT_ITEMS, cap_chat_context


def test_cap_noop_when_short():
    ctx = ChatContext.empty()
    ctx.add_message(role="system", content="sys")
    ctx.add_message(role="user", content="hi")
    assert cap_chat_context(ctx) is False
    assert len(ctx.items) == 2


def test_cap_keeps_system_and_tail():
    ctx = ChatContext.empty()
    ctx.add_message(role="system", content="sys")
    for i in range(30):
        ctx.add_message(role="user", content=f"u{i}")
        ctx.add_message(role="assistant", content=f"a{i}")
    before = len(ctx.items)
    assert before > MAX_CHAT_ITEMS
    assert cap_chat_context(ctx) is True
    # LiveKit may re-insert the system instruction in front of the tail.
    assert len(ctx.items) < before
    assert len(ctx.items) <= MAX_CHAT_ITEMS + 1
    first = ctx.items[0]
    assert first.role == "system"
    last = ctx.items[-1]
    assert last.role == "assistant"
    assert last.content == ["a29"]
