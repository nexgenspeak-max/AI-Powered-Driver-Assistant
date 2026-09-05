"""Run trip-target + full tool-path verification and print a metric report.

Usage:
  cd src/backend/voice-agent && python -m app.voicebot.testing.trip_tool_verify
"""
from __future__ import annotations

import asyncio
import importlib
import inspect
from dataclasses import dataclass, field
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from livekit.agents import StopResponse

from app.voicebot.processors import context_store, pending_action
from app.voicebot.processors.spoken_intent import (
    classify_driver_intent,
    handle_driver_utterance,
    needs_tool_llm,
)
from app.voicebot.processors.trip_target import resolve_trips_from_text

VN_TOOLS_DIR = Path(__file__).resolve().parents[1] / "locales" / "vn" / "tools"

# Tools that must call resolve_customer_trip or resolve_call_target (grep-audited).
TRIP_AWARE_TOOLS = frozenset(
    {
        "call_customer",
        "confirm_trip",
        "confirm_trip_with_customer",
        "extend_wait_time",
        "get_current_trip_info",
        "get_customer_location",
        "get_trip_traffic",
        "reject_trip",
        "report_customer_no_show",
        "report_trip_issue",
        "request_cancel_trip",
        "send_sms_to_customer",
        "update_trip_status",
    }
)

RESOLVE_FN_MARKERS = (
    "resolve_customer_trip",
    "resolve_call_target",
    "resolve_trip_from_subset",
)


@dataclass
class Case:
    case_id: str
    utterance: str
    expected_trip_id: str | None
    category: str
    callable_only: bool = True
    allow_ambiguous: bool = False


@dataclass
class Row:
    case_id: str
    category: str
    ok: bool
    detail: str = ""


@dataclass
class Report:
    rows: list[Row] = field(default_factory=list)

    def add(self, case_id: str, category: str, ok: bool, detail: str = "") -> None:
        self.rows.append(Row(case_id, category, ok, detail))

    def section_pass(self, category: str) -> tuple[int, int]:
        subset = [r for r in self.rows if r.category == category]
        passed = sum(1 for r in subset if r.ok)
        return passed, len(subset)

    def total_pass(self) -> tuple[int, int]:
        passed = sum(1 for r in self.rows if r.ok)
        return passed, len(self.rows)

    def print_report(self) -> None:
        total_ok, total = self.total_pass()
        pct = (100.0 * total_ok / total) if total else 0.0
        print("=" * 60)
        print("TRIP / TOOL VERIFY METRIC REPORT")
        print("=" * 60)
        categories = sorted({r.category for r in self.rows})
        for cat in categories:
            ok, n = self.section_pass(cat)
            print(f"  {cat:22} {ok:3}/{n:3}  ({100 * ok / n:5.1f}%)")
        print("-" * 60)
        print(f"  {'OVERALL':22} {total_ok:3}/{total:3}  ({pct:5.1f}%)")
        fails = [r for r in self.rows if not r.ok]
        if fails:
            print("-" * 60)
            print("FAILURES:")
            for r in fails:
                print(f"  [{r.category}] {r.case_id}: {r.detail}")
        print("=" * 60)


def _fixture_userdata() -> dict:
    userdata: dict = {"driver_phone": "0888887798", "room_name": "test", "context": {}}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {
                    "trip_id": "t-nexgen",
                    "status": "confirmed",
                    "customer_name": "NexGen Speak",
                    "customer_phone": "+848888887798",
                    "pickup_address": "123 Lê Lợi, Quận 1, TP.HCM",
                    "dropoff_address": "456 Nguyễn Huệ, Quận 1",
                    "scheduled_pickup": "2026-08-30T12:30:00+07:00",
                },
                {
                    "trip_id": "t-bob",
                    "status": "confirmed",
                    "customer_name": "Bob Nguyen",
                    "customer_phone": "+84901111111",
                    "pickup_address": "88 Pasteur, Quận 3, TP.HCM",
                    "dropoff_address": "Landmark 81, Bình Thạnh",
                    "scheduled_pickup": "2026-08-30T18:00:00+07:00",
                },
                {
                    "trip_id": "t-alice",
                    "status": "confirmed",
                    "customer_name": "Alice Tran",
                    "customer_phone": "+84902222222",
                    "pickup_address": "10 Hai Bà Trưng, Quận 1",
                    "dropoff_address": "Sân bay Tân Sơn Nhất",
                    "scheduled_pickup": "2026-08-30T07:15:00+07:00",
                },
            ],
            "active_trip": None,
        },
    )
    return userdata


