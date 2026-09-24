"""Structured tool output for LLM follow-ups without re-calling tools.

Tools return a ResponseTemplate the assistant parses:
  KnowledgeData      — raw facts (not read aloud)
  ResponseRule       — how to speak naturally
  ResponseKnowledge  — main spoken answer (TTS reads this on fast-path tools)
  FollowUpKnowledge  — answer informational follow-ups without re-calling tool
  ActionKnowledge    — when driver wants an ACTION, call the tool listed here
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field


TOOL_RESPONSE_INSTRUCTIONS_VN = """
ĐỊNH DẠNG KẾT QUẢ TOOL (<ResponseTemplate>):
- KnowledgeData: dữ liệu thô — không đọc thẳng cho tài xế.
- ResponseRule: quy tắc cách nói — tuân theo khi diễn đạt lại.
- ResponseKnowledge: câu trả lời chính — tool đã TTS phần này thì im lặng.
- FollowUpKnowledge: trả lời câu hỏi thông tin tiếp theo CÙNG chủ đề — không gọi lại tool đọc dữ liệu.
- ActionKnowledge: khi tài xế muốn THỰC HIỆN (gọi, nhắn, xác nhận, hủy, đổi chuyến) → gọi đúng tool/action ghi ở đây.
Chỉ gọi lại tool đọc dữ liệu khi: đổi chuyến, làm mới (refresh), hoặc dữ liệu có thể đã cũ.
"""

TOOL_RESPONSE_INSTRUCTIONS_EN = """
TOOL RESULT FORMAT (<ResponseTemplate>):
- KnowledgeData: raw facts — do not read verbatim to the driver.
- ResponseRule: speaking style — follow when rephrasing.
- ResponseKnowledge: main answer — stay silent if the tool already spoke this.
- FollowUpKnowledge: answer informational follow-ups on the SAME topic — do not re-call read tools.
- ActionKnowledge: when the driver wants an ACTION (call, SMS, confirm, cancel, switch trip) → invoke the tool/action listed here.
Re-call data tools only when: switching trips, refreshing, or data may be stale.
"""


_DEFAULT_RULES_VI = (
    "Trả lời tự nhiên, ngắn, gọi tài xế là bạn, xưng em hoặc mình",
    "Mỗi lượt một thông tin — follow-up chỉ trả đúng phần được hỏi",
    "Follow-up thông tin: FollowUpKnowledge; follow-up hành động: ActionKnowledge",
)

_DEFAULT_RULES_EN = (
    "Natural, short spoken English",
    "One fact per turn — follow-ups answer only what was asked",
    "Info follow-ups: FollowUpKnowledge; action follow-ups: ActionKnowledge",
)


@dataclass
class ToolResponse:
    tool: str = ""
    lang: str = "vi"
    knowledge_data: list[str] = field(default_factory=list)
    response_rules: list[str] = field(default_factory=list)
    response_knowledge: str = ""
    follow_up_knowledge: list[str] = field(default_factory=list)
    action_knowledge: list[str] = field(default_factory=list)

    def spoken(self) -> str:
        return self.response_knowledge.strip()

    @staticmethod
    def spoken_from_template(template: str) -> str:
        """Extract speakable text from a serialized ResponseTemplate."""
        text = (template or "").strip()
        if not text or "<ResponseTemplate>" not in text:
            return text
        match = re.search(
            r"<ResponseKnowledge>\s*(.*?)\s*</ResponseKnowledge>",
            text,
            flags=re.DOTALL,
        )
        if match:
            return match.group(1).strip()
        return text

    @staticmethod
    def is_template(text: str) -> bool:
        return "<ResponseTemplate>" in (text or "")

    def to_template(self) -> str:
        lines = ["<ResponseTemplate>"]
        if self.knowledge_data:
            lines.append("<KnowledgeData>")
            lines.extend(f"- {row}" for row in self.knowledge_data)
            lines.append("</KnowledgeData>")
        rules = self.response_rules or (
            list(_DEFAULT_RULES_EN if self.lang == "en" else _DEFAULT_RULES_VI)
        )
        lines.append("<ResponseRule>")
        lines.extend(f"- {row}" for row in rules)
        lines.append("</ResponseRule>")
        lines.append("<ResponseKnowledge>")
        lines.append(self.response_knowledge.strip())
        lines.append("</ResponseKnowledge>")
        if self.follow_up_knowledge:
            lines.append("<FollowUpKnowledge>")
            lines.extend(f"- {row}" for row in self.follow_up_knowledge)
            lines.append("</FollowUpKnowledge>")
        if self.action_knowledge:
            lines.append("<ActionKnowledge>")
            lines.extend(f"- {row}" for row in self.action_knowledge)
            lines.append("</ActionKnowledge>")
        lines.append("</ResponseTemplate>")
        return "\n".join(lines)

    @classmethod
    def simple(
        cls,
        *,
        tool: str,
        spoken: str,
        lang: str = "vi",
        knowledge: list[str] | None = None,
        rules: list[str] | None = None,
        follow_up: list[str] | None = None,
        action: list[str] | None = None,
    ) -> ToolResponse:
        return cls(
            tool=tool,
            lang=lang,
            knowledge_data=list(knowledge or []),
            response_rules=list(rules or []),
            response_knowledge=spoken,
            follow_up_knowledge=list(follow_up or []),
            action_knowledge=list(action or []),
        )


def wrap_spoken(
    tool: str,
    spoken: str,
    *,
    lang: str = "vi",
    knowledge: list[str] | None = None,
    follow_up: list[str] | None = None,
    action: list[str] | None = None,
    rules: list[str] | None = None,
) -> ToolResponse:
    """Minimal template for short tool replies (errors, disambiguation)."""
    return ToolResponse.simple(
        tool=tool,
        spoken=spoken,
        lang=lang,
        knowledge=knowledge,
        follow_up=follow_up,
        action=action,
        rules=rules,
    )
