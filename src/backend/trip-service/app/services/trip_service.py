"""
DynamoDB CRUD for trips.

Table:  {env}-driver-assistant-trips
PK:     trip_id  (UUID)
GSI:    status-created_at-index   — list trips by status (pending, calling, etc.)
GSI:    driver_phone-created_at-index — list trips for a specific driver
"""
import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from functools import lru_cache

import boto3
from boto3.dynamodb.conditions import Key

from app.core.config import get_settings


@lru_cache
def _table():
    return boto3.resource("dynamodb", region_name="ap-southeast-1").Table(get_settings().dynamodb_table)


def _to_decimal(obj: dict) -> dict:
    return json.loads(json.dumps(obj), parse_float=Decimal)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create(data: dict) -> dict:
    trip = {
        "trip_id":        str(uuid.uuid4()),
        "status":         "pending",
        "driver_phone":   data["driver_phone"],
        "customer_name":  data["customer_name"],
        "customer_phone": data.get("customer_phone", ""),
        "pickup_address": data["pickup_address"],
        "dropoff_address": data["dropoff_address"],
        "pickup_time":    data.get("pickup_time", ""),
        "booked_via":     data.get("booked_via", "app"),
        "distance_km":    data.get("distance_km", 0),
        "eta_minutes":    data.get("eta_minutes", 0),
        "traffic_note":   data.get("traffic_note", ""),
        "route_summary":  data.get("route_summary", ""),
        "room_name":      "",
        "created_at":     _now(),
        "updated_at":     _now(),
    }
    _table().put_item(Item=_to_decimal(trip))
    return trip


def get(trip_id: str) -> dict | None:
    resp = _table().get_item(Key={"trip_id": trip_id})
    return resp.get("Item")


def update_status(trip_id: str, status: str, extra: dict | None = None) -> dict | None:
    attrs = {"#s": "status", "#u": "updated_at"}
    values = {":s": status, ":u": _now()}

    if extra:
        for k, v in extra.items():
            attrs[f"#{k}"] = k
            values[f":{k}"] = v
        set_expr = "SET #s = :s, #u = :u, " + ", ".join(f"#{k} = :{k}" for k in extra)
    else:
        set_expr = "SET #s = :s, #u = :u"

    resp = _table().update_item(
        Key={"trip_id": trip_id},
        UpdateExpression=set_expr,
        ExpressionAttributeNames=attrs,
        ExpressionAttributeValues=_to_decimal(values),
        ReturnValues="ALL_NEW",
    )
    return resp.get("Attributes")


def list_recent(limit: int = 50) -> list[dict]:
    resp = _table().scan(Limit=limit)
    items = resp.get("Items", [])
    return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)


def list_by_status(status: str, limit: int = 50) -> list[dict]:
    resp = _table().query(
        IndexName="status-created_at-index",
        KeyConditionExpression=Key("status").eq(status),
        ScanIndexForward=False,
        Limit=limit,
    )
    return resp.get("Items", [])


def list_by_driver(driver_phone: str, limit: int = 50) -> list[dict]:
    resp = _table().query(
        IndexName="driver_phone-created_at-index",
        KeyConditionExpression=Key("driver_phone").eq(driver_phone),
        ScanIndexForward=False,
        Limit=limit,
    )
    return resp.get("Items", [])


def list_by_driver_and_status(driver_phone: str, status: str, limit: int = 50) -> list[dict]:
    """Used by driver app polling — get trips assigned to this driver with given status."""
    items = list_by_driver(driver_phone, limit=200)
    return [t for t in items if t.get("status") == status][:limit]


def list_by_customer(customer_phone: str, limit: int = 50) -> list[dict]:
    """Used by customer support agent — get all trips for this customer phone."""
    resp = _table().scan(
        FilterExpression=boto3.dynamodb.conditions.Attr("customer_phone").eq(customer_phone),
        Limit=limit * 3,  # over-fetch since scan doesn't guarantee count
    )
    items = resp.get("Items", [])
    return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)[:limit]
