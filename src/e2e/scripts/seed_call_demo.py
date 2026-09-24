#!/usr/bin/env python3
"""Seed một vài chuyến DEMO để test luồng 'gọi khách' bằng số thật.

Vì tài xế demo David dùng số 0888887798, các chuyến cũ lỡ gán customer_phone
trùng số này → llm-orchestrator chặn self-call (loop SIP). Script này tạo chuyến
mới với customer_phone khác hẳn (mặc định 0528310879) để bot gọi ra được.

  AWS_PROFILE=david python3 src/e2e/scripts/seed_call_demo.py
  AWS_PROFILE=david CUSTOMER_PHONE=0528310879 python3 .../seed_call_demo.py
  AWS_PROFILE=david python3 .../seed_call_demo.py --clean   # + xoá chuyến customer_phone==driver_phone
"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import boto3

DRIVER_PHONE = os.environ.get("DRIVER_PHONE", "0888887798")
CUSTOMER_PHONE = os.environ.get("CUSTOMER_PHONE", "0528310879")
CUSTOMER_NAME = os.environ.get("CUSTOMER_NAME", "Khách Gọi Thử")
TABLE = os.environ.get("DYNAMODB_TABLE", "local-driver-assistant-trips")
REGION = os.environ.get("AWS_REGION", "ap-southeast-1")
TAG = "seed_call_demo_v1"


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


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


def trip(status: str, when: datetime, pickup: str, dropoff: str, km: float, hhmm: str) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "trip_id": str(uuid.uuid4()),
        "status": status,
        "customer_name": CUSTOMER_NAME,
        "customer_phone": CUSTOMER_PHONE,
        "pickup_address": pickup,
        "dropoff_address": dropoff,
        "pickup_time": hhmm,
        "booked_via": TAG,
        "distance_km": km,
        "eta_minutes": int(km * 2.6),
        "traffic_note": "",
        "note": TAG,
        "route_summary": f"{km} km",
        "room_name": "",
        "driver_phone": DRIVER_PHONE,
        "created_at": iso(now - timedelta(minutes=30)),
        "updated_at": iso(now - timedelta(minutes=10)),
    }


def clean_self_call_trips(ddb: Any) -> int:
    """Xoá các chuyến có customer_phone == driver_phone (nguồn gây chặn self-call)."""
    removed = 0
    paginator = ddb.get_paginator("scan")
    for page in paginator.paginate(
        TableName=TABLE,
        FilterExpression="customer_phone = :p AND driver_phone = :p",
        ExpressionAttributeValues={":p": {"S": DRIVER_PHONE}},
    ):
        for it in page.get("Items", []):
            tid = it["trip_id"]["S"]
            name = it.get("customer_name", {}).get("S", "?")
            st = it.get("status", {}).get("S", "?")
            print(f"  xoá trip {tid[:8]}  {name}  [{st}]  customer_phone={DRIVER_PHONE}")
            ddb.delete_item(TableName=TABLE, Key={"trip_id": {"S": tid}})
            removed += 1
    return removed


def clean_own_tag(ddb: Any) -> int:
    """Xoá chuyến do chính script này tạo lần trước (idempotent khi chạy lại)."""
    removed = 0
    for page in ddb.get_paginator("scan").paginate(
        TableName=TABLE,
        FilterExpression="booked_via = :t",
        ExpressionAttributeValues={":t": {"S": TAG}},
    ):
        for it in page.get("Items", []):
            ddb.delete_item(TableName=TABLE, Key={"trip_id": {"S": it["trip_id"]["S"]}})
            removed += 1
    return removed


def main() -> None:
    now = datetime.now(timezone.utc)
    ddb = boto3.client("dynamodb", region_name=REGION)

    old = clean_own_tag(ddb)
    if old:
        print(f"Đã xoá {old} chuyến demo cũ (tag {TAG}).")

    if "--clean" in sys.argv:
        print(f"Quét & xoá chuyến customer_phone == driver_phone ({DRIVER_PHONE})…")
        n = clean_self_call_trips(ddb)
        print(f"→ đã xoá {n} chuyến.\n")

    rows = [
        trip("confirmed", now + timedelta(minutes=30),
             "Mỹ Đình, Hà Nội", "Đông Anh, Hà Nội", 15.4, f"{(now.hour + 1) % 24:02d}:30"),
        trip("confirmed", now + timedelta(hours=3),
             "Tòa nhà Lotte, 54 Liễu Giai, Ba Đình, Hà Nội", "45 Nguyễn Huệ, Quận 1, TP.HCM", 12.6, "18:00"),
        trip("pending", now + timedelta(hours=5),
             "88 Pasteur, Quận 3, TP.HCM", "Bitexco Financial Tower, Quận 1, TP.HCM", 5.0, "20:00"),
    ]
    for r in rows:
        ddb.put_item(TableName=TABLE, Item=_to_item(r))
        print(f"  + {r['status']:9s}  {r['pickup_address']}  →  {r['dropoff_address']}")

    print(
        f"\nĐã tạo {len(rows)} chuyến demo cho tài xế {DRIVER_PHONE}, "
        f"khách '{CUSTOMER_NAME}' / {CUSTOMER_PHONE}.\n"
        "Trên app: mở lại trợ lý → 'gọi cho khách của chuyến hiện tại' → SIP quay ra số này."
    )


if __name__ == "__main__":
    main()
