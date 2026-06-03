#!/usr/bin/env python
"""
Smoke-test suite for the voice-agent service.

Run from the voice-agent directory:
    python tests/smoke_test.py
"""
import importlib
import os
import sys

# Ensure the voice-agent root is on sys.path regardless of where we run from
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
os.chdir(_ROOT)  # settings.py reads envs/.env.{ENV} relative to cwd

# Load env file so os.getenv checks reflect actual config
from dotenv import load_dotenv  # noqa: E402
_ENV = os.getenv("ENV", "local")
load_dotenv(f"envs/.env.{_ENV}", override=False)  # don't overwrite already-set vars

GREEN  = "\033[32m"
RED    = "\033[31m"
YELLOW = "\033[33m"
RESET  = "\033[0m"
PASS   = f"{GREEN}✓{RESET}"
FAIL   = f"{RED}✗{RESET}"
WARN   = f"{YELLOW}⚠{RESET}"

_errors = 0


def check(label: str, fn):
    global _errors
    try:
        result = fn()
        suffix = f"  →  {result}" if result else ""
        print(f"  {PASS}  {label}{suffix}")
    except Exception as exc:
        print(f"  {FAIL}  {label}  →  {exc}")
        _errors += 1


def warn(label: str, fn):
    try:
        result = fn()
        suffix = f"  →  {result}" if result else ""
        print(f"  {PASS}  {label}{suffix}")
    except Exception as exc:
        print(f"  {WARN}  {label}  →  {exc}  (non-fatal)")


# ── 1. Module imports ─────────────────────────────────────────────────────────
print(f"\n{GREEN}── 1. Module Imports{RESET}")
_modules = [
    "app.config.settings",
    "app.config.logging",
    "app.providers",
    "app.providers.stt.openai",
    "app.providers.stt.deepgram",
    "app.providers.llm.openai",
    "app.providers.llm.gemini",
    "app.providers.tts.elevenlabs",
    "app.providers.tts.google",
    "app.agent.session",
    "app.agent.voice_agent",
    "app.agent.prompts",
    "app.tools.trip_tools",
    "app.tools.customer_tools",
    "app.tools.call_tools",
    "app.tools.reminder_tools",
    "app.tools.registry",
    "app.services.silence_tracker",
    "app.services.conversation_service",
    "app.services.backend_api",
]
for mod in _modules:
    check(mod, lambda m=mod: importlib.import_module(m) and None)


# ── 2. Settings loaded correctly ──────────────────────────────────────────────
print(f"\n{GREEN}── 2. Settings{RESET}")
from app.config.settings import get_settings  # noqa: E402
s = get_settings()
check("STT provider valid", lambda: s.stt_provider in ("openai", "deepgram") or (_ for _ in ()).throw(ValueError(f"unknown: {s.stt_provider}")))  # type: ignore[attr-defined]
check("LLM provider valid", lambda: s.llm_provider in ("openai", "gemini", "google") or (_ for _ in ()).throw(ValueError(f"unknown: {s.llm_provider}")))  # type: ignore[attr-defined]
check("TTS provider valid", lambda: s.tts_provider in ("elevenlabs", "google") or (_ for _ in ()).throw(ValueError(f"unknown: {s.tts_provider}")))  # type: ignore[attr-defined]
print(f"  {PASS}  providers: STT={s.stt_provider}/{s.stt_model}  LLM={s.llm_provider}/{s.llm_model}  TTS={s.tts_provider}")


# ── 3. Required environment variables ─────────────────────────────────────────
print(f"\n{GREEN}── 3. Environment Variables{RESET}")
_required = [
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "OPENAI_API_KEY",
]
_optional = [
    "DEEPGRAM_API_KEY",
    "ELEVENLABS_API_KEY",
    "TRIP_SERVICE_URL",
    "CALL_LOGGER_URL",
]
for k in _required:
    val = os.getenv(k, "")
    check(k, lambda v=val, k=k: v or (_ for _ in ()).throw(ValueError("not set")))  # type: ignore[attr-defined]
for k in _optional:
    val = os.getenv(k, "")
    warn(k, lambda v=val, k=k: v or (_ for _ in ()).throw(ValueError("not set")))  # type: ignore[attr-defined]


# ── 4. Plugins ────────────────────────────────────────────────────────────────
print(f"\n{GREEN}── 4. Plugins{RESET}")
from app.agent.session import _NOISE_CANCEL  # noqa: E402
check(
    "BVCTelephony noise cancellation",
    lambda: _NOISE_CANCEL or (_ for _ in ()).throw(ValueError("unavailable — run: pip install livekit-plugins-noise-cancellation")),  # type: ignore[attr-defined]
)

from livekit.plugins import silero  # noqa: E402
check("Silero VAD available", lambda: silero.VAD.load() and None)

from livekit.plugins.turn_detector.multilingual import MultilingualModel  # noqa: E402
check("MultilingualModel importable", lambda: MultilingualModel and None)  # init needs job context


# ── 5. Tool registry ──────────────────────────────────────────────────────────
print(f"\n{GREEN}── 5. Tool Registry{RESET}")
from app.tools.registry import InboundToolsMixin, OutboundToolsMixin, CustomerAgentMixin  # noqa: E402
from app.agent.voice_agent import DriverAgent  # noqa: E402
from app.agent.customer_agent import CustomerAgent  # noqa: E402

check("DriverAgent class defined",  lambda: DriverAgent and None)
check("CustomerAgent class defined", lambda: CustomerAgent and None)
check("InboundToolsMixin has trip tools",   lambda: hasattr(InboundToolsMixin, "check_upcoming_trips") or (_ for _ in ()).throw(AttributeError("missing check_upcoming_trips")))  # type: ignore
check("InboundToolsMixin has call tools",   lambda: hasattr(InboundToolsMixin, "call_customer") or (_ for _ in ()).throw(AttributeError("missing call_customer")))  # type: ignore
check("CustomerAgentMixin has support tools", lambda: hasattr(CustomerAgentMixin, "get_my_trip") or (_ for _ in ()).throw(AttributeError("missing get_my_trip")))  # type: ignore

driver_mro = " → ".join(c.__name__ for c in DriverAgent.__mro__ if c is not object)
print(f"  {PASS}  DriverAgent MRO: {driver_mro}")


# ── 6. Room name parser ───────────────────────────────────────────────────────
print(f"\n{GREEN}── 6. Room Name Parsing{RESET}")
from app.agent.session import _parse_room  # noqa: E402

cases = [
    ("driver-84867347452-1748700000", "driver",   "84867347452"),
    ("customer-84901234567-1748700000", "customer", "84901234567"),
    ("trip-abc12345",                 "outbound", ""),
    ("unknown-room",                  "driver",   ""),
]
for room, exp_mode, exp_phone in cases:
    mode, phone = _parse_room(room)
    ok = mode == exp_mode and phone == exp_phone
    label = f"_parse_room({room!r}) → mode={mode!r} phone={phone!r}"
    if ok:
        print(f"  {PASS}  {label}")
    else:
        print(f"  {FAIL}  {label}  (expected mode={exp_mode!r} phone={exp_phone!r})")
        _errors += 1


# ── Summary ───────────────────────────────────────────────────────────────────
print()
if _errors:
    print(f"  {FAIL}  {RED}{_errors} check(s) FAILED{RESET}")
    sys.exit(1)
else:
    print(f"  {PASS}  {GREEN}All checks passed — voice-agent is ready{RESET}")
