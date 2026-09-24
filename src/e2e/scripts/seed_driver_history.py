#!/usr/bin/env python3
"""Seed backdated trips for one driver (DynamoDB PutItem).

Earnings use updated_at on completed trips; history/context use recent rows.
Default target: David 0888887798 — enough volume for today/week/month bot answers.

  AWS_PROFILE=david python3 src/e2e/scripts/seed_driver_history.py
  DRIVER_PHONE=0888887798 python3 .../seed_driver_history.py
"""
from __future__ import annotations

import os
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import boto3

DRIVER_PHONE = os.environ.get("DRIVER_PHONE", "0888887798")
TABLE = os.environ.get("DYNAMODB_TABLE", "local-driver-assistant-trips")
REGION = os.environ.get("AWS_REGION", "ap-southeast-1")
TAG = "seed_history_david_v1"

CUSTOMERS = [
    ("Nguyễn Minh Anh", "0903111001"),
    ("Trần Quốc Bảo", "0903111002"),
    ("Lê Thu Hà", "0903111003"),
    ("Phạm Đức Huy", "0903111004"),
    ("Hoàng Lan", "0903111005"),
    ("Vũ Thanh Tùng", "0903111006"),
    ("Đặng Mỹ Linh", "0903111007"),
    ("Bùi Văn Nam", "0903111008"),
]

PICKUPS = [
    "Số 1 Đường Lê Lợi, Quận 1, TP.HCM",
    "215 Nguyễn Văn Cừ, Quận 5, TP.HCM",
    "88 Pasteur, Quận 3, TP.HCM",
    "12 Nguyễn Trãi, Quận 1, TP.HCM",
    "45 Võ Văn Tần, Quận 3, TP.HCM",
]
DROPOFFS = [
    "Sân bay Tân Sơn Nhất, Tân Bình, TP.HCM",
    "Landmark 81, Bình Thạnh, TP.HCM",
    "Bitexco Financial Tower, Quận 1, TP.HCM",
    "AEON Mall Tân Phú, TP.HCM",
    "Chợ Bến Thành, Quận 1, TP.HCM",
]


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def put_trip(ddb: Any, trip: dict[str, Any]) -> None:
    ddb.put_item(TableName=TABLE, Item=_to_item(trip))


def _to_item(obj: dict[str, Any]) -> dict[str, Any]:
    item: dict[str, Any] = {}
    for k, v in obj.items():
        if v is None:
            continue
        if isinstance(v, bool):
            item[k] = {"BOOL": v}
        elif isinstance(v, (int, float)):
            item[k] = {"N": str(v)}
        else:
            item[k] = {"S": str(v)}
    return item


