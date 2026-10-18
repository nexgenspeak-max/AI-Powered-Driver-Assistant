"""Live-LLM eval: does the driver agent fill call_customer.intent_clarity right?

Opt-in (needs OPENAI_API_KEY, costs a few cents, not run in CI):
    .venv/bin/python -m app.voicebot.testing.call_intent_eval [runs]

Uses the real VN driver prompt (INBOUND_PROMPT + TOOLS_MAPPING_PROMPT), the
real tool schemas and the configured model. A case passes when the model
either does not call call_customer at all, or calls it with the expected
intent_clarity. The tool gate (processors/call_intent.py) makes an
"ambiguous" call safe anyway; this measures how often the model gets it
right on its own.
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
    "Ngữ cảnh: tài xế đang có 1 chuyến đang chạy — đón khách Nguyễn Văn Nam ở Mỹ Đình, "
    "Hà Nội, còn 11 chuyến sau đó."
)
GREETING = [
    {"role": "assistant", "content": "Chào bạn, mình là Czen, trợ lý AI của bạn."},
    {"role": "assistant", "content": "Bạn đang có chuyến với Nguyễn Văn Nam, sau đó còn 11 chuyến nữa. Cần gì bạn cứ nói nhé."},
]

# (name, turns after greeting, expected): expected = "no_call" | "ambiguous" | "explicit"
CASES = [
    ("live_bug_vague", [("user", "cần lắm"), ("user", "ngay lúc này")], "no_call_or_ambiguous"),
    ("dont_know", [("user", "Tôi không biết tôi cần gì.")], "no_call_or_ambiguous"),
    ("ok_after_traffic", [
        ("user", "Bạn kiểm tra tình hình giao thông không?"),
        ("assistant", "Tuyến Mỹ Đình đến Hoàng Mai giao thông bình thường, dự kiến 33 phút."),
        ("user", "Sao bạn biết là bình thường?"),
        ("assistant", "Mình lấy trạng thái giao thông hiện tại từ dữ liệu bản đồ."),
        ("user", "Ok."),
    ], "no_call_or_ambiguous"),
    ("how_to_call", [("user", "gọi khách như nào nhỉ")], "no_call_or_ambiguous"),
    ("explicit_call", [("user", "Gọi cho khách giúp mình.")], "explicit"),
    ("explicit_message", [("user", "Báo khách là mình đến trễ 5 phút nhé.")], "explicit"),
    ("explicit_name", [("user", "gọi anh Nam đi")], "explicit"),
]


def _tools() -> list[dict]:
    return [dict(v) for v in raw_schema.values()]


def _run_once(client: OpenAI, model: str, turns: list[tuple[str, str]]) -> str:
    messages = [{"role": "system", "content": INBOUND_PROMPT + "\n\n" + CONTEXT + "\n" + TOOLS_MAPPING_PROMPT}]
    messages += GREETING
    messages += [{"role": r, "content": c} for r, c in turns]
    kwargs: dict = {}
    if model.startswith("gpt-5"):
        kwargs["reasoning"] = {"effort": "none"} if ("luna" in model or model.startswith("gpt-5.6")) else {"effort": "minimal"}
    resp = client.responses.create(model=model, input=messages, tools=_tools(), **kwargs)
    for item in resp.output:
        if getattr(item, "type", "") == "function_call" and item.name == "call_customer":
            args = json.loads(item.arguments or "{}")
            return str(args.get("intent_clarity") or "missing")
    return "no_call"


def _ok(got: str, expected: str) -> bool:
    if expected == "no_call_or_ambiguous":
        return got in ("no_call", "ambiguous", "missing")
    return got == expected


def main() -> int:
    runs = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    s = get_settings()
    client = OpenAI(api_key=s.openai_api_key)
    model = s.llm_model or "gpt-4o-mini"
    print(f"model={model} runs={runs}")
    passed = total = 0
    for name, turns, expected in CASES:
        results = [_run_once(client, model, turns) for _ in range(runs)]
        ok = sum(_ok(r, expected) for r in results)
        passed += ok
        total += runs
        print(f"  {'OK ' if ok == runs else 'BAD'} {name:<18} expected={expected:<22} got={results}")
    print(f"OVERALL {passed}/{total}")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
