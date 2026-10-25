"""Live-LLM eval: does the driver agent pick the right read-only tool?

Opt-in (needs OPENAI_API_KEY, costs a few cents, not run in CI):
    .venv/bin/python -m app.voicebot.testing.tool_choice_eval [runs]

Same harness as call_intent_eval: real VN prompt, real schemas, configured
model. A case passes when the first tool the model calls is the expected one
(or it calls none when none is expected); when the case names an argument,
that argument must match too. Covers the tools added on 2026-10-24
(get_active_bonuses, get_driver_status, get_vehicle_info, the yesterday /
last_week periods of get_earnings_summary) plus neighbours they could be
confused with (get_today_earnings, set_driver_status, get_driver_stats).
"""
from __future__ import annotations

import json
import sys

from openai import OpenAI

from app.config.settings import get_settings
from app.voicebot.locales.vn.system_instructions import INBOUND_PROMPT
from app.voicebot.locales.vn.tools_mapping import TOOLS_MAPPING_PROMPT
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.tool_registry import driver_inbound_tool_names

CONTEXT = (
    "Ngữ cảnh: tài xế đang online, có 1 chuyến đang chạy — đón khách Nguyễn Văn Nam ở Mỹ Đình, "
    "Hà Nội, còn 11 chuyến sau đó. Hôm nay có một ưu đãi: vùng trung tâm tăng giá 1.2x, đến 23:59."
)
GREETING = [
    {"role": "assistant", "content": "Chào bạn, mình là Czen, trợ lý AI của bạn."},
    {"role": "assistant", "content": "Bạn đang có chuyến với Nguyễn Văn Nam, sau đó còn 11 chuyến nữa. Cần gì bạn cứ nói nhé."},
]

# (name, user utterance, expected first tool or "none"[, expected arguments — a subset:
#  every listed key must match, extra keys the model adds are fine; a tuple lists the
#  acceptable values and None inside it means "key absent"])
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
    ("vehicle_plate", "Biển số xe tôi là gì?", "get_vehicle_info"),
    ("vehicle_which", "Tôi đang đăng ký xe nào?", "get_vehicle_info"),
    ("vehicle_not_stats", "Xe tôi loại gì?", "get_vehicle_info"),
    ("earnings_yesterday", "Hôm qua tôi kiếm được bao nhiêu?", "get_earnings_summary", {"period": "yesterday"}),
    ("earnings_last_week", "Tuần trước thu nhập bao nhiêu?", "get_earnings_summary", {"period": "last_week"}),
    ("earnings_this_week", "Tuần này kiếm được bao nhiêu rồi?", "get_earnings_summary", {"period": "week"}),
    ("trips_tomorrow", "Ngày mai tôi có chuyến nào không?", "check_upcoming_trips", {"day": "tomorrow"}),
    ("history_yesterday", "Hôm qua tôi hoàn thành mấy chuyến?", "check_trip_history", {"scope": "completed", "day": "yesterday"}),
    ("history_week_not_earnings", "Bảy ngày qua tôi chạy được bao nhiêu chuyến?", "check_trip_history", {"scope": "completed", "day": "last_7_days"}),
    ("cancelled_today", "Hôm nay có chuyến nào bị hủy không?", "check_trip_history", {"scope": "cancelled"}),
    # Ordinals count over the whole list the greeting announced (all days), so the
    # model must not narrow to today on its own: day absent or "all".
    ("trip_index_name", "Khách ở chuyến thứ ba tên gì?", "check_upcoming_trips", {"trip_index": 3, "day": (None, "all")}),
    ("trip_index_pickup", "Chuyến thứ hai đón ở đâu?", "check_upcoming_trips", {"trip_index": 2, "day": (None, "all")}),
    ("trips_count_all_days", "Tôi còn mấy chuyến nữa?", "check_upcoming_trips", {"day": (None, "all")}),
    ("trips_today", "Hôm nay tôi có mấy chuyến?", "check_upcoming_trips", {"day": "today"}),
]


def _tools() -> list[dict]:
    """Same tools in the same ORDER the live agent registers them (agent.py):
    the model's rare default-call goes to whichever tool is listed first."""
    order = driver_inbound_tool_names("vn")
    return [dict(raw_schema[name]) for name in order if name in raw_schema]


def _first_tool(client: OpenAI, model: str, utterance: str) -> str:
    """Name of the first tool called, with its arguments appended when any ('tool{...}')."""
    messages = [{"role": "system", "content": INBOUND_PROMPT + "\n\n" + CONTEXT + "\n" + TOOLS_MAPPING_PROMPT}]
    messages += GREETING
    messages.append({"role": "user", "content": utterance})
    kwargs: dict = {}
    if model.startswith("gpt-5"):
        kwargs["reasoning"] = {"effort": "none"} if ("luna" in model or model.startswith("gpt-5.6")) else {"effort": "minimal"}
    resp = client.responses.create(model=model, input=messages, tools=_tools(), **kwargs)
    for item in resp.output:
        if getattr(item, "type", "") == "function_call":
            args = getattr(item, "arguments", "") or ""
            try:
                parsed = json.loads(args) if args else {}
            except ValueError:
                parsed = {}
            return str(item.name) + (json.dumps(parsed, ensure_ascii=False, sort_keys=True) if parsed else "")
    return "none"


def main() -> int:
    runs = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    s = get_settings()
    client = OpenAI(api_key=s.openai_api_key)
    model = s.llm_model or "gpt-4o-mini"
    print(f"model={model} runs/case={runs}")
    total = ok = 0
    for case in CASES:
        name, utt, expected = case[0], case[1], case[2]
        want_args = case[3] if len(case) > 3 else None
        got = [_first_tool(client, model, utt) for _ in range(runs)]

        def _hit(g: str) -> bool:
            tool, _, args = g.partition("{")
            if tool != expected:
                return False
            if want_args is None:
                return True
            try:
                got_args = json.loads("{" + args)
            except ValueError:
                return False
            return all(
                (got_args.get(k) in v) if isinstance(v, tuple) else got_args.get(k) == v
                for k, v in want_args.items()
            )

        hits = sum(1 for g in got if _hit(g))
        total += runs; ok += hits
        flag = "ok " if hits == runs else "BAD"
        label = expected + (json.dumps(want_args, sort_keys=True, default=str) if want_args else "")
        print(f"{flag} {name:24s} expected={label:40s} got={json.dumps(got, ensure_ascii=False)}")
    print(f"{ok}/{total} correct")
    return 0 if ok == total else 1


if __name__ == "__main__":
    sys.exit(main())