def main() -> None:
    now = datetime.now(timezone.utc)
    ddb = boto3.client("dynamodb", region_name=REGION)
    rng = random.Random(42)
    created = 0

    # --- Completed today (earnings today + history completed_today) ---
    for i, km in enumerate([8.5, 12.2, 5.0]):
        created_at = now.replace(hour=2 + i, minute=10, second=0, microsecond=0)
        updated_at = now.replace(hour=3 + i, minute=40, second=0, microsecond=0)
        if updated_at > now:
            updated_at = now - timedelta(minutes=30 * (i + 1))
            created_at = updated_at - timedelta(hours=1)
        cust = CUSTOMERS[i]
        put_trip(
            ddb,
            {
                "trip_id": str(uuid.uuid4()),
                "status": "completed",
                "customer_name": cust[0],
                "customer_phone": cust[1],
                "pickup_address": PICKUPS[i % len(PICKUPS)],
                "dropoff_address": DROPOFFS[i % len(DROPOFFS)],
                "pickup_time": "08:00",
                "booked_via": TAG,
                "distance_km": km,
                "eta_minutes": int(km * 3),
                "traffic_note": "",
                "note": TAG,
                "route_summary": f"{km} km",
                "room_name": "",
                "driver_phone": DRIVER_PHONE,
                "created_at": iso(created_at),
                "updated_at": iso(updated_at),
            },
        )
        created += 1

    # --- Cancelled today (history cancelled_today) ---
    for i, status in enumerate(["cancelled", "cancelled_by_driver", "no_show"]):
        t = now - timedelta(hours=2 + i)
        cust = CUSTOMERS[3 + i]
        put_trip(
            ddb,
            {
                "trip_id": str(uuid.uuid4()),
                "status": status,
                "customer_name": cust[0],
                "customer_phone": cust[1],
                "pickup_address": PICKUPS[(i + 2) % len(PICKUPS)],
                "dropoff_address": DROPOFFS[(i + 2) % len(DROPOFFS)],
                "pickup_time": "10:00",
                "booked_via": TAG,
                "distance_km": 6.0 + i,
                "eta_minutes": 20,
                "traffic_note": "",
                "note": TAG,
                "route_summary": "",
                "room_name": "",
                "driver_phone": DRIVER_PHONE,
                "created_at": iso(t - timedelta(minutes=40)),
                "updated_at": iso(t),
            },
        )
        created += 1

    # --- Completed last 7 days (week earnings) ---
    for i in range(8):
        day = now - timedelta(days=1 + (i % 6))
        updated = day.replace(hour=10 + (i % 5), minute=15, second=0, microsecond=0)
        created_at = updated - timedelta(hours=1, minutes=20)
        km = round(4.0 + rng.random() * 22.0, 1)
        cust = CUSTOMERS[i % len(CUSTOMERS)]
        put_trip(
            ddb,
            {
                "trip_id": str(uuid.uuid4()),
                "status": "completed",
                "customer_name": cust[0],
                "customer_phone": cust[1],
                "pickup_address": PICKUPS[i % len(PICKUPS)],
                "dropoff_address": DROPOFFS[i % len(DROPOFFS)],
                "pickup_time": "09:30",
                "booked_via": TAG,
                "distance_km": km,
                "eta_minutes": int(km * 2.5),
                "traffic_note": "",
                "note": TAG,
                "route_summary": f"{km} km",
                "room_name": "",
                "driver_phone": DRIVER_PHONE,
                "created_at": iso(created_at),
                "updated_at": iso(updated),
            },
        )
        created += 1

    # --- Completed days 8–28 (month earnings beyond week) ---
    for i in range(12):
        day = now - timedelta(days=8 + i * 1.5)
        updated = day.replace(hour=11, minute=0, second=0, microsecond=0)
        created_at = updated - timedelta(hours=2)
        km = round(5.0 + rng.random() * 30.0, 1)
        cust = CUSTOMERS[i % len(CUSTOMERS)]
        put_trip(
            ddb,
            {
                "trip_id": str(uuid.uuid4()),
                "status": "completed",
                "customer_name": cust[0],
                "customer_phone": cust[1],
                "pickup_address": PICKUPS[i % len(PICKUPS)],
                "dropoff_address": DROPOFFS[i % len(DROPOFFS)],
                "pickup_time": "14:00",
                "booked_via": TAG,
                "distance_km": km,
                "eta_minutes": int(km * 2.8),
                "traffic_note": "",
                "note": TAG,
                "route_summary": f"{km} km",
                "room_name": "",
                "driver_phone": DRIVER_PHONE,
                "created_at": iso(created_at),
                "updated_at": iso(updated),
            },
        )
        created += 1

    # --- Older cancelled (not spoken by today-only history, but realistic DB) ---
    for i in range(4):
        day = now - timedelta(days=10 + i * 3)
        put_trip(
            ddb,
            {
                "trip_id": str(uuid.uuid4()),
                "status": "cancelled",
                "customer_name": CUSTOMERS[i][0],
                "customer_phone": CUSTOMERS[i][1],
                "pickup_address": PICKUPS[i % len(PICKUPS)],
                "dropoff_address": DROPOFFS[i % len(DROPOFFS)],
                "pickup_time": "16:00",
                "booked_via": TAG,
                "distance_km": 9.0,
                "eta_minutes": 25,
                "traffic_note": "",
                "note": TAG,
                "route_summary": "",
                "room_name": "",
                "driver_phone": DRIVER_PHONE,
                "created_at": iso(day - timedelta(hours=1)),
                "updated_at": iso(day),
            },
        )
        created += 1

    # --- Active upcoming (confirmed / pending) ---
    for i, status in enumerate(["confirmed", "confirmed", "pending"]):
        t = now + timedelta(hours=2 + i)
        put_trip(
            ddb,
            {
                "trip_id": str(uuid.uuid4()),
                "status": status,
                "customer_name": CUSTOMERS[-(i + 1)][0],
                "customer_phone": CUSTOMERS[-(i + 1)][1],
                "pickup_address": PICKUPS[i % len(PICKUPS)],
                "dropoff_address": DROPOFFS[i % len(DROPOFFS)],
                "pickup_time": f"{15 + i}:00",
                "booked_via": TAG,
                "distance_km": round(7.0 + i * 3.2, 1),
                "eta_minutes": 22 + i * 5,
                "traffic_note": "",
                "note": TAG,
                "route_summary": "",
                "room_name": "",
                "driver_phone": DRIVER_PHONE,
                "created_at": iso(now - timedelta(minutes=30)),
                "updated_at": iso(now - timedelta(minutes=10)),
            },
        )
        created += 1

    print(f"driver={DRIVER_PHONE} trips_put={created} tag={TAG}")


if __name__ == "__main__":
    main()
