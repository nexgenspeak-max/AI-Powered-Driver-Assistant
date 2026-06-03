"""
DynamoDB CRUD for drivers.

Table:  {env}-driver-assistant-drivers
PK:     phone  (e.g. +84867347452)
"""
from datetime import datetime, timezone
from functools import lru_cache

import boto3
from boto3.dynamodb.conditions import Key

from app.core.config import get_settings


@lru_cache
def _table():
    s = get_settings()
    dyn = boto3.resource("dynamodb", region_name="ap-southeast-1")
    drivers_table = s.dynamodb_table.replace("-trips", "-drivers")
    return dyn.Table(drivers_table)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def register(phone: str, name: str, fcm_token: str = "") -> dict:
    driver = {
        "phone":         phone,
        "name":          name,
        "fcm_token":     fcm_token,
        "status":        "offline",
        "registered_at": _now(),
        "updated_at":    _now(),
    }
    _table().put_item(Item=driver)
    return driver


def get(phone: str) -> dict | None:
    resp = _table().get_item(Key={"phone": phone})
    return resp.get("Item")


def update(phone: str, fields: dict) -> dict | None:
    fields["updated_at"] = _now()
    names  = {f"#{k}": k for k in fields}
    values = {f":{k}": v for k, v in fields.items()}
    expr   = "SET " + ", ".join(f"#{k} = :{k}" for k in fields)

    resp = _table().update_item(
        Key={"phone": phone},
        UpdateExpression=expr,
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
        ReturnValues="ALL_NEW",
    )
    return resp.get("Attributes")


def list_all() -> list[dict]:
    resp = _table().scan()
    items = resp.get("Items", [])
    return sorted(items, key=lambda x: x.get("name", ""))


def list_online() -> list[dict]:
    return [d for d in list_all() if d.get("status") == "online"]
