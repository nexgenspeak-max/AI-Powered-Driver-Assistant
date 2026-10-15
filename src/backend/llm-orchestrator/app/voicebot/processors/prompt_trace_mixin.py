"""Agent mixin — records each llm_node call to the session prompt trace.

Must be FIRST in the bases so ``super().llm_node`` runs the rest of the chain
(e.g. SpokenIntentMixin's tool_choice tweak) before the request is recorded.
"""
from __future__ import annotations

from typing import Any

from app.services.prompt_trace import trace_llm_node, writer_for


class PromptTraceMixin:
    def llm_node(self, chat_ctx: Any, tools: list[Any], model_settings: Any):
        inner = super().llm_node(chat_ctx, tools, model_settings)  # type: ignore[misc]
        if writer_for(self) is None:
            return inner
        return trace_llm_node(self, chat_ctx, tools, model_settings, inner)