def _pending_fixture() -> dict:
    userdata: dict = {"driver_phone": "0888887798", "room_name": "test", "context": {}}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {
                    "trip_id": "t-p1",
                    "status": "notified",
                    "customer_name": "NexGen Speak",
                    "pickup_address": "123 Lê Lợi",
                },
                {
                    "trip_id": "t-p2",
                    "status": "notified",
                    "customer_name": "Bob Nguyen",
                    "pickup_address": "88 Pasteur",
                },
            ],
        },
    )
    return userdata


TRIP_TARGET_CASES: list[Case] = [
    Case("name_exact", "Tôi muốn gọi cho NexGen Speak.", "t-nexgen", "trip_target"),
    Case("name_stt_nextgen", "Gọi cho NextGen Speak.", "t-nexgen", "trip_target"),
    Case("name_stt_nick", "Gọi cho Nick and Speak.", "t-nexgen", "trip_target"),
    Case("address_le_loi", "Gọi khách ở 123 Lê Lợi.", "t-nexgen", "trip_target"),
    Case("address_quan1_le_loi", "Chuyến đón 123 Lê Lợi Quận 1.", "t-nexgen", "trip_target"),
    Case("address_landmark", "Gọi khách Landmark 81.", "t-bob", "trip_target"),
    Case("address_pasteur", "Khách ở Pasteur Quận 3.", "t-bob", "trip_target"),
    Case("time_nexgen", "Chuyến NexGen đón lúc 12 giờ 30.", "t-nexgen", "trip_target"),
    Case("time_bob", "Bob chuyến 18 giờ 00.", "t-bob", "trip_target"),
    Case("index_2", "Gọi khách chuyến số 2.", "t-bob", "trip_target"),
    Case("index_3", "Chuyến 3 là ai?", "t-alice", "trip_target", callable_only=False),
    Case("wrong_no_match", "Gọi khách ở Đà Lạt.", None, "trip_target"),
]

CUSTOMER_TRIP_CASES = [
    ("sms_nexgen_name", "Nhắn khách NexGen Speak là tôi đến sau 10 phút.", "t-nexgen"),
    ("sms_bob_address", "Nhắn khách ở Pasteur là tôi đang đến.", "t-bob"),
    ("location_landmark", "Khách Landmark 81 đón ở đâu?", "t-bob"),
    ("traffic_time", "Tắc đường chuyến 12 giờ 30.", "t-nexgen"),
    ("info_alice", "Thông tin chuyến Alice Tran.", "t-alice"),
]

INTENT_FAST = [
    ("lịch trình hôm nay", "upcoming"),
    ("Gọi cho khách giúp tôi.", "call_customer"),
    ("thu nhập hôm nay", "earnings"),
    ("Xác nhận nhận chuyến", "confirm"),
    ("tháng vừa rồi thu nhập", "earnings"),
    ("toàn bộ thu nhập của tôi", "earnings"),
    ("Tôi còn mấy đơn hàng?", "delivery_orders"),
    (
        "thu nhập tuần vừa rồi bao nhiêu đến từ giao hàng bao nhiêu đến từ chở khách",
        "earnings",
    ),
    ("Không, bạn hiểu sai ý tôi rồi, tôi chưa hỏi về đơn giao hàng.", None),
    ("tắt máy", "end_conversation"),
]


