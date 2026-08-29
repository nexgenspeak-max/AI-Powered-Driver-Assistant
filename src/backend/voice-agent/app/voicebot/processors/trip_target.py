"""Resolve which trip a driver utterance refers to — name, address, time, index.

Single source of truth for trip targeting. `target_trip` is updated only after
a confident match; ambiguous matches return multiple candidates for disambiguation.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Literal

from app.voicebot.processors import context_store

MatchKind = Literal["matched", "ambiguous", "none"]

# Minimum score to accept a unique winner (0–100 scale).
_MIN_MATCH_SCORE = 32
# Second-place must be this far below the winner to avoid ambiguity.
_MIN_SCORE_GAP = 8

_STT_NAME_ALIASES = (
    ("nextgen", "nexgen"),
    ("nextgenerationspeak", "nexgenspeak"),
    ("nickand", "nexgen"),
    ("nickandspeak", "nexgenspeak"),
    ("nickjanspeak", "nexgenspeak"),
)

_ADDRESS_STOP = frozenset(
    "tại ở tôi muốn gọi cho khách đón trả chuyến và với của là".split()
)


@dataclass
class TripScore:
    trip: dict
    score: float
    signals: list[str] = field(default_factory=list)
    schedule_index: int = 0


@dataclass
class TripResolveResult:
    kind: MatchKind
    trip: dict | None = None
    candidates: list[TripScore] = field(default_factory=list)
    best_score: float = 0.0


def _norm(text: str) -> str:
    folded = unicodedata.normalize("NFC", (text or "").lower().strip())
    folded = re.sub(r"[.!?…,;:“”'\"]+", " ", folded)
    return re.sub(r"\s+", " ", folded).strip()


def _fold_key(text: str) -> str:
    key = unicodedata.normalize("NFKD", (text or "").lower())
    key = "".join(c for c in key if not unicodedata.combining(c))
    key = re.sub(r"[^a-z0-9]+", "", key)
    for src, dst in _STT_NAME_ALIASES:
        key = key.replace(src, dst)
    return key


def _name_score(name: str, text: str) -> float:
    name = (name or "").strip()
    if len(name) < 3:
        return 0.0
    haystack = (text or "").lower()
    if name.lower() in haystack:
        return 45.0
    name_key = _fold_key(name)
    text_key = _fold_key(text)
    if not name_key or not text_key:
        return 0.0
    if name_key in text_key or text_key in name_key:
        return 40.0
    # Token overlap for multi-word names (e.g. "Next Generation Speak").
    name_tokens = [t for t in re.split(r"\s+", name.lower()) if len(t) >= 3]
    if name_tokens and sum(1 for t in name_tokens if t in haystack) >= max(1, len(name_tokens) - 1):
        return 35.0
    return 0.0


def _address_tokens(text: str) -> set[str]:
    norm = _norm(text)
    raw = re.findall(r"[a-z0-9]+", unicodedata.normalize("NFKD", norm))
    tokens: set[str] = set()
    for t in raw:
        if len(t) < 2 or t in _ADDRESS_STOP:
            continue
        tokens.add(t)
    return tokens


def _address_score(trip: dict, text: str) -> float:
    utter_tokens = _address_tokens(text)
    if not utter_tokens:
        return 0.0
    blob = " ".join(
        filter(
            None,
            (
                trip.get("pickup_address") or "",
                trip.get("dropoff_address") or "",
                trip.get("pickup_location_name") or "",
            ),
        )
    )
    addr_key = _fold_key(blob)
    if not addr_key:
        return 0.0
    hits = sum(1 for t in utter_tokens if t in addr_key)
    matched_tokens = [t for t in utter_tokens if t in addr_key]
    if hits >= 3:
        return 42.0
    if hits == 2:
        return 36.0
    if matched_tokens:
        best = max(matched_tokens, key=len)
        if len(best) >= 5:
            return 34.0
        if hits == 1 and len(best) >= 4:
            return 28.0
    return 0.0


def _parse_time(text: str) -> tuple[int, int] | None:
    t = _norm(text)
    m = re.search(r"(\d{1,2})\s*(?:giờ|gio|h|:)\s*(\d{1,2})", t)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = re.search(r"(\d{1,2}):(\d{2})", t)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None


def _trip_pickup_time(trip: dict) -> tuple[int, int] | None:
    for key in ("scheduled_pickup", "pickup_time", "scheduled_at"):
        raw = trip.get(key) or ""
        if not raw:
            continue
        m = re.search(r"T(\d{2}):(\d{2})", str(raw))
        if m:
            return int(m.group(1)), int(m.group(2))
        m = re.search(r"(\d{1,2}):(\d{2})", str(raw))
        if m:
            return int(m.group(1)), int(m.group(2))
    return None


def _time_score(trip: dict, text: str) -> float:
    spoken = _parse_time(text)
    trip_time = _trip_pickup_time(trip)
    if not spoken or not trip_time:
        return 0.0
    if spoken == trip_time:
        return 38.0
    if spoken[0] == trip_time[0]:
        return 18.0
    return 0.0


def _index_score(trip_index: int, text: str) -> float:
    from app.voicebot.processors.spoken_intent import parse_trip_index

    idx = parse_trip_index(text)
    if idx is not None and idx == trip_index:
        return 50.0
    return 0.0


def score_trip(trip: dict, text: str, *, schedule_index: int) -> TripScore:
    signals: list[str] = []
    total = 0.0
    name = trip.get("customer_name") or ""
    ns = _name_score(name, text)
    if ns:
        total += ns
        signals.append("name")
    ads = _address_score(trip, text)
    if ads:
        total += ads
        signals.append("address")
    ts = _time_score(trip, text)
    if ts:
        total += ts
        signals.append("time")
    ix = _index_score(schedule_index, text)
    if ix:
        total += ix
        signals.append("index")
    return TripScore(trip=trip, score=min(total, 100.0), signals=signals, schedule_index=schedule_index)


def resolve_trips_from_text(
    userdata: dict,
    text: str,
    *,
    callable_only: bool = False,
) -> TripResolveResult:
    """Score all schedule/callable trips against utterance; pick one or flag ambiguity."""
    if not (text or "").strip():
        return TripResolveResult(kind="none")

    if callable_only:
        trips = context_store.get_callable_trips(userdata)
    else:
        trips = context_store.get_schedule_trips(userdata)

    if not trips:
        return TripResolveResult(kind="none")

    schedule = context_store.get_schedule_trips(userdata)
    id_to_index = {t.get("trip_id"): i + 1 for i, t in enumerate(schedule)}

    scored: list[TripScore] = []
    for trip in trips:
        tid = trip.get("trip_id")
        idx = id_to_index.get(tid, 0)
        row = score_trip(trip, text, schedule_index=idx)
        if row.score > 0:
            scored.append(row)

    if not scored:
        return TripResolveResult(kind="none")

    scored.sort(key=lambda r: (-r.score, r.schedule_index))
    best = scored[0]
    if best.score < _MIN_MATCH_SCORE:
        return TripResolveResult(kind="none", candidates=scored, best_score=best.score)

    if len(scored) == 1:
        return TripResolveResult(kind="matched", trip=best.trip, candidates=scored, best_score=best.score)

    second = scored[1]
    if best.score - second.score >= _MIN_SCORE_GAP:
        return TripResolveResult(kind="matched", trip=best.trip, candidates=scored, best_score=best.score)

    close = [r for r in scored if best.score - r.score < _MIN_SCORE_GAP]
    return TripResolveResult(kind="ambiguous", candidates=close, best_score=best.score)


def resolve_and_select_trip(
    userdata: dict,
    text: str,
    *,
    callable_only: bool = False,
) -> dict | None:
    """Match trip from text; set target_trip when confident."""
    result = resolve_trips_from_text(userdata, text, callable_only=callable_only)
    if result.kind == "matched" and result.trip:
        context_store.set_target_trip(userdata, result.trip)
        return result.trip
    return None
