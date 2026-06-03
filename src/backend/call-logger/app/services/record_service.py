"""
DynamoDB CRUD for call records.

Table:  {env}-driver-assistant-call-records
PK:     call_id  (String) — LiveKit room name, e.g. driver-call-_+84867347452_abc
GSI:    caller-started_at-index  — query all calls by driver phone number
"""
import json
from decimal import Decimal
from functools import lru_cache

import boto3
from boto3.dynamodb.conditions import Key

from app.core.config import get_settings


@lru_cache
def _table():
    s = get_settings()
    return boto3.resource("dynamodb").Table(s.dynamodb_table)


def _to_decimal(obj: dict) -> dict:
    """DynamoDB doesn't accept float — convert via JSON round-trip."""
    return json.loads(json.dumps(obj), parse_float=Decimal)


def save(record: dict) -> None:
    _table().put_item(Item=_to_decimal(record))


def get(call_id: str) -> dict | None:
    resp = _table().get_item(Key={"call_id": call_id})
    return resp.get("Item")


def list_by_caller(caller: str, limit: int = 20) -> list[dict]:
    """All calls for one driver, newest first."""
    resp = _table().query(
        IndexName="caller-started_at-index",
        KeyConditionExpression=Key("caller").eq(caller),
        ScanIndexForward=False,
        Limit=limit,
    )
    return resp.get("Items", [])


def list_recent(limit: int = 20) -> list[dict]:
    """Scan for recent records — dev/debug only, avoid on large tables."""
    resp = _table().scan(Limit=limit)
    items = resp.get("Items", [])
    return sorted(items, key=lambda x: x.get("started_at", ""), reverse=True)
