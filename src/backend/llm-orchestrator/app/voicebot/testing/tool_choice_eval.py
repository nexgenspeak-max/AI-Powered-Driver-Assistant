"""Live-LLM eval: does the driver agent pick the right read-only tool?

Opt-in (needs OPENAI_API_KEY, costs a few cents, not run in CI):
    .venv/bin/python -m app.voicebot.testing.tool_choice_eval [runs]

Same harness as call_intent_eval: real VN prompt, real schemas, configured
model. A case passes when the first tool the model calls is the expected one
(or it calls none when none is expected). Covers the tools added on
2026-10-24 (get_active_bonuses, get_driver_status) plus neighbours they could
be confused with (get_today_earnings, set_driver_status, get_driver_stats).
"""
from __future__ import annotations

import json
import sys

from openai import OpenAI

from app.config.settings import get_settings
from app.voicebot.locales.vn.system_instructions import INBOUND_PROMPT
from app.voicebot.locales.vn.tools_mapping import TOOLS_MAPPING_PROMPT
from app.voicebot.locales.vn.tools_definition import raw_schema

CONTEXT = (
    "Ngữ cảnh: tài xế đang online, có 1 chuyến đang chạy — đón khách Nguyễn Văn Nam ở Mỹ Đình, "
    "Hà Nội, còn 11 chuyến sau đó. Hôm nay có một ưu đãi: vùng trung tâm tăng giá 1.2x, đến 23:59."
)
GREETING = [
    {"role": "assistant", "content": "Chào bạn, mình là Czen, trợ lý AI của bạn."},
    {"role": "assistant", "content": "Bạn đang có chuyến với Nguyễn Văn Nam, sau đó còn 11 chuyến nữa. Cần gì bạn cứ nói nhé."},
]

# (name, user utterance, expected first tool or "none")
CASES = [
    ("bonus_today", "Hôm nay có thưởng gì không?", "get_active_bonuses"),
    ("bonus_promo", "Đang có ưu đãi gì cho tài xế không?", "get_active_bonuses"),
    ("bonus_surge", "Có bonus khu trung tâm không?", "get_active_bonuses"),
    ("earnings_not_bonus", "Hôm nay tôi kiếm được bao nhiêu?", "get_today_earnings"),
    ("status_query", "Tôi đang online chưa?", "get_driver_status"),
    ("status_query2", "Giờ tôi có đang nhận chuyến không?", "get_driver_status"),
    ("status_change_not_query", "Tắt nhận chuyến giúp tôi.", "set_driver_status"),
    ("stats_not_status", "Điểm đánh giá của tôi bao nhiêu?", "get_driver_stats"),
    ("chitchat_no_tool", "Hôm nay trời đẹp nhỉ.", "none"),
]


def _tools() -> list[dict]:
    return [dict(v) for v in raw_schema.values()]


def _first_tool(client: OpenAI, model: str, utterance: str) -> str:
    messages = [{"role": "system", "content": INBOUND_PROMPT + "\n\n" + CONTEXT + "\n" + TOOLS_MAPPING_PROMPT}]
    messages += GREETING
    messages.append({"role": "user", "content": utterance})
    kwargs: dict = {}
    if model.startswith("gpt-5"):
        kwargs["reasoning"] = {"effort": "none"} if ("luna" in model or model.startswith("gpt-5.6")) else {"effort": "minimal"}
    resp = client.responses.create(model=model, input=messages, tools=_tools(), **kwargs)
    for item in resp.output:
        if getattr(item, "type", "") == "function_call":
            return str(item.name)
    return "none"


def main() -> int:
    runs = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    s = get_settings()
    client = OpenAI(api_key=s.openai_api_key)
    model = s.llm_model or "gpt-4o-mini"
    print(f"model={model} runs/case={runs}")
    total = ok = 0
    for name, utt, expected in CASES:
        got = [_first_tool(client, model, utt) for _ in range(runs)]
        hits = sum(1 for g in got if g == expected)
        total += runs; ok += hits
        flag = "ok " if hits == runs else "BAD"
        print(f"{flag} {name:24s} expected={expected:20s} got={json.dumps(got, ensure_ascii=False)}")
    print(f"{ok}/{total} correct")
    return 0 if ok == total else 1


if __name__ == "__main__":
    sys.exit(main())