INTENT_TOOL_LLM = [
    ("Tôi đến nơi rồi.", True),
    ("Khách đứng ở đâu?", True),
    ("Anh khỏe không", False),
]

PENDING_INFER = [
    ("Em kiểm tra lịch chuyến cho bạn nhé.", "upcoming"),
    ("Em nhắn khách là bạn sẽ đến đón sau 10 phút.", "call_customer"),
]

PENDING_EXECUTE = [
    ("Ok.", True),
    ("Đúng rồi.", True),
    ("Thì gọi đi.", True),
    ("Sao bạn không kiểm tra?", False),
]

# Replay of live session driver-0888887798-e5ea0a9b (2026-08-30 ~02:59–03:02).
CONVERSATION_REPLAY_STEPS = [
    "schedule_intent",
    "schedule_target_trip",
    "bot_detail_target",
    "call_after_context",
    "pending_skip_during_call",
    "pre_dial_no_foreground",
    "handback_no_duplicate",
]


def _run_trip_target(report: Report) -> None:
    for case in TRIP_TARGET_CASES:
        userdata = _fixture_userdata()
        result = resolve_trips_from_text(
            userdata, case.utterance, callable_only=case.callable_only
        )
        if case.expected_trip_id is None:
            ok = result.kind == "none"
            detail = f"got {result.kind} best={result.best_score:.0f}"
        elif case.allow_ambiguous:
            ok = result.kind in ("matched", "ambiguous")
            detail = f"kind={result.kind}"
        else:
            ok = (
                result.kind == "matched"
                and result.trip is not None
                and result.trip.get("trip_id") == case.expected_trip_id
            )
            got = result.trip.get("trip_id") if result.trip else result.kind
            sig = result.candidates[0].signals if result.candidates else []
            detail = f"expected={case.expected_trip_id} got={got} signals={sig}"
        report.add(case.case_id, "trip_target", ok, detail)


def _run_customer_trip(report: Report) -> None:
    for case_id, utterance, expected in CUSTOMER_TRIP_CASES:
        userdata = _fixture_userdata()
        context_store.set_last_driver_utterance(userdata, utterance)
        trip = context_store.resolve_customer_trip(userdata, {})
        ok = trip is not None and trip.get("trip_id") == expected
        got = trip.get("trip_id") if trip else None
        report.add(case_id, "customer_trip", ok, f"expected={expected} got={got}")


def _run_pending_subset(report: Report) -> None:
    cases = [
        ("pending_name", "Xác nhận chuyến NexGen Speak.", "t-p1"),
        ("pending_address", "Từ chối chuyến Pasteur.", "t-p2"),
        ("pending_index", None, "t-p2"),
    ]
    trips = [
        t
        for t in context_store.get_schedule_trips(_pending_fixture())
        if t.get("status") == "notified"
    ]
    for case_id, utterance, expected in cases:
        userdata = _pending_fixture()
        if utterance:
            context_store.set_last_driver_utterance(userdata, utterance)
            matched = context_store.resolve_trip_from_subset(userdata, trips, {})
        else:
            matched = context_store.resolve_trip_from_subset(userdata, trips, {"trip_index": 2})
        ok = matched is not None and matched.get("trip_id") == expected
        got = matched.get("trip_id") if matched else None
        report.add(case_id, "pending_subset", ok, f"expected={expected} got={got}")


def _run_intent(report: Report) -> None:
    for utterance, expected in INTENT_FAST:
        got = classify_driver_intent(utterance, "vn")
        ok = got == expected
        report.add(
            utterance[:28],
            "intent_fast_path",
            ok,
            f"expected={expected} got={got}",
        )
    for utterance, expect_tool in INTENT_TOOL_LLM:
        got = needs_tool_llm(utterance, "vn")
        ok = got == expect_tool
        report.add(
            utterance[:28],
            "intent_tool_llm",
            ok,
            f"expected={expect_tool} got={got}",
        )


