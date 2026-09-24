"""Trim tool JSON descriptions so every LLM turn is not a 6k-token essay.

LiveKit sends the full raw_schema for every inbound tool on every turn.
Long Vietnamese/English essays duplicated the mapping prompt and pushed
confirm_trip LLM TTFT over 1.6s.
"""

_DESC_MAX = 180
_PARAM_MAX = 90


def _clip(text: str, limit: int) -> str:
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def compact_raw_schema(raw: dict) -> dict:
    for spec in raw.values():
        desc = spec.get("description")
        if isinstance(desc, str):
            spec["description"] = _clip(desc, _DESC_MAX)
        properties = (spec.get("parameters") or {}).get("properties") or {}
        for prop in properties.values():
            pdesc = prop.get("description")
            if isinstance(pdesc, str):
                prop["description"] = _clip(pdesc, _PARAM_MAX)
    return raw
