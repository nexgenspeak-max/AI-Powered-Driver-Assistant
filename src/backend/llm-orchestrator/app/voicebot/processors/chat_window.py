"""Keep LiveKit chat history short so Luna TTFT does not grow with the session.

System + tools are ~4.5k tokens. Each extra user/assistant/tool item adds
hundreds of tokens; live turns at ~5.2k were 2–3s LLM TTFT. Truncate in
``on_user_turn_completed`` so this generation (and the persisted agent
context) stay within the last N items. LiveKit's truncate keeps the first
system/developer instruction and drops leading partial tool pairs.
"""
from __future__ import annotations

from typing import Any

# Instruction + ~7 turns (user/assistant, plus a tool pair when needed).
MAX_CHAT_ITEMS = 16


def cap_chat_context(chat_ctx: Any) -> bool:
    """Truncate in place. Returns True when items were dropped."""
    if chat_ctx is None or not hasattr(chat_ctx, "truncate"):
        return False
    items = getattr(chat_ctx, "items", None)
    n = len(items) if items is not None else 0
    if n <= MAX_CHAT_ITEMS:
        return False
    chat_ctx.truncate(max_items=MAX_CHAT_ITEMS)
    return True