def _run_pending(report: Report) -> None:
    for bot_line, intent in PENDING_INFER:
        userdata = _fixture_userdata()
        context_store.set_last_driver_utterance(
            userdata, "Hôm nay tối NexGen Speak vào lúc mấy giờ?"
        )
        pending_action.infer_from_bot_line(bot_line, userdata, lang="vn")
        pending = context_store.get_pending_driver_action(userdata)
        ok = pending is not None and pending.get("intent") == intent
        report.add(
            bot_line[:28],
            "pending_action",
            ok,
            f"expected={intent} got={pending and pending.get('intent')}",
        )

    async def _exec_one(text: str, expect: bool) -> tuple[bool, str]:
        userdata = _fixture_userdata()
        context_store.set_pending_driver_action(
            userdata, "upcoming", {"scope": "all", "trip_index": 1}
        )
        session = MagicMock()
        session.userdata = userdata
        session.say = AsyncMock()
        if expect:
            mock_fn = AsyncMock(side_effect=StopResponse())
            with patch(
                "app.voicebot.processors.spoken_intent._tool",
                return_value=SimpleNamespace(__wrapped__=mock_fn),
            ):
                try:
                    await handle_driver_utterance(
                        session, SimpleNamespace(text_content=text), lang="vn"
                    )
                except StopResponse:
                    pass
                called = mock_fn.called
            cleared = context_store.get_pending_driver_action(userdata) is None
            return called and cleared, f"called={called} cleared={cleared}"
        ok = not pending_action.should_execute(userdata, text, "vn")
        return ok, "should not execute"

    for text, expect in PENDING_EXECUTE:
        ok, detail = asyncio.run(_exec_one(text, expect))
        report.add(text, "pending_execute", ok, detail)


def _run_call_target(report: Report) -> None:
    cases = [
        ("call_by_name", "Gọi cho NexGen Speak.", "t-nexgen"),
        ("call_by_address", "Gọi khách ở Pasteur Quận 3.", "t-bob"),
        ("call_by_index", None, "t-bob"),
    ]
    for case_id, utterance, expected in cases:
        userdata = _fixture_userdata()
        if utterance:
            resolved = context_store.resolve_call_target(
                userdata, utterance=utterance, lang="vi"
            )
        else:
            resolved = context_store.resolve_call_target(userdata, trip_index=2, lang="vi")
        ok = isinstance(resolved, dict) and resolved.get("trip_id") == expected
        got = resolved.get("trip_id") if isinstance(resolved, dict) else str(resolved)[:40]
        report.add(case_id, "call_target", ok, f"expected={expected} got={got}")


def _run_tool_imports(report: Report) -> None:
    tool_files = sorted(
        p for p in VN_TOOLS_DIR.glob("*.py") if p.name != "__init__.py"
    )
    for path in tool_files:
        mod_name = f"app.voicebot.locales.vn.tools.{path.stem}"
        case_id = path.stem
        try:
            mod = importlib.import_module(mod_name)
            ok = True
            detail = "import ok"
            for attr in dir(mod):
                if attr.startswith("_"):
                    continue
                obj = getattr(mod, attr)
                if callable(obj) and getattr(obj, "__module__", "") == mod_name:
                    if not inspect.isfunction(obj) and not inspect.iscoroutinefunction(obj):
                        continue
                    if hasattr(obj, "__wrapped__") or hasattr(obj, "raw_schema"):
                        detail = f"tool fn={attr}"
                        break
        except Exception as exc:
            ok = False
            detail = str(exc)[:80]
        report.add(case_id, "tool_import", ok, detail)


def _run_tool_trip_wiring(report: Report) -> None:
    for tool_name in sorted(TRIP_AWARE_TOOLS):
        path = VN_TOOLS_DIR / f"{tool_name}.py"
        if not path.exists():
            report.add(tool_name, "tool_trip_wiring", False, "file missing")
            continue
        source = path.read_text(encoding="utf-8")
        ok = any(marker in source for marker in RESOLVE_FN_MARKERS)
        found = next((m for m in RESOLVE_FN_MARKERS if m in source), "none")
        report.add(tool_name, "tool_trip_wiring", ok, f"marker={found}")


def _run_conversation_replay(report: Report) -> None:
    """Replay log-derived multi-turn flows without a device."""
    from app.voicebot.processors.pre_dial import announce_pre_dial
    from app.voicebot.processors.schedule_reply import format_schedule_reply
    from app.voicebot.tools import bridge_call_tools, customer_call_tools

    userdata = _fixture_userdata()

    utterance_schedule = "Tôi muốn xem lịch trình hôm nay"
    ok = classify_driver_intent(utterance_schedule, "vn") == "upcoming"
    report.add("schedule_intent", "conversation_replay", ok, f"intent={classify_driver_intent(utterance_schedule, 'vn')}")

    format_schedule_reply(userdata, {"scope": "all"}, lang="vi")
    target = context_store.get_target_trip(userdata)
    ok = target is not None and target.get("trip_id") == "t-nexgen"
    report.add("schedule_target_trip", "conversation_replay", ok, f"target={target and target.get('trip_id')}")

    context_store.match_callable_trip_by_text(
        userdata,
        "Chuyến 1 đón NexGen Speak tại Lotte 54 Liễu Giai lúc 12 giờ 30.",
    )
    target = context_store.get_target_trip(userdata)
    ok = target is not None and target.get("trip_id") == "t-nexgen"
    report.add("bot_detail_target", "conversation_replay", ok, f"target={target and target.get('trip_id')}")

    call_utterance = "Ok, gọi cho khách bảo tôi chuẩn bị đến rồi"
    context_store.set_last_driver_utterance(userdata, call_utterance)
    trip = context_store.resolve_call_target(userdata, utterance=call_utterance, lang="vi")
    ok = (
        classify_driver_intent(call_utterance, "vn") == "call_customer"
        and trip is not None
        and trip.get("trip_id") == "t-nexgen"
    )
    report.add(
        "call_after_context",
        "conversation_replay",
        ok,
        f"trip={trip and trip.get('trip_id')}",
    )

    during_call = _fixture_userdata()
    during_call["customer_call_active"] = True
    pending_action.infer_from_bot_line("Em gọi khách ngay.", during_call, lang="vn")
    ok = context_store.get_pending_driver_action(during_call) is None
    report.add("pending_skip_during_call", "conversation_replay", ok, "no false pending")

    async def _pre_dial() -> bool:
        session = MagicMock()
        session.say = AsyncMock()
        ctx = SimpleNamespace(session=session)
        await announce_pre_dial(ctx, "Đang gọi NexGen Speak, xin đợi.")
        return session.say.await_count == 1

    ok = asyncio.run(_pre_dial())
    report.add("pre_dial_no_foreground", "conversation_replay", ok, "say called")

    import inspect

    cust_src = inspect.getsource(customer_call_tools.end_customer_call)
    bridge_src = inspect.getsource(bridge_call_tools.end_bridge_call)
    ok = 'return driver, ""' in cust_src and 'return driver, ""' in bridge_src
    report.add("handback_no_duplicate", "conversation_replay", ok, "empty handoff tuple")


def main() -> int:
    report = Report()
    _run_trip_target(report)
    _run_customer_trip(report)
    _run_pending_subset(report)
    _run_call_target(report)
    _run_intent(report)
    _run_pending(report)
    _run_tool_imports(report)
    _run_tool_trip_wiring(report)
    _run_conversation_replay(report)
    report.print_report()
    ok, total = report.total_pass()
    return 0 if ok == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
